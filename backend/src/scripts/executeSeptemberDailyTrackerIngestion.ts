import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { DailyTracker, CallOutcome } from '../models/DailyTracker';
import { syncLeadFromDailyTracker } from '../lib/activeLeadRoutes';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDateCell(val: any, defaultYear = 2026, defaultMonth = 9): { sessionDate: Date; year: number; month: number; day: number } | null {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) {
      const yr = parsed.y || defaultYear;
      const mo = parsed.m || defaultMonth;
      const dy = parsed.d || 1;
      const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
      return { sessionDate, year: yr, month: mo, day: dy };
    }
  }

  if (val instanceof Date) {
    const istTime = new Date(val.getTime() + 5.5 * 3600 * 1000);
    const yr = istTime.getUTCFullYear();
    const mo = istTime.getUTCMonth() + 1;
    const dy = istTime.getUTCDate();
    const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
    return { sessionDate, year: yr, month: mo, day: dy };
  }

  const str = String(val).trim();
  if (!str) return null;

  const monthNames: { [k: string]: number } = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };

  const ordinalMatch = str.match(/(\d{1,2})(?:st|nd|rd|th)?[ -]+([a-zA-Z]+)/i);
  if (ordinalMatch) {
    const dy = parseInt(ordinalMatch[1], 10);
    const mStr = ordinalMatch[2].toLowerCase();
    if (monthNames[mStr]) {
      const yr = defaultYear;
      const mo = monthNames[mStr];
      const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
      return { sessionDate, year: yr, month: mo, day: dy };
    }
  }

  const alphaFirstMatch = str.match(/([a-zA-Z]+)[ -]+(\d{1,2})(?:st|nd|rd|th)?/i);
  if (alphaFirstMatch) {
    const mStr = alphaFirstMatch[1].toLowerCase();
    const dy = parseInt(alphaFirstMatch[2], 10);
    if (monthNames[mStr]) {
      const yr = defaultYear;
      const mo = monthNames[mStr];
      const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
      return { sessionDate, year: yr, month: mo, day: dy };
    }
  }

  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const yr = parseInt(isoMatch[1], 10);
    const mo = parseInt(isoMatch[2], 10);
    const dy = parseInt(isoMatch[3], 10);
    const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
    return { sessionDate, year: yr, month: mo, day: dy };
  }

  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const dy = parseInt(ddmmyyyy[1], 10);
    const mo = parseInt(ddmmyyyy[2], 10);
    const yr = parseInt(ddmmyyyy[3], 10);
    const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
    return { sessionDate, year: yr, month: mo, day: dy };
  }

  return null;
}

function parseTimeCell(val: any, baseDate: Date): Date | null {
  if (val === null || val === undefined || val === '') return null;

  let hours = 0;
  let minutes = 0;

  if (typeof val === 'number') {
    if (val < 1.0) {
      const totalMinutes = Math.round(val * 24 * 60);
      hours = Math.floor(totalMinutes / 60) % 24;
      minutes = totalMinutes % 60;
    } else {
      const integerPart = Math.floor(val);
      const decimalPart = Math.round((val - integerPart) * 100);
      hours = integerPart < 12 ? integerPart + 12 : integerPart;
      minutes = decimalPart;
    }
  } else if (val instanceof Date) {
    const ist = new Date(val.getTime() + 5.5 * 3600 * 1000);
    hours = ist.getUTCHours();
    minutes = ist.getUTCMinutes();
  } else {
    const str = String(val).trim();
    if (!str) return null;

    const match = str.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toLowerCase() : null;

      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      hours = h;
      minutes = m;
    } else {
      return null;
    }
  }

  const result = new Date(baseDate);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

