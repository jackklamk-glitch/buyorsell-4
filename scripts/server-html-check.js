const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const before=s.slice(0,s.indexOf('<script>'));
const result={
  serverSignalCards:(before.match(/signal-card/g)||[]).length,
  serverHeat:(before.match(/class="heat /g)||[]).length,
  serverBrief:before.includes('Thị trường đang ở trạng thái'),
  serverResearch:(before.match(/research-card/g)||[]).length,
  serverCompanies:(before.match(/company-card/g)||[]).length,
  primaryPlaceholders:/Đang tải|Đang đọc|Đang tạo/.test(before)
};
result.ok=result.serverSignalCards>=20&&result.serverHeat>=6&&result.serverBrief&&result.serverResearch>=2&&result.serverCompanies>=2&&!result.primaryPlaceholders;
console.log(JSON.stringify(result,null,2));
if(!result.ok) process.exit(1);
