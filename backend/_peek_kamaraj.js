const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/admin/Downloads/September Tracker 2026.xlsx');
console.log('  exact sheet name check:');
wb.SheetNames.forEach(n => { if (/kamaraj/i.test(n)) console.log('    ' + JSON.stringify(n)); });

const ws = wb.Sheets['KAMARAJ'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
let shown = 0;
rows.forEach((r, i) => {
  const cells = r.map(c => String(c).trim());
  if (cells.some(c => c !== '') && shown < 20) {
    console.log('  r' + String(i + 1).padStart(3) + ': ' + cells.map(c => c.slice(0, 20)).join(' | '));
    shown++;
  }
});
console.log('\n  total non-empty rows: ' + rows.filter(r => r.some(c => String(c).trim() !== '')).length);
