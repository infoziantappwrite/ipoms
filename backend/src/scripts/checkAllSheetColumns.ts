import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

async function main() {
  await connectDatabase();

  const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
  const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];

  for (let i = 0; i < wb.SheetNames.length; i++) {
    const sheetName = wb.SheetNames[i];
    const prop = sheetProps[i];
    const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
    if (isHidden) continue;

    const trimmed = sheetName.trim().toUpperCase();
    if (['POSITIVES', 'JD RECEIVED', 'TRACKER', 'SUMMARY'].includes(trimmed)) continue;

    const sheet = wb.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log(`\n--- Sheet [${i}]: "${sheetName}" ---`);
    console.log('Row 0 (Handled by):', JSON.stringify(json[0]?.slice(0, 6)));
    console.log('Row 1 (Headers):', JSON.stringify(json[1]?.slice(0, 11)));
    if (json.length > 2) {
      console.log('Row 2 (Sample):', JSON.stringify(json[2]?.slice(0, 11)));
    }
  }

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
