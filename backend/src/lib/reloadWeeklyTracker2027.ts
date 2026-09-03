import fs from 'fs';
import * as xlsx from 'xlsx';
import { College } from '../models/College';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { User } from '../models/User';
import { WeeklyTracker, PipelineSection } from '../models/WeeklyTracker';

const SECTION_HEADERS_MAP: { pattern: RegExp; section: PipelineSection }[] = [
  { pattern: /companies\s+completed/i, section: 'completed' },
  { pattern: /companies\s+in\s+progress/i, section: 'in_progress' },
  { pattern: /companies\s+in\s+pipeline/i, section: 'pipeline' },
  { pattern: /top\s+companies/i, section: 'top_companies' },
  { pattern: /companies\s+on\s+hold\s+by\s+hr|rejected\s+companies/i, section: 'rejected_by_hr' },
  { pattern: /companies\s+on\s+hold\s+by\s+college|rejected\s+by\s+college/i, section: 'rejected_by_college' },
];

export interface ParsedWeeklyEntry {
  section: PipelineSection;
  sNo: number;
  companyName: string;
  role: string;
  ctc: string;
  status: string;
  offersReceived?: number;
  followUpDate?: string;
  batch?: string;
}

export function parseWeeklySheet(sheet: xlsx.WorkSheet): ParsedWeeklyEntry[] {
  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const entries: ParsedWeeklyEntry[] = [];

  let currentSection: PipelineSection | null = null;
  let headerMap: { [key: string]: number } = {};

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
    const joinedRow = strRow.join(' ').trim();

    if (!joinedRow) continue;

    // Check if section header
    let detectedSection: PipelineSection | null = null;
    for (const mapping of SECTION_HEADERS_MAP) {
      if (mapping.pattern.test(joinedRow)) {
        detectedSection = mapping.section;
        break;
      }
    }

    if (detectedSection) {
      currentSection = detectedSection;
      headerMap = {};
      continue;
    }

    // Check if column definition header
    if (
      strRow.some((c) => /s\.?\s*no|si\.?\s*no/i.test(c)) &&
      strRow.some((c) => /company/i.test(c))
    ) {
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
      const offersVal = headerMap['offers'] !== undefined ? strRow[headerMap['offers']] : '';
      const followUpVal = headerMap['followUp'] !== undefined ? strRow[headerMap['followUp']] : '';
      const batchVal = headerMap['batch'] !== undefined ? strRow[headerMap['batch']] : '';

      const cleanCompany = (companyVal || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanCompany || cleanCompany === '#VALUE!' || cleanCompany.length < 2) {
        continue;
      }

      const cleanRole = (roleVal || 'Graduate Trainee').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
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
        lowerComp.startsWith('total status') ||
        lowerComp.startsWith('in progress count') ||
        lowerComp.startsWith('pipeline count') ||
        lowerComp.startsWith('completed count')
      ) {
        continue;
      }

      let offersNum = 0;
      if (offersVal && !isNaN(Number(offersVal))) {
        offersNum = Number(offersVal);
      }

      let cleanCtc = (ctcVal || '').replace(/[\t\r\n]+/g, ' ').trim();
      if (cleanCtc.toLowerCase() === 'not mentioned' || cleanCtc === '-') {
        cleanCtc = '';
      }

      const cleanStatus = (statusVal || 'In discussion with HR').replace(/[\t\r\n]+/g, ' ').trim();

      let parsedFollowUpDate: string = '';
      if (followUpVal) {
        const num = Number(followUpVal);
        if (!isNaN(num) && num > 40000 && num < 60000) {
          const d = new Date(Math.round((num - 25569) * 86400 * 1000));
          parsedFollowUpDate = d.toISOString().split('T')[0];
        } else {
          parsedFollowUpDate = String(followUpVal).trim();
        }
      }

      let finalSection: PipelineSection = currentSection;
      if (
        currentSection === 'rejected_by_hr' &&
        /rejected by (the )?college|response from (the )?college|college in connect|low package|bda role|tpo/i.test(cleanStatus)
      ) {
        finalSection = 'rejected_by_college';
      }

      entries.push({
        section: finalSection,
        sNo: Number(sNoVal) || entries.length + 1,
        companyName: cleanCompany,
        role: cleanRole || 'Graduate Trainee',
        ctc: cleanCtc,
        status: cleanStatus,
        offersReceived: offersNum,
        followUpDate: parsedFollowUpDate,
        batch: batchVal || '2027 Batch',
      });
    }
  }

  return entries;
}

