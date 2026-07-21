const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8');

const start = html.indexOf('    async function renderDetail(r){');
const end = html.indexOf('    async function load(){', start);
if (start < 0 || end < 0) throw new Error('Cannot locate renderDetail block');

const replacement = `    function aiCheckUrl(r){
      const params = new URLSearchParams({
        symbol: r.symbol || '',
        signal: r.signal || '',
        signalPrice: r.signalPrice ?? '',
        currentPrice: r.livePrice ?? ''
      });
      return '/api/ai-check?' + params.toString();
    }
    function renderAiCheckBlock(data){
      const m = data.metrics || {};
      const verdict = data.verdict || {};
      const checklist = (data.checklist || []).slice(0, 5).map(item => \`<div class="cell"><span>\${item.criterion}</span><b>\${item.rating}</b><p class="muted" style="margin:6px 0 0;font-size:12px;line-height:1.45">\${item.detail}</p></div>\`).join('');
      return \`<div class="detail-grid"><div class="cell"><span>AI Verdict</span><b>\${verdict.label || 'Trung lập'}</b></div><div class="cell"><span>ROE</span><b>\${fmt(m.roePct,'%')}</b></div><div class="cell"><span>P/E · P/B</span><b>\${fmt(m.pe)}x · \${fmt(m.pb)}x</b></div><div class="cell"><span>Nợ/VCSH</span><b>\${fmt(m.debtToEquity)}x</b></div><div class="cell"><span>CFO</span><b>\${fmt(m.cfoBn)} tỷ</b></div><div class="cell"><span>Vốn hóa</span><b>\${fmt(m.marketCapBn)} tỷ</b></div></div><div class="empty" style="margin-top:10px"><b>Hành động gợi ý:</b><br>\${verdict.action || 'Cần thêm dữ liệu để kết luận.'}</div><div class="detail-grid">\${checklist}</div>\`;
    }
    async function renderDetail(r){
      selected=r; renderList(); if(!r){return}
      $('detailPanel').innerHTML=\`<span class="pill">\${r.symbol} · AI Confidence \${fmt(r.aiConfidence,'%')}</span><h3>\${r.live?.companyName||r.symbol}</h3><p class="muted">\${r.verdict||''} · nguồn: Vnstock_pipeline, vnstock_data, vnstock_ta, vnstock_news và tín hiệu Buy/Sell hiện có.</p><div class="detail-grid"><div class="cell"><span>Signal</span><b>\${r.signal}</b></div><div class="cell"><span>BOS Score</span><b>\${fmt(r.bosScore)}/100</b></div><div class="cell"><span>Live price</span><b>\${fmt(r.livePrice)}</b></div><div class="cell"><span>P/L từ tín hiệu</span><b>\${fmt(r.performance?.pct,'%')}</b></div><div class="cell"><span>RSI 14</span><b>\${fmt(r.ta?.rsi14)}</b></div><div class="cell"><span>MACD hist</span><b>\${fmt(r.ta?.macdHistogram)}</b></div><div class="cell"><span>EMA20 / SMA50</span><b>\${fmt(r.ta?.ema20)} / \${fmt(r.ta?.sma50)}</b></div><div class="cell"><span>NN ròng</span><b>\${fmt(r.live?.foreignNetVolume)}</b></div></div><div class="news">\${(r.news||[]).length?r.news.map(n=>\`<div>\${n.date||''} · \${n.title||''}</div>\`).join(''):'<div>Chưa có news trả về cho mã này.</div>'}</div><div id="aiCheckBox" class="empty" style="margin-top:12px">Đang tải AI double-check trong app...</div>\`;
      try{
        const res=await fetch(aiCheckUrl(r));
        const j=await res.json();
        if(!res.ok || !j || !j.ok || !j.data) throw new Error(j?.error || 'Không lấy được double-check');
        $('aiCheckBox').className='';
        $('aiCheckBox').innerHTML=renderAiCheckBlock(j.data);
      }catch(e){
        $('aiCheckBox').className='empty';
        $('aiCheckBox').innerHTML=\`AI double-check chưa tải được cho \${r.symbol}: \${e.message}. Các chỉ số tín hiệu phía trên vẫn dùng được; thử Refresh pipeline hoặc chọn mã khác.\`;
      }
    }
    async function analyzeStandaloneSymbol(sym){
      const symbol = String(sym || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
      if(!symbol) return;
      selected = null;
      $('detailPanel').innerHTML=\`<span class="pill">\${symbol} · AI Double-check</span><h3>Đang phân tích \${symbol}</h3><div class="empty">Đang lấy dữ liệu từ /api/ai-check...</div>\`;
      try{
        const res=await fetch('/api/ai-check?symbol=' + encodeURIComponent(symbol));
        const j=await res.json();
        if(!res.ok || !j || !j.ok || !j.data) throw new Error(j?.error || 'Không phân tích được mã này');
        $('detailPanel').innerHTML=\`<span class="pill">\${symbol} · AI Double-check</span><h3>\${j.data.companyName || symbol}</h3>\${renderAiCheckBlock(j.data)}\`;
      }catch(e){
        $('detailPanel').innerHTML=\`<span class="pill">\${symbol} · AI Double-check</span><h3>Chưa phân tích được</h3><div class="empty">\${e.message}</div>\`;
      }
    }
`;

html = html.slice(0, start) + replacement + html.slice(end);
html = html.replace("if(r) renderDetail(r); else if(sym) window.open('/api/ai-check?symbol='+encodeURIComponent(sym),'_blank');", "if(r) renderDetail(r); else if(sym) analyzeStandaloneSymbol(sym);");
html = html.replace('Mở AI double-check JSON', 'AI double-check');
fs.writeFileSync(p, html, 'utf8');
