import * as XLSX from 'xlsx';

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

const wb = XLSX.readFile(FILE_PATH, { cellDates: false, raw: true });
const wbDates = XLSX.readFile(FILE_PATH, { cellDates: true });

console.log('=== RAW (cellDates: false) vs PARSED (cellDates: true) ===');

['ACET', 'KAMARAJ', 'NGP', 'KLU'].forEach(sheetName => {
  const sRaw = wb.Sheets[sheetName];
  const sDate = wbDates.Sheets[sheetName];
  if (!sRaw) return;

  const rawJson: any[] = XLSX.utils.sheet_to_json(sRaw, { header: 1, defval: '' });
  const dateJson: any[] = XLSX.utils.sheet_to_json(sDate, { header: 1, defval: '' });

  console.log(`\n--- Sheet ${sheetName} ---`);
  for (let r = 2; r < Math.min(7, rawJson.length); r++) {
    console.log(`Row ${r + 1}:`);
    console.log('  Raw Date col (col 1):', JSON.stringify(rawJson[r][1]), 'Type:', typeof rawJson[r][1]);
    console.log('  DateObj Date col (col 1):', JSON.stringify(dateJson[r][1]), 'Type:', typeof dateJson[r][1]);
    console.log('  Raw Time col (col 2):', JSON.stringify(rawJson[r][2]), 'Type:', typeof rawJson[r][2]);
    console.log('  DateObj Time col (col 2):', JSON.stringify(dateJson[r][2]), 'Type:', typeof dateJson[r][2]);
  }
});
