import * as xlsx from 'xlsx';
import { Types } from 'mongoose';
import { College } from '../models/College';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { User } from '../models/User';
import { WeeklyTracker, PipelineSection } from '../models/WeeklyTracker';

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

const SECTION_HEADERS_MAP: { pattern: RegExp; section: PipelineSection }[] = [
  { pattern: /companies\s+completed/i, section: 'completed' },
  { pattern: /companies\s+in\s+progress/i, section: 'in_progress' },
  { pattern: /companies\s+in\s+pipeline/i, section: 'pipeline' },
  { pattern: /top\s+companies/i, section: 'top_companies' },
  { pattern: /companies\s+on\s+hold\s+by\s+hr|rejected\s+companies/i, section: 'rejected_by_hr' },
  { pattern: /companies\s+on\s+hold\s+by\s+college|rejected\s+by\s+college/i, section: 'rejected_by_college' },
];

export function parseSheetData(sheet: xlsx.WorkSheet): ParsedWeeklyEntry[] {
  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const entries: ParsedWeeklyEntry[] = [];

  let currentSection: PipelineSection | null = null;
  let isHeaderRow = false;
  let headerMap: { [key: string]: number } = {};

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Convert row cells to strings
    const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
    const joinedRow = strRow.join(' ').trim();

    if (!joinedRow) continue;

    // Check if row is a Section Header
    let detectedSection: PipelineSection | null = null;
    for (const mapping of SECTION_HEADERS_MAP) {
      if (mapping.pattern.test(joinedRow)) {
        detectedSection = mapping.section;
        break;
      }
    }

    if (detectedSection) {
      currentSection = detectedSection;
      isHeaderRow = true;
      headerMap = {};
      continue;
    }

    // Check if row is the Column Definition Header row (e.g. S.No, Company Name, Role, CTC...)
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

    // If we are in a section, parse data row
    if (currentSection) {
      const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : strRow[0];
      const companyVal = headerMap['companyName'] !== undefined ? strRow[headerMap['companyName']] : strRow[1];
      const roleVal = headerMap['role'] !== undefined ? strRow[headerMap['role']] : strRow[2];
      const ctcVal = headerMap['ctc'] !== undefined ? strRow[headerMap['ctc']] : strRow[3];
      const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : strRow[4];
      const offersVal = headerMap['offers'] !== undefined ? strRow[headerMap['offers']] : '';
      const followUpVal = headerMap['followUp'] !== undefined ? strRow[headerMap['followUp']] : '';
      const batchVal = headerMap['batch'] !== undefined ? strRow[headerMap['batch']] : '';

      // Must have a valid company name
      const cleanCompany = (companyVal || '').replace(/[\t\r\n]+/g, ' ').trim();
      if (!cleanCompany || cleanCompany === '#VALUE!' || cleanCompany.length < 2) {
        continue;
      }

      // Clean role
      const cleanRole = (roleVal || 'Graduate Trainee').replace(/[\t\r\n]+/g, ' ').trim();
      const lowerRole = cleanRole.toLowerCase();

      // Ignore noise rows
      const lowerComp = cleanCompany.toLowerCase();
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

      // Parse offers count
      let offersNum = 0;
      if (offersVal && !isNaN(Number(offersVal))) {
        offersNum = Number(offersVal);
      }

      // Clean CTC
      let cleanCtc = (ctcVal || '').replace(/[\t\r\n]+/g, ' ').trim();
      if (cleanCtc.toLowerCase() === 'not mentioned' || cleanCtc === '-') {
        cleanCtc = '';
      }

      // Clean Status
      const cleanStatus = (statusVal || 'In discussion with HR').replace(/[\t\r\n]+/g, ' ').trim();

      // Parse follow-up date
      let parsedFollowUpDate: string = '';
      if (followUpVal) {
        const num = Number(followUpVal);
        if (!isNaN(num) && num > 40000 && num < 60000) {
          // Excel serial date to YYYY-MM-DD
          const d = new Date(Math.round((num - 25569) * 86400 * 1000));
          parsedFollowUpDate = d.toISOString().split('T')[0];
        } else {
          parsedFollowUpDate = String(followUpVal).trim();
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

export async function importWeeklySheetForCollege(sheetName: string): Promise<{
  success: boolean;
  sheetName: string;
  collegeName: string;
  totalInserted: number;
  sectionsBreakdown: Record<string, number>;
  entries: ParsedWeeklyEntry[];
}> {
  const filePath = 'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx';
  const workbook = xlsx.readFile(filePath);

  const matchedSheetKey = workbook.SheetNames.find(
    (s) => s.trim().toLowerCase() === sheetName.trim().toLowerCase()
  );

  if (!matchedSheetKey) {
    throw new Error(`Sheet '${sheetName}' not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`);
  }

  const sheet = workbook.Sheets[matchedSheetKey];
  const parsedEntries = parseSheetData(sheet);

  // Match College in DB
  const normalizedKey = sheetName.trim().toUpperCase();
  let college = await College.findOne({
    $or: [
      { college_code: normalizedKey },
      { college_code: new RegExp(`^${normalizedKey}$`, 'i') },
      { college_name: new RegExp(normalizedKey, 'i') },
    ],
  });

  if (!college) {
    // Try alias mappings
    const ALIAS_MAP: Record<string, string> = {
      ACHARIYA: 'ACET',
      KARPAGAM: 'KARPAGAM',
      'MAR EPHRAEM': 'MAR',
      EGS: 'EGS',
    };
    const mappedCode = ALIAS_MAP[normalizedKey];
    if (mappedCode) {
      college = await College.findOne({ college_code: mappedCode });
    }
  }

  if (!college) {
    // If not found, create or pick first matching
    college = await College.findOne();
  }

  if (!college) {
    throw new Error(`No college record found for sheet '${sheetName}'.`);
  }

  // Find Coordinator
  let coordinator = await User.findOne({
    $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
  });
  if (!coordinator) {
    coordinator = await User.findOne();
  }

  // Remove existing entries for this college to prevent duplicate entries
  await WeeklyTracker.deleteMany({
    college_id: college._id,
    academic_year: 2026,
  });

  const sectionsBreakdown: Record<string, number> = {
    completed: 0,
    in_progress: 0,
    pipeline: 0,
    top_companies: 0,
    rejected_by_hr: 0,
    rejected_by_college: 0,
  };

  for (const entry of parsedEntries) {
    // Find or create company metadata
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

    // Create WeeklyTracker row
    await WeeklyTracker.create({
      academic_year: 2026,
      college_id: college._id,
      coordinator_id: coordinator?._id,
      company_id: compMeta._id,
      company_name: entry.companyName.trim(),
      job_role: entry.role || 'Graduate Trainee',
      ctc_lpa: entry.ctc || '',
      eligible_batch: entry.batch?.includes('Batch') ? entry.batch : `${entry.batch || 2026} Batch`,
      pipeline_section: entry.section,
      is_pinned_top: entry.section === 'top_companies',
      current_status_text: entry.status || 'Active engagement',
      selected_count: entry.offersReceived || 0,
      registered_count: entry.offersReceived ? entry.offersReceived * 10 : 0,
      shortlisted_count: entry.offersReceived ? entry.offersReceived * 2 : 0,
      is_deleted: false,
    });

    sectionsBreakdown[entry.section] = (sectionsBreakdown[entry.section] || 0) + 1;
  }

  return {
    success: true,
    sheetName: matchedSheetKey,
    collegeName: college.college_name,
    totalInserted: parsedEntries.length,
    sectionsBreakdown,
    entries: parsedEntries,
  };
}
