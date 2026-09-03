import * as xlsx from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { WeeklyTracker, PipelineSection } from '../models/WeeklyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { PendingTask } from '../models/PendingTask';

const FILE_PATH = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';

const SHEET_COLLEGE_MAP: Record<string, string> = {
  'KIOT': 'KIOT',
  'KLU': 'KLU',
  'ACHARIYA': 'ACET',
  'AIHT': 'AIHT',
  'KPR': 'KPR',
  'KARPAGAM': 'KARPAGAM',
  'KARPAGAM ': 'KARPAGAM',
  'MKCE': 'MKCE',
  'SONA': 'SONA',
  'SMVEC': 'SMVEC',
  'DSU': 'DSU',
  'PSNA': 'PSNA',
  'NPR': 'NPR',
  'NGP': 'NGP',
  'KGISL': 'KGISL',
  'AAA': 'AAA',
  'EGS': 'EGS',
  'KARUNYA': 'KARUNYA',
  'NEHRU': 'NEHRU',
  'HITS': 'HITS',
  'KAMARAJ': 'KAMARAJ',
  'NGCE': 'NGCE',
  'MAR EPHRAEM': 'MAREPHRA',
  'MAR Ephraem': 'MAREPHRA',
  'ACEW': 'ACEW',
};

interface SectionRule {
  pattern: RegExp;
  section: PipelineSection;
}

