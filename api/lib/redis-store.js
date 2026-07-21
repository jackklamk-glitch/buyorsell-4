const memory = new Map();
let tcpClientReady = null;

function nowMs() {
  return Date.now();
}

async function redisCommand(command) {
  const tcpResult = await redisTcpCommand(command);
  if (tcpResult !== null) return tcpResult;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || typeof fetch !== 'function') return null;
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  return Array.isArray(payload) ? payload[0]?.result : null;
}

async function redisTcpCommand(command) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  try {
    if (!tcpClientReady) {
      tcpClientReady = (async () => {
        const { createClient } = require('redis');
        const client = createClient({ url: redisUrl });
        client.on('error', () => {});
        await client.connect();
        return client;
      })();
    }
    const client = await tcpClientReady;
    const [op, ...args] = command;
    if (op === 'GET') return await client.get(args[0]);
    if (op === 'SET') {
      const [key, value, mode, ttl] = args;
      if (mode === 'EX') return await client.set(key, value, { EX: Number(ttl) });
      return await client.set(key, value);
    }
  } catch (_) {
    return null;
  }
  return null;
}

async function getJson(key) {
  const redisValue = await redisCommand(['GET', key]);
  if (redisValue != null) {
    try { return JSON.parse(redisValue); } catch (_) { return null; }
  }
  const item = memory.get(key);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt <= nowMs()) {
    memory.delete(key);
    return null;
  }
  return item.value;
}

async function setJson(key, value, ttlSeconds = 60) {
  const serialized = JSON.stringify(value);
  const redisResult = await redisCommand(['SET', key, serialized, 'EX', String(ttlSeconds)]);
  memory.set(key, { value, expiresAt: nowMs() + ttlSeconds * 1000 });
  return redisResult;
}

module.exports = { getJson, setJson };
