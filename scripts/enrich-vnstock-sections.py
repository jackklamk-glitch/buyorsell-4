from pathlib import Path
p = Path('index.html')
html = p.read_text(encoding='utf-8')

def replace_between(start_marker, end_marker, replacement):
    global html
    start = html.find(start_marker)
    end = html.find(end_marker, start)
    if start < 0 or end < 0:
        raise RuntimeError(f'Cannot replace {start_marker}')
    html = html[:start] + replacement + html[end:]

dynamic_sections = r'''    <section class="section" id="architecture">
      <div class="section-title"><h2>Product Architecture</h2><p>Kiến trúc 4.0 được nuôi bởi cùng một pipeline dữ liệu: tín hiệu Buy/Sell, vnstock_data, vnstock_ta, vnstock_news và AI double-check.</p></div>
      <div class="os-grid" id="architectureData"><article class="os-card"><h3>Đang tải architecture intelligence...</h3><p class="muted">Pipeline sẽ tự điền dữ liệu vào 7 lớp OS.</p></article></div>
    </section>

    <section class="section" id="market">
      <div class="section-title"><h2>Market OS</h2><p>Market terminal dùng dữ liệu live/pipeline để hiển thị market breadth, signal mix, liquidity và smart-money pulse.</p></div>
      <div class="metric-grid"><div class="metric"><label>Deal Flow</label><strong id="dealFlowMetric">--</strong><small class="muted">Số mã/tín hiệu đang được pipeline xử lý.</small></div><div class="metric"><label>Liquidity</label><strong id="liquidityMetric">--</strong><small class="muted">Tổng khối lượng live từ dữ liệu thị trường.</small></div><div class="metric"><label>Smart Money</label><strong id="foreignMetric">--</strong><small class="muted">Dòng tiền ngoại ròng từ dữ liệu live.</small></div><div class="metric"><label>News Impact</label><strong id="newsMetric">--</strong><small class="muted">Tin tức liên quan từ vnstock_news.</small></div></div>
      <div class="panel" style="margin-top:12px"><div id="marketData" class="os-grid"><article class="os-card"><h3>Đang tải Market OS...</h3><p class="muted">Chờ Vnstock_pipeline.</p></article></div></div>
    </section>

    <section class="section" id="research"><div class="section-title"><h2>Research OS</h2><p>Mỗi research brief được tự sinh từ tín hiệu, TA, dòng tiền, news và double-check nền tảng.</p></div><div class="panel"><div id="researchBrief" class="empty">Research brief sẽ tự sinh sau khi pipeline tải xong.</div><div id="researchData" class="os-grid" style="margin-top:12px"></div></div></section>

    <section class="section" id="company"><div class="section-title"><h2>Company OS</h2><p>Company intelligence tự lấy mã nổi bật/rủi ro từ pipeline và mở rộng bằng AI double-check khi người dùng chọn mã.</p></div><div class="panel"><div id="companyData" class="workflow"><div class="step"><i>1</i><b>Đang tải Company OS</b><p class="muted">Chờ pipeline trả danh sách mã.</p></div></div></div></section>

    <section class="section" id="methodology">
      <div class="section-title"><h2>Decision Methodology</h2><p>Phương pháp chấm điểm hiển thị theo dữ liệu đang chạy, để người xem hiểu vì sao một mã được đánh dấu đồng thuận/rủi ro.</p></div>
      <div class="workflow" id="methodologyData"><div class="step"><i>1</i><b>Đang tải Methodology</b><p class="muted">Pipeline sẽ map score components.</p></div></div>
    </section>

    <section class="section" id="portfolio">
      <div class="section-title"><h2>Portfolio OS</h2><p>Portfolio view mô phỏng danh mục từ các tín hiệu đang active: exposure Buy/Sell, P/L realtime, drawdown/risk queue.</p></div>
      <div class="metric-grid" id="portfolioData"><div class="metric"><label>Portfolio NAV</label><strong>Loading</strong><small class="muted">Chờ pipeline.</small></div></div>
    </section>

    <section class="section" id="capital">
      <div class="section-title"><h2>Capital OS</h2><p>Capital layer dùng dữ liệu pipeline để tạo fund dashboard mẫu: AUM model, NAV pulse, holdings, monthly intelligence report.</p></div>
      <div class="os-grid" id="capitalData"><article class="os-card"><h3>Đang tải Capital OS...</h3><p class="muted">Chờ Vnstock data.</p></article></div>
    </section>

    <section class="section" id="ai-copilot">
      <div class="section-title"><h2>AI OS · Investment Copilot</h2><p>Copilot sinh câu hỏi/hành động trực tiếp từ dữ liệu vnstock thay vì prompt tĩnh.</p></div>
      <div class="workflow" id="aiCopilotData"><div class="step"><i>AI</i><b>Đang tải Copilot</b><p class="muted">Chờ pipeline.</p></div></div>
    </section>

    <section class="section" id="deal"><div class="section-title"><h2>Deal OS</h2><p>Deal workspace dùng cùng intelligence graph để chuyển tín hiệu thành quy trình review, DD, approval và settlement.</p></div><div class="workflow" id="dealData"><div class="step"><i>1</i><b>Đang tải Deal OS</b><p class="muted">Chờ pipeline.</p></div></div></section>

    <section class="section" id="compliance">
      <div class="section-title"><h2>Trust, Compliance & Risk</h2><p>Compliance layer tự công bố nguồn dữ liệu, freshness, trạng thái API và giới hạn sử dụng.</p></div>
      <div class="os-grid" id="complianceData"><article class="os-card"><h3>Đang tải Trust Layer...</h3><p class="muted">Chờ pipeline provenance.</p></article></div>
    </section>

'''

replace_between('    <section class="section" id="architecture">', '    <section class="section" id="faq">', dynamic_sections)

helper_insert = r'''
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
'''

if 'function renderVnstockSections(meta={})' not in html:
    marker = '    function setSummary(json){'
    pos = html.find(marker)
    if pos < 0:
        raise RuntimeError('No setSummary')
    html = html[:pos] + helper_insert + html[pos:]

html = html.replace('setSummary(json); selected=rows[0]; renderList(); renderDetail(selected);', 'setSummary(json); renderVnstockSections(json); selected=rows[0]; renderList(); renderDetail(selected);')
p.write_text(html, encoding='utf-8')
