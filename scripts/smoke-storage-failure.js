const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
class Element { constructor(id){ this.id=id; this._textContent=''; this._innerHTML=''; this.className=''; this.dataset={}; this.style={}; this.value=id==='signalFilter'?'all':''; } set textContent(v){this._textContent=String(v)} get textContent(){return this._textContent} set innerHTML(v){this._innerHTML=String(v)} get innerHTML(){return this._innerHTML} closest(){return null} }
const elements = Object.fromEntries(ids.map(id=>[id,new Element(id)]));
const document = { getElementById(id){ if(!elements[id]) elements[id]=new Element(id); return elements[id]; }, addEventListener(){} };
const localStorage = { getItem(){ throw new Error('SecurityError: localStorage is unavailable'); }, setItem(){ throw new Error('SecurityError: localStorage is unavailable'); } };
const fetch = async (url) => url.includes('/api/ai-check') ? { json: async () => ({ ok: true, data: { metrics: {}, verdict: {} } }) } : new Promise(()=>{});
const ctx = { document, localStorage, window:{}, fetch, setInterval(){}, URLSearchParams, Date, Number, JSON, Math, console, Error, Array, Object, String, RegExp, setTimeout };
ctx.window=ctx;
vm.createContext(ctx);
let threw = null;
try { vm.runInContext(script, ctx, { timeout: 5000 }); } catch (e) { threw = e; }
const checks = {
  bootDidNotThrow: !threw,
  signalListRendered: /signal-card/.test(elements.signalList.innerHTML),
  heatmapRendered: /class="heat/.test(elements.heatmap.innerHTML),
  briefRendered: /<li>/.test(elements.briefList.innerHTML) && !/Đang đọc/.test(elements.briefList.innerHTML),
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, threw: threw && threw.message, checks, sample: { signalList: elements.signalList.innerHTML.slice(0,100) } }, null, 2));
if(!ok) process.exit(1);
