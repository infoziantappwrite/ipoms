const XLSX = require('xlsx');

const filePath = "C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx";
const wb = XLSX.readFile(filePath);

console.log("Sheet names in workbook:", wb.SheetNames);

const sheetName = "KIOT";
const sheet = wb.Sheets[sheetName];

if (!sheet) {
  console.log(`Sheet "${sheetName}" not found!`);
  process.exit(1);
}

const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`\n--- Sheet "${sheetName}" has ${rawData.length} rows ---`);
rawData.forEach((row, i) => {
  const rowStr = row.filter(c => c !== '').map(String).join(' | ');
  if (rowStr.trim()) {
    console.log(`Row ${i + 1}: ${rowStr}`);
  }
});
