// Vercel serverless chỉ cho ghi tạm trong /tmp. vnstock-js khởi tạo watchlist/cache
// theo HOME, nên phải chuyển HOME sang /tmp trước khi require package.
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  process.env.HOME = '/tmp';
  process.env.USERPROFILE = '/tmp';
}
try { require('fs').mkdirSync(`${process.env.HOME || '/tmp'}/.vnstock-js`, { recursive: true }); } catch (_) {}

const { sma, ema, rsi, macd } = require('vnstock-js');
const vnstock = require('vnstock-js');
const { tokenBucket } = require('./lib/rate-limit');

const SHEET_ID = '1_1tdoih5Wwq23E096At0mtLx-rxnCFpyDMCccdKzBuw';
const DEFAULT_GID = '75989377';
const VCI_URL = 'https://trading.vietcap.com.vn/api/price/symbols/getList';
const VCI_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7',
  'Content-Type': 'application/json',
  Origin: 'https://trading.vietcap.com.vn',
  Referer: 'https://trading.vietcap.com.vn/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
};

function cleanSymbol(v) { return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10); }
function toNumber(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s.replace('%', ''));
  return Number.isFinite(n) ? n : null;
}
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
function parseDateTime(dateStr, timeStr) {
  const [day, month, year] = String(dateStr || '').split('/').map(Number);
  const m = String(timeStr || '').match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!day || !month || !year || !m) return new Date(0);
  let hour = Number(m[1]);
  if (m[4].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (m[4].toUpperCase() === 'AM' && hour === 12) hour = 0;
  return new Date(year, month - 1, day, hour, Number(m[2]), Number(m[3]));
}
function normalizePrice(v) { const n = toNumber(v); return n == null ? null : n / 1000; }
function pickLivePrice(row) {
  if (!row) return null;
  return [row.price, row.matchedPrice, row.last, row.lastPrice, row.best1Offer, row.best1Bid, row.referencePrice].map(toNumber).find((n) => n && n > 0) || null;
}
function normalizeVci(raw) {
  const listing = raw?.listingInfo || {};
  const match = raw?.matchPrice || {};
  const symbol = cleanSymbol(listing.symbol || listing.ticker);
  if (!symbol) return null;
  return {
    symbol,
    companyName: listing.organName || '',
    price: normalizePrice(match.matchPrice),
    referencePrice: normalizePrice(listing.refPrice),
    changePct: toNumber(match.changePercent),
    totalVolume: toNumber(match.accumulatedVolume),
    foreignNetVolume: (toNumber(match.foreignBuyVolume) || 0) - (toNumber(match.foreignSellVolume) || 0),
    exchange: listing.board || '',
    tradingDate: listing.tradingDate || null,
  };
}
async function fetchSignals(limit = null) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${DEFAULT_GID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sheet_${res.status}`);
  const csv = await res.text();
  const rows = csv.trim().split(/\r?\n/).slice(1).map(parseCsvLine).map((c) => ({
    stt: c[0], date: c[1], time: c[2], symbol: cleanSymbol(c[3]), signal: String(c[6] || '').trim().toUpperCase(),
    signalPrice: toNumber(c[4]), note: c[7] || '', sheetCurrentPrice: toNumber(c[8]), pnl: toNumber(c[11]), pct: toNumber(String(c[12] || '').replace('%', '')),
    holdDays: c[13] || '', dt: parseDateTime(c[1], c[2]),
  })).filter((r) => r.symbol && r.signal);
  const sorted = rows.sort((a, b) => b.dt - a.dt || a.symbol.localeCompare(b.symbol));
  return limit ? sorted.slice(0, limit) : sorted;
}
async function fetchLive(symbols) {
  const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
  if (!uniqueSymbols.length) return {};
  const out = {};
  for (let i = 0; i < uniqueSymbols.length; i += 80) {
    const chunk = uniqueSymbols.slice(i, i + 80);
    const res = await fetch(VCI_URL, { method: 'POST', headers: VCI_HEADERS, body: JSON.stringify({ symbols: chunk }) });
    if (!res.ok) continue;
    const rows = await res.json().catch(() => []);
    for (const raw of Array.isArray(rows) ? rows : []) {
      const row = normalizeVci(raw);
      if (row) out[row.symbol] = row;
    }
  }
  return out;
}
async function fetchTa(symbol) {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 220);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const history = await vnstock.stock.quote({ ticker: symbol, start: fmt(start), end: fmt(end) });
    if (!Array.isArray(history) || history.length < 30) return null;
    const rsi14 = rsi(history, { period: 14 }).at(-1)?.rsi;
    const ema20 = ema(history, { period: 20 }).at(-1)?.ema;
    const sma50 = sma(history, { period: 50 }).at(-1)?.sma;
    const macdLast = macd(history).at(-1) || {};
    const last = history.at(-1) || {};
    let stance = 'NEUTRAL';
    if (last.close > ema20 && ema20 > sma50 && macdLast.histogram >= 0) stance = 'BULLISH';
    if (last.close < ema20 && ema20 < sma50 && macdLast.histogram <= 0) stance = 'BEARISH';
    return { close: last.close, rsi14: round(rsi14), ema20: round(ema20), sma50: round(sma50), macdHistogram: round(macdLast.histogram), stance };
  } catch (_) { return null; }
}
async function fetchNews(symbol) {
  try {
    const rows = await vnstock.news.search(symbol);
    return Array.isArray(rows) ? rows.slice(0, 3).map((n) => ({ title: n.title || n.newsTitle || n.headline, date: n.date || n.publicDate || n.publishedAt, source: n.source })) : [];
  } catch (_) { return []; }
}
function round(v, d = 2) { const n = toNumber(v); return n == null ? null : Number(n.toFixed(d)); }
function vnMarketSession(now = new Date()) {
  const vn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const day = vn.getDay();
  const minutes = vn.getHours() * 60 + vn.getMinutes();
  const weekday = day >= 1 && day <= 5;
  const morning = minutes >= 9 * 60 && minutes <= 11 * 60 + 30;
  const afternoon = minutes >= 13 * 60 && minutes <= 15 * 60;
  const open = weekday && (morning || afternoon);
  const lunch = weekday && minutes > 11 * 60 + 30 && minutes < 13 * 60;
  const preopen = weekday && minutes >= 8 * 60 + 45 && minutes < 9 * 60;
  return { open, lunch, preopen, timezone: 'Asia/Ho_Chi_Minh', label: open ? 'Realtime phiên VN' : lunch ? 'Nghỉ trưa - chờ phiên chiều' : preopen ? 'Chuẩn bị mở cửa' : 'Ngoài giờ giao dịch' };
}
function calcPnl(signal, signalPrice, livePrice) {
  if (!signalPrice || !livePrice) return { pnl: null, pct: null };
  const pnl = signal === 'SELL' ? signalPrice - livePrice : livePrice - signalPrice;
  return { pnl: round(pnl), pct: round((pnl / signalPrice) * 100) };
}
function bosScore(row, live, ta) {
  let score = 50;
  if (row.signal === 'BUY') score += 10;
  if (row.signal === 'SELL') score -= 5;
  if (live?.foreignNetVolume > 0) score += 8;
  if (live?.foreignNetVolume < 0) score -= 8;
  if (ta?.stance === 'BULLISH') score += 15;
  if (ta?.stance === 'BEARISH') score -= 15;
  if (ta?.rsi14 != null && ta.rsi14 >= 45 && ta.rsi14 <= 68) score += 6;
  if (ta?.rsi14 != null && ta.rsi14 > 78) score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  const session = vnMarketSession();
  res.setHeader('Cache-Control', session.open ? 's-maxage=10, stale-while-revalidate=10' : 's-maxage=120, stale-while-revalidate=600');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!(await tokenBucket(req, res, { namespace: 'vnstock-signal-os', capacity: 120, refillPerSecond: 2 }))) return;
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : null;
  try {
    const signals = await fetchSignals(limit);
    const liveMap = await fetchLive(signals.map((r) => r.symbol));
    const enriched = await Promise.all(signals.map(async (row, idx) => {
      const live = liveMap[row.symbol] || null;
      const livePrice = pickLivePrice(live) || row.sheetCurrentPrice;
      const shouldDeep = idx < 6;
      const [ta, news] = shouldDeep ? await Promise.all([fetchTa(row.symbol), fetchNews(row.symbol)]) : [null, []];
      const pnl = calcPnl(row.signal, row.signalPrice, livePrice);
      const score = bosScore(row, live, ta);
      return { ...row, dt: row.dt.toISOString(), livePrice, live, performance: pnl, ta, news, bosScore: score,
        aiConfidence: Math.max(45, Math.min(95, score + (news.length ? 5 : 0))),
        verdict: score >= 72 ? 'Đồng thuận mạnh' : score >= 58 ? 'Theo dõi tích cực' : score >= 42 ? 'Trung lập / cần xác nhận' : 'Rủi ro / hạ tỷ trọng' };
    }));
    const buys = enriched.filter((r) => r.signal === 'BUY');
    const sells = enriched.filter((r) => r.signal === 'SELL');
    return res.status(200).json({ ok: true, source: ['Vnstock_pipeline', 'vnstock_data', 'vnstock_ta', 'vnstock_news', 'buyorsell_signal_sheet'], marketSession: session, fetchedAt: new Date().toISOString(), summary: { total: enriched.length, buy: buys.length, sell: sells.length, avgBosScore: round(enriched.reduce((s, r) => s + r.bosScore, 0) / Math.max(1, enriched.length), 0), top: enriched[0]?.symbol || null }, data: enriched });
  } catch (err) {
    return res.status(200).json({ ok: false, source: ['Vnstock_pipeline'], marketSession: session, error: err?.message || 'pipeline_failed', fetchedAt: new Date().toISOString(), data: [] });
  }
};
