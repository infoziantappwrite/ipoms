import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import mongoose, { Types } from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { DailyTracker, CallOutcome } from '../models/DailyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import { connectDatabase, disconnectDatabase } from '../config/database';

// ── Smart Normalizers ───────────────────────────────────────────────────────
function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/private\s+limited/gi, 'pvt ltd')
    .replace(/pvt\.\s*ltd\.?/gi, 'pvt ltd')
    .replace(/limited/gi, 'ltd')
    .replace(/ltd\.?/gi, 'ltd')
    .replace(/technologies/gi, 'tech')
    .replace(/technology/gi, 'tech')
    .replace(/solutions/gi, 'sol')
    .replace(/services/gi, 'serv')
    .replace(/india/gi, '')
    .replace(/inc\.?/gi, '')
    .replace(/corp\.?/gi, '')
    .replace(/llp\.?/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

function cleanString(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function parsePhoneNumbers(val: any): string[] {
  const raw = cleanString(val);
  if (!raw || raw === '—' || raw === '-' || raw === 'N/A' || raw === 'nil') return [];
  return raw
    .split(/[,;\/\n\r]+/)
    .map((p) => p.replace(/[^\d+]/g, '').trim())
    .filter((p) => p.length >= 7 && p.length <= 15);
}

function parseEmails(val: any): string[] {
  const raw = cleanString(val);
  if (!raw || raw === '—' || raw === '-' || raw === 'N/A' || raw === 'nil') return [];
  return raw
    .split(/[,;\/\s\n\r]+/)
    .map((e) => e.trim().toLowerCase().replace(/^mailto:/, ''))
    .filter((e) => e.includes('@') && e.includes('.'));
}

function isPhoneNumber(val: any): boolean {
  const raw = cleanString(val);
  const digits = raw.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 13 && !raw.includes('@');
}

function isEmail(val: any): boolean {
  const raw = cleanString(val);
  return raw.includes('@') && raw.includes('.');
}

function formatFollowUpMonth(val: string): string | null {
  if (!val) return null;
  const s = val.trim().toLowerCase();
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const matched = months.find((m) => s.includes(m));
  if (matched) {
    return matched.charAt(0).toUpperCase() + matched.slice(1);
  }
  return null;
}

function mapOutcome(status: string, comments: string): CallOutcome {
  const s = (status || '').toLowerCase().trim();
  const c = (comments || '').toLowerCase().trim();
  const combined = `${s} ${c}`;

  if (combined.includes('jd received') || combined.includes('jd shared') || combined.includes('shared jd')) {
    return 'jd_received';
  }
  if (combined.includes('invite mail') || combined.includes('invite shared') || combined.includes('mail shared') || combined.includes('shared mail')) {
    return 'invite_mail';
  }
  if (combined.includes('drive completed')) {
    return 'drive_completed';
  }
  if (combined.includes('freeze') || combined.includes('freezed')) {
    return 'hiring_freezed';
  }
  if (combined.includes('completed') && (combined.includes('hiring') || combined.includes('process'))) {
    return 'hiring_completed';
  }
  if (combined.includes('invalid') || combined.includes('wrong number') || combined.includes('wrong contact') || combined.includes('not working') || combined.includes('not correct')) {
    return 'invalid';
  }
  if (combined.includes('not hiring') || combined.includes('stopped hiring') || combined.includes('no hiring') || combined.includes('not looking') || combined.includes('not interested') || combined.includes('not intrested')) {
    return 'not_hiring';
  }
  if (combined.includes('call back') || combined.includes('follow up') || combined.includes('will get back') || combined.includes('later') || combined.includes('next drive') || combined.includes('upcoming drive') || combined.includes('busy')) {
    return 'follow_up';
  }
  if (combined.includes('in connect') || combined.includes('connected')) {
    return 'in_connect';
  }
  if (combined.includes('hiring') && !combined.includes('not hiring')) {
    return 'hiring';
  }
  if (combined.includes('no response') || combined.includes('didnt answer') || combined.includes('not answer') || combined.includes('disconnect') || combined.includes('ringing') || combined.includes('not reachable') || combined.includes('switch off')) {
    return 'no_response';
  }
  return 'no_response';
}

// ── 12 New Companies to Add (Excluding "Sedin") ─────────────────────────────
const NEW_COMPANIES_TO_ADD = [
  {
    company_name: 'Azentio Software Private Limited',
    hr_name: 'Parvathi Aravindh',
    hr_designation: 'Lead – Talent Acquisition',
    primary_mobile: '9791042771',
    mobile_numbers: ['9791042771'],
    primary_email: 'parvathi.aravindh@azentio.com',
    email_ids: ['parvathi.aravindh@azentio.com'],
    company_type: 'software'
  },
  {
    company_name: 'Optiver',
    hr_name: 'Geetanjali Sharma',
    primary_mobile: '9818104989',
    mobile_numbers: ['9818104989'],
    company_type: 'software'
  },
  {
    company_name: 'Hitachi Energy (Direct Contact)',
    hr_name: 'Serena Fernandes',
    primary_mobile: '9987493642',
    mobile_numbers: ['9987493642', '8591420245'],
    company_type: 'core_engineering'
  },
  {
    company_name: 'GEP Worldwide',
    hr_name: 'Prasanna',
    primary_mobile: '+919943155320',
    mobile_numbers: ['+919943155320'],
    company_type: 'software'
  },
  {
    company_name: 'IMC Trading',
    hr_name: 'Kamlesh J',
    primary_mobile: '7709075143',
    mobile_numbers: ['7709075143'],
    company_type: 'banking'
  },
  {
    company_name: 'Edveon Technologies',
    hr_name: 'Hariharan',
    primary_mobile: '9884289222',
    mobile_numbers: ['9884289222'],
    company_type: 'software'
  },
  {
    company_name: 'Infotech Systems',
    hr_name: 'Karunanithi',
    primary_mobile: '9840883086',
    mobile_numbers: ['9840883086'],
    company_type: 'software'
  },
  {
    company_name: 'MulticoreWare Inc',
    hr_name: 'Swetha Srinivasan',
    primary_mobile: '9380801094',
    mobile_numbers: ['9380801094'],
    company_type: 'software'
  },
  {
    company_name: 'Srinisoft Technologies',
    hr_name: '',
    primary_mobile: '7299715255',
    mobile_numbers: ['7299715255'],
    company_type: 'software'
  },
  {
    company_name: 'Pravega Semi Private Limited',
    hr_name: '',
    primary_mobile: '9019959713',
    mobile_numbers: ['9019959713'],
    company_type: 'core_engineering'
  },
  {
    company_name: 'Pratt & Whitney',
    hr_name: '',
    primary_mobile: '8067370000',
    mobile_numbers: ['8067370000'],
    company_type: 'core_engineering'
  },
  {
    company_name: 'Molex India Business Services Pvt Ltd',
    hr_name: '',
    primary_mobile: '9711984665',
    mobile_numbers: ['9711984665'],
    company_type: 'core_engineering'
  }
];

// ── Main Execution Function ─────────────────────────────────────────────────

async function executeSeptemberIngestion() {
  console.log('\n===============================================================');
  console.log('🚀 FULL INGESTION & PLACEHOLDER ENRICHMENT: SEPTEMBER TRACKER');
  console.log('===============================================================\n');

  await connectDatabase();

  const excelPath = 'C:\\Users\\admin\\Downloads\\September Tracker.xlsx';
  const wb = xlsx.readFile(excelPath, { cellDates: true });

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: ADD THE 12 NEW COMPANIES (EXCLUDING SEDIN)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('📦 STEP 1: Adding 12 New Companies into company_metadata');
  console.log('───────────────────────────────────────────────────────────────');

  const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
    .sort({ serial_number: -1 })
    .select('serial_number');

  let nextSerial = (highestDoc?.serial_number || 3998) + 1;
  let addedCount = 0;

  for (const comp of NEW_COMPANIES_TO_ADD) {
    const existing = await CompanyMetadata.findOne({
      company_name: { $regex: new RegExp(`^${comp.company_name}$`, 'i') },
      is_deleted: false,
    });

    if (existing) {
      console.log(`   ℹ️ Company "${comp.company_name}" already exists at S.No #${existing.serial_number}. Updating details...`);
      await CompanyMetadata.updateOne(
        { _id: existing._id },
        {
          $set: {
            hr_name: comp.hr_name || existing.hr_name,
            primary_mobile: comp.primary_mobile || existing.primary_mobile,
            primary_email: comp.primary_email || existing.primary_email,
            updated_at: new Date()
          },
          $addToSet: {
            mobile_numbers: { $each: comp.mobile_numbers || [] },
            email_ids: { $each: comp.email_ids || [] }
          }
        }
      );
    } else {
      await CompanyMetadata.create({
        serial_number: nextSerial,
        company_name: comp.company_name,
        hr_name: comp.hr_name || '',
        hr_designation: comp.hr_designation || '',
        primary_mobile: comp.primary_mobile || '',
        mobile_numbers: comp.mobile_numbers || [],
        primary_email: comp.primary_email || '',
        email_ids: comp.email_ids || [],
        company_type: comp.company_type || 'other',
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`   ✅ Inserted S.No #${nextSerial}: "${comp.company_name}" (HR: ${comp.hr_name || '—'}, Phone: ${comp.primary_mobile || '—'})`);
      nextSerial++;
      addedCount++;
    }
  }
  console.log(`✨ Total New Companies Created: ${addedCount}`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: LOAD REFRESHED METADATA & PARSE ALL COLLEGE SHEETS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('🔄 STEP 2: Parsing September Tracker & Enriching Placeholders');
  console.log('───────────────────────────────────────────────────────────────');

  const allMetadata = await CompanyMetadata.find({ is_deleted: false }).lean();
  console.log(`🏢 Active Metadata Catalog Size: ${allMetadata.length} records`);

  const metaByNorm = new Map<string, any[]>();
  const metaByExact = new Map<string, any[]>();

  for (const m of allMetadata) {
    const norm = normalizeCompanyName(m.company_name);
    if (norm) {
      if (!metaByNorm.has(norm)) metaByNorm.set(norm, []);
      metaByNorm.get(norm)!.push(m);
    }
    const exact = m.company_name.trim().toLowerCase();
    if (exact) {
      if (!metaByExact.has(exact)) metaByExact.set(exact, []);
      metaByExact.get(exact)!.push(m);
    }
  }

  // Parse calls from all college sheets
  interface ParsedCall {
    sheetName: string;
    collegeName: string;
    rowIndex: number;
    rawDate: string;
    sessionDate: Date;
    companyName: string;
    hrName: string;
    phone: string;
    email: string;
    status: string;
    followup: string;
    comments: string;
    outcome: CallOutcome;
  }

  const parsedCalls: ParsedCall[] = [];
  const uniqueCompanies = new Map<string, { companyName: string; hrNames: Set<string>; mobiles: Set<string>; emails: Set<string> }>();

  for (const sheetName of wb.SheetNames) {
    if (['Tracker', 'POSITIVES', 'JD RECEIVED'].includes(sheetName)) continue;

    const sheet = wb.Sheets[sheetName];
    const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawRows.length < 2) continue;

    let headerIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const row = rawRows[r];
      const rowJoined = row.map(cleanString).join(' ').toLowerCase();
      if (rowJoined.includes('company') || rowJoined.includes('contact') || rowJoined.includes('mail')) {
        headerIdx = r;
        row.forEach((cell: any, cIdx: number) => {
          const key = cleanString(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (key === 'companytype' || key === 'type') {
            colMap.type = cIdx;
          } else if (key.includes('company') || key === 'name' || key.includes('corporate') || key.includes('organization')) {
            if (colMap.company === undefined) colMap.company = cIdx;
          } else if (key.includes('date') || key.includes('callingdate')) {
            colMap.date = cIdx;
          } else if (key.includes('time')) {
            colMap.time = cIdx;
          } else if (key.includes('hr') || key.includes('spoc') || key.includes('person') || key.includes('contactperson')) {
            colMap.hr = cIdx;
          } else if (key.includes('contact') || key.includes('phone') || key.includes('mobile') || key.includes('num')) {
            colMap.phone = cIdx;
          } else if (key.includes('mail') || key.includes('email')) {
            colMap.email = cIdx;
          } else if (key.includes('status') || key.includes('response') || key.includes('outcome')) {
            colMap.status = cIdx;
          } else if (key.includes('follow') || key.includes('month')) {
            colMap.followup = cIdx;
          } else if (key.includes('comment') || key.includes('remark') || key.includes('feedback')) {
            colMap.comments = cIdx;
          }
        });
        break;
      }
    }

    if (headerIdx === -1) continue;

    let currentDateStr = '2026-09-01';

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const firstVal = row.map(cleanString).find((v) => v.length > 0) || '';
      if (firstVal.toLowerCase().includes('september') || firstVal.toLowerCase().includes('august')) {
        currentDateStr = firstVal;
        continue;
      }

      let compName = colMap.company !== undefined ? cleanString(row[colMap.company]) : '';
      let dateVal = colMap.date !== undefined ? cleanString(row[colMap.date]) : currentDateStr;
      let fieldPhone = colMap.phone !== undefined ? cleanString(row[colMap.phone]) : '';
      let fieldHr = colMap.hr !== undefined ? cleanString(row[colMap.hr]) : '';
      let email = colMap.email !== undefined ? cleanString(row[colMap.email]) : '';
      let status = colMap.status !== undefined ? cleanString(row[colMap.status]) : '';
      let followup = colMap.followup !== undefined ? cleanString(row[colMap.followup]) : '';
      let comments = colMap.comments !== undefined ? cleanString(row[colMap.comments]) : '';

      if (!compName || compName.toLowerCase().includes('handled by') || compName.toLowerCase().includes('company name')) {
        continue;
      }

      let phone = '';
      let hr = '';

      if (isPhoneNumber(fieldPhone) && !isPhoneNumber(fieldHr)) {
        phone = fieldPhone;
        hr = fieldHr;
      } else if (isPhoneNumber(fieldHr) && !isPhoneNumber(fieldPhone)) {
        phone = fieldHr;
        hr = fieldPhone;
      } else {
        phone = fieldPhone;
        hr = fieldHr;
      }

      if (isEmail(fieldPhone) && !email) email = fieldPhone;
      if (isEmail(fieldHr) && !email) email = fieldHr;

      let sessionDate = new Date('2026-09-01T00:00:00.000Z');
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          sessionDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        }
      }

      const outcome = mapOutcome(status, comments);

      parsedCalls.push({
        sheetName,
        collegeName: sheetName.trim(),
        rowIndex: r + 1,
        rawDate: dateVal,
        sessionDate,
        companyName: compName,
        hrName: hr,
        phone,
        email,
        status,
        followup,
        comments,
        outcome
      });

      const norm = normalizeCompanyName(compName);
      if (norm) {
        if (!uniqueCompanies.has(norm)) {
          uniqueCompanies.set(norm, {
            companyName: compName,
            hrNames: new Set(),
            mobiles: new Set(),
            emails: new Set()
          });
        }
        const u = uniqueCompanies.get(norm)!;
        if (hr && hr !== '—' && hr !== '-') u.hrNames.add(hr);
        parsePhoneNumbers(phone).forEach((p) => u.mobiles.add(p));
        parseEmails(email).forEach((e) => u.emails.add(e));
      }
    }
  }

  console.log(`📞 Total Valid Calls Extracted: ${parsedCalls.length}`);
  console.log(`🏢 Total Unique Companies Encountered: ${uniqueCompanies.size}`);

  // Now enrich placeholders
  let enrichedPlaceholdersCount = 0;

  for (const [norm, u] of uniqueCompanies.entries()) {
    let matches = metaByNorm.get(norm) || metaByExact.get(u.companyName.trim().toLowerCase()) || [];

    if (matches.length === 0 && norm.length >= 6) {
      for (const [mNorm, docs] of metaByNorm.entries()) {
        if (mNorm.startsWith(norm) || norm.startsWith(mNorm)) {
          matches = docs;
          break;
        }
      }
    }

    if (matches.length > 0) {
      for (const metaDoc of matches) {
        // Enrich if it is a placeholder or missing phone/hr/email
        const isPlaceholder = (metaDoc.serial_number || 0) >= 3807 && (metaDoc.serial_number || 0) <= 3998;
        const isMissingInfo = !metaDoc.primary_mobile || !metaDoc.hr_name || !metaDoc.primary_email;

        if (isPlaceholder || isMissingInfo) {
          const hrList = Array.from(u.hrNames);
          const mobList = Array.from(u.mobiles);
          const emailList = Array.from(u.emails);

          const newHr = hrList[0] || metaDoc.hr_name || '';
          const newPhone = mobList[0] || metaDoc.primary_mobile || '';
          const newEmail = emailList[0] || metaDoc.primary_email || '';

          const combinedMobiles = Array.from(new Set([
            ...(metaDoc.mobile_numbers || []),
            ...mobList,
            newPhone
          ].filter(Boolean)));

          const combinedEmails = Array.from(new Set([
            ...(metaDoc.email_ids || []),
            ...emailList,
            newEmail
          ].filter(Boolean)));

          const updateObj: Record<string, any> = {
            updated_at: new Date()
          };

          if (newHr && !metaDoc.hr_name) updateObj.hr_name = newHr;
          if (newPhone && !metaDoc.primary_mobile) updateObj.primary_mobile = newPhone;
          if (newEmail && !metaDoc.primary_email) updateObj.primary_email = newEmail;
          if (combinedMobiles.length > 0) updateObj.mobile_numbers = combinedMobiles;
          if (combinedEmails.length > 0) updateObj.email_ids = combinedEmails;

          await CompanyMetadata.updateOne({ _id: metaDoc._id }, { $set: updateObj });
          enrichedPlaceholdersCount++;
        }
      }
    }
  }

  console.log(`✨ Total Placeholder / Incomplete Records Enriched: ${enrichedPlaceholdersCount}`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: MAP COLLEGES & COORDINATORS AND INGEST DAILY TRACKER CALLS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('📥 STEP 3: Ingesting September Call Logs into DailyTracker');
  console.log('───────────────────────────────────────────────────────────────');

  // Load all colleges
  const allColleges = await College.find({}).lean();
  const collegeMap = new Map<string, any>();
  for (const col of allColleges) {
    collegeMap.set(col.college_code.toUpperCase(), col);
    collegeMap.set(col.college_name.toUpperCase(), col);
    collegeMap.set(normalizeCompanyName(col.college_name), col);
  }

  // Load admin/default user for fallback coordinator_id
  const defaultAdmin = await User.findOne({}).sort({ created_at: 1 }).lean();
  const defaultUserId = defaultAdmin?._id || new mongoose.Types.ObjectId();

  // Reload metadata lookup
  const freshMetadata = await CompanyMetadata.find({ is_deleted: false }).lean();
  const metaMap = new Map<string, any>();
  for (const m of freshMetadata) {
    metaMap.set(normalizeCompanyName(m.company_name), m);
    metaMap.set(m.company_name.trim().toLowerCase(), m);
  }

  // Group calls by College and Date
  const callsByCollegeAndDate = new Map<string, ParsedCall[]>();

  for (const call of parsedCalls) {
    const key = `${call.collegeName}__${call.sessionDate.toISOString().split('T')[0]}`;
    if (!callsByCollegeAndDate.has(key)) callsByCollegeAndDate.set(key, []);
    callsByCollegeAndDate.get(key)!.push(call);
  }

  console.log(`📅 Unique (College × Session Date) Batches: ${callsByCollegeAndDate.size}`);

  let totalInsertedCalls = 0;

  for (const [batchKey, calls] of callsByCollegeAndDate.entries()) {
    const [collegeNameStr, dateStr] = batchKey.split('__');

    // Resolve College
    let colDoc = collegeMap.get(collegeNameStr.toUpperCase()) || collegeMap.get(normalizeCompanyName(collegeNameStr));
    
    // Fuzzy matching if not direct
    if (!colDoc) {
      for (const [cKey, cVal] of collegeMap.entries()) {
        if (cKey.includes(collegeNameStr.toUpperCase()) || collegeNameStr.toUpperCase().includes(cKey)) {
          colDoc = cVal;
          break;
        }
      }
    }

    if (!colDoc) {
      // Create college record if missing
      console.log(`   🏫 College "${collegeNameStr}" not found in DB. Creating college record...`);
      const newCol = await College.create({
        college_code: collegeNameStr.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
        college_name: collegeNameStr,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      colDoc = newCol.toObject();
      collegeMap.set(collegeNameStr.toUpperCase(), colDoc);
    }

    const collegeId = colDoc._id;
    const sessionDate = calls[0].sessionDate;
    const year = sessionDate.getUTCFullYear();
    const month = sessionDate.getUTCMonth() + 1;
    const day = sessionDate.getUTCDate();

    // Find coordinator assigned or default
    const coordinatorId = colDoc.assigned_coordinator_id || defaultUserId;

    // Delete existing records for this specific college and date to ensure idempotent, clean insertion
    await DailyTracker.deleteMany({
      college_id: collegeId,
      session_date: sessionDate
    });

    const docsToInsert = [];
    let serialNo = 1;

    for (const call of calls) {
      const norm = normalizeCompanyName(call.companyName);
      let metaDoc = metaMap.get(norm) || metaMap.get(call.companyName.trim().toLowerCase());

      if (!metaDoc && norm.length >= 6) {
        for (const [mNorm, doc] of metaMap.entries()) {
          if (mNorm.startsWith(norm) || norm.startsWith(mNorm)) {
            metaDoc = doc;
            break;
          }
        }
      }

      const companyId = metaDoc?._id || new mongoose.Types.ObjectId();
      const resolvedCompanyName = metaDoc?.company_name || call.companyName;
      const hrName = call.hrName || metaDoc?.hr_name || '—';
      const mobileNumber = call.phone || metaDoc?.primary_mobile || '9999999999';
      const emailId = call.email || metaDoc?.primary_email || '';

      docsToInsert.push({
        coordinator_id: coordinatorId,
        college_id: collegeId,
        company_id: companyId,
        company_name: resolvedCompanyName,
        hr_name: hrName,
        mobile_number: mobileNumber,
        email_id: emailId,
        year,
        month,
        day,
        session_date: sessionDate,
        outcome_status: call.outcome,
        follow_up_month: formatFollowUpMonth(call.followup),
        comments: call.comments || '',
        serial_no: serialNo++,
        is_finalized: true,
        is_skipped: false,
        created_at: sessionDate,
        updated_at: sessionDate
      });
    }

    if (docsToInsert.length > 0) {
      await DailyTracker.insertMany(docsToInsert);
      totalInsertedCalls += docsToInsert.length;
      console.log(`   ✅ Ingested ${docsToInsert.length} calls for "${collegeNameStr}" on ${dateStr}`);
    }
  }

  console.log('\n===============================================================');
  console.log('🎉 INGESTION & ENRICHMENT COMPLETE!');
  console.log('===============================================================');
  console.log(`1. New Metadata Companies Inserted : ${addedCount}`);
  console.log(`2. Placeholder Records Enriched     : ${enrichedPlaceholdersCount}`);
  console.log(`3. Total September Daily Calls Saved: ${totalInsertedCalls}`);
  console.log('===============================================================\n');

  await disconnectDatabase();
}

executeSeptemberIngestion().catch(console.error);
