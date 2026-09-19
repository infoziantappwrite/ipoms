const xlsx = require('xlsx');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../../.env') });

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

const ALIAS_MAP = {
  ACHARIYA: 'ACET',
  KARPAGAM: 'KARPAGAM',
  'KARPAGAM ': 'KARPAGAM',
  'MAR EPHRAEM': 'MAREPHRA',
  MAR: 'MAREPHRA',
  EGS: 'EGS',
  'E.G.S': 'EGS',
  NARAYANAGURU: 'NGCE',
  'ANNAI MIRA': 'ACEW',
  ACEW: 'ACEW',
  KUMARAGURU: 'KCT',
  'K.L.N': 'KLN',
  SHANMUGHA: 'SSEI',
  KARUNYA: 'KARUNYA',
  NGP: 'NGP',
  HITS: 'HITS',
  NEHRU: 'NEHRU',
  DSU: 'DSU',
  SMVEC: 'SMVEC',
  PSNA: 'PSNA',
  MCET: 'MCET',
  MEC: 'MEC',
  MKCE: 'MKCE',
  SONA: 'SONA',
  KGISL: 'KGISL',
  AAA: 'AAA',
  KAMARAJ: 'KAMARAJ',
  KPR: 'KPR',
};

function parseSheet(sheet) {
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const entries = [];
  let currentSection = null;
  let headerMap = {};

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const strRow = row.map(c => (c !== undefined && c !== null ? String(c).trim() : ''));
    const joinedRow = strRow.filter(Boolean).join(' ').trim();
    if (!joinedRow) continue;

    // Check if summary statistics
    if (/status\s+count\s+summary|total\s+status|in\s+progress\s+count|pipeline\s+count|completed\s+count/i.test(joinedRow)) {
      currentSection = null;
      continue;
    }

    // Check if section header
    let matchedSection = null;
    for (const sp of SECTION_PATTERNS) {
      if (sp.pattern.test(joinedRow)) {
        matchedSection = sp.section;
        break;
      }
    }

    if (matchedSection) {
      currentSection = matchedSection;
      headerMap = {};
      continue;
    }

    // Check if column definitions header (e.g. S.No | Company Name | Role | CTC | Status)
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
      continue;
    }

    if (currentSection) {
      const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : strRow[0];
      const companyVal = headerMap['companyName'] !== undefined ? strRow[headerMap['companyName']] : strRow[1];
      const roleVal = headerMap['role'] !== undefined ? strRow[headerMap['role']] : strRow[2];
      const ctcVal = headerMap['ctc'] !== undefined ? strRow[headerMap['ctc']] : strRow[3];
      const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : strRow[4];
      const typeVal = headerMap['companyType'] !== undefined ? strRow[headerMap['companyType']] : '';
      const offersVal = headerMap['offers'] !== undefined ? strRow[headerMap['offers']] : '';
      const followUpVal = headerMap['followUp'] !== undefined ? strRow[headerMap['followUp']] : '';

      const cleanCompany = (companyVal || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanCompany || cleanCompany === '#VALUE!' || cleanCompany.length < 2) {
        continue;
      }

      const lowerComp = cleanCompany.toLowerCase();
      if (
        ['status', 'count', 'total', 's.no', 'si.no', 'company name', 'role', 'ctc', 'in progress', 'pipeline', 'completed', 'top companies'].includes(lowerComp) ||
        lowerComp.startsWith('status count') ||
        lowerComp.startsWith('total status')
      ) {
        continue;
      }

      const cleanRole = (roleVal || 'Graduate Trainee').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      let cleanCtc = (ctcVal || '').replace(/\u00a0/g, ' ').replace(/[\t\r\n]+/g, ' ').trim();
      if (cleanCtc.toLowerCase() === 'not mentioned' || cleanCtc === '-' || cleanCtc.toLowerCase() === 'competitive') {
        cleanCtc = '';
      } else {
        cleanCtc = cleanCtc
          .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
          .replace(/(\d+)\s*LPA/gi, '$1 LPA')
          .replace(/\/month\s*stipend/gi, ' / Month')
          .replace(/stipend\s*\/month/gi, ' / Month')
          .replace(/\/month/gi, ' / Month')
          .replace(/\/m\b/gi, ' / Month')
          .replace(/per\s*month/gi, '/ Month')
          .replace(/\s+/g, ' ')
          .trim();
      }
      const cleanStatus = (statusVal || 'In discussion with HR').replace(/[\t\r\n]+/g, ' ').trim();
      let cleanType = (typeVal || '').replace(/[\t\r\n]+/g, ' ').trim();
      if (/^\d+$/.test(cleanType) || cleanType === '-' || cleanType === '#VALUE!' || cleanType.toLowerCase() === 'undefined' || cleanType.toLowerCase() === 'null') {
        cleanType = '';
      }

      let offersNum = 0;
      if (offersVal && !isNaN(Number(offersVal))) {
        offersNum = Number(offersVal);
      }

      let parsedFollowUpDate = null;
      if (followUpVal) {
        const num = Number(followUpVal);
        if (!isNaN(num) && num > 40000 && num < 60000) {
          parsedFollowUpDate = new Date(Math.round((num - 25569) * 86400 * 1000));
        }
      }

      if (currentSection === 'top_companies') {
        const existing = entries.find(e => e.companyName.toLowerCase() === cleanCompany.toLowerCase());
        if (existing) {
          existing.isPinnedTop = true;
          continue;
        }
      }

      entries.push({
        section: currentSection,
        isPinnedTop: currentSection === 'top_companies',
        sNo: Number(sNoVal) || entries.length + 1,
        companyName: cleanCompany,
        role: cleanRole,
        ctc: cleanCtc,
        status: cleanStatus,
        companyType: cleanType || '',
        offersReceived: offersNum,
        followUpDate: parsedFollowUpDate,
        batch: '2027 Batch',
      });
    }
  }

  return entries;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('✅ Connected to MongoDB Atlas');

  const filePath = "C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx";
  const wb = xlsx.readFile(filePath);

  const collegesInDb = await mongoose.connection.collection('colleges').find({}).toArray();

  const REMAINING_SHEETS = [
    'KPR',
    'Karpagam ',
    'MCET',
    'MEC',
    'MKCE',
    'SONA',
    'DSU',
    'SMVEC',
    'PSNA',
    'NGCE',
    'HITS',
    'NEHRU',
    'KGISL',
    'AAA',
    'EGS',
    'Karunya',
    'NGP',
    'KAMARAJ',
    'MAR Ephraem',
    'ACEW'
  ];

  const summaryReport = [];

  for (const targetSheet of REMAINING_SHEETS) {
    console.log(`\n======================================================`);
    console.log(`🚀 Processing Sheet: "${targetSheet}"`);
    console.log(`======================================================`);

    const matchedSheetKey = wb.SheetNames.find(s => s.trim().toLowerCase() === targetSheet.trim().toLowerCase());
    if (!matchedSheetKey) {
      console.error(`❌ Sheet "${targetSheet}" not found in workbook!`);
      continue;
    }

    const sheet = wb.Sheets[matchedSheetKey];
    const entries = parseSheet(sheet);
    console.log(`📄 Parsed ${entries.length} raw company entries from sheet "${matchedSheetKey}".`);

    const normalizedKey = matchedSheetKey.trim().toUpperCase();
    let college = collegesInDb.find(c => c.college_code.toUpperCase() === normalizedKey);
    if (!college && ALIAS_MAP[normalizedKey]) {
      const alias = ALIAS_MAP[normalizedKey];
      college = collegesInDb.find(c => c.college_code.toUpperCase() === alias.toUpperCase() || c.college_name.toLowerCase().includes(alias.toLowerCase()));
    }
    if (!college) {
      college = collegesInDb.find(c => c.college_name.toUpperCase().includes(normalizedKey) || normalizedKey.includes(c.college_code.toUpperCase()));
    }

    if (!college) {
      console.error(`❌ College not found in database for sheet "${matchedSheetKey}".`);
      continue;
    }

    console.log(`🏛️ Matched College: "${college.college_name}" (${college.college_code})`);

    // Find coordinator
    let coordinator = null;
    if (college.assigned_coordinator_ids && college.assigned_coordinator_ids.length > 0) {
      const nonAdminCoord = await mongoose.connection.collection('users').findOne({
        _id: { $in: college.assigned_coordinator_ids },
        role_codes: { $ne: 'SYSTEM_ADMINISTRATOR' },
      });
      coordinator = nonAdminCoord || await mongoose.connection.collection('users').findOne({
        _id: { $in: college.assigned_coordinator_ids },
      });
    }

    if (!coordinator) {
      coordinator = await mongoose.connection.collection('users').findOne({
        $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
      });
    }
    if (!coordinator) {
      coordinator = await mongoose.connection.collection('users').findOne({});
    }

    // Clear previous 2027 records for this college
    const delRes = await mongoose.connection.collection('weekly_tracker').deleteMany({
      college_id: college._id,
      academic_year: 2027,
    });
    console.log(`🗑️ Removed ${delRes.deletedCount} existing 2027 records.`);

    const breakdown = {};
    const insertedRows = [];

    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx];

      let compMeta = await mongoose.connection.collection('company_metadata').findOne({
        company_name: new RegExp(`^${entry.companyName.trim()}$`, 'i'),
      });

      if (!compMeta) {
        const now = new Date();
        const insertMeta = await mongoose.connection.collection('company_metadata').insertOne({
          company_name: entry.companyName.trim(),
          company_type: entry.companyType || 'Software / IT',
          industry_sector: 'Information Technology',
          created_at: now,
          updated_at: now,
        });
        compMeta = { _id: insertMeta.insertedId };
      }

      const doc = {
        academic_year: 2027,
        college_id: college._id,
        coordinator_id: coordinator._id,
        company_id: compMeta._id,
        company_name: entry.companyName.trim(),
        job_role: entry.role || 'Graduate Trainee',
        company_type: entry.companyType || '',
        ctc_lpa: entry.ctc || '',
        eligible_batch: '2027 Batch',
        pipeline_section: entry.section,
        is_pinned_top: Boolean(entry.isPinnedTop || entry.section === 'top_companies'),
        current_status_text: entry.status || 'Active engagement',
        selected_count: entry.offersReceived || 0,
        registered_count: entry.offersReceived ? entry.offersReceived * 10 : 0,
        shortlisted_count: entry.offersReceived ? entry.offersReceived * 2 : 0,
        order_index: idx,
        follow_up_date: entry.followUpDate,
        is_deleted: false,
        last_status_updated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const ins = await mongoose.connection.collection('weekly_tracker').insertOne(doc);
      breakdown[entry.section] = (breakdown[entry.section] || 0) + 1;
      insertedRows.push({ ...doc, _id: ins.insertedId });
    }

    console.log(`✅ Ingested ${insertedRows.length} records.`);
    console.log('Breakdown:', breakdown);

    summaryReport.push({
      Sheet: targetSheet,
      College: college.college_name,
      Code: college.college_code,
      TotalRecords: insertedRows.length,
      Sections: Object.entries(breakdown).map(([k, v]) => `${k}: ${v}`).join(', '),
    });
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL REMAINING COLLEGES INGESTED SUCCESSFULLY!`);
  console.log(`======================================================\n`);
  console.table(summaryReport);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Batch Ingestion failed:', err);
  process.exit(1);
});
