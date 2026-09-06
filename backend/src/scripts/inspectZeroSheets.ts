import * as xlsx from 'xlsx';

const excelPath = 'C:\\Users\\admin\\Downloads\\September Tracker.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: true });

for (const name of ['PSNA', 'NEHRU', 'HITS', 'SONA', 'AIHT', 'KPR']) {
  const sheet = wb.Sheets[name];
  if (!sheet) continue;
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n📄 Sheet: "${name}" (${rows.length} rows)`);
  rows.slice(0, 15).forEach((r, idx) => {
    if (r.some((c) => String(c).trim().length > 0)) {
      console.log(`  Row ${idx + 1}:`, JSON.stringify(r));
    }
  });
}
