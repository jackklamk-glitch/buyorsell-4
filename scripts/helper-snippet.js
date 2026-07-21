    function sum(arr, fn){ return arr.reduce((a,x)=>a+(Number(fn(x))||0),0); }
    function avg(arr, fn){ return arr.length ? sum(arr, fn)/arr.length : 0; }
    function pct(n,d){ return d ? Math.round((n/d)*100) : 0; }
    function compactNumber(v){ const n=Number(v)||0; if(Math.abs(n)>=1e9) return (n/1e9).toFixed(1)+'B'; if(Math.abs(n)>=1e6) return (n/1e6).toFixed(1)+'M'; if(Math.abs(n)>=1e3) return (n/1e3).toFixed(1)+'K'; return fmt(n); }
    function strongest(){ return [...rows].sort((a,b)=>(b.bosScore||0)-(a.bosScore||0))[0]; }
    function weakest(){ return [...rows].sort((a,b)=>(a.bosScore||0)-(b.bosScore||0))[0]; }
    function renderVnstockSections(meta={}){
      const total = rows.length || 1;
      const buys = rows.filter(r=>r.signal==='BUY');
      const sells = rows.filter(r=>r.signal==='SELL');
      const bullish = rows.filter(r=>r.ta?.stance==='BULLISH');
      const bearish = rows.filter(r=>r.ta?.stance==='BEARISH');
      const newsCount = sum(rows, r => (r.news||[]).length);
      const volume = sum(rows, r => r.live?.totalVolume);
      const foreign = sum(rows, r => r.live?.foreignNetVolume);
      const avgScore = Math.round(avg(rows, r=>r.bosScore));
      const avgConfidence = Math.round(avg(rows, r=>r.aiConfidence));
      const top = strongest();
      const risk = weakest();
      const gainers = rows.filter(r => (r.performance?.pct||0) > 0).length;
      const pnlAvg = avg(rows, r=>r.performance?.pct);
      $('liquidityMetric').textContent = compactNumber(volume);
      $('architectureData').innerHTML = [
        ['Market OS', `${total} tín hiệu active · ${pct(buys.length,total)}% Buy / ${pct(sells.length,total)}% Sell`, 'vnstock_data + live price + signal sheet'],
        ['Research OS', `${newsCount} news items · ${bullish.length} bullish TA · ${bearish.length} bearish TA`, 'vnstock_news + vnstock_ta'],
        ['Company OS', `Top: ${top?.symbol||'-'} · Risk: ${risk?.symbol||'-'}`, 'AI double-check + financial metrics'],
        ['Deal OS', `${rows.filter(r=>(r.bosScore||0)>=58).length} mã vào review queue`, 'BOS Score → DD workflow'],
        ['Portfolio OS', `Avg signal P/L ${fmt(pnlAvg,'%')} · ${gainers}/${total} vị thế đang đúng hướng`, 'Realtime P/L model'],
        ['Capital OS', `Holdings model ${total} mã · confidence ${avgConfidence}%`, 'Fund/SPV dashboard foundation'],
        ['AI OS', `Copilot ưu tiên ${top?.symbol||'-'} và cảnh báo ${risk?.symbol||'-'}`, 'Compare · Risk · Exit Timing']
      ].map(([h,p,s])=>`<article class="os-card"><h3>${h}</h3><p class="muted">${p}</p><div class="tags"><span class="tag">${s}</span><span class="tag">Live from Vnstock</span></div></article>`).join('');
      $('marketData').innerHTML = [
        ['Signal Breadth', `${buys.length} Buy / ${sells.length} Sell`, `Buy ratio ${pct(buys.length,total)}%`],
        ['TA Rotation', `${bullish.length} bullish · ${bearish.length} bearish`, `Avg BOS ${avgScore}/100`],
        ['Liquidity Pulse', compactNumber(volume), `Foreign net ${fmt(foreign)}`]
      ].map(([h,b,p])=>`<article class="os-card"><h3>${h}</h3><p class="muted"><b style="color:var(--text)">${b}</b><br>${p}</p></article>`).join('');
      $('researchData').innerHTML = [top, risk].filter(Boolean).map(r=>`<article class="os-card"><h3>${r.symbol} Research Brief</h3><p class="muted">Signal ${r.signal} · BOS ${r.bosScore}/100 · TA ${r.ta?.stance||'n/a'} · RSI ${fmt(r.ta?.rsi14)} · news ${(r.news||[]).length}.</p><div class="tags"><span class="tag">${r.verdict}</span><span class="tag">${r.live?.companyName||r.symbol}</span></div></article>`).join('');
      $('companyData').innerHTML = [top, risk, rows.find(r=>r.news?.length)].filter(Boolean).slice(0,4).map((r,i)=>`<div class="step"><i>${i+1}</i><b>${r.symbol} · ${r.live?.companyName||'Company profile'}</b><p class="muted">Live ${fmt(r.livePrice)} · foreign ${fmt(r.live?.foreignNetVolume)} · verdict ${r.verdict}.</p></div>`).join('');
      $('methodologyData').innerHTML = [
        ['Signal', `${buys.length} Buy / ${sells.length} Sell`, 'Tín hiệu gốc từ sheet hiện có.'],
        ['Market Data', `Volume ${compactNumber(volume)} · NN ròng ${fmt(foreign)}`, 'Live price, volume, foreign flow.'],
        ['Technical', `Bullish ${bullish.length} · Bearish ${bearish.length}`, 'RSI, EMA20, SMA50, MACD từ vnstock_ta.'],
        ['Confidence', `Avg AI Confidence ${avgConfidence}%`, 'BOS Score + news + double-check.']
      ].map(([h,b,p],i)=>`<div class="step"><i>${i+1}</i><b>${h}: ${b}</b><p class="muted">${p}</p></div>`).join('');
      $('portfolioData').innerHTML = [
        ['Signal NAV', `${fmt(pnlAvg,'%')}`, 'P/L trung bình từ giá tín hiệu đến live price.'],
        ['Exposure', `${pct(buys.length,total)}% Buy`, `${pct(sells.length,total)}% Sell / hedge signals.`],
        ['Risk Queue', `${rows.filter(r=>(r.bosScore||0)<42).length} mã`, 'BOS thấp hoặc TA bearish.'],
        ['Review Queue', `${rows.filter(r=>(r.bosScore||0)>=58).length} mã`, 'Ưu tiên double-check.']
      ].map(([l,b,s])=>`<div class="metric"><label>${l}</label><strong>${b}</strong><small class="muted">${s}</small></div>`).join('');
      $('capitalData').innerHTML = [
        ['Private Fund Snapshot', `Model holdings: ${total} · Avg BOS ${avgScore}`, 'AUM/NAV/IRR layer sẽ dùng cùng signal intelligence.'],
        ['SPV Screening', `Candidate: ${top?.symbol||'-'}`, 'Điểm cao nhất được đưa vào queue thẩm định.'],
        ['Monthly Report', `${new Date(meta.fetchedAt||Date.now()).toLocaleString('vi-VN')}`, 'Freshness và provenance tự động từ pipeline.']
      ].map(([h,b,p])=>`<article class="os-card"><h3>${h}</h3><p class="muted"><b style="color:var(--text)">${b}</b><br>${p}</p></article>`).join('');
      $('aiCopilotData').innerHTML = [
        ['Compare', `So sánh ${top?.symbol||'-'} với ${risk?.symbol||'-'} theo BOS/TA/news.`],
        ['Find Opportunity', `Ưu tiên ${top?.symbol||'-'} nếu double-check nền tảng không xung đột.`],
        ['Portfolio Review', `Kiểm tra ${risk?.symbol||'-'} vì BOS thấp/rủi ro cao.`],
        ['Exit Timing', `Dùng RSI/MACD/live P/L để xác nhận chốt lời/cắt lỗ.`]
      ].map(([h,p],i)=>`<div class="step"><i>${i+1}</i><b>${h}</b><p class="muted">${p}</p></div>`).join('');
      $('dealData').innerHTML = [
        ['Discovery', `${top?.symbol||'-'} vào opportunity queue.`],
        ['Due Diligence', 'Mở AI double-check để lấy ROE, P/E, P/B, CFO, nợ/VCSH.'],
        ['Approval', `Nếu BOS > 58 và nền tảng đồng thuận, chuyển sang review.`],
        ['Settlement', 'Theo dõi P/L, holding days, exit signal sau khi quyết định.']
      ].map(([h,p],i)=>`<div class="step"><i>${i+1}</i><b>${h}</b><p class="muted">${p}</p></div>`).join('');
      $('complianceData').innerHTML = [
        ['Data Provenance', (meta.source||[]).join(' · ') || 'Vnstock + signal sheet'],
        ['Freshness', meta.fetchedAt ? new Date(meta.fetchedAt).toLocaleString('vi-VN') : 'Live request'],
        ['Risk Notice', 'Dữ liệu có thể trễ/lỗi upstream; nội dung không phải khuyến nghị đầu tư cá nhân.']
      ].map(([h,p])=>`<article class="os-card"><h3>${h}</h3><p class="muted">${p}</p></article>`).join('');
    }
