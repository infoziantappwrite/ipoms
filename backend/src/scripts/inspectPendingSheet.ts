import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';
const wb = xlsx.readFile(filePath);
const sheet = wb.Sheets['PENDING'];

if (sheet) {
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`=== PENDING SHEET DUMP (${rows.length} rows) ===`);
  rows.forEach((r, idx) => {
    if (r.some(c => c !== '')) {
      console.log(`[Row ${idx + 1}]`, JSON.stringify(r));
    }
  });
} else {
  console.log('Sheet PENDING not found');
}
