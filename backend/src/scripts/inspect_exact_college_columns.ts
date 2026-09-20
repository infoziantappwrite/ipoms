import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = 'C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx';

const ELIGIBLE_SHEETS = [
  'MCET',
  'MEC',
  'ACET',
  'KAMARAJ',
  'NGP',
  'MAR EPHRAEM',
  'KIOT',
  'ACEW',
  'NPR',
  'KLU',
  'SMVEC',
  'DSU',
  'PSNA',
  'SONA',
];

async function main() {
  await connectDatabase();

  const allColleges = await College.find({ is_deleted: { $ne: true } }).lean();
  const allCoordinators = await User.find({ is_deleted: { $ne: true } }).lean();

  const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });

  const allStatusValues = new Set<string>();

  console.log('=== DETAILED INSPECTION OF 14 ELIGIBLE COLLEGE SHEETS ===\n');

  for (const sheetName of ELIGIBLE_SHEETS) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    // Find header row
    let headerRowIdx = -1;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r].map((v) => (v != null ? String(v).trim() : ''));
      const text = row.join(' ').toLowerCase();
      if (
        (text.includes('company') || text.includes('s.no') || text.includes('contact') || text.includes('mobile')) &&
        row.filter(Boolean).length >= 4
      ) {
        headerRowIdx = r;
        headers = row.map((h) => h.trim());
        break;
      }
    }

    // Match college in DB
    const college = allColleges.find((c: any) => {
      const cName = c.college_name.toLowerCase();
      const cCode = c.college_code.toLowerCase();
      const sName = sheetName.toLowerCase();
      return (
        sName === cName ||
        sName === cCode ||
        sName.includes(cCode) ||
        cName.includes(sName) ||
        sName.replace(/[^a-z0-9]/g, '') === cName.replace(/[^a-z0-9]/g, '')
      );
    });

    const assignedUser = allCoordinators.find((u: any) =>
      u.assigned_college_ids?.some((id: any) => String(id) === String(college?._id))
    );

    const validDataRows: any[] = [];
    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.every((c: any) => c == null || String(c).trim() === '')) continue;
      
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        if (h) rowObj[h] = row[idx] != null ? String(row[idx]).trim() : '';
      });

      // Find company name
      const compKey = headers.find((h) => /company/i.test(h)) || '';
      const compName = compKey ? String(rowObj[compKey] || '').trim() : '';

      // Skip date section headers like "01st September", "02nd September"
      if (!compName || /^\d+(st|nd|rd|th)?\s*(september|sep|august|aug)/i.test(compName)) {
        continue;
      }

      const statusKey = headers.find((h) => /status|response/i.test(h)) || '';
      const statusVal = statusKey ? String(rowObj[statusKey] || '').trim() : '';
      if (statusVal) allStatusValues.add(statusVal);

      validDataRows.push(rowObj);
    }

    console.log(`📌 [${sheetName}] ➔ College: "${college?.college_name || 'N/A'}" (${college?.college_code || 'N/A'})`);
    console.log(`   - Coordinator: ${assignedUser ? `${assignedUser.full_name} (@${assignedUser.username})` : '⚠️ None Assigned'}`);
    console.log(`   - Header Line ${headerRowIdx + 1}: [${headers.filter(Boolean).join(' | ')}]`);
    console.log(`   - Clean Data Rows: ${validDataRows.length}`);
    if (validDataRows.length > 0) {
      console.log(`   - Sample 1:`, JSON.stringify(validDataRows[0]));
    }
    console.log('');
  }

  console.log('=== ALL DISTINCT RESPONSE STATUS VALUES FOUND IN EXCEL ===');
  console.log(Array.from(allStatusValues).sort());

  await disconnectDatabase();
}

main().catch(console.error);
