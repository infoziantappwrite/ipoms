const xlsx = require('xlsx');
const path = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';

try {
  const workbook = xlsx.readFile(path);
  console.log('Sheet Names in Workbook:');
  console.log(workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\n========================================`);
    console.log(`Sheet: "${sheetName}" (Rows: ${data.length})`);
    console.log(`========================================`);
    // Print first 15 rows to inspect structure
    for (let i = 0; i < Math.min(data.length, 15); i++) {
      console.log(`Row ${i + 1}:`, JSON.stringify(data[i]));
    }
  }
} catch (err) {
  console.error('Error reading Excel file:', err);
}
