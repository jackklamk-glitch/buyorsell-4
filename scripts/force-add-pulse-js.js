const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');
if (!s.includes('function pulseState(')) {
  const fn = `function pulseState(avgBos, vol, foreign, buy, sell, topRow, riskRow){
  const privateMarket = avgBos>=58?'🟢 Bullish':avgBos>=45?'🟡 Neutral':'🔴 Defensive';
  const liquidity = vol>5000000?'🟢 Increasing':vol>1500000?'🟡 Normal':'🔴 Thin';
  const valuation = avgBos>=62?'🟡 Neutral-High':avgBos>=42?'🟡 Neutral':'🟢 Attractive / reset';
  const fundraising = buy>=sell?'🟢 Strong':'🟡 Selective';
  const ma = sell>buy*1.5?'🔴 Slowing':'🟡 Selective';
  const sectorsFocus = [topRow?sectorFor(topRow,rows.indexOf(topRow)):null, riskRow?sectorFor(riskRow,rows.indexOf(riskRow)):null, 'Healthcare'].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3).join(', ');
  const summary = \`Trong 24 giờ qua dòng tiền đang tập trung vào \${sectorsFocus||'các nhóm có BOS cao'}, với \${buy} tín hiệu BUY và \${sell} tín hiệu SELL. \${topRow?topRow.symbol+' là mã cần đọc đầu tiên; ':''}\${riskRow?riskRow.symbol+' nằm trong risk queue cần theo dõi.':''}\`;
  return {privateMarket, liquidity, valuation, fundraising, ma, summary};
}
function renderMarketPulse(meta={}){const buy=rows.filter(r=>r.signal==='BUY').length, sell=rows.filter(r=>r.signal==='SELL').length, avgBos=Math.round(avg(rows,r=>r.bosScore)); const vol=sum(rows,r=>r.live?.totalVolume); const foreign=sum(rows,r=>r.live?.foreignNetVolume); const st=pulseState(avgBos,vol,foreign,buy,sell,top(),risk()); $('pulseFresh').textContent=freshText(meta.fetchedAt); $('pulsePrivate').textContent=st.privateMarket; $('pulseLiquidity').textContent=st.liquidity; $('pulseValuation').textContent=st.valuation; $('pulseFundraising').textContent=st.fundraising; $('pulseMA').textContent=st.ma; $('pulseSummary').textContent=st.summary;}
`;
  s = s.replace('function renderHero(meta={})', fn + 'function renderHero(meta={})');
}
s = s.replace('function renderAll(meta={}){renderHero(meta);', 'function renderAll(meta={}){renderMarketPulse(meta); renderHero(meta);');
fs.writeFileSync('index.html', s);
console.log({ pulseJs: s.includes('function renderMarketPulse'), renderAll: s.includes('renderMarketPulse(meta)') });