const VALID_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function normalizeFollowUpMonth(raw: string | null | undefined, outcome: CallOutcome | null): { month: string | null; extraComment?: string } {
  if (outcome !== 'follow_up') {
    return { month: null, extraComment: raw && raw.trim() ? raw.trim() : undefined };
  }

  if (!raw || !raw.trim()) {
    return { month: 'September' };
  }

  const trimmed = raw.trim();
  const match = VALID_MONTHS.find(m => m.toLowerCase() === trimmed.toLowerCase() || trimmed.toLowerCase().includes(m.toLowerCase()));
  if (match) {
    return { month: match };
  }

  return { month: 'September', extraComment: trimmed };
}

function normalizeOutcome(raw: string): { outcome: CallOutcome | null; inferredMonth?: string | null } {
  if (!raw || !raw.trim()) return { outcome: null };
  const s = raw.trim().toLowerCase();

  if (s.includes('invite') || s.includes('requirement') || s.includes('send invite')) {
    return { outcome: 'invite_mail' };
  }
  if (s.includes('no response') || s.includes('no resoponse') || s.includes('not connected') || s === 'nr' || s.includes('busy') || s.includes('switched off') || s.includes('forwarded') || s.includes('not allowed') || s.includes('didnt')) {
    return { outcome: 'no_response' };
  }
  if (s.includes('not hiring') || s.includes('not looking') || s.includes('hospitality') || s.includes('arts')) {
    return { outcome: 'not_hiring' };
  }
  if (s.includes('hiring completed') || s.includes('hiring over')) {
    return { outcome: 'hiring_completed' };
  }
  if (s.includes('hiring freezed')) {
    return { outcome: 'hiring_freezed' };
  }
  if (s.includes('drive completed')) {
    return { outcome: 'drive_completed' };
  }
  if (s.includes('call back') || s.includes('get back') || s.includes('cal back')) {
    return { outcome: 'call_back' };
  }
  if (s.includes('follow') || s.includes('remainder') || s.includes('future') || s.includes('upcoming') || s.includes('next year') || s.includes('yet  to start') || s.includes('waiting for')) {
    return { outcome: 'follow_up' };
  }
  if (s.includes('in connect') || s.includes('in_connect')) {
    return { outcome: 'in_connect' };
  }
  if (s.includes('invalid') || s.includes('wrong') || s.includes('closed') || s.includes('not an hr') || s.includes('changed')) {
    return { outcome: 'invalid' };
  }
  if (s.includes('jd received') || s.includes('jd_received')) {
    return { outcome: 'jd_received' };
  }
  if (s.includes('hiring')) {
    return { outcome: 'hiring' };
  }

  return { outcome: null };
}

const VALID_COMPANY_TYPES = new Set([
  'software',
  'it_services',
  'product',
  'bpo',
  'banking',
  'finance',
  'ai',
  'edtech',
  'pharma',
  'medical',
  'core_engineering',
  'construction',
  'consulting',
  'other',
]);

function normalizeCompanyType(raw: string): string {
  if (!raw) return 'other';
  const cleaned = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (VALID_COMPANY_TYPES.has(cleaned)) return cleaned;
  if (cleaned.includes('software') || cleaned.includes('it')) return 'software';
  if (cleaned.includes('bank')) return 'banking';
  if (cleaned.includes('finance')) return 'finance';
  if (cleaned.includes('construct')) return 'construction';
  if (cleaned.includes('core') || cleaned.includes('engineer') || cleaned.includes('automotive')) return 'core_engineering';
  if (cleaned.includes('edu')) return 'edtech';
  if (cleaned.includes('health') || cleaned.includes('pharma') || cleaned.includes('medic')) return 'pharma';
  if (cleaned.includes('consult')) return 'consulting';
  if (cleaned.includes('bpo')) return 'bpo';
  if (cleaned.includes('product')) return 'product';
  return 'other';
}

