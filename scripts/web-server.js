const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const handlers = {
  '/api/health': require('../api/health'),
  '/api/vnstock-signal-os': require('../api/vnstock-signal-os'),
  '/api/ai-check': require('../api/ai-check'),
  '/api/alerts-evaluate': require('../api/alerts-evaluate'),
  '/api/bff-dashboard': require('../api/bff-dashboard'),
  '/api/kbs': require('../api/kbs'),
};

const server = http.createServer(async (incoming, outgoing) => {
  const parsed = new URL(incoming.url || '/', `http://${incoming.headers.host || 'localhost'}`);
  const handler = handlers[parsed.pathname];
  if (handler) {
    const body = await readBody(incoming);
    const req = {
      method: incoming.method,
      headers: incoming.headers,
      query: Object.fromEntries(parsed.searchParams.entries()),
      body,
      socket: incoming.socket,
    };
    const res = makeResponse(outgoing);
    Promise.resolve(handler(req, res)).catch((error) => {
      if (!outgoing.headersSent) {
        outgoing.writeHead(500, { 'Content-Type': 'application/json' });
      }
      outgoing.end(JSON.stringify({ ok: false, error: error?.message || 'server_error' }));
    });
    return;
  }
  serveStatic(parsed.pathname, outgoing);
});

function makeResponse(outgoing) {
  return {
    code: 200,
    setHeader(key, value) { outgoing.setHeader(key, value); },
    status(code) { this.code = code; return this; },
    json(payload) {
      const data = JSON.stringify(payload);
      outgoing.writeHead(this.code, { 'Content-Type': 'application/json; charset=utf-8' });
      outgoing.end(data);
    },
    end(payload = '') {
      outgoing.writeHead(this.code);
      outgoing.end(payload);
    },
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (_) { resolve(raw); }
    });
  });
}

function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const candidates = [
    path.join(publicRoot, safePath),
    path.join(root, safePath),
    path.join(root, 'index.html'),
  ];
  const file = candidates.find((candidate) => {
    const normalized = path.normalize(candidate);
    return (normalized.startsWith(publicRoot) || normalized.startsWith(root)) && fs.existsSync(normalized) && fs.statSync(normalized).isFile();
  });
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  const ext = path.extname(file);
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
  }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(file).pipe(res);
}

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`BuyOrSell web BFF listening on ${port}`);
});