export async function reloadWeeklyTrackerFrom2027Workbook(customPath?: string): Promise<{
  success: boolean;
  totalImported: number;
  totalColleges: number;
  skippedSheets: string[];
  colleges: any[];
}> {
  const possiblePaths = [
    customPath,
    'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
    'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH (1).xlsx',
    'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx',
    'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
  ].filter(Boolean) as string[];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.warn('⚠️ [Weekly Tracker 2027 Reload] Excel workbook not found in Downloads. Skipping.');
    return { success: false, totalImported: 0, totalColleges: 0, skippedSheets: [], colleges: [] };
  }

  console.log(`🚀 [Weekly Tracker 2027 Reload] Reading workbook from: ${filePath}`);
  const workbook = xlsx.readFile(filePath);

  // 1. Wipe all existing Weekly Tracker data as requested by user
  const deleteResult = await WeeklyTracker.deleteMany({});
  console.log(`🗑️ [Weekly Tracker 2027 Reload] Cleared ${deleteResult.deletedCount} old records from WeeklyTracker.`);

  // Find a fallback coordinator
  let coordinator = await User.findOne({
    $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
  });
  if (!coordinator) coordinator = await User.findOne();

  const results: any[] = [];
  const skippedSheets: string[] = [];
  let totalImported = 0;

  for (const sheetName of workbook.SheetNames) {
    const cleanSheetName = sheetName.trim();

    // Skip the pending sheet as requested: "skip the pending sheet"
    if (/pending/i.test(cleanSheetName)) {
      skippedSheets.push(cleanSheetName);
      console.log(`⏭️ [Weekly Tracker 2027 Reload] Skipped pending sheet: "${cleanSheetName}"`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const parsedEntries = parseWeeklySheet(sheet);

    if (parsedEntries.length === 0) {
      console.log(`⚠️ [Weekly Tracker 2027 Reload] Sheet "${cleanSheetName}" has 0 valid entries.`);
      continue;
    }

    // Match College in DB
    const normalizedKey = cleanSheetName.toUpperCase();
    let college = await College.findOne({
      $or: [
        { college_code: normalizedKey },
        { college_code: new RegExp(`^${normalizedKey}$`, 'i') },
        { college_name: new RegExp(normalizedKey, 'i') },
      ],
    });

    if (!college) {
      const ALIAS_MAP: Record<string, string> = {
        ACHARIYA: 'ACET',
        KARPAGAM: 'KARPAGAM',
        'MAR EPHRAEM': 'MAREPHRA',
        MAR: 'MAREPHRA',
        EGS: 'EGS',
        'E.G.S': 'EGS',
        NARAYANAGURU: 'NGCE',
        'ANNAI MIRA': 'ACEW',
        KUMARAGURU: 'KCT',
        'K.L.N': 'KLN',
        SHANMUGHA: 'SSEI',
      };
      const mappedCode = ALIAS_MAP[normalizedKey];
      if (mappedCode) {
        college = await College.findOne({
          $or: [{ college_code: mappedCode }, { college_code: new RegExp(`^${mappedCode}$`, 'i') }],
        });
      }
    }

    if (!college) {
      // Auto-create college if it doesn't exist
      college = await College.create({
        college_name: cleanSheetName,
        college_code: cleanSheetName.substring(0, 10).toUpperCase(),
        status: 'active',
      });
      console.log(`✨ [Weekly Tracker 2027 Reload] Created new college record for "${cleanSheetName}"`);
    }

    const sectionsBreakdown: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      pipeline: 0,
      top_companies: 0,
      rejected_by_hr: 0,
      rejected_by_college: 0,
    };

    for (const entry of parsedEntries) {
      if (entry.companyName.toLowerCase() === 'status' || entry.companyName.toLowerCase() === 'count') {
        continue;
      }

      let compMeta = await CompanyMetadata.findOne({
        company_name: new RegExp(`^${entry.companyName.trim()}$`, 'i'),
      });

      if (!compMeta) {
        compMeta = await CompanyMetadata.create({
          company_name: entry.companyName.trim(),
          company_type: 'software',
          industry_sector: 'Information Technology',
        });
      }

      await WeeklyTracker.create({
        academic_year: 2027,
        college_id: college._id,
        coordinator_id: coordinator?._id,
        company_id: compMeta._id,
        company_name: entry.companyName.trim(),
        job_role: entry.role || 'Graduate Trainee',
        ctc_lpa: entry.ctc || '',
        eligible_batch: '2027 Batch',
        pipeline_section: entry.section,
        is_pinned_top: entry.section === 'top_companies',
        current_status_text: entry.status || 'Active engagement',
        selected_count: entry.offersReceived || 0,
        registered_count: entry.offersReceived ? entry.offersReceived * 10 : 0,
        shortlisted_count: entry.offersReceived ? entry.offersReceived * 2 : 0,
        is_deleted: false,
      });

      sectionsBreakdown[entry.section] = (sectionsBreakdown[entry.section] || 0) + 1;
      totalImported++;
    }

    const colTotal = Object.values(sectionsBreakdown).reduce((a, b) => a + b, 0);
    results.push({
      sheetName: cleanSheetName,
      collegeName: college.college_name,
      collegeCode: college.college_code,
      totalCompanies: colTotal,
      sectionsBreakdown,
    });

    console.log(`✅ [Weekly Tracker 2027 Reload] ${college.college_name} (${cleanSheetName}): ${colTotal} companies loaded.`, sectionsBreakdown);
  }

  console.log(`🎉 [Weekly Tracker 2027 Reload] Successfully imported ${totalImported} companies across ${results.length} colleges. Skipped: ${skippedSheets.join(', ') || 'None'}`);

  return {
    success: true,
    totalImported,
    totalColleges: results.length,
    skippedSheets,
    colleges: results,
  };
}