const SECTION_RULES: SectionRule[] = [
  { pattern: /companies\s+completed/i, section: 'completed' },
  { pattern: /companies\s+in\s+progress/i, section: 'in_progress' },
  { pattern: /companies\s+in\s+pipeline/i, section: 'pipeline' },
  { pattern: /top\s+companies/i, section: 'top_companies' },
  { pattern: /rejected\s+companies|rejected\s+by\s+hr/i, section: 'rejected_by_hr' },
  { pattern: /companies\s+on\s+hold\s+by\s+college|on\s+hold\s+by\s+college/i, section: 'on_hold_by_college' },
  { pattern: /companies\s+on\s+hold\s+by\s+hr|on\s+hold\s+by\s+hr/i, section: 'on_hold_by_hr' },
];

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    return new Date(Math.round((num - 25569) * 86400 * 1000));
  }
  if (typeof val === 'string' && val.trim()) {
    const parsed = new Date(val.trim());
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function parseSheetData(sheet: xlsx.WorkSheet) {
  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const entries: Array<{
    section: PipelineSection;
    sNo: number;
    companyName: string;
    role: string;
    ctc: string;
    status: string;
    offersReceived?: number;
    followUpDate?: Date | null;
    batch?: string;
  }> = [];

  let currentSection: PipelineSection | null = null;
  let headerMap: { [key: string]: number } = {};

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
    const joinedRow = strRow.join(' ').trim();

    if (!joinedRow) continue;

    // Check if row is a section heading
    let matchedSection: PipelineSection | null = null;
    for (const rule of SECTION_RULES) {
      if (rule.pattern.test(joinedRow)) {
        matchedSection = rule.section;
        break;
      }
    }

    if (matchedSection) {
      currentSection = matchedSection;
      headerMap = {};
      continue;
    }

    // Check if column headers
    if (strRow.some((c) => /s\.?\s*no|si\.?\s*no/i.test(c)) && strRow.some((c) => /company/i.test(c))) {
      headerMap = {};
      strRow.forEach((colName, colIdx) => {
        const lower = colName.toLowerCase().trim();
        if (/s\.?\s*no|si\.?\s*no/i.test(lower)) headerMap['sNo'] = colIdx;
        else if (/company\s*name|company/i.test(lower)) headerMap['companyName'] = colIdx;
        else if (/role/i.test(lower)) headerMap['role'] = colIdx;
        else if (/ctc/i.test(lower)) headerMap['ctc'] = colIdx;
        else if (/status/i.test(lower)) headerMap['status'] = colIdx;
        else if (/offers|no\s+of\s+offers/i.test(lower)) headerMap['offers'] = colIdx;
        else if (/follow\s*up/i.test(lower)) headerMap['followUp'] = colIdx;
        else if (/batch/i.test(lower)) headerMap['batch'] = colIdx;
      });
      continue;
    }

    // Skip summary / stats table at bottom
    if (/status\s+count|total\s+status|in\s+progress\s+count|pipeline\s+count|completed\s+count/i.test(joinedRow)) {
      continue;
    }

    if (currentSection) {
      const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : strRow[0];
      const companyVal = headerMap['companyName'] !== undefined ? strRow[headerMap['companyName']] : strRow[1];
      const roleVal = headerMap['role'] !== undefined ? strRow[headerMap['role']] : strRow[2];
      const ctcVal = headerMap['ctc'] !== undefined ? strRow[headerMap['ctc']] : strRow[3];
      const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : strRow[4];
      const offersVal = headerMap['offers'] !== undefined ? strRow[headerMap['offers']] : strRow[5];
      const followUpVal = headerMap['followUp'] !== undefined ? strRow[headerMap['followUp']] : '';
      const batchVal = headerMap['batch'] !== undefined ? strRow[headerMap['batch']] : '';

      const cleanCompany = (companyVal || '').replace(/\u00a0/g, ' ').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanCompany || cleanCompany === '#VALUE!' || cleanCompany.length < 2) {
        continue;
      }

      const cleanRole = (roleVal || 'Graduate Trainee').replace(/\u00a0/g, ' ').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      const lowerComp = cleanCompany.toLowerCase();
      const lowerRole = cleanRole.toLowerCase();

      if (
        lowerComp === 'status' ||
        lowerComp === 'count' ||
        lowerComp === 'total' ||
        lowerComp === 's.no' ||
        lowerComp === 'si.no' ||
        lowerComp === 'company name' ||
        lowerComp === 'role' ||
        lowerComp === 'ctc' ||
        lowerComp === 'in progress' ||
        lowerComp === 'pipeline' ||
        lowerComp === 'completed' ||
        lowerComp === 'top companies' ||
        lowerRole === 'count' ||
        lowerRole === 'role' ||
        lowerComp.startsWith('status count') ||
        lowerComp.startsWith('total status')
      ) {
        continue;
      }

      let cleanCtc = (ctcVal || '').replace(/[\t\r\n]+/g, ' ').trim();
      if (cleanCtc.toLowerCase() === 'not mentioned' || cleanCtc === '-') {
        cleanCtc = 'Not Mentioned';
      }

      const cleanStatus = (statusVal || 'In discussion with HR').replace(/[\t\r\n]+/g, ' ').trim();

      let offersNum = 0;
      if (offersVal && !isNaN(Number(offersVal))) {
        offersNum = Number(offersVal);
      }

      const parsedFollowUpDate = parseExcelDate(followUpVal);

      entries.push({
        section: currentSection,
        sNo: Number(sNoVal) || entries.length + 1,
        companyName: cleanCompany,
        role: cleanRole || 'Graduate Trainee',
        ctc: cleanCtc,
        status: cleanStatus,
        offersReceived: offersNum,
        followUpDate: parsedFollowUpDate,
        batch: batchVal || '2026 Batch',
      });
    }
  }

  return entries;
}

