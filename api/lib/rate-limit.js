const { getJson, setJson } = require('./redis-store');

function clientKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  const token = req.headers?.authorization || req.headers?.['x-api-key'] || '';
  return (token || ip || req.socket?.remoteAddress || 'anonymous').slice(0, 180);
}

async function tokenBucket(req, res, options = {}) {
  const capacity = options.capacity || 60;
  const refillPerSecond = options.refillPerSecond || 1;
  const ttlSeconds = options.ttlSeconds || 600;
  const namespace = options.namespace || 'api';
  const key = `rl:${namespace}:${clientKey(req)}`;
  const now = Date.now();
  const bucket = (await getJson(key)) || { tokens: capacity, updatedAt: now };
  const elapsed = Math.max(0, (now - bucket.updatedAt) / 1000);
  const tokens = Math.min(capacity, Number(bucket.tokens || 0) + elapsed * refillPerSecond);

  if (tokens < 1) {
    const retryAfter = Math.ceil((1 - tokens) / refillPerSecond);
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('X-RateLimit-Limit', String(capacity));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.status(429).json({ ok: false, error: 'rate_limited', retryAfter });
    await setJson(key, { tokens, updatedAt: now }, ttlSeconds);
    return false;
  }

  const next = tokens - 1;
  await setJson(key, { tokens: next, updatedAt: now }, ttlSeconds);
  res.setHeader('X-RateLimit-Limit', String(capacity));
  res.setHeader('X-RateLimit-Remaining', String(Math.floor(next)));
  return true;
}

module.exports = { tokenBucket };
