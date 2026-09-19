import * as XLSX from 'xlsx';

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });

console.log('=== MEC Rows (First 10) ===');
const mecSheet = wb.Sheets['MEC'];
const mecJson: any[] = XLSX.utils.sheet_to_json(mecSheet, { header: 1, defval: '' });
mecJson.slice(0, 10).forEach((r, idx) => console.log(`[MEC Row ${idx}]`, JSON.stringify(r)));

console.log('\n=== KLU Rows (First 20) ===');
const kluSheet = wb.Sheets['KLU'];
const kluJson: any[] = XLSX.utils.sheet_to_json(kluSheet, { header: 1, defval: '' });
kluJson.slice(0, 20).forEach((r, idx) => console.log(`[KLU Row ${idx}]`, JSON.stringify(r)));
