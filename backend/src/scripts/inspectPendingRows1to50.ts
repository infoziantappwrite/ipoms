import * as xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'C:\\Users\\admin\\Downloads\\Weekly.xlsx';
const wb = xlsx.readFile(filePath);
const sheet = wb.Sheets['PENDING'];
const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('=== FIRST 50 ROWS OF PENDING SHEET ===');
rawRows.slice(0, 50).forEach((r, idx) => {
  if (r.some(c => c !== '')) {
    console.log(`[Row ${idx + 1}]`, JSON.stringify(r));
  }
});
