const xlsx = require('xlsx');

const filePath = "C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx";
const wb = xlsx.readFile(filePath);
const sheet = wb.Sheets['NPR'];
const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const SECTION_PATTERNS = [
  { pattern: /^\s*(companies\s+completed|drives?\s+completed)\s*$/i, section: 'completed' },
  { pattern: /^\s*(drive\s+in\s+progress)\s*$/i, section: 'drive_in_progress' },
  { pattern: /^\s*(upcoming\s+drives?|companies\s+in\s+drive|in\s+drive)\s*$/i, section: 'upcoming_drives' },
  { pattern: /^\s*(companies\s+in\s+progress|in\s+progress)\s*$/i, section: 'in_progress' },
  { pattern: /^\s*(companies\s+in\s+pipeline|in\s+pipeline|pipeline)\s*$/i, section: 'pipeline' },
  { pattern: /^\s*(top\s+companies)\s*$/i, section: 'top_companies' },
  { pattern: /^\s*(companies\s+on\s+hold\s+by\s+college|on\s+hold\s+by\s+college)\s*$/i, section: 'on_hold_by_college' },
  { pattern: /^\s*(companies\s+on\s+hold\s+by\s+hr|on\s+hold\s+by\s+hr)\s*$/i, section: 'on_hold_by_hr' },
  { pattern: /^\s*(rejected\s+by\s+college)\s*$/i, section: 'on_hold_by_college' },
  { pattern: /^\s*(rejected\s+by\s+hr)\s*$/i, section: 'rejected_companies' },
  { pattern: /^\s*(rejected\s+companies|companies\s+rejected)\s*$/i, section: 'rejected_companies' },
];

let currentSection = null;
let headerMap = {};

for (let r = 0; r < rawRows.length; r++) {
  const row = rawRows[r];
  if (!row || row.length === 0) continue;

  const strRow = row.map(c => (c !== undefined && c !== null ? String(c).trim() : ''));
  const joinedRow = strRow.filter(Boolean).join(' ').trim();
  if (!joinedRow) continue;

  // Check if section header
  let matchedSection = null;
  for (const sp of SECTION_PATTERNS) {
    if (sp.pattern.test(joinedRow)) {
      matchedSection = sp.section;
      break;
    }
  }

  if (matchedSection) {
    console.log(`[Line ${r+1}] SECTION HEADER: "${joinedRow}" -> ${matchedSection}`);
    currentSection = matchedSection;
    headerMap = {};
    continue;
  }

  // Check if column definition
  if (strRow.some(c => /s\.?\s*no|si\.?\s*no/i.test(c)) && strRow.some(c => /company/i.test(c))) {
    headerMap = {};
    strRow.forEach((colName, colIdx) => {
      const lower = colName.toLowerCase().trim();
      if (/s\.?\s*no|si\.?\s*no/i.test(lower)) {
        headerMap['sNo'] = colIdx;
      } else if (/company\s*type|industry/i.test(lower)) {
        headerMap['companyType'] = colIdx;
      } else if (/company\s*name|^company$/i.test(lower) || (lower.includes('company') && !lower.includes('type'))) {
        headerMap['companyName'] = colIdx;
      } else if (/role|designation|job\s*role/i.test(lower)) {
        headerMap['role'] = colIdx;
      } else if (/ctc|salary|package/i.test(lower)) {
        headerMap['ctc'] = colIdx;
      } else if (/status|remark|notes/i.test(lower)) {
        headerMap['status'] = colIdx;
      } else if (/offers|no\s+of\s+offers|selected/i.test(lower)) {
        headerMap['offers'] = colIdx;
      } else if (/follow\s*up/i.test(lower)) {
        headerMap['followUp'] = colIdx;
      } else if (/batch/i.test(lower)) {
        headerMap['batch'] = colIdx;
      }
    });
    console.log(`[Line ${r+1}] COLUMN MAP:`, headerMap);
    continue;
  }

  if (currentSection) {
    const companyVal = headerMap['companyName'] !== undefined ? strRow[headerMap['companyName']] : strRow[1];
    console.log(`[Line ${r+1}] [${currentSection}] Company: "${companyVal}"`);
  }
}
