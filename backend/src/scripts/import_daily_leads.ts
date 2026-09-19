import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';
import { DailyLead } from '../models/DailyLead';
import { CompanyMetadata } from '../models/CompanyMetadata';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const filePath = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/CALL\s+POSTIVES\s*-\s*/i, '').replace(/CALL\s+POSITIVES\s*-\s*/i, '').trim();
  
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
  }

  const parts = clean.split(/[-/]/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const monthStr = parts[1].toLowerCase();
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    let month = months[monthStr.substring(0, 3)];
    if (month === undefined) {
      month = parseInt(parts[0]) - 1;
    }
    const year = parts.length >= 3 ? (parseInt(parts[2]) < 100 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])) : 2026;
    return new Date(Date.UTC(year, month, day || 1, 0, 0, 0));
  }

  return null;
}

export async function importDailyLeads() {
  await connectDatabase();

  console.log('🚀 [Import] Starting Daily Leads Import from Excel...');

  const allColleges = await College.find({ is_deleted: { $ne: true } }).lean();
  const allUsers = await User.find({ is_deleted: { $ne: true } }).lean();
  const allCompanies = await CompanyMetadata.find({ is_deleted: { $ne: true } }).select('_id company_name').lean();

  const collegeByCode = new Map<string, any>();
  allColleges.forEach(c => collegeByCode.set(c.college_code.toUpperCase(), c));

  const companyMap = new Map<string, any>();
  allCompanies.forEach(c => {
    if (c.company_name) {
      companyMap.set(c.company_name.toLowerCase().trim(), c._id);
    }
  });

  const collegeAliases: Record<string, string> = {
    'MAR EPHRAEM': 'MAREPHRA',
    'MAR EPHREAM': 'MAREPHRA',
    'KGISL': 'KGISL',
    'ACET': 'ACET',
    'SONA': 'SONA',
    'KARPAGAM': 'KARPAGAM',
    'SMVEC': 'SMVEC',
    'PSNA': 'PSNA',
    'DSU': 'DSU',
    'KLU': 'KLU',
    'KIOT': 'KIOT',
    'NPR': 'NPR',
    'KPR': 'KPR',
    'AIHT': 'AIHT',
    'ACEW': 'ACEW',
    'HITS': 'HITS',
    'NEHRU': 'NEHRU',
    'NGCE': 'NGCE',
    'NGP': 'NGP',
    'MCET': 'MCET',
    'MEC': 'MEC',
    'MKCE': 'MKCE',
    'KAMARAJ': 'KAMARAJ',
    'KARUNYA': 'KARUNYA',
    'AVS': 'AVS',
    'AAA': 'AAA',
    'SSEI': 'SSEI',
    'EGS': 'EGS',
  };

  const OFFICIAL_MAP: Record<string, string> = {
    'KARPAGAM': 'mohanaradha_a@infoziant.com',
    'AIHT': 'mohanaradha_a@infoziant.com',
    'ACET': 'mohanaradha_a@infoziant.com',
    'KPR': 'mohanaradha_a@infoziant.com',
    'NEHRU': 'sujitha_s@infoziant.com',
    'SONA': 'sujitha_s@infoziant.com',
    'MAREPHRA': 'sujitha_s@infoziant.com',
    'MKCE': 'sujitha_s@infoziant.com',
    'KARUNYA': 'sujitha_s@infoziant.com',
    'AVS': 'sujitha_s@infoziant.com',
    'AAA': 'sujitha_s@infoziant.com',
    'KGISL': 'sujitha_s@infoziant.com',
    'SSEI': 'sujitha_s@infoziant.com',
    'HITS': 'sujitha_s@infoziant.com',
    'EGS': 'sujitha_s@infoziant.com',
    'PSNA': 'thirisha_r@infoziant.com',
    'DSU': 'thirisha_r@infoziant.com',
    'SMVEC': 'thirisha_r@infoziant.com',
    'KLU': 'malavika_ramesh@infoziant.com',
    'NGCE': 'malavika_ramesh@infoziant.com',
    'NPR': 'lizenya_r@infoziant.com',
    'KIOT': 'lizenya_r@infoziant.com',
    'ACEW': 'lizenya_r@infoziant.com',
    'NGP': 'megaladevi_ps@infoziant.com',
    'KAMARAJ': 'megaladevi_ps@infoziant.com',
    'MCET': 'seshmitha_tamil@icl.today',
    'MEC': 'seshmitha_tamil@icl.today',
  };

  const userByEmail = new Map<string, any>();
  allUsers.forEach(u => userByEmail.set(u.official_email.toLowerCase(), u));
  const adminUser = allUsers.find(u => u.role_codes?.includes('ADMINISTRATOR')) || allUsers[0];

  function matchCoordinator(coordName: string, collegeCode: string): any {
    if (coordName) {
      const q = coordName.toLowerCase().trim();
      const matched = allUsers.find(u => {
        const full = u.full_name.toLowerCase();
        const user = u.username.toLowerCase();
        return full.includes(q) || user.includes(q) || q.includes(user) || (q === 'suji' && user.includes('sujitha'));
      });
      if (matched) return matched;
    }

    const email = OFFICIAL_MAP[collegeCode];
    if (email && userByEmail.has(email.toLowerCase())) {
      return userByEmail.get(email.toLowerCase());
    }

    return adminUser;
  }

  function parseCollegeAndCoordinator(rawCollegeStr: string): { collegeObj: any; coordinatorObj: any } {
    const cleanStr = (rawCollegeStr || '').trim();
    let coordName = '';

    const match = cleanStr.match(/^([^(]+)(?:\(([^)]+)\))?$/);
    let colNamePart = cleanStr;
    if (match) {
      colNamePart = match[1].trim();
      coordName = (match[2] || '').trim();
    }

    let code = colNamePart.toUpperCase();
    if (collegeAliases[code]) {
      code = collegeAliases[code];
    }

    const collegeObj = collegeByCode.get(code) || null;
    const coordinatorObj = matchCoordinator(coordName, code);

    return { collegeObj, coordinatorObj };
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });

  // 1. Process POSITIVES (From 19-Aug-2026 / row 405+)
  const posSheet = workbook.Sheets['POSITIVES'] || workbook.Sheets['POSITIVE'];
  const posData: any[][] = XLSX.utils.sheet_to_json(posSheet, { header: 1, raw: false });

  let currentDate: Date | null = null;
  const docsToInsert: any[] = [];

  for (let i = 0; i < posData.length; i++) {
    const row = posData[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();
    if (firstCell.startsWith('CALL POSTIVES') || firstCell.startsWith('CALL POSITIVES')) {
      currentDate = parseDate(firstCell);
      continue;
    }
    if (firstCell === 'SI.NO') continue;

    if (i < 404) continue; // Start from 19-Aug-2026

    const companyName = String(row[2] || '').trim();
    if (!companyName) continue;

    const role = String(row[3] || '').trim() || 'Graduate Trainee / SDE';
    const ctc = String(row[4] || '').trim() || 'Not Disclosed';
    const batch = String(row[5] || '2027').trim();
    const rawCollege = String(row[6] || '').trim();
    const eventTime = String(row[1] || '').trim() || '10:00 AM';

    const { collegeObj, coordinatorObj } = parseCollegeAndCoordinator(rawCollege);
    if (!collegeObj) continue;

    const companyId = companyMap.get(companyName.toLowerCase().trim()) || undefined;

    docsToInsert.push({
      lead_type: 'positive',
      lead_date: currentDate || new Date('2026-08-19'),
      event_time: eventTime,
      company_name: companyName,
      company_id: companyId,
      job_role: role,
      ctc: ctc,
      eligible_batch: batch,
      college_id: collegeObj._id,
      coordinator_id: coordinatorObj._id,
      remarks: `Imported from Positive Tracker — Date: ${currentDate?.toLocaleDateString() || '19-Aug-2026'}`,
      is_moved_to_jd: false,
      is_finalized: false,
      is_deleted: false,
    });
  }

  // 2. Process JD RECEIVED (From Row 151 / 19-Aug-2026+)
  const jdSheet = workbook.Sheets['JD RECEIVED'];
  const jdData: any[][] = XLSX.utils.sheet_to_json(jdSheet, { header: 1, raw: false });

  let currentJdDate: Date | null = null;

  for (let i = 0; i < jdData.length; i++) {
    const row = jdData[i];
    if (!row || row.length === 0) continue;

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (cellVal.startsWith('CALL POSTIVES') || cellVal.match(/^\d{1,2}[-/]\w+[-/]?\d{0,4}$/)) {
        const d = parseDate(cellVal);
        if (d) currentJdDate = d;
      }
    }

    const firstCell = String(row[0] || '').trim();
    if (firstCell === 'SI.NO') continue;

    if (i < 150) continue; // Start from Row 151 (19-Aug-2026)

    const companyName = String(row[2] || '').trim();
    if (!companyName) continue;

    const role = String(row[3] || '').trim() || 'Role / JD Received';
    const ctc = String(row[4] || '').trim() || 'Not Disclosed';
    
    let colVal = String(row[5] || '').trim();
    let batchVal = String(row[6] || '').trim();

    if (colVal.includes('202') || colVal.includes('Batch')) {
      const temp = colVal;
      colVal = batchVal;
      batchVal = temp;
    }

    const eventTime = String(row[1] || '').trim() || '11:00 AM';
    const { collegeObj, coordinatorObj } = parseCollegeAndCoordinator(colVal);
    if (!collegeObj) continue;

    const companyId = companyMap.get(companyName.toLowerCase().trim()) || undefined;

    docsToInsert.push({
      lead_type: 'jd_received',
      lead_date: currentJdDate || new Date('2026-08-19'),
      event_time: eventTime,
      company_name: companyName,
      company_id: companyId,
      job_role: role,
      ctc: ctc,
      eligible_batch: batchVal || '2027',
      college_id: collegeObj._id,
      coordinator_id: coordinatorObj._id,
      remarks: `Imported from JD Received Tracker — Date: ${currentJdDate?.toLocaleDateString() || '19-Aug-2026'}`,
      is_moved_to_jd: true,
      is_finalized: false,
      is_deleted: false,
    });
  }

  console.log(`📦 Prepared ${docsToInsert.length} DailyLead records for insertion.`);
  const inserted = await DailyLead.insertMany(docsToInsert);
  console.log(`✅ Successfully inserted ${inserted.length} Daily Leads into MongoDB!`);

  const [posCount, jdCount] = await Promise.all([
    DailyLead.countDocuments({ lead_type: 'positive', is_deleted: false }),
    DailyLead.countDocuments({ lead_type: 'jd_received', is_deleted: false }),
  ]);

  console.log('\n==============================================');
  console.log(' DATABASE DAILY LEADS STATUS AFTER IMPORT');
  console.log('==============================================');
  console.log(`1. Daily Leads — Positives Tab:   ${posCount} records`);
  console.log(`2. Daily Leads — JD Received Tab: ${jdCount} records`);
  console.log(`3. Total Daily Leads:             ${posCount + jdCount} records`);
  console.log('==============================================');

  await disconnectDatabase();
}

if (require.main === module) {
  importDailyLeads()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Import failed:', err);
      process.exit(1);
    });
}
