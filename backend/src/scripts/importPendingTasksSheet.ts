import * as xlsx from 'xlsx';
import fs from 'fs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { PendingTask } from '../models/PendingTask';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';

const candidatePaths = [
  'C:\\Users\\admin\\Downloads\\Weekly.xlsx',
  'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
  'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
];

const FILE_PATH = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];

const COLLEGE_CODE_MAP: Record<string, string> = {
  KLU: 'KLU',
  KPR: 'KPR',
  KARPAGAM: 'KARPAGAM',
  KIOT: 'KIOT',
  NPR: 'NPR',
  PSNA: 'PSNA',
  DSU: 'DSU',
  SMVEC: 'SMVEC',
  ACET: 'ACET',
  ACHARIYA: 'ACET',
  NEHRU: 'NEHRU',
  HITS: 'HITS',
  'MAR EPHRAEM': 'MAREPHRA',
  MAREPHRAEM: 'MAREPHRA',
  MAREPHRA: 'MAREPHRA',
  NGCE: 'NGCE',
  ACEW: 'ACEW',
  KAMARAJ: 'KAMARAJ',
  AIHT: 'AIHT',
  SONA: 'SONA',
  MKCE: 'MKCE',
  NGP: 'NGP',
  KGISL: 'KGISL',
  AAA: 'AAA',
  EGS: 'EGS',
  KARUNYA: 'KARUNYA',
};

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    return new Date(Math.round((num - 25569) * 86400 * 1000));
  }
  if (typeof val === 'string' && val.trim() && val.trim() !== '-' && val.trim() !== 'Not Shared') {
    const parsed = new Date(val.trim());
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export async function importPendingTasks() {
  await connectDatabase();

  console.log('\n======================================================');
  console.log(`📋 IMPORTING PENDING TASKS FROM: ${FILE_PATH}`);
  console.log('======================================================\n');

  const workbook = xlsx.readFile(FILE_PATH);
  const pendingSheet = workbook.Sheets['PENDING'];

  if (!pendingSheet) {
    throw new Error(`Sheet 'PENDING' not found in ${FILE_PATH}`);
  }

  // 1. Wipe existing PendingTask records
  const delResult = await PendingTask.deleteMany({});
  console.log(`🧹 Cleared ${delResult.deletedCount} old PendingTask records.\n`);

  const rawRows: any[][] = xlsx.utils.sheet_to_json(pendingSheet, { header: 1, defval: '' });

  let currentCollegeCode: string | null = null;
  let currentCollege: any = null;
  let currentCoordinator: any = null;
  let headerMap: { [key: string]: number } = {};

  const summaryByCollege: Record<string, number> = {};
  let totalImported = 0;

  // Track highest serial number for company metadata
  const highestMeta = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 });
  let currentSerial = highestMeta?.serial_number || 4500;

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
    const joinedRow = strRow.join(' ').trim();
    if (!joinedRow) continue;

    // Check if row is a College Section Header (e.g. "1. KLU", "2. KPR", "3. Karpagam", "PSNA", "7. DSU", etc.)
    const cleanHeading = joinedRow.replace(/^\d+[\.\)]\s*/, '').trim().toUpperCase();
    let detectedCollegeKey: string | null = null;

    for (const key of Object.keys(COLLEGE_CODE_MAP)) {
      if (
        cleanHeading === key ||
        cleanHeading.startsWith(key + ' ') ||
        cleanHeading.startsWith(key + '.') ||
        cleanHeading.endsWith(' ' + key) ||
        cleanHeading.includes(key)
      ) {
        detectedCollegeKey = key;
        break;
      }
    }

    if (detectedCollegeKey) {
      const targetCode = COLLEGE_CODE_MAP[detectedCollegeKey];
      currentCollege = await College.findOne({
        $or: [
          { college_code: targetCode },
          { college_code: new RegExp(`^${targetCode}$`, 'i') },
          { college_name: new RegExp(targetCode, 'i') },
        ],
      });

      if (currentCollege) {
        currentCollegeCode = currentCollege.college_code;
        currentCoordinator = await User.findOne({
          assigned_college_ids: currentCollege._id,
          role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR'] },
          is_deleted: false,
        });

        if (!currentCoordinator) {
          currentCoordinator = await User.findOne({
            role_codes: { $in: ['PLACEMENT_COORDINATOR', 'ADMINISTRATOR'] },
            is_deleted: false,
          });
        }
      } else {
        currentCollegeCode = null;
        currentCollege = null;
        currentCoordinator = null;
      }

      headerMap = {};
      continue;
    }

    // Check if row is a column definition header
    if (strRow.some((c) => /s\.?\s*no/i.test(c)) && strRow.some((c) => /company/i.test(c))) {
      headerMap = {};
      strRow.forEach((colName, colIdx) => {
        const lower = colName.toLowerCase().trim();
        if (/s\.?\s*no/i.test(lower)) headerMap['sNo'] = colIdx;
        else if (/company/i.test(lower)) headerMap['company'] = colIdx;
        else if (/jd\s*received/i.test(lower)) headerMap['jdReceived'] = colIdx;
        else if (/db\s*shared\s*date|db\s*shared/i.test(lower)) headerMap['dbShared'] = colIdx;
        else if (/status/i.test(lower)) headerMap['status'] = colIdx;
        else if (/remarks|action/i.test(lower)) headerMap['remarks'] = colIdx;
        else if (/drive\s*date/i.test(lower)) headerMap['driveDate'] = colIdx;
      });
      continue;
    }

    // Data Row
    if (currentCollege && currentCoordinator && headerMap['company'] !== undefined) {
      const companyVal = strRow[headerMap['company']];
      if (!companyVal || companyVal.length < 2 || /s\.?\s*no|company/i.test(companyVal)) {
        continue;
      }

      const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : '';
      const jdDateVal = headerMap['jdReceived'] !== undefined ? strRow[headerMap['jdReceived']] : '';
      const dbDateVal = headerMap['dbShared'] !== undefined ? strRow[headerMap['dbShared']] : '';
      const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : '';
      const remarksVal = headerMap['remarks'] !== undefined ? strRow[headerMap['remarks']] : '';
      const driveDateVal = headerMap['driveDate'] !== undefined ? strRow[headerMap['driveDate']] : '';

      const jdDate = parseExcelDate(jdDateVal);
      const dbDate = parseExcelDate(dbDateVal);
      const driveDate = parseExcelDate(driveDateVal);

      // Determine DB Shared Status
      let dbSharedStatus: 'Shared' | 'Pending' | 'In Progress' | 'Not Shared' | 'Under Review' = 'Pending';
      const statusLower = statusVal.toLowerCase();
      const dbValLower = String(dbDateVal).toLowerCase();

      if (dbDate || dbValLower.includes('shared') || statusLower.includes('database shared') || statusLower.includes('db shared')) {
        dbSharedStatus = 'Shared';
      } else if (dbValLower.includes('not shared') || statusLower.includes('db pending') || statusLower.includes('database pending')) {
        dbSharedStatus = 'Pending';
      } else if (statusLower.includes('in progress')) {
        dbSharedStatus = 'In Progress';
      } else if (statusLower.includes('under review')) {
        dbSharedStatus = 'Under Review';
      }

      // Upsert CompanyMetadata
      let compMeta = await CompanyMetadata.findOne({
        company_name: new RegExp(`^${companyVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        is_deleted: false,
      });

      if (!compMeta) {
        currentSerial += 1;
        const isTech =
          companyVal.toLowerCase().includes('technolog') ||
          companyVal.toLowerCase().includes('soft') ||
          companyVal.toLowerCase().includes('lab') ||
          companyVal.toLowerCase().includes('system');
        compMeta = await CompanyMetadata.create({
          company_name: companyVal.trim(),
          serial_number: currentSerial,
          company_type: isTech ? 'software' : 'core_engineering',
          industry_sector: isTech ? 'IT / Software' : 'Core Engineering',
          source: 'PENDING_TASKS_IMPORT',
          is_deleted: false,
        });
      }

      const isCompleted =
        statusLower.includes('completed') ||
        statusLower.includes('results arrived') ||
        statusLower.includes('drive completed');

      await PendingTask.create({
        college_id: currentCollege._id,
        coordinator_id: currentCoordinator._id,
        company_name: companyVal.trim(),
        company_id: compMeta._id,
        serial_no: Number(sNoVal) || (summaryByCollege[currentCollege.college_code] || 0) + 1,
        jd_received_date: jdDate,
        db_shared_date: dbDate,
        db_shared_status: dbSharedStatus,
        current_status: statusVal.trim() || 'In Progress',
        next_status: remarksVal.trim() || 'Follow up with college/HR',
        action_to_be_taken: remarksVal.trim() || 'Follow up with college/HR',
        remarks: remarksVal.trim() + (driveDateVal && typeof driveDateVal === 'string' && !driveDate ? ` (Drive: ${driveDateVal})` : ''),
        drive_date: driveDate,
        is_completed: isCompleted,
        is_deleted: false,
      });

      summaryByCollege[currentCollege.college_code] = (summaryByCollege[currentCollege.college_code] || 0) + 1;
      totalImported += 1;
    }
  }

  console.log(`\n🎉 [SUCCESS] Imported ${totalImported} PendingTask records across ${Object.keys(summaryByCollege).length} colleges!`);
  console.log('\n📈 Breakdown by College:');
  Object.entries(summaryByCollege).forEach(([code, count]) => {
    console.log(`   • [${code.padEnd(8)}] : ${count} pending tasks`);
  });

  return { totalImported, summaryByCollege };
}

async function main() {
  try {
    const result = await importPendingTasks();
    console.log('\nImport Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Import failed:', err);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
