from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
if '.pulse-top{' not in s:
    s=s.replace('.empty{border:1px dashed var(--line);border-radius:16px;padding:16px;color:var(--muted)}', '.empty{border:1px dashed var(--line);border-radius:16px;padding:16px;color:var(--muted)}.pulse-top{margin-top:18px;border:1px solid #22d3ee55;background:linear-gradient(180deg,#071426e8,#09111fe0);border-radius:24px;box-shadow:var(--shadow);overflow:hidden}.pulse-inner{padding:18px}.pulse-title{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:14px}.pulse-title b{font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#e0f2fe}.pulse-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.pulse-item{border:1px solid var(--line);background:#02061780;border-radius:16px;padding:12px}.pulse-item span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.09em;font-weight:900}.pulse-item b{display:block;margin-top:6px;font-size:20px}.pulse-summary{margin-top:14px;border-left:4px solid var(--cyan);background:#22d3ee12;border-radius:16px;padding:14px;color:#dbeafe}.pulse-summary span{display:block;color:var(--cyan);font-weight:950;text-transform:uppercase;letter-spacing:.1em;font-size:12px;margin-bottom:6px}')
if 'id="market-pulse-top"' not in s:
    pulse='''

    <section class="pulse-top" id="market-pulse-top">
      <div class="pulse-inner">
        <div class="pulse-title"><b>BUYORSELL MARKET PULSE</b><span class="pill" id="pulseFresh">Updated --</span></div>
        <div class="pulse-grid">
          <div class="pulse-item"><span>Private Market</span><b id="pulsePrivate">Loading</b></div>
          <div class="pulse-item"><span>Liquidity</span><b id="pulseLiquidity">--</b></div>
          <div class="pulse-item"><span>Valuation</span><b id="pulseValuation">--</b></div>
          <div class="pulse-item"><span>Fundraising</span><b id="pulseFundraising">--</b></div>
          <div class="pulse-item"><span>M&A</span><b id="pulseMA">--</b></div>
        </div>
        <div class="pulse-summary"><span>Today's AI Summary</span><div id="pulseSummary">Đang đọc dòng tiền, tín hiệu và sector rotation...</div></div>
      </div>
    </section>'''
    marker='    </nav>'
    idx=s.find(marker)
    if idx<0: raise SystemExit('nav marker not found')
    s=s[:idx+len(marker)]+pulse+s[idx+len(marker):]
if '@media(max-width:980px){.nav{display:none}.pulse-grid' not in s:
    s=s.replace('@media(max-width:980px){.nav{display:none}', '@media(max-width:980px){.nav{display:none}.pulse-grid{grid-template-columns:1fr}.pulse-title{display:block}.pulse-title .pill{margin-top:8px;display:inline-flex}')
p.write_text(s,encoding='utf-8')
