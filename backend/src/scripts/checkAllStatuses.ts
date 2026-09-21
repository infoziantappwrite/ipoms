import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

async function main() {
  await connectDatabase();

  const colleges = await College.find({ is_deleted: { $ne: true } }).lean();
  const activeCodes = new Set(colleges.map(c => c.college_code.trim().toUpperCase()));

  const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
  const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];

  const allStatuses = new Map<string, number>();

  for (let i = 0; i < wb.SheetNames.length; i++) {
    const sheetName = wb.SheetNames[i];
    const prop = sheetProps[i];
    const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
    if (isHidden) continue;

    const trimmed = sheetName.trim().toUpperCase();
    if (['POSITIVES', 'JD RECEIVED', 'TRACKER', 'SUMMARY'].includes(trimmed)) continue;
    if (!activeCodes.has(trimmed)) {
      // Check if it matches any college code
      const found = Array.from(activeCodes).find(code => trimmed.includes(code) || code.includes(trimmed));
      if (!found) continue;
    }

    const sheet = wb.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    for (let r = 2; r < json.length; r++) {
      const row = json[r];
      // Column index for response status is usually column 7 (index 7)
      const rawStatus = String(row[7] || '').trim();
      if (rawStatus) {
        allStatuses.set(rawStatus, (allStatuses.get(rawStatus) || 0) + 1);
      }
    }
  }

  console.log('\n=== ALL UNIQUE RESPONSE STATUSES ACROSS ACTIVE COLLEGE SHEETS ===');
  const sorted = Array.from(allStatuses.entries()).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([status, count]) => {
    console.log(`"${status}": ${count}`);
  });

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
