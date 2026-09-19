import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

async function main() {
  await connectDatabase();

  const colleges = await College.find({ is_deleted: { $ne: true } }).lean();
  const collegeMap = new Map<string, any>();
  colleges.forEach(c => {
    collegeMap.set(c.college_code.trim().toUpperCase(), c);
    collegeMap.set(c.college_name.trim().toUpperCase(), c);
  });

  const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
  const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];

  console.log(`\nWorkbook contains ${wb.SheetNames.length} sheets.`);

  for (let i = 0; i < wb.SheetNames.length; i++) {
    const sheetName = wb.SheetNames[i];
    const prop = sheetProps[i];
    const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);

    const sheet = wb.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const trimmedSheet = sheetName.trim().toUpperCase();
    const matchedCollege = collegeMap.get(trimmedSheet);

    const nonBlankRows = json.slice(2).filter((r: any[]) => r.some(c => String(c || '').trim() !== ''));

    console.log(`\n[Sheet ${i + 1}] "${sheetName}" -> Hidden: ${isHidden ? 'YES' : 'NO'}, Matched College: ${matchedCollege ? matchedCollege.college_code + ' (' + matchedCollege.college_name + ')' : 'NONE'}, Non-blank data rows: ${nonBlankRows.length}`);
    if (json.length > 0) {
      console.log(`  Row 0: ${JSON.stringify(json[0]?.slice(0, 5))}`);
    }
    if (json.length > 1) {
      console.log(`  Row 1: ${JSON.stringify(json[1]?.slice(0, 8))}`);
    }
    if (nonBlankRows.length > 0) {
      console.log(`  Sample Row: ${JSON.stringify(nonBlankRows[0]?.slice(0, 8))}`);
    }
  }

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
