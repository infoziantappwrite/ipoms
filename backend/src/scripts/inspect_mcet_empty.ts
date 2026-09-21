import * as XLSX from 'xlsx';

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });

const sheet = wb.Sheets['MCET'];
const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

json.forEach((r, idx) => {
  const c3 = String(r[3] || '').trim();
  const hasOther = r.some((c: any, colIdx: number) => colIdx !== 3 && String(c || '').trim() !== '');
  if (!c3 && hasOther) {
    console.log(`Row ${idx} has NO company name but has other cells:`, JSON.stringify(r));
  }
});
