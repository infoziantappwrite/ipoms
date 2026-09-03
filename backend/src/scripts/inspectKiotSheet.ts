import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';

const wb = xlsx.readFile(filePath);
const sheet = wb.Sheets['KIOT'];
const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('=== COMPLETE DUMP OF SHEET "KIOT" ===');
rows.forEach((row, idx) => {
  // Only print non-empty rows
  if (row.some(c => c !== '')) {
    console.log(`[Row ${idx + 1}]`, JSON.stringify(row));
  }
});
