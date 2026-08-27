import * as xlsx from 'xlsx';
import path from 'path';

const filePath = 'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx';

function main() {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);

    workbook.SheetNames.forEach((sheetName) => {
      console.log(`\n========================================`);
      console.log(`SHEET: ${sheetName}`);
      console.log(`========================================`);
      const sheet = workbook.Sheets[sheetName];
      const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`Total Rows: ${data.length}`);
      
      // Print first 30 rows to see sections, headers, and layout
      data.slice(0, 35).forEach((row, idx) => {
        if (row && row.length > 0 && row.some((cell) => cell !== undefined && cell !== '')) {
          console.log(`Row ${idx + 1}:`, JSON.stringify(row));
        }
      });
    });
  } catch (err) {
    console.error('Error reading excel file:', err);
  }
}

main();
