import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

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

async function runAudit() {
  console.log('\n===============================================================');
  console.log('🚀 SEPTEMBER DAILY TRACKER FULL RECONCILIATION ENGINE');
  console.log('===============================================================\n');

  const excelPath = 'C:\\Users\\admin\\Downloads\\September Tracker.xlsx';
  const wb = xlsx.readFile(excelPath, { cellDates: true });

  await connectDatabase();

  const allMetadata = await CompanyMetadata.find({ is_deleted: false }).lean();
  console.log(`🏢 Loaded ${allMetadata.length} Active Metadata records from MongoDB.`);

  // Indexes
  const metaByNorm = new Map<string, any[]>();
  const metaByExact = new Map<string, any[]>();
  const metaBySno = new Map<number, any>();

  for (const m of allMetadata) {
    if (m.serial_number) metaBySno.set(m.serial_number, m);
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

  interface ExtractedCall {
    sheetName: string;
    college: string;
    rowNumber: number;
    rawDate: string;
    date: string;
    companyName: string;
    hrName: string;
    phone: string;
    email: string;
    status: string;
    followup: string;
    comments: string;
  }

  const allCalls: ExtractedCall[] = [];
  const collegeBreakdown: Record<string, { totalRows: number; validCalls: number; coordinator: string }> = {};

  for (const sheetName of wb.SheetNames) {
    // Skip summary / aggregated sheets from direct call log extraction (we extract their companies separately if needed)
    if (['Tracker', 'POSITIVES', 'JD RECEIVED'].includes(sheetName)) continue;

    const sheet = wb.Sheets[sheetName];
    const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawRows.length < 2) continue;

    const banner = cleanString(rawRows[0]?.[0]);
    let coordinator = '';
    if (banner.toLowerCase().includes('handled by')) {
      coordinator = banner.replace(/handled by\s*[-:]?/i, '').trim();
    }

    // Identify header row
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

    if (headerIdx === -1) {
      console.warn(`⚠️ Could not detect header row in sheet: ${sheetName}`);
      continue;
    }

    let validCount = 0;
    let currentDate = '';

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      // Check if this row is a date section divider (e.g. "01st September")
      const firstNonEmpty = row.map(cleanString).find((v) => v.length > 0) || '';
      if (
        firstNonEmpty.toLowerCase().includes('september') ||
        firstNonEmpty.toLowerCase().includes('august') ||
        firstNonEmpty.toLowerCase().includes('calling date')
      ) {
        currentDate = firstNonEmpty;
        continue;
      }

      let compName = colMap.company !== undefined ? cleanString(row[colMap.company]) : '';
      let dateVal = colMap.date !== undefined ? cleanString(row[colMap.date]) : currentDate;
      let fieldPhone = colMap.phone !== undefined ? cleanString(row[colMap.phone]) : '';
      let fieldHr = colMap.hr !== undefined ? cleanString(row[colMap.hr]) : '';
      let email = colMap.email !== undefined ? cleanString(row[colMap.email]) : '';
      let status = colMap.status !== undefined ? cleanString(row[colMap.status]) : '';
      let followup = colMap.followup !== undefined ? cleanString(row[colMap.followup]) : '';
      let comments = colMap.comments !== undefined ? cleanString(row[colMap.comments]) : '';

      // Skip non-company rows
      if (!compName || compName.toLowerCase().includes('handled by') || compName.toLowerCase().includes('company name')) {
        continue;
      }

      // Smart column disambiguation between Phone and HR
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

      let dateFormatted = '';
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          dateFormatted = d.toISOString().split('T')[0];
        } else {
          dateFormatted = dateVal;
        }
      }

      allCalls.push({
        sheetName,
        college: sheetName.trim(),
        rowNumber: r + 1,
        rawDate: dateVal,
        date: dateFormatted,
        companyName: compName,
        hrName: hr,
        phone,
        email,
        status,
        followup,
        comments
      });
      validCount++;
    }

    collegeBreakdown[sheetName.trim()] = {
      totalRows: rawRows.length,
      validCalls: validCount,
      coordinator
    };
  }

  console.log(`\n📞 Total Valid Call Logs Extracted Across 22 College Sheets: ${allCalls.length}`);
  console.log('\n🏫 College Call Log Breakdown:');
  for (const [col, stats] of Object.entries(collegeBreakdown)) {
    console.log(`   • ${col.padEnd(15)}: ${String(stats.validCalls).padStart(3)} calls | Handled by: ${stats.coordinator || '—'}`);
  }

  // ── Aggregate by Unique Company ───────────────────────────────────────────
  interface UniqueAgg {
    companyName: string;
    norm: string;
    hrNames: Set<string>;
    mobiles: Set<string>;
    emails: Set<string>;
    calls: ExtractedCall[];
  }

  const aggMap = new Map<string, UniqueAgg>();

  for (const call of allCalls) {
    const norm = normalizeCompanyName(call.companyName);
    if (!norm) continue;

    if (!aggMap.has(norm)) {
      aggMap.set(norm, {
        companyName: call.companyName,
        norm,
        hrNames: new Set(),
        mobiles: new Set(),
        emails: new Set(),
        calls: []
      });
    }

    const agg = aggMap.get(norm)!;
    if (call.hrName && call.hrName !== '—' && call.hrName !== '-') agg.hrNames.add(call.hrName);
    parsePhoneNumbers(call.phone).forEach((p) => agg.mobiles.add(p));
    parseEmails(call.email).forEach((e) => agg.emails.add(e));
    agg.calls.push(call);
  }

  console.log(`\n🏢 Unique Companies Encountered Across All College Calls: ${aggMap.size}`);

  // ── Reconciliation against MongoDB Metadata ───────────────────────────────
  const placeholderEnrichments: any[] = [];
  const completeExistingMatches: any[] = [];
  const notInMetadata: any[] = [];

  for (const [norm, agg] of aggMap.entries()) {
    let matches = metaByNorm.get(norm) || metaByExact.get(agg.companyName.trim().toLowerCase()) || [];

    if (matches.length === 0 && norm.length >= 6) {
      for (const [mNorm, docs] of metaByNorm.entries()) {
        if (mNorm.startsWith(norm) || norm.startsWith(mNorm)) {
          matches = docs;
          break;
        }
      }
    }

    if (matches.length > 0) {
      // Check if it's a placeholder or missing data
      const placeholders = matches.filter((d) => {
        const isSnoPlaceholder = (d.serial_number || 0) >= 3807 && (d.serial_number || 0) <= 3998;
        const isMissingInfo = !d.primary_mobile || !d.hr_name || !d.primary_email;
        return isSnoPlaceholder || isMissingInfo;
      });

      if (placeholders.length > 0) {
        placeholderEnrichments.push({
          trackerCompany: agg.companyName,
          extractedHr: Array.from(agg.hrNames).join(' / ') || '—',
          extractedMobiles: Array.from(agg.mobiles),
          extractedEmails: Array.from(agg.emails),
          matchedMetadataDocs: placeholders.map((p) => ({
            sno: p.serial_number,
            name: p.company_name,
            current_hr: p.hr_name || '—',
            current_mobile: p.primary_mobile || '—',
            current_email: p.primary_email || '—'
          })),
          occurrences: agg.calls.map((c) => `${c.college} (${c.date || 'Sept'})`)
        });
      } else {
        completeExistingMatches.push({
          trackerCompany: agg.companyName,
          metaSno: matches[0].serial_number,
          metaName: matches[0].company_name,
          metaHr: matches[0].hr_name,
          metaMobile: matches[0].primary_mobile,
          metaEmail: matches[0].primary_email,
          totalCalls: agg.calls.length
        });
      }
    } else {
      notInMetadata.push({
        companyName: agg.companyName,
        hrName: Array.from(agg.hrNames).join(' / ') || '—',
        mobile: Array.from(agg.mobiles).join(', ') || '—',
        email: Array.from(agg.emails).join(', ') || '—',
        loggedColleges: Array.from(new Set(agg.calls.map((c) => c.college))).join(', '),
        totalCalls: agg.calls.length,
        sampleComments: agg.calls.find((c) => c.comments)?.comments || '—'
      });
    }
  }

  console.log('\n===============================================================');
  console.log('📊 AUDIT SUMMARY REPORT:');
  console.log('===============================================================');
  console.log(`1. Total September Call Logs Found           : ${allCalls.length}`);
  console.log(`2. Total Unique Companies in Sept Tracker    : ${aggMap.size}`);
  console.log(`3. Existing Complete Metadata Records Matched: ${completeExistingMatches.length}`);
  console.log(`4. Existing Placeholders Ready to Enrich     : ${placeholderEnrichments.length}`);
  console.log(`5. Companies NOT in Metadata Database At All : ${notInMetadata.length}`);
  console.log('===============================================================\n');

  // Save detailed reports to scratch directory
  const outDir = path.resolve(__dirname, '../../../scratch');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'september_tracker_calls.json'),
    JSON.stringify(allCalls, null, 2)
  );

  fs.writeFileSync(
    path.join(outDir, 'september_placeholder_enrichments.json'),
    JSON.stringify(placeholderEnrichments, null, 2)
  );

  fs.writeFileSync(
    path.join(outDir, 'september_not_in_metadata.json'),
    JSON.stringify(notInMetadata, null, 2)
  );

  console.log('✅ Reports generated successfully in /scratch:');
  console.log('   • scratch/september_tracker_calls.json');
  console.log('   • scratch/september_placeholder_enrichments.json');
  console.log('   • scratch/september_not_in_metadata.json\n');

  await disconnectDatabase();
}

runAudit().catch(console.error);
