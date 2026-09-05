import * as xlsx from 'xlsx';

const excelPath = 'C:\\Users\\admin\\Downloads\\September Tracker.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: true });

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n📄 Sheet: "${name}" (${rows.length} rows)`);
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    console.log(`  Row ${i + 1}:`, JSON.stringify(rows[i]));
  }
}
