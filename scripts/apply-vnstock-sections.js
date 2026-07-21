const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8');
const sections = fs.readFileSync('scripts/section-snippet.html', 'utf8');
const helper = fs.readFileSync('scripts/helper-snippet.js', 'utf8');
function replaceBetween(startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Cannot locate range ${startMarker}`);
  html = html.slice(0, start) + replacement + html.slice(end);
}
replaceBetween('    <section class="section" id="architecture">', '    <section class="section" id="faq">', sections);
if (!html.includes('function renderVnstockSections(meta={})')) {
  const marker = '    function setSummary(json){';
  const pos = html.indexOf(marker);
  if (pos < 0) throw new Error('Cannot locate setSummary');
  html = html.slice(0, pos) + helper + html.slice(pos);
}
html = html.replace('setSummary(json); selected=rows[0]; renderList(); renderDetail(selected);', 'setSummary(json); renderVnstockSections(json); selected=rows[0]; renderList(); renderDetail(selected);');
fs.writeFileSync(p, html, 'utf8');
