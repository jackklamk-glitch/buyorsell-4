let vnstockReady = null;
const { tokenBucket } = require('./lib/rate-limit');

function cleanSymbol(v) {
  return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function ratio(a, b) {
  a = num(a); b = num(b);
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function pct(a, b) {
  const r = ratio(a, b);
  return r == null ? null : (r - 1) * 100;
}

function fmt(x, digits = 2) {
  const n = num(x);
  return n == null ? null : Number(n.toFixed(digits));
}

function latest(rows) {
  return Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
}

function previous(rows) {
  return Array.isArray(rows) && rows.length > 1 ? rows[rows.length - 2] : null;
}

function view(v, fallback = 'Chưa có dữ liệu') {
  return v == null || v === '' || Number.isNaN(v) ? fallback : v;
}

function band(value, good, watch) {
  if (value == null) return 'Cần bổ sung dữ liệu';
  if (good(value)) return 'An toàn';
  if (watch(value)) return 'Cần theo dõi';
  return 'Rủi ro';
}

async function getVnstock() {
  if (!vnstockReady) {
    vnstockReady = (async () => {
      const { VciAdapter } = require('vnstock-js/dist/adapters/vci');
      return { adapter: new VciAdapter({ cache: true }) };
    })();
  }
  return vnstockReady;
}

function makeVerdict({ signal, debtToEquity, currentRatio, cashToDebt, revenueGrowth, netProfitGrowth, roe, pe, pb, cfo, foreignNetVolume, pctFromSignal }) {
  const isBuy = String(signal || '').toLowerCase() === 'buy';
  const isSell = String(signal || '').toLowerCase() === 'sell';
  let score = 0;
  if (debtToEquity != null) score += debtToEquity <= 1 ? 2 : debtToEquity <= 1.8 ? 1 : -2;
  if (currentRatio != null) score += currentRatio >= 1.2 ? 2 : currentRatio >= 0.9 ? 0 : -1;
  if (cashToDebt != null) score += cashToDebt >= 0.2 ? 1 : cashToDebt >= 0.08 ? 0 : -1;
  if (revenueGrowth != null) score += revenueGrowth >= 10 ? 2 : revenueGrowth >= 0 ? 1 : -2;
  if (netProfitGrowth != null) score += netProfitGrowth >= 10 ? 2 : netProfitGrowth >= 0 ? 1 : -2;
  if (roe != null) score += roe >= 0.15 ? 2 : roe >= 0.08 ? 1 : -1;
  if (pe != null) score += pe > 0 && pe <= 15 ? 1 : pe > 25 ? -1 : 0;
  if (pb != null) score += pb > 0 && pb <= 2 ? 1 : pb > 4 ? -1 : 0;
  if (cfo != null) score += cfo > 0 ? 1 : -2;
  if (foreignNetVolume != null) score += foreignNetVolume > 0 ? 1 : foreignNetVolume < 0 ? -1 : 0;
  if (pctFromSignal != null) score += pctFromSignal >= 0 ? 1 : -1;

  if (isBuy && score >= 7) return { label: 'ĐỒNG THUẬN MUA', tone: 'positive', score, action: 'Tín hiệu kỹ thuật/dòng tiền đang trùng với nền tảng cơ bản. Có thể đưa vào watchlist giải ngân theo từng phần; ưu tiên điểm mua khi giá không bị kéo quá xa khỏi giá tín hiệu.' };
  if (isBuy && score >= 2) return { label: 'MUA THẬN TRỌNG', tone: 'watch', score, action: 'Tín hiệu kỹ thuật đang ủng hộ nhưng nền tảng hoặc định giá chưa đủ đẹp; đi vốn nhỏ, chia lệnh và đặt ngưỡng cắt lỗ rõ.' };
  if (isBuy) return { label: 'MUA ĐẦU CƠ / KHÔNG ĐỒNG THUẬN', tone: 'negative', action: 'Tín hiệu kỹ thuật có nhưng nền tảng chưa xác nhận; chỉ phù hợp lướt sóng kỷ luật, không giải ngân lớn.' };
  if (isSell && score <= 0) return { label: 'ĐỒNG THUẬN BÁN / HẠ TỶ TRỌNG', tone: 'negative', action: 'Tín hiệu bán trùng với bộ lọc rủi ro; ưu tiên bảo toàn vốn và chờ nền giá mới.' };
  if (isSell) return { label: 'BÁN KỸ THUẬT, NỀN TẢNG CHƯA XẤU', tone: 'watch', action: 'Có thể hạ tỷ trọng theo tín hiệu, nhưng vẫn theo dõi lại nếu dòng tiền quay lại.' };
  return { label: 'TRUNG LẬP', tone: 'watch', action: 'Chưa xác định được tín hiệu chính; cần thêm dữ liệu kỹ thuật.' };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!(await tokenBucket(req, res, { namespace: 'ai-check', capacity: 30, refillPerSecond: 0.2 }))) return;

  const symbol = cleanSymbol(req.query.symbol);
  if (!symbol) return res.status(400).json({ ok: false, error: 'missing_symbol' });

  try {
    const { adapter } = await getVnstock();
    const signal = String(req.query.signal || '').toUpperCase();
    const signalPrice = num(req.query.signalPrice);
    const currentPrice = num(req.query.currentPrice);

    const [priceBoard, overview, balanceSheet, incomeStatement, cashFlow] = await Promise.all([
      adapter.fetchPriceBoard([symbol]).then(rows => Array.isArray(rows) ? rows[0] : null).catch(() => null),
      adapter.fetchCompanyOverview(symbol, 'vi').catch(() => null),
      adapter.fetchFinancialReport({ symbol, period: 'quarter', reportKey: 'Chỉ tiêu cân đối kế toán' }).catch(() => null),
      adapter.fetchFinancialReport({ symbol, period: 'quarter', reportKey: 'Chỉ tiêu kết quả kinh doanh' }).catch(() => null),
      adapter.fetchFinancialReport({ symbol, period: 'quarter', reportKey: 'Chỉ tiêu lưu chuyển tiền tệ' }).catch(() => null),
    ]);
    const listingInfo = overview && overview.CompanyListingInfo ? overview.CompanyListingInfo : {};
    const profile = {
      issuedShares: listingInfo.issueShare,
      profile: listingInfo.companyProfile || listingInfo.en_CompanyProfile || '',
      industry: listingInfo.icbName || listingInfo.industry || listingInfo.industryName,
    };

    const bsRows = balanceSheet && balanceSheet.data && Array.isArray(balanceSheet.data.years) ? balanceSheet.data.years : [];
    const isRows = incomeStatement && incomeStatement.data && Array.isArray(incomeStatement.data.years) ? incomeStatement.data.years : [];
    const cfRows = cashFlow && cashFlow.data && Array.isArray(cashFlow.data.years) ? cashFlow.data.years : [];
    const cur = latest(bsRows) || {};
    const prev = previous(bsRows) || {};
    const curIncome = latest(isRows) || {};
    const prevIncome = previous(isRows) || {};
    const curCashFlow = latest(cfRows) || {};
    const issuedShares = num(profile && profile.issuedShares) || num(overview && overview.CompanyListingInfo && overview.CompanyListingInfo.issueShare);
    const marketPrice = currentPrice || num(priceBoard && priceBoard.price) || ratio(num(overview && overview.TickerPriceInfo && overview.TickerPriceInfo.matchPrice), 1000);
    const marketCapBn = marketPrice != null && issuedShares ? (marketPrice * 1000 * issuedShares) / 1e9 : null;

    const totalAssets = num(cur.bsa53);
    const liabilities = num(cur.bsa54);
    const equity = num(cur.bsa78);
    const currentAssets = num(cur.bsa1);
    const currentLiabilities = num(cur.bsa55);
    const cash = num(cur.bsa2);
    const inventory = num(cur.bsa15);
    const revenue = num(curIncome.isa3);
    const grossProfit = num(curIncome.isa5);
    const operatingProfit = num(curIncome.isa11);
    const netProfit = num(curIncome.isa20);
    const parentProfit = num(curIncome.isa22) || netProfit;
    const eps = num(curIncome.isa23);
    const cfo = num(curCashFlow.cfa18);
    const freeCashFlowApprox = cfo != null && num(curCashFlow.cfa21) != null ? cfo + num(curCashFlow.cfa21) : null;
    const debtToEquity = ratio(liabilities, equity);
    const currentRatio = ratio(currentAssets, currentLiabilities);
    const cashToDebt = ratio(cash, liabilities);
    const assetGrowth = pct(totalAssets, prev.bsa53);
    const equityGrowth = pct(equity, prev.bsa78);
    const revenueGrowth = pct(revenue, prevIncome.isa3);
    const netProfitGrowth = pct(netProfit, prevIncome.isa20);
    const grossMargin = ratio(grossProfit, revenue);
    const netMargin = ratio(netProfit, revenue);
    const roe = ratio(parentProfit, equity);
    const roa = ratio(netProfit, totalAssets);
    const pe = eps && marketPrice ? (marketPrice * 1000) / eps : null;
    const pb = marketCapBn != null && equity != null ? marketCapBn / (equity / 1e9) : null;
    const pctFromSignal = signalPrice && marketPrice ? (String(signal).toLowerCase() === 'sell' ? ((signalPrice - marketPrice) / signalPrice) : ((marketPrice - signalPrice) / signalPrice)) * 100 : null;

    const priceInfo = overview && overview.TickerPriceInfo ? overview.TickerPriceInfo : {};
    const foreignNetVolume = num(req.query.foreignNetVolume);
    const verdict = makeVerdict({ signal, debtToEquity, currentRatio, cashToDebt, revenueGrowth, netProfitGrowth, roe, pe, pb, cfo, foreignNetVolume, pctFromSignal });

    const data = {
      symbol,
      companyName: view((priceBoard && priceBoard.companyName) || (profile && profile.profile ? profile.profile.split('(')[0].trim() : '')),
      exchange: view((priceBoard && priceBoard.exchange) || priceInfo.exchange),
      industry: view(profile && profile.industry),
      updatedAt: new Date().toISOString(),
      signal: { type: signal || null, signalPrice, currentPrice: marketPrice, pctFromSignal: fmt(pctFromSignal) },
      metrics: {
        marketCapBn: fmt(marketCapBn, 0),
        totalAssetsBn: fmt(totalAssets != null ? totalAssets / 1e9 : null, 0),
        liabilitiesBn: fmt(liabilities != null ? liabilities / 1e9 : null, 0),
        equityBn: fmt(equity != null ? equity / 1e9 : null, 0),
        currentRatio: fmt(currentRatio),
        debtToEquity: fmt(debtToEquity),
        cashToDebt: fmt(cashToDebt),
        inventoryToAssets: fmt(ratio(inventory, totalAssets)),
        assetGrowthPct: fmt(assetGrowth),
        equityGrowthPct: fmt(equityGrowth),
        revenueBn: fmt(revenue != null ? revenue / 1e9 : null, 0),
        netProfitBn: fmt(netProfit != null ? netProfit / 1e9 : null, 0),
        revenueGrowthPct: fmt(revenueGrowth),
        netProfitGrowthPct: fmt(netProfitGrowth),
        grossMarginPct: fmt(grossMargin != null ? grossMargin * 100 : null),
        netMarginPct: fmt(netMargin != null ? netMargin * 100 : null),
        roePct: fmt(roe != null ? roe * 100 : null),
        roaPct: fmt(roa != null ? roa * 100 : null),
        eps: fmt(eps, 0),
        pe: fmt(pe),
        pb: fmt(pb),
        cfoBn: fmt(cfo != null ? cfo / 1e9 : null, 0),
        freeCashFlowApproxBn: fmt(freeCashFlowApprox != null ? freeCashFlowApprox / 1e9 : null, 0),
        averageVolume2Week: num(priceInfo.averageMatchVolume2Week),
        foreignHoldingRoom: fmt(priceInfo.foreignHoldingRoom),
        foreignNetVolume,
      },
      checklist: [
        { criterion: 'Sức khỏe tài chính', detail: `Nợ/VCSH ${view(fmt(debtToEquity))}x · Thanh toán ngắn hạn ${view(fmt(currentRatio))}x`, rating: band(debtToEquity, v => v <= 1.2, v => v <= 2) },
        { criterion: 'Đệm thanh khoản', detail: `Tiền/Nợ phải trả ${view(fmt(cashToDebt))}x · Tiền ${view(fmt(cash != null ? cash / 1e9 : null, 0))} tỷ`, rating: band(cashToDebt, v => v >= 0.2, v => v >= 0.08) },
        { criterion: 'Động lực tăng trưởng', detail: `Doanh thu ${view(fmt(revenue != null ? revenue / 1e9 : null, 0))} tỷ (${view(fmt(revenueGrowth))}%) · LNST ${view(fmt(netProfit != null ? netProfit / 1e9 : null, 0))} tỷ (${view(fmt(netProfitGrowth))}%)`, rating: band(netProfitGrowth, v => v >= 10 && (revenueGrowth == null || revenueGrowth >= 0), v => v >= 0) },
        { criterion: 'Biên lợi nhuận & hiệu quả vốn', detail: `Biên gộp ${view(fmt(grossMargin != null ? grossMargin * 100 : null))}% · ROE ${view(fmt(roe != null ? roe * 100 : null))}% · ROA ${view(fmt(roa != null ? roa * 100 : null))}%`, rating: band(roe, v => v >= 0.15, v => v >= 0.08) },
        { criterion: 'Chất lượng dòng tiền', detail: `CFO ${view(fmt(cfo != null ? cfo / 1e9 : null, 0))} tỷ · FCF xấp xỉ ${view(fmt(freeCashFlowApprox != null ? freeCashFlowApprox / 1e9 : null, 0))} tỷ`, rating: band(cfo, v => v > 0, v => v >= -Math.max(1, Math.abs(netProfit || 0) * 0.25)) },
        { criterion: 'Quy mô & tăng trưởng tài sản', detail: `Tổng tài sản ${view(fmt(totalAssets != null ? totalAssets / 1e9 : null, 0))} tỷ · Tăng trưởng ${view(fmt(assetGrowth))}%`, rating: band(assetGrowth, v => v >= 8, v => v >= 0) },
        { criterion: 'Chất lượng vốn chủ', detail: `VCSH ${view(fmt(equity != null ? equity / 1e9 : null, 0))} tỷ · Tăng trưởng ${view(fmt(equityGrowth))}%`, rating: band(equityGrowth, v => v >= 8, v => v >= 0) },
        { criterion: 'Dòng tiền thị trường', detail: `KLGD TB 2 tuần ${view(num(priceInfo.averageMatchVolume2Week)?.toLocaleString('vi-VN'))} · NN ròng ${view(foreignNetVolume?.toLocaleString('vi-VN'))}`, rating: foreignNetVolume == null ? 'Cần bổ sung dữ liệu' : foreignNetVolume > 0 ? 'Đang gom ròng' : foreignNetVolume < 0 ? 'Đang bán ròng' : 'Trung lập' },
        { criterion: 'Định giá hiện tại', detail: `P/E ${view(fmt(pe))}x · P/B ${view(fmt(pb))}x · Vốn hóa ${view(fmt(marketCapBn, 0))} tỷ`, rating: pe == null && pb == null ? 'Cần bổ sung P/E ngành' : (pe != null && pe > 25) || (pb != null && pb > 4) ? 'Đang đắt' : 'Hợp lý / cần so ngành' },
      ],
      verdict,
      notes: [
        profile && profile.profile ? profile.profile.slice(0, 260) + (profile.profile.length > 260 ? '…' : '') : null,
        'Bộ lọc hiện dùng dữ liệu công khai từ vnstock-js và luật chấm điểm nội bộ; bước kế tiếp có thể gắn LLM thật để viết luận điểm sâu hơn.',
      ].filter(Boolean),
      news: Array.isArray(overview && overview.News) ? overview.News.slice(0, 4).map(n => ({ title: n.newsTitle || n.title, date: n.publicDate || n.createdAt || n.publishedAt })) : [],
      source: 'vnstock-js + buyorsell-signal',
    };

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(200).json({ ok: false, data: null, error: err && err.message ? err.message : 'ai_check_failed', source: 'vnstock-js' });
  }
};