export async function ingestAllCollegeTrackers() {
  await connectDatabase();
  void User;

  const allColleges = await College.find({ is_deleted: { $ne: true } }).lean();
  const collegeMap = new Map<string, any>();
  allColleges.forEach((c: any) => {
    collegeMap.set(c.college_code.trim().toUpperCase(), c);
    collegeMap.set(c.college_name.trim().toUpperCase(), c);
  });
  if (collegeMap.has('MAREPHRA')) {
    collegeMap.set('MAR EPHRAEM', collegeMap.get('MAREPHRA'));
  }

  const allUsers = await User.find({ is_active: { $ne: false } }).lean();
  const userMap = new Map<string, any>();
  allUsers.forEach((u: any) => {
    userMap.set(u.official_email.toLowerCase(), u);
    userMap.set(u.username.toLowerCase(), u);
    userMap.set(u.full_name.toLowerCase(), u);
  });

  const coordinatorNameMap: { [k: string]: string } = {
    'mohana': 'mohanaradha_a@infoziant.com',
    'mohanaradha': 'mohanaradha_a@infoziant.com',
    'a.mohanaradha': 'mohanaradha_a@infoziant.com',
    'thirisha': 'thirisha_r@infoziant.com',
    'thrisha': 'thirisha_r@infoziant.com',
    'malavika': 'malavika_ramesh@infoziant.com',
    'lizenya': 'lizenya_r@infoziant.com',
    'lizenya s': 'lizenya_r@infoziant.com',
    'suji': 'sujitha_s@infoziant.com',
    'sujitha': 'sujitha_s@infoziant.com',
    'megala': 'megaladevi_ps@infoziant.com',
    'megala devi': 'megaladevi_ps@infoziant.com',
    'seshmitha': 'seshmitha_tamil@icl.today',
    'seshmith': 'seshmitha_tamil@icl.today',
    'tamil selvi': 'seshmitha_tamil@icl.today',
    'tamil': 'seshmitha_tamil@icl.today',
  };

  const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
  const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];

  console.log(`\n================ STARTING FULL DAILY TRACKER INGESTION ================`);

  const summaryResults: any[] = [];
  let totalOverallInserted = 0;
  let totalOverallUpdated = 0;

  for (let i = 0; i < wb.SheetNames.length; i++) {
    const sheetName = wb.SheetNames[i];
    const prop = sheetProps[i];
    const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
    if (isHidden) {
      console.log(`⏩ Skipping hidden sheet: "${sheetName}"`);
      continue;
    }

    const trimmed = sheetName.trim().toUpperCase();
    if (['POSITIVES', 'JD RECEIVED', 'TRACKER', 'SUMMARY'].includes(trimmed)) {
      console.log(`⏩ Skipping non-college tracker sheet: "${sheetName}"`);
      continue;
    }

    let college = collegeMap.get(trimmed);
    if (!college) {
      const matchKey = Array.from(collegeMap.keys()).find(k => trimmed.includes(k) || k.includes(trimmed));
      if (matchKey) college = collegeMap.get(matchKey);
    }

    if (!college) {
      console.log(`⏩ Skipping unmatched sheet: "${sheetName}"`);
      continue;
    }

    const sheet = wb.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Determine Coordinator from Row 0 or Row 1 or College Assigned Coordinator
    const headerRow0 = String(json[0]?.join(' ') || '');
    const headerRow1 = String(json[1]?.join(' ') || '');
    const combinedHeader = `${headerRow0} ${headerRow1}`.toLowerCase();
    let coordinatorUser = null;

    for (const [key, email] of Object.entries(coordinatorNameMap)) {
      if (combinedHeader.includes(key)) {
        coordinatorUser = userMap.get(email);
        break;
      }
    }

    if (!coordinatorUser) {
      // Find non-admin coordinator who has this college assigned
      coordinatorUser = allUsers.find((u: any) =>
        !u.role_codes?.includes('ADMINISTRATOR') &&
        (u.assigned_college_ids || []).some((id: any) => String(id) === String(college._id))
      );
    }

    if (!coordinatorUser) {
      coordinatorUser = userMap.get('placement_management@infoziant.com');
    }

    console.log(`\n🏫 Ingesting [${college.college_code}] ${college.college_name} | Coordinator: ${coordinatorUser.full_name} (${coordinatorUser.official_email})`);

    let lastParsedDate = {
      sessionDate: new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0)),
      year: 2026,
      month: 9,
      day: 1,
    };

    let inserted = 0;
    let updated = 0;
    let skippedEmpty = 0;

    // Detect header row index (usually row 1 or row 2 for MEC)
    let startDataRow = 2;
    for (let r = 0; r < Math.min(4, json.length); r++) {
      const rowStr = (json[r] || []).join(' ').toLowerCase();
      if (rowStr.includes('company name') || rowStr.includes('contact num') || rowStr.includes('contact number')) {
        startDataRow = r + 1;
        break;
      }
    }

    for (let r = startDataRow; r < json.length; r++) {
      const row = json[r];
      const rawDate = row[1];
      const rawTime = row[2];
      let rawCompany = String(row[3] || '').trim();
      let rawContact = String(row[4] || '').trim();
      let rawHr = String(row[5] || '').trim();
      let rawEmail = String(row[6] || '').trim().toLowerCase();
      let rawStatus = String(row[7] || '').trim();
      let rawFollowUpMonth = String(row[8] || '').trim();
      let rawComments = String(row[9] || '').trim();
      let rawCompanyType = String(row[10] || '').trim();

      // Check if it's a section divider row like "01st September"
      if (rawCompany.toLowerCase().includes('september') && !rawContact && !rawHr) {
        const dObj = parseDateCell(rawCompany);
        if (dObj) {
          lastParsedDate = dObj;
        }
        continue;
      }

      // Check for shifted row format (e.g. DEXIAN in row[1])
      if (!rawCompany && typeof row[1] === 'string' && row[1].trim() && !parseDateCell(row[1])) {
        rawCompany = String(row[1]).trim();
        rawHr = String(row[2] || '').trim();
        rawContact = String(row[3] || '').trim();
        rawEmail = String(row[4] || '').trim().toLowerCase();
      }

      // If still empty company, check if phone/email exists to infer or skip
      if (!rawCompany) {
        if (rawEmail.includes('rntbci') || rawContact === '9003213177') {
          rawCompany = 'Renault Nissan (RNTBCI)';
          rawHr = rawHr || 'Anchaneyalu KN';
        } else {
          // If no company name at all, update date if present and skip row
          const dateObj = parseDateCell(rawDate);
          if (dateObj) lastParsedDate = dateObj;
          skippedEmpty++;
          continue;
        }
      }

      // Parse date or inherit
      const dateObj = parseDateCell(rawDate);
      if (dateObj) {
        lastParsedDate = dateObj;
      }
      const { sessionDate, year, month, day } = lastParsedDate;

      // Parse time
      const callStartTime = parseTimeCell(rawTime, sessionDate);

      // Outcome
      const { outcome, inferredMonth } = normalizeOutcome(rawStatus);
      const { month: finalFollowUpMonth, extraComment } = normalizeFollowUpMonth(rawFollowUpMonth || inferredMonth, outcome);
      const finalComments = [rawComments, extraComment].filter(Boolean).join(' | ');

      // Company Metadata
      let comp = await CompanyMetadata.findOne({
        company_name: { $regex: new RegExp(`^${escapeRegex(rawCompany)}$`, 'i') },
        is_deleted: false,
      });

      const mobList = rawContact ? rawContact.split(/[,;/]+/).map(s => s.trim()).filter(Boolean) : [];
      const emailList = rawEmail ? rawEmail.split(/[,;/]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];

      if (!comp) {
        const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
          .sort({ serial_number: -1 })
          .select('serial_number');
        const nextSerial = (highestDoc?.serial_number || 0) + 1;

        comp = await CompanyMetadata.create({
          serial_number: nextSerial,
          company_name: rawCompany,
          hr_name: rawHr || 'HR Contact',
          primary_mobile: mobList[0] || '',
          mobile_numbers: mobList,
          primary_email: emailList[0] || '',
          email_ids: emailList,
          company_type: normalizeCompanyType(rawCompanyType),
          notes: `Imported from ${college.college_code} September Tracker on ${new Date().toLocaleDateString('en-IN')}`,
        });
      } else {
        let metaUpdated = false;
        if (rawHr && rawHr !== comp.hr_name && (!comp.hr_name || comp.hr_name === 'HR Contact')) {
          comp.hr_name = rawHr;
          metaUpdated = true;
        }
        for (const mob of mobList) {
          if (!comp.mobile_numbers.includes(mob)) {
            comp.mobile_numbers.push(mob);
            metaUpdated = true;
          }
        }
        if (!comp.primary_mobile && mobList[0]) {
          comp.primary_mobile = mobList[0];
          metaUpdated = true;
        }
        for (const em of emailList) {
          if (!comp.email_ids.includes(em)) {
            comp.email_ids.push(em);
            metaUpdated = true;
          }
        }
        if (!comp.primary_email && emailList[0]) {
          comp.primary_email = emailList[0];
          metaUpdated = true;
        }
        if (metaUpdated) {
          await comp.save();
        }
      }

      const mobileNumToSave = rawContact || comp.primary_mobile || (mobList[0] || 'Not Provided');

      const existingTracker = await DailyTracker.findOne({
        college_id: college._id,
        coordinator_id: coordinatorUser._id,
        company_name: rawCompany,
        mobile_number: mobileNumToSave,
        session_date: sessionDate,
      });

      if (existingTracker) {
        existingTracker.hr_name = rawHr || comp.hr_name || 'HR Contact';
        existingTracker.mobile_number = mobileNumToSave;
        existingTracker.email_id = rawEmail || comp.primary_email || '';
        existingTracker.call_start_time = callStartTime || existingTracker.call_start_time;
        existingTracker.outcome_status = outcome || existingTracker.outcome_status;
        existingTracker.follow_up_month = finalFollowUpMonth;
        existingTracker.comments = finalComments || existingTracker.comments;
        await existingTracker.save();
        updated++;
      } else {
        const newTracker = await DailyTracker.create({
          coordinator_id: coordinatorUser._id,
          college_id: college._id,
          company_id: comp._id,
          company_name: rawCompany,
          hr_name: rawHr || comp.hr_name || 'HR Contact',
          mobile_number: mobileNumToSave,
          email_id: rawEmail || comp.primary_email || '',
          call_start_time: callStartTime,
          outcome_status: outcome,
          follow_up_month: finalFollowUpMonth,
          comments: finalComments,
          year,
          month,
          day,
          session_date: sessionDate,
          is_skipped: false,
          is_promoted_to_weekly: false,
          is_finalized: false,
          save_count: 0,
          duplicate_acknowledged: false,
        });

        if (newTracker.outcome_status && newTracker.company_name) {
          syncLeadFromDailyTracker({
            company_name: newTracker.company_name,
            call_outcome: newTracker.outcome_status,
            remarks: newTracker.comments,
            coordinator_id: newTracker.coordinator_id,
            college_id: newTracker.college_id,
            daily_tracker_id: newTracker._id,
          }).catch(() => {});
        }

        inserted++;
      }
    }

    totalOverallInserted += inserted;
    totalOverallUpdated += updated;

    summaryResults.push({
      college_code: college.college_code,
      college_name: college.college_name,
      coordinator: coordinatorUser.full_name,
      total_rows: inserted + updated,
      inserted,
      updated,
    });
  }

  console.log(`\n================ FULL INGESTION COMPLETE ================`);
  console.log(`Total Inserted: ${totalOverallInserted}`);
  console.log(`Total Updated: ${totalOverallUpdated}`);
  console.log(`Total Processed: ${totalOverallInserted + totalOverallUpdated}`);
  console.table(summaryResults);

  await disconnectDatabase();
}

if (require.main === module) {
  ingestAllCollegeTrackers().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
