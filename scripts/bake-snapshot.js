const fs = require('fs');

function callHandler(handler, query = {}) {
  return new Promise((resolve) => {
    const req = { method: 'GET', query };
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

(async () => {
  const pipeline = await callHandler(require('../api/vnstock-signal-os'), { limit: '20' });
  const payload = pipeline.payload || {};
  if (!payload.ok || !Array.isArray(payload.data) || !payload.data.length) throw new Error(payload.error || 'pipeline_empty');
  let html = fs.readFileSync('index.html', 'utf8');
  html = html.replace(/\nwindow\.__BOS4_SNAPSHOT__=[\s\S]*?;\n(?=<\/script>)/g, '');
  html = html.replace('</script>\n</body>', `\nwindow.__BOS4_SNAPSHOT__=${JSON.stringify({ ok: true, source: payload.source, fetchedAt: payload.fetchedAt, summary: payload.summary, data: payload.data })};\n</script>\n</body>`);
  fs.writeFileSync('index.html', html);
  console.log(JSON.stringify({ ok: true, rows: payload.data.length, summary: payload.summary }, null, 2));
})();
