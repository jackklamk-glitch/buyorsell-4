const signalHandler = require('./vnstock-signal-os');
const aiCheckHandler = require('./ai-check');
const { evaluateRules } = require('./lib/alert-rules');
const { withCircuitBreaker } = require('./lib/circuit-breaker');
const { tokenBucket } = require('./lib/rate-limit');

function callHandler(handler, query = {}) {
  return new Promise((resolve) => {
    const req = { method: 'GET', query, headers: {} };
    const res = {
      code: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; },
      json(payload) { resolve({ code: this.code, payload }); },
      end() { resolve({ code: this.code, payload: null }); },
    };
    Promise.resolve(handler(req, res)).catch((error) => resolve({ code: 500, payload: { ok: false, error: error?.message || 'handler_error' } }));
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!(await tokenBucket(req, res, { namespace: 'bff-dashboard', capacity: 90, refillPerSecond: 1.5 }))) return;

  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : null;
  const includeRag = String(req.query.includeRag || '') === '1';

  const signalResult = await withCircuitBreaker(
    'vnstock-signal-os',
    async () => {
      const result = await callHandler(signalHandler, limit ? { limit: String(limit) } : {});
      if (!result.payload?.ok) throw new Error(result.payload?.error || 'signals_failed');
      return result.payload;
    },
    { cacheTtlSeconds: 120, cooldownSeconds: 45 },
  );

  const signalsPayload = signalResult.data || { data: [] };
  const signals = Array.isArray(signalsPayload.data) ? signalsPayload.data : [];
  const top = signals[0] || null;

  const ragResult = includeRag && top
    ? await withCircuitBreaker(
      `ai-check:${top.symbol}`,
      async () => {
        const result = await callHandler(aiCheckHandler, {
          symbol: top.symbol,
          signal: top.signal,
          signalPrice: top.signalPrice,
          currentPrice: top.livePrice,
          foreignNetVolume: top.live?.foreignNetVolume,
        });
        if (!result.payload?.ok) throw new Error(result.payload?.error || 'rag_failed');
        return result.payload.data;
      },
      { cacheTtlSeconds: 900, cooldownSeconds: 60 },
    )
    : { ok: true, data: null, data_degraded: false, source: 'skipped' };

  const alerts = evaluateRules(signals);
  return res.status(200).json({
    ok: signalResult.ok,
    data_degraded: Boolean(signalResult.data_degraded || ragResult.data_degraded),
    fetchedAt: new Date().toISOString(),
    marketSession: signalsPayload.marketSession || null,
    sources: {
      signals: signalResult.source,
      rag: ragResult.source,
      alerts: 'rules_engine',
    },
    data: {
      summary: signalsPayload.summary || {},
      signals,
      rag: ragResult.data,
      alerts,
    },
    errors: [signalResult.error, ragResult.error].filter(Boolean),
  });
};
