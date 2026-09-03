import * as xlsx from 'xlsx';
import path from 'path';

const filePath = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  console.log('📊 Total Sheets:', workbook.SheetNames.length);
  console.log('📋 Sheet Names:', workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\n======================================================`);
    console.log(`Sheet: "${sheetName}" | Total Rows: ${data.length}`);
    console.log(`======================================================`);
    for (let i = 0; i < Math.min(data.length, 25); i++) {
      if (data[i].some((cell: any) => cell !== '')) {
        console.log(`Row ${i + 1}:`, JSON.stringify(data[i]));
      }
    }
  }
} catch (err) {
  console.error('Error reading workbook:', err);
}