async function parseAndImportPendingSheet(sheet: xlsx.WorkSheet) {
  console.log('\n======================================================');
  console.log('📋 Parsing and Importing PENDING Sheet...');
  console.log('======================================================\n');

  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  await PendingTask.deleteMany({});
  console.log('🧹 Cleared old PendingTask records.');

  let currentCollegeCode: string | null = null;
  let currentCollege: any = null;
  let currentCoordinator: any = null;
  let headerMap: { [key: string]: number } = {};
  let totalPendingImported = 0;

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
    const joinedRow = strRow.join(' ').trim();
    if (!joinedRow) continue;

    // Check if college heading (e.g. "1. KLU", "2. KPR", "3. Karpagam", "5. NPR", "PSNA", "7. DSU", "8. SMVEC", "9. ACET", "10. NEHRU", "11. HITS", "12. Mar Ephraem", "13. NGCE", "14. ACEW", "16. AIHT")
    const cleanHeading = joinedRow.replace(/^\d+[\.\)]\s*/, '').trim().toUpperCase();
    for (const [key, code] of Object.entries(SHEET_COLLEGE_MAP)) {
      if (cleanHeading.startsWith(key.toUpperCase()) || cleanHeading.includes(key.toUpperCase())) {
        currentCollegeCode = code;
        currentCollege = await College.findOne({ college_code: code });
        if (currentCollege) {
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
        }
        headerMap = {};
        break;
      }
    }

    // Check if column definition header
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

    if (currentCollege && currentCoordinator && headerMap['company'] !== undefined) {
      const companyVal = strRow[headerMap['company']];
      if (!companyVal || companyVal.length < 2 || /s\.?\s*no|company/i.test(companyVal)) continue;

      const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : '';
      const jdDateVal = headerMap['jdReceived'] !== undefined ? strRow[headerMap['jdReceived']] : '';
      const dbDateVal = headerMap['dbShared'] !== undefined ? strRow[headerMap['dbShared']] : '';
      const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : '';
      const remarksVal = headerMap['remarks'] !== undefined ? strRow[headerMap['remarks']] : '';
      const driveDateVal = headerMap['driveDate'] !== undefined ? strRow[headerMap['driveDate']] : '';

      const jdDate = parseExcelDate(jdDateVal);
      const dbDate = parseExcelDate(dbDateVal);
      const driveDate = parseExcelDate(driveDateVal);

      let dbSharedStatus = 'Pending';
      if (dbDate || /shared/i.test(statusVal) || /shared/i.test(String(dbDateVal))) {
        dbSharedStatus = 'Shared';
      } else if (/not shared/i.test(String(dbDateVal)) || /pending/i.test(statusVal)) {
        dbSharedStatus = 'Pending';
      }

      await PendingTask.create({
        college_id: currentCollege._id,
        coordinator_id: currentCoordinator._id,
        company_name: companyVal.trim(),
        serial_no: Number(sNoVal) || totalPendingImported + 1,
        jd_received_date: jdDate,
        db_shared_date: dbDate,
        db_shared_status: dbSharedStatus,
        current_status: statusVal.trim() || 'In Progress',
        action_to_be_taken: remarksVal.trim() || 'Follow up with college/HR',
        remarks: remarksVal.trim(),
        drive_date: driveDate,
        is_completed: /completed|arrived/i.test(statusVal),
        is_deleted: false,
      });

      totalPendingImported += 1;
    }
  }

  console.log(`✅ Imported ${totalPendingImported} PendingTask records from PENDING sheet.`);
}

