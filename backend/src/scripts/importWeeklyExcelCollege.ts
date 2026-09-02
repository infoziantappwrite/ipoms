import * as xlsx from 'xlsx';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { WeeklyTracker, PipelineSection } from '../models/WeeklyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';

const FILE_PATH = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';

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

export function parseSheetData(sheet: xlsx.WorkSheet) {
  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const entries: Array<{
    section: PipelineSection;
    sNo: number;
    companyName: string;
    role: string;
    ctc: string;
    status: string;
    offersReceived?: number;
    followUpDate?: Date;
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

      let parsedFollowUpDate: Date | undefined = undefined;
      if (followUpVal) {
        const num = Number(followUpVal);
        if (!isNaN(num) && num > 40000 && num < 60000) {
          parsedFollowUpDate = new Date(Math.round((num - 25569) * 86400 * 1000));
        } else if (typeof followUpVal === 'string' && followUpVal.includes('-')) {
          const parsed = new Date(followUpVal);
          if (!isNaN(parsed.getTime())) parsedFollowUpDate = parsed;
        }
      }

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

export async function importSingleCollege(sheetName: string, options: { clearAllFirst?: boolean } = {}) {
  await connectDatabase();

  if (options.clearAllFirst) {
    console.log('🧹 [Wipe] Clearing all existing WeeklyTracker records across all colleges...');
    const delResult = await WeeklyTracker.deleteMany({});
    console.log(`✅ Deleted ${delResult.deletedCount} old weekly tracker records.`);
  }

  console.log(`\n======================================================`);
  console.log(`📖 Importing Weekly Sheet: "${sheetName}" from ${FILE_PATH}`);
  console.log(`======================================================\n`);

  const workbook = xlsx.readFile(FILE_PATH);
  const matchedSheetKey = workbook.SheetNames.find(
    (s) => s.trim().toLowerCase() === sheetName.trim().toLowerCase()
  );

  if (!matchedSheetKey) {
    throw new Error(`Sheet "${sheetName}" not found in workbook. Available: ${workbook.SheetNames.join(', ')}`);
  }

  const sheet = workbook.Sheets[matchedSheetKey];
  const entries = parseSheetData(sheet);

  console.log(`📊 Parsed ${entries.length} valid entries across all sections from sheet "${matchedSheetKey}".`);

  // Find target college in DB
  const normalizedKey = sheetName.trim().toUpperCase();
  const ALIAS_MAP: Record<string, string> = {
    ACHARIYA: 'ACET',
    KARPAGAM: 'KARPAGAM',
    'KARPAGAM ': 'KARPAGAM',
    'MAR EPHRAEM': 'MAREPHRA',
    EGS: 'EGS',
    KARUNYA: 'KARUNYA',
  };
  const targetCode = ALIAS_MAP[normalizedKey] || normalizedKey;

  const college = await College.findOne({
    $or: [
      { college_code: targetCode },
      { college_code: new RegExp(`^${targetCode}$`, 'i') },
      { college_name: new RegExp(targetCode, 'i') },
    ],
  });

  if (!college) {
    throw new Error(`College with code "${targetCode}" not found in DB!`);
  }

  console.log(`🏛️ Target College: [${college.college_code}] ${college.college_name} (${college._id})`);

  // Find coordinator assigned to this college (or fallback to first coordinator / admin)
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

  console.log(`👤 Assigned Coordinator: ${coordinator?.full_name} (${coordinator?.official_email})`);

  // If we didn't clear all, clear records for this specific college
  if (!options.clearAllFirst) {
    const delCount = await WeeklyTracker.deleteMany({ college_id: college._id });
    console.log(`🧹 Cleared ${delCount.deletedCount} existing records for [${college.college_code}]`);
  }

  // Find highest serial number for company metadata
  const highestMeta = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 });
  let currentSerial = highestMeta?.serial_number || 4000;

  const sectionBreakdown: Record<string, number> = {};
  const insertedDocs = [];

  for (const item of entries) {
    // Upsert CompanyMetadata
    let compMeta = await CompanyMetadata.findOne({
      company_name: new RegExp(`^${item.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      is_deleted: false,
    });

    if (!compMeta) {
      currentSerial += 1;
      const isTech = item.companyName.toLowerCase().includes('technolog') || item.role.toLowerCase().includes('software') || item.role.toLowerCase().includes('developer');
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
      follow_up_date: item.followUpDate,
      eligible_batch: item.batch || '2026 Batch',
      week_number: 35,
      is_deleted: false,
      last_status_updated_at: new Date(),
    });

    insertedDocs.push(doc);
    sectionBreakdown[item.section] = (sectionBreakdown[item.section] || 0) + 1;
  }

  console.log(`\n🎉 [SUCCESS] Imported ${insertedDocs.length} rows for [${college.college_code}] ${college.college_name}!`);
  console.log('📈 Breakdown by Pipeline Section:');
  Object.entries(sectionBreakdown).forEach(([sec, count]) => {
    console.log(`   • ${sec.padEnd(25)} : ${count} companies`);
  });

  return {
    college: {
      id: college._id,
      code: college.college_code,
      name: college.college_name,
    },
    coordinator: {
      id: coordinator?._id,
      name: coordinator?.full_name,
      email: coordinator?.official_email,
    },
    totalImported: insertedDocs.length,
    sectionBreakdown,
  };
}

async function main() {
  const sheetToImport = process.argv[2] || 'KIOT';
  const clearAllFirst = process.argv.includes('--clear-all');

  try {
    const result = await importSingleCollege(sheetToImport, { clearAllFirst });
    console.log('\nImport Result Summary:', JSON.stringify(result, null, 2));
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
