const { evaluateRules, dispatchWebhooks, DEFAULT_RULES } = require('./lib/alert-rules');
const { tokenBucket } = require('./lib/rate-limit');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!(await tokenBucket(req, res, { namespace: 'alerts', capacity: 30, refillPerSecond: 0.5 }))) return;

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const previousRows = Array.isArray(body.previousRows) ? body.previousRows : [];
  const rules = Array.isArray(body.rules) && body.rules.length ? body.rules : DEFAULT_RULES;
  const alerts = evaluateRules(rows, previousRows, rules);
  const webhookResults = body.dispatch === true ? await dispatchWebhooks(alerts, body.channels || {}) : [];

  return res.status(200).json({
    ok: true,
    data_degraded: false,
    evaluatedAt: new Date().toISOString(),
    summary: { rows: rows.length, rules: rules.length, alerts: alerts.length },
    alerts,
    webhookResults,
  });
};
