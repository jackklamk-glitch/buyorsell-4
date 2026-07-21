const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const css = `
    .vnstock-terminal { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .source-stack { display:flex; gap:8px; flex-wrap:wrap; margin: 12px 0 0; }
    .source-badge { border:1px solid rgba(34,211,238,.25); background:rgba(34,211,238,.09); color:#cffafe; border-radius:999px; padding:7px 9px; font-size:11px; font-weight:900; letter-spacing:.04em; }
    .signal-os-head { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; flex-wrap:wrap; margin-bottom:14px; }
    .signal-os-actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .signal-os-actions input { color:var(--text); background:rgba(2,6,23,.58); border:1px solid var(--line); border-radius:12px; padding:12px; min-width:150px; outline:none; font-weight:850; text-transform:uppercase; }
    .signal-os-actions input:focus { border-color:rgba(34,211,238,.45); }
    .intelligence-strip { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:14px; }
    .intel-tile { border:1px solid var(--line); background:rgba(2,6,23,.28); border-radius:18px; padding:14px; }
    .intel-tile span { color:var(--muted); font-size:12px; font-weight:850; text-transform:uppercase; letter-spacing:.08em; }
    .intel-tile b { display:block; margin-top:8px; font-size:26px; letter-spacing:-.04em; }
    .signal-board { display:grid; grid-template-columns: 1.1fr .9fr; gap:14px; }
    .signal-list { display:grid; gap:10px; }
    .signal-card { border:1px solid var(--line); background:rgba(2,6,23,.32); border-radius:18px; padding:14px; display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:center; cursor:pointer; }
    .signal-card:hover { border-color:rgba(34,211,238,.38); transform:translateY(-1px); }
    .ticker-badge { width:52px; height:52px; border-radius:18px; display:grid; place-items:center; font-weight:950; background:rgba(59,130,246,.18); border:1px solid rgba(59,130,246,.25); }
    .ticker-badge.sell { background:rgba(239,68,68,.18); border-color:rgba(239,68,68,.25); }
    .signal-card h3 { margin:0 0 5px; font-size:18px; letter-spacing:-.03em; }
    .signal-card p { margin:0; color:var(--muted); line-height:1.45; font-size:13px; }
    .score-ring { width:58px; height:58px; border-radius:50%; display:grid; place-items:center; font-weight:950; background:conic-gradient(var(--cyan) calc(var(--score)*1%), rgba(148,163,184,.16) 0); position:relative; }
    .score-ring::after { content:""; position:absolute; inset:6px; border-radius:50%; background:#071024; }
    .score-ring span { position:relative; z-index:1; }
    .detail-panel { border:1px solid var(--line); background:rgba(2,6,23,.28); border-radius:20px; padding:16px; min-height:360px; }
    .detail-panel h3 { margin:0 0 8px; }
    .detail-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin:14px 0; }
    .detail-cell { border:1px solid var(--line); border-radius:14px; padding:11px; background:rgba(15,23,42,.48); }
    .detail-cell span { color:var(--muted); font-size:12px; display:block; margin-bottom:5px; }
    .detail-cell b { font-size:18px; }
    .news-list { display:grid; gap:8px; margin-top:10px; }
    .news-item { color:var(--muted); border-left:2px solid rgba(34,211,238,.45); padding-left:10px; font-size:13px; line-height:1.45; }
    .state-note { color:var(--muted); line-height:1.65; }
    @media (max-width: 980px) { .signal-board, .intelligence-strip { grid-template-columns:1fr; } .signal-card { grid-template-columns:auto 1fr; } .score-ring { grid-column:1 / -1; width:100%; height:42px; border-radius:14px; } .score-ring::after { inset:4px; border-radius:10px; } }
`;
html = html.replace('  </style>', css + '\n  </style>');
const section = `
    <section class="section vnstock-terminal" id="vnstock-os">
      <div class="panel">
        <div class="signal-os-head">
          <div>
            <span class="pill">Vnstock Signal OS · dữ liệu thật</span>
            <h2 style="margin-top:12px">Buy/Sell Intelligence Pipeline</h2>
            <p class="state-note">Áp dụng bộ tín hiệu Buy/Sell hiện có vào BuyOrSell 4.0, dùng Vnstock Pipeline để gom dữ liệu, TA, news và chấm BOS Score theo từng mã.</p>
            <div class="source-stack">
              <span class="source-badge">Vnstock_pipeline</span>
              <span class="source-badge">vnstock_data</span>
              <span class="source-badge">vnstock_ta</span>
              <span class="source-badge">vnstock_news</span>
              <span class="source-badge">Buy/Sell Signal Sheet</span>
            </div>
          </div>
          <div class="signal-os-actions">
            <input id="symbolProbe" placeholder="VD: FPT" maxlength="10" />
            <button class="btn secondary" type="button" id="probeBtn">Phân tích mã</button>
            <button class="btn" type="button" id="refreshSignalOs">Refresh pipeline</button>
          </div>
        </div>
        <div class="intelligence-strip" id="signalSummary">
          <div class="intel-tile"><span>Pipeline</span><b>Loading</b></div>
          <div class="intel-tile"><span>Buy</span><b>-</b></div>
          <div class="intel-tile"><span>Sell</span><b>-</b></div>
          <div class="intel-tile"><span>Avg BOS</span><b>-</b></div>
        </div>
        <div class="signal-board">
          <div class="signal-list" id="signalList"><div class="state-note">Đang tải pipeline Vnstock...</div></div>
          <aside class="detail-panel" id="signalDetail"><h3>Chọn một mã để xem intelligence card</h3><p class="state-note">Card sẽ hiển thị giá live, hiệu quả từ giá tín hiệu, RSI/MACD/EMA/SMA, confidence, verdict và news gần đây nếu có.</p></aside>
        </div>
      </div>
    </section>
`;
html = html.replace('    <section class="section" id="architecture">', section + '\n    <section class="section" id="architecture">');
const script = `
  <script>
    (function(){
      const fmt = (v, suffix = '') => v == null || Number.isNaN(Number(v)) ? '-' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + suffix;
      const els = {
        summary: document.getElementById('signalSummary'),
        list: document.getElementById('signalList'),
        detail: document.getElementById('signalDetail'),
        refresh: document.getElementById('refreshSignalOs'),
        probe: document.getElementById('probeBtn'),
        input: document.getElementById('symbolProbe')
      };
      let rows = [];
      function renderSummary(summary, ok){
        els.summary.innerHTML = [
          ['Pipeline', ok ? 'LIVE' : 'FAIL'],
          ['Buy', summary?.buy ?? '-'],
          ['Sell', summary?.sell ?? '-'],
          ['Avg BOS', summary?.avgBosScore != null ? summary.avgBosScore + '/100' : '-']
        ].map(([k,v]) => '<div class="intel-tile"><span>'+k+'</span><b>'+v+'</b></div>').join('');
      }
      function card(row){
        const type = String(row.signal || '').toLowerCase();
        return '<button class="signal-card" type="button" data-symbol="'+row.symbol+'">'
          + '<div class="ticker-badge '+type+'">'+row.symbol+'</div>'
          + '<div><h3>'+row.symbol+' · '+row.signal+' · '+(row.verdict || '')+'</h3><p>Giá tín hiệu '+fmt(row.signalPrice)+' · live '+fmt(row.livePrice)+' · hiệu quả '+fmt(row.performance?.pct, '%')+' · TA '+(row.ta?.stance || 'n/a')+'</p></div>'
          + '<div class="score-ring" style="--score:'+ (row.bosScore || 0) +'"><span>'+ (row.bosScore || '-') +'</span></div>'
          + '</button>';
      }
      function renderList(){
        els.list.innerHTML = rows.length ? rows.map(card).join('') : '<div class="state-note">Chưa có dữ liệu tín hiệu.</div>';
      }
      function renderDetail(row){
        if (!row) return;
        els.detail.innerHTML = '<span class="pill">'+row.symbol+' · AI Confidence '+fmt(row.aiConfidence, '%')+'</span>'
          + '<h3 style="margin-top:12px">'+(row.live?.companyName || row.symbol)+' </h3>'
          + '<p class="state-note">'+row.verdict+' · nguồn: Vnstock_pipeline, vnstock_data, vnstock_ta, vnstock_news và tín hiệu Buy/Sell hiện có.</p>'
          + '<div class="detail-grid">'
          + '<div class="detail-cell"><span>Signal</span><b>'+row.signal+'</b></div>'
          + '<div class="detail-cell"><span>BOS Score</span><b>'+fmt(row.bosScore)+'/100</b></div>'
          + '<div class="detail-cell"><span>Live price</span><b>'+fmt(row.livePrice)+'</b></div>'
          + '<div class="detail-cell"><span>P/L từ tín hiệu</span><b>'+fmt(row.performance?.pct, '%')+'</b></div>'
          + '<div class="detail-cell"><span>RSI 14</span><b>'+fmt(row.ta?.rsi14)+'</b></div>'
          + '<div class="detail-cell"><span>MACD hist</span><b>'+fmt(row.ta?.macdHistogram)+'</b></div>'
          + '<div class="detail-cell"><span>EMA20 / SMA50</span><b>'+fmt(row.ta?.ema20)+' / '+fmt(row.ta?.sma50)+'</b></div>'
          + '<div class="detail-cell"><span>NN ròng</span><b>'+fmt(row.live?.foreignNetVolume)+'</b></div>'
          + '</div>'
          + '<button class="btn secondary" type="button" onclick="window.open(\'/api/ai-check?symbol='+row.symbol+'&signal='+row.signal+'&signalPrice='+(row.signalPrice||'')+'&currentPrice='+(row.livePrice||'')+'\', \'_blank\')">Mở AI double-check JSON</button>'
          + '<div class="news-list">'+((row.news||[]).length ? row.news.map(n => '<div class="news-item">'+(n.date || '')+' · '+(n.title || '')+'</div>').join('') : '<div class="news-item">Chưa có news trả về cho mã này.</div>')+'</div>';
      }
      async function load(){
        els.list.innerHTML = '<div class="state-note">Đang chạy Vnstock_pipeline...</div>';
        try {
          const res = await fetch('/api/vnstock-signal-os?limit=10');
          const json = await res.json();
          if (!json.ok) throw new Error(json.error || 'pipeline failed');
          rows = json.data || [];
          renderSummary(json.summary, true); renderList(); renderDetail(rows[0]);
        } catch (err) {
          renderSummary(null, false);
          els.list.innerHTML = '<div class="state-note">Pipeline lỗi: '+err.message+'</div>';
        }
      }
      els.list?.addEventListener('click', (e) => { const btn = e.target.closest('[data-symbol]'); if (btn) renderDetail(rows.find(r => r.symbol === btn.dataset.symbol)); });
      els.refresh?.addEventListener('click', load);
      els.probe?.addEventListener('click', () => { const sym = (els.input.value || '').trim().toUpperCase(); const found = rows.find(r => r.symbol === sym); if (found) renderDetail(found); else if (sym) window.open('/api/ai-check?symbol='+encodeURIComponent(sym), '_blank'); });
      els.input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.probe.click(); });
      load();
    })();
  </script>
`;
html = html.replace('</body>', script + '\n</body>');
fs.writeFileSync(p, html, 'utf8');
