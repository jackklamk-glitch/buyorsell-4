const { getJson, setJson } = require('./redis-store');

async function withCircuitBreaker(name, fn, options = {}) {
  const failureThreshold = options.failureThreshold || 3;
  const cooldownSeconds = options.cooldownSeconds || 45;
  const cacheTtlSeconds = options.cacheTtlSeconds || 120;
  const stateKey = `cb:${name}:state`;
  const cacheKey = `cb:${name}:last_ok`;
  const state = (await getJson(stateKey)) || { failures: 0, openedUntil: 0 };
  const now = Date.now();

  if (state.openedUntil > now) {
    const cached = await getJson(cacheKey);
    if (cached != null) return { ok: true, data: cached, data_degraded: true, source: 'circuit_cache' };
    return { ok: false, data: null, data_degraded: true, error: 'circuit_open' };
  }

  try {
    const data = await fn();
    await setJson(stateKey, { failures: 0, openedUntil: 0 }, cooldownSeconds);
    await setJson(cacheKey, data, cacheTtlSeconds);
    return { ok: true, data, data_degraded: false, source: 'upstream' };
  } catch (error) {
    const failures = Number(state.failures || 0) + 1;
    const openedUntil = failures >= failureThreshold ? now + cooldownSeconds * 1000 : 0;
    await setJson(stateKey, { failures, openedUntil }, cooldownSeconds);
    const cached = await getJson(cacheKey);
    if (cached != null) {
      return { ok: true, data: cached, data_degraded: true, source: 'stale_cache', error: error?.message || 'upstream_failed' };
    }
    return { ok: false, data: null, data_degraded: true, error: error?.message || 'upstream_failed' };
  }
}

module.exports = { withCircuitBreaker };
