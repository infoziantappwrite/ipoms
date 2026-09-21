import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

async function main() {
  await connectDatabase();

  const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
  const sheet = wb.Sheets['ACET'];
  if (!sheet) {
    console.log('Sheet ACET not found');
    return;
  }

  const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Sheet ACET has ${json.length} rows.`);
  json.forEach((row, idx) => {
    const hasData = row.some((c: any) => String(c || '').trim() !== '');
    if (hasData) {
      console.log(`[Row ${idx}]`, JSON.stringify(row));
    }
  });

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
