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
  console.log(`Database Active Colleges (${colleges.length}):`);
  colleges.forEach(c => console.log(` - [${c.college_code}] ${c.college_name} (_id: ${c._id})`));

  const users = await User.find({ is_active: { $ne: false } }).select('full_name official_email role_codes').lean();
  console.log(`\nActive Users (${users.length}):`);
  users.forEach(u => console.log(` - ${u.full_name} (${u.official_email}, roles: ${u.role_codes?.join(', ')})`));

  const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
  console.log(`\nWorkbook Sheet Names (${wb.SheetNames.length}):`);
  
  const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];

  wb.SheetNames.forEach((name, idx) => {
    const prop = sheetProps[idx];
    const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
    const sheet = wb.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const rowCount = range.e.r - range.s.r + 1;
    console.log(` [${idx + 1}] "${name}" -> Hidden: ${isHidden ? 'YES (' + prop.Hidden + ')' : 'NO'}, Rows: ${rowCount}`);
  });

  // Pick first college sheet to inspect structure
  for (const name of wb.SheetNames) {
    if (name.toUpperCase().includes('POSITIVE') || name.toUpperCase().includes('JD') || name.toUpperCase().includes('SUMMARY')) continue;
    console.log(`\n--- Inspecting First 10 Rows of Sheet: "${name}" ---`);
    const sheet = wb.Sheets[name];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    for (let r = 0; r < Math.min(10, json.length); r++) {
      console.log(`Row ${r}:`, JSON.stringify(json[r]));
    }
    break;
  }

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
