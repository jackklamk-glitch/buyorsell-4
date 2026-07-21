const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/^\uFEFF/, '');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8').replace(/^\uFEFF/, ''));

const required = [
  'BuyOrSell 4.0',
  'NHỊP THỊ TRƯỜNG BUYORSELL',
  'Tóm tắt AI hôm nay',
  'Bảng tin tình báo thị trường',
  'Bản tin sáng AI',
  'Chỉ số BOS tư nhân',
  'Bản đồ nhiệt thị trường',
  'Tín hiệu AI nổi bật',
  'Không chỉ ghi MUA/BÁN',
  'Trung tâm nghiên cứu',
  'Hồ sơ doanh nghiệp',
  'Danh sách theo dõi',
  'Cảnh báo AI',
  'Chuyên viên phân tích AI',
  'Giải thích điểm BOS',
  'Nguồn dữ liệu · Miễn trừ AI · Về điểm BOS',
  '/api/vnstock-signal-os?limit=20',
  '/api/ai-check',
  '<meta name="robots" content="index,follow" />'
];
const requiredIds = ['nhip-thi-truong','pulseFresh','pulsePrivate','pulseLiquidity','pulseValuation','pulseFundraising','pulseMA','pulseSummary','top','ban-tin-sang','thi-truong','heatmap','tin-hieu','globalSearch','signalFilter','refreshBtn','signalList','signalDetail','nghien-cuu','researchTabs','researchGrid','doanh-nghiep','companyGrid','watchlist','watchlistBox','alerts','alertGrid','ai','aiGrid','methodology','methodologyGrid','trust'];
const forbiddenVisible = ['Market Pulse<','Today\'s AI Summary','Private Market<','>Liquidity<','>Valuation<','>Fundraising<','>Slowing<','>Defensive<','>Bullish<','>Watchlist<','Company Intelligence<','Research Hub<','Notification Center<','GoLive Boundary','noindex','dashboard marketing','không phải blog','không phải chatbot'];
const missing = required.filter((token) => !index.includes(token));
const missingIds = requiredIds.filter((id) => !index.includes(`id="${id}"`));
const forbidden = forbiddenVisible.filter((token) => index.includes(token));
const snapshotIndex = index.indexOf('window.__BOS4_SNAPSHOT__=');
const bootIndex = index.indexOf('const $=id=>document.getElementById(id);');
const snapshotBeforeBoot = snapshotIndex >= 0 && bootIndex >= 0 && snapshotIndex < bootIndex;
if (missing.length || missingIds.length || forbidden.length || !snapshotBeforeBoot) {
  if (missing.length) console.error('Missing required content:', missing.join(', '));
  if (missingIds.length) console.error('Missing required ids:', missingIds.join(', '));
  if (forbidden.length) console.error('Forbidden English/preview content:', forbidden.join(', '));
  if (!snapshotBeforeBoot) console.error('Snapshot must be declared before client boot so first paint has data.');
  process.exit(1);
}
const scripts = [...index.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('Missing inline script');
for (const script of scripts) new Function(script);
if (!Array.isArray(vercel.headers) || !Array.isArray(vercel.rewrites)) throw new Error('Invalid vercel.json');
for (const api of ['api/vnstock-signal-os.js', 'api/ai-check.js', 'api/kbs.js']) {
  if (!fs.existsSync(path.join(root, api))) throw new Error(`Missing API file: ${api}`);
}
console.log('BuyOrSell 4.0 Vietnamese production checks passed');
