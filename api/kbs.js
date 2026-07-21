const VCI_URL = 'https://trading.vietcap.com.vn/api/price/symbols/getList';

const VCI_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7',
  'Content-Type': 'application/json',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  DNT: '1',
  Origin: 'https://trading.vietcap.com.vn',
  Referer: 'https://trading.vietcap.com.vn/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function price(v) {
  const x = n(v);
  return x == null ? null : x / 1000;
}

function normalize(raw) {
  const listing = raw && raw.listingInfo ? raw.listingInfo : {};
  const match = raw && raw.matchPrice ? raw.matchPrice : {};
  const bidAsk = raw && raw.bidAsk ? raw.bidAsk : {};
  const symbol = String(listing.symbol || listing.ticker || '').toUpperCase();
  if (!symbol) return null;
  return {
    symbol,
    companyName: listing.organName || '',
    companyNameEn: listing.enOrganName || '',
    price: price(match.matchPrice),
    referencePrice: price(listing.refPrice),
    ceilingPrice: price(listing.ceiling),
    floorPrice: price(listing.floor),
    matchVolume: n(match.matchVol),
    totalVolume: n(match.accumulatedVolume),
    totalValue: n(match.accumulatedValue),
    averagePrice: price(match.avgMatchPrice),
    highestPrice: price(match.highest),
    lowestPrice: price(match.lowest),
    foreignBuyVolume: n(match.foreignBuyVolume),
    foreignSellVolume: n(match.foreignSellVolume),
    bidPrices: Array.isArray(bidAsk.bidPrices) ? bidAsk.bidPrices.map((b) => ({ price: price(b.price), volume: n(b.volume) })) : [],
    askPrices: Array.isArray(bidAsk.askPrices) ? bidAsk.askPrices.map((a) => ({ price: price(a.price), volume: n(a.volume) })) : [],
    exchange: listing.board || '',
    tradingDate: listing.tradingDate || null,
    receivedTime: match.receivedTime || bidAsk.receivedTime || listing.receivedTime || null,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=45');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const symbols = String(req.query.symbols || '')
    .split(',')
    .map((s) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 50);

  if (!symbols.length) {
    return res.status(200).json({ ok: true, source: 'vietcap-vnstock', count: 0, data: {} });
  }

  try {
    const upstream = await fetch(VCI_URL, {
      method: 'POST',
      headers: VCI_HEADERS,
      body: JSON.stringify({ symbols }),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(200).json({ ok: false, source: 'vietcap-vnstock', count: 0, requested: symbols.length, data: {}, error: `upstream_${upstream.status}`, detail: text.slice(0, 200), fetchedAt: new Date().toISOString() });
    }
    const rows = JSON.parse(text);
    const data = {};
    for (const raw of Array.isArray(rows) ? rows : []) {
      const row = normalize(raw);
      if (row) data[row.symbol] = row;
    }
    const missing = symbols.filter((s) => !data[s]);
    return res.status(200).json({
      ok: true,
      source: 'vietcap-vnstock',
      count: Object.keys(data).length,
      requested: symbols.length,
      data,
      errors: missing.length ? Object.fromEntries(missing.map((s) => [s, 'no_data'])) : undefined,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(200).json({ ok: false, source: 'vietcap-vnstock', count: 0, requested: symbols.length, data: {}, error: err && err.message ? err.message : 'fetch_failed', fetchedAt: new Date().toISOString() });
  }
};
