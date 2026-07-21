const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Missing inline script');

class Element {
  constructor(id) { this.id = id; this._textContent = ''; this._innerHTML = ''; this.className = ''; this.dataset = {}; this.style = {}; this.value = id === 'signalFilter' ? 'all' : ''; }
  set textContent(v) { this._textContent = String(v); }
  get textContent() { return this._textContent; }
  set innerHTML(v) { this._innerHTML = String(v); }
  get innerHTML() { return this._innerHTML; }
  closest() { return null; }
}
const elements = Object.fromEntries(ids.map((id) => [id, new Element(id)]));
const document = {
  getElementById(id) { if (!elements[id]) elements[id] = new Element(id); return elements[id]; },
  addEventListener() {},
};
const localStorage = { getItem() { return '[]'; }, setItem() {} };
// Critical regression: the page must render usable snapshot data even if live fetch never returns.
const fetch = async (url) => url.includes('/api/ai-check')
  ? { json: async () => ({ ok: true, data: { metrics: {}, verdict: { label: 'OK', action: 'OK' } } }) }
  : new Promise(() => {});
const ctx = { document, localStorage, window: {}, fetch, setInterval() {}, URLSearchParams, Date, Number, JSON, Math, console, Error, Array, Object, String, RegExp, setTimeout };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(script, ctx, { timeout: 5000 });

const checks = {
  signalListRendered: /signal-card/.test(elements.signalList.innerHTML),
  heatmapRendered: /class="heat/.test(elements.heatmap.innerHTML),
  briefRendered: /<li>/.test(elements.briefList.innerHTML) && !/Đang đọc/.test(elements.briefList.innerHTML),
  marketStatusRendered: elements.marketStatus.textContent && elements.marketStatus.textContent !== 'Đang đọc',
  researchRendered: /research-card/.test(elements.researchGrid.innerHTML),
  companyRendered: /company-card/.test(elements.companyGrid.innerHTML),
  noPrimaryPlaceholders: !/Đang tải|Đang đọc|Đang tạo/.test([
    elements.signalList.innerHTML,
    elements.heatmap.innerHTML,
    elements.briefList.innerHTML,
    elements.researchGrid.innerHTML,
    elements.companyGrid.innerHTML,
    elements.alertGrid.innerHTML,
    elements.aiGrid.innerHTML,
  ].join('\n')),
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks, sample: { marketStatus: elements.marketStatus.textContent, signalList: elements.signalList.innerHTML.slice(0,120), brief: elements.briefList.innerHTML.slice(0,120) } }, null, 2));
if (!ok) process.exit(1);
