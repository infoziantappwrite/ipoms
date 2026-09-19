import * as XLSX from 'xlsx';

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  json.slice(2).forEach((r, idx) => {
    const rawCompany = String(r[3] || '').trim();
    const hasAny = r.some((c: any) => String(c || '').trim() !== '');
    if (!rawCompany && hasAny) {
      console.log(`Sheet [${sheetName}] Row ${idx + 3}:`, JSON.stringify(r));
    }
  });
});
