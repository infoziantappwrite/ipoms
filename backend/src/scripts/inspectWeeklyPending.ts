import * as xlsx from 'xlsx';
import fs from 'fs';

const candidatePaths = [
  'C:\\Users\\admin\\Downloads\\Weekly.xlsx',
  'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
  'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
];

const resolvedPath = candidatePaths.find(p => fs.existsSync(p));
console.log('Resolved Path:', resolvedPath);

if (resolvedPath) {
  const wb = xlsx.readFile(resolvedPath);
  console.log('Sheet Names:', wb.SheetNames);
  const pendingSheet = wb.Sheets['PENDING'];
  if (pendingSheet) {
    const rawRows: any[][] = xlsx.utils.sheet_to_json(pendingSheet, { header: 1, defval: '' });
    console.log(`\n=== PENDING SHEET ROW COUNT: ${rawRows.length} ===`);
    rawRows.forEach((r, idx) => {
      if (r.some(c => c !== '')) {
        console.log(`[Row ${idx + 1}]`, JSON.stringify(r));
      }
    });
  } else {
    console.log('Sheet PENDING not found in workbook!');
  }
} else {
  console.log('None of candidatePaths found!');
}
