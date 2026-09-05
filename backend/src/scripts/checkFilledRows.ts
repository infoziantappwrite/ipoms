import * as xlsx from 'xlsx';

const excelPath = 'C:\\Users\\admin\\Downloads\\September Tracker.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: true });

for (const name of ['PSNA', 'NEHRU', 'HITS', 'SONA', 'AIHT', 'KPR']) {
  const sheet = wb.Sheets[name];
  if (!sheet) continue;
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const filledRows = rows.map((r, i) => ({ i: i + 1, r })).filter(({ i, r }) => i > 2 && r.some((c) => String(c).trim().length > 0));
  console.log(`Sheet "${name}": Total non-empty data rows below header = ${filledRows.length}`);
  if (filledRows.length > 0) {
    console.log(`  First 3 filled:`, JSON.stringify(filledRows.slice(0, 3)));
  }
}