export async function importAllColleges() {
  await connectDatabase();

  console.log('\n======================================================');
  console.log(`🚀 IMPORTING ALL SHEETS FROM: ${FILE_PATH}`);
  console.log('======================================================\n');

  const workbook = xlsx.readFile(FILE_PATH);

  // Clear all WeeklyTracker records
  console.log('🧹 Clearing all WeeklyTracker records across all colleges...');
  const delTracker = await WeeklyTracker.deleteMany({});
  console.log(`✅ Deleted ${delTracker.deletedCount} old weekly tracker records.\n`);

  const summaryReport: any[] = [];
  let totalAllRows = 0;

  // Track highest serial number for company metadata
  const highestMeta = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 });
  let currentSerial = highestMeta?.serial_number || 4000;

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.trim().toUpperCase() === 'PENDING') {
      continue;
    }

    const matchedCodeKey = Object.keys(SHEET_COLLEGE_MAP).find(
      (k) => k.trim().toUpperCase() === sheetName.trim().toUpperCase()
    );

    const targetCode = matchedCodeKey ? SHEET_COLLEGE_MAP[matchedCodeKey] : sheetName.trim().toUpperCase();

    const college = await College.findOne({
      $or: [
        { college_code: targetCode },
        { college_code: new RegExp(`^${targetCode}$`, 'i') },
        { college_name: new RegExp(targetCode, 'i') },
      ],
    });

    if (!college) {
      console.warn(`⚠️ Warning: College with code "${targetCode}" (sheet: "${sheetName}") not found in DB! Skipping...`);
      continue;
    }

    let coordinator = await User.findOne({
      assigned_college_ids: college._id,
      role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR'] },
      is_deleted: false,
    });

    if (!coordinator) {
      coordinator = await User.findOne({
        role_codes: { $in: ['PLACEMENT_COORDINATOR', 'ADMINISTRATOR'] },
        is_deleted: false,
      });
    }

    const sheet = workbook.Sheets[sheetName];
    const entries = parseSheetData(sheet);

    const sectionBreakdown: Record<string, number> = {};
    const insertedDocs = [];

    for (const item of entries) {
      let compMeta = await CompanyMetadata.findOne({
        company_name: new RegExp(`^${item.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        is_deleted: false,
      });

      if (!compMeta) {
        currentSerial += 1;
        const isTech =
          item.companyName.toLowerCase().includes('technolog') ||
          item.role.toLowerCase().includes('software') ||
          item.role.toLowerCase().includes('developer') ||
          item.role.toLowerCase().includes('engineer');
        compMeta = await CompanyMetadata.create({
          company_name: item.companyName,
          serial_number: currentSerial,
          company_type: isTech ? 'software' : 'core_engineering',
          industry_sector: isTech ? 'IT / Software' : 'Core Engineering',
          source: 'WEEKLY_TRACKER_IMPORT',
          is_deleted: false,
        });
      }

      const doc = await WeeklyTracker.create({
        academic_year: 2026,
        college_id: college._id,
        coordinator_id: coordinator?._id,
        company_id: compMeta._id,
        company_name: item.companyName,
        job_role: item.role,
        ctc_lpa: item.ctc,
        pipeline_section: item.section,
        is_pinned_top: item.section === 'top_companies',
        current_status_text: item.status,
        selected_count: item.offersReceived || 0,
        follow_up_date: item.followUpDate || undefined,
        eligible_batch: item.batch || '2026 Batch',
        week_number: 35,
        is_deleted: false,
        last_status_updated_at: new Date(),
      });

      insertedDocs.push(doc);
      sectionBreakdown[item.section] = (sectionBreakdown[item.section] || 0) + 1;
    }

    totalAllRows += insertedDocs.length;
    summaryReport.push({
      sheet: sheetName,
      college_code: college.college_code,
      college_name: college.college_name,
      coordinator: coordinator?.full_name,
      total_rows: insertedDocs.length,
      sections: sectionBreakdown,
    });

    console.log(`✅ [${college.college_code.padEnd(8)}] ${college.college_name.padEnd(45)} -> ${insertedDocs.length} rows imported (Coordinator: ${coordinator?.full_name})`);
  }

  // Also import PENDING sheet
  const pendingSheet = workbook.Sheets['PENDING'];
  if (pendingSheet) {
    await parseAndImportPendingSheet(pendingSheet);
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL SHEETS IMPORTED SUCCESSFULLY! Total Records: ${totalAllRows}`);
  console.log('======================================================\n');

  console.table(
    summaryReport.map((s) => ({
      Sheet: s.sheet,
      Code: s.college_code,
      Coordinator: s.coordinator,
      Total: s.total_rows,
      Completed: s.sections['completed'] || 0,
      InProgress: s.sections['in_progress'] || 0,
      Pipeline: s.sections['pipeline'] || 0,
      Top: s.sections['top_companies'] || 0,
      HoldCollege: s.sections['on_hold_by_college'] || 0,
      HoldHR: s.sections['on_hold_by_hr'] || 0,
    }))
  );

  return { totalAllRows, collegesImported: summaryReport.length, summaryReport };
}

async function main() {
  try {
    const result = await importAllColleges();
    console.log('\nExecution finished cleanly.');
  } catch (err) {
    console.error('❌ Master import failed:', err);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
