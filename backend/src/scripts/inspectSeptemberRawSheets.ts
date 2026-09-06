import * as xlsx from 'xlsx';

const excelPath = 'C:\\Users\\admin\\Downloads\\September Tracker.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: true });

console.log('Sheets in workbook:', wb.SheetNames);

for (const sheetName of ['MCET', 'KAMARAJ', 'ACEW', 'Tracker', 'POSITIVES', 'JD RECEIVED']) {
  if (!wb.Sheets[sheetName]) continue;
  console.log(`\n===============================================================`);
  console.log(`🔍 SAMPLE ROWS FOR SHEET: "${sheetName}"`);
  console.log(`===============================================================`);
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  rows.slice(0, 12).forEach((r, idx) => {
    console.log(`Row ${idx + 1}:`, JSON.stringify(r));
  });
}
