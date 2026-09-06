import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

// ── College Sheets in the Workbook ──────────────────────────────────────────
const COLLEGE_SHEET_NAMES = [
  'KARPAGAM ', 'KARPAGAM', 'MCET', 'ACET', 'KPR', 'AIHT', 'KAMARAJ',
  'NGP', 'MAR EPHRAEM', 'MKCE', 'ACEW', 'NPR', 'KIOT', 'KLU',
  'SMVEC', 'DSU', 'PSNA', 'SONA', 'NEHRU', 'NGCE', 'HITS', 'AVS', 'KARUNYA'
];

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

// ── Main Deep Parser ────────────────────────────────────────────────────────
async function runDeepAnalysis() {
  console.log('\n===============================================================');
  console.log('🚀 SEPTEMBER WORKBOOK — DEEP COLLEGE SHEET & METADATA AUDIT');
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

  interface ExtractedContact {
    college: string;
    sheetName: string;
    rowNumber: number;
    rawDate: string;
    date: string;
    companyName: string;
    hrName: string;
    phone: string;
    email: string;
    responseStatus: string;
    followUpMonth: string;
    comments: string;
    companyType: string;
  }

  const extractedList: ExtractedContact[] = [];
  const collegeStats: Record<string, { totalRows: number; validContacts: number; coordinator: string }> = {};

  for (const sheetName of wb.SheetNames) {
    const isCollegeSheet = COLLEGE_SHEET_NAMES.some(
      (c) => c.trim().toLowerCase() === sheetName.trim().toLowerCase()
    );
    if (!isCollegeSheet) continue;

    const sheet = wb.Sheets[sheetName];
    const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawRows.length < 2) continue;

    const banner = cleanString(rawRows[0]?.[0]);
    let coordinator = '';
    if (banner.toLowerCase().includes('handled by')) {
      coordinator = banner.replace(/handled by\s*[-:]?/i, '').trim();
    }

    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    // Find the header row (typically row 2, index 1)
    for (let r = 0; r < Math.min(5, rawRows.length); r++) {
      const row = rawRows[r];
      const rowStr = row.map(cleanString).join(' ').toLowerCase();
      if (rowStr.includes('company') || rowStr.includes('contact') || rowStr.includes('mail')) {
        headerRowIdx = r;
        row.forEach((cell: any, cIdx: number) => {
          const cName = cleanString(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cName.includes('company')) colMap.company = cIdx;
          else if (cName.includes('date') || cName.includes('callingdate')) colMap.date = cIdx;
          else if (cName.includes('time')) colMap.time = cIdx;
          else if (cName.includes('hr') || cName.includes('person') || cName.includes('spoc')) colMap.hr = cIdx;
          else if (cName.includes('contact') || cName.includes('phone') || cName.includes('mobile') || cName.includes('num')) colMap.phone = cIdx;
          else if (cName.includes('mail') || cName.includes('email')) colMap.email = cIdx;
          else if (cName.includes('status') || cName.includes('response') || cName.includes('outcome')) colMap.status = cIdx;
          else if (cName.includes('follow') || cName.includes('month')) colMap.followup = cIdx;
          else if (cName.includes('comment') || cName.includes('remark') || cName.includes('feedback')) colMap.comments = cIdx;
          else if (cName.includes('type')) colMap.type = cIdx;
        });
        break;
      }
    }

    let validCount = 0;

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      let companyName = colMap.company !== undefined ? cleanString(row[colMap.company]) : '';
      let dateVal = colMap.date !== undefined ? cleanString(row[colMap.date]) : '';
      let fieldA = colMap.phone !== undefined ? cleanString(row[colMap.phone]) : '';
      let fieldB = colMap.hr !== undefined ? cleanString(row[colMap.hr]) : '';
      let email = colMap.email !== undefined ? cleanString(row[colMap.email]) : '';
      let status = colMap.status !== undefined ? cleanString(row[colMap.status]) : '';
      let followup = colMap.followup !== undefined ? cleanString(row[colMap.followup]) : '';
      let comments = colMap.comments !== undefined ? cleanString(row[colMap.comments]) : '';
      let compType = colMap.type !== undefined ? cleanString(row[colMap.type]) : '';

      // Skip empty or divider rows
      if (!companyName && !fieldA && !fieldB && !email) continue;
      if (companyName.toLowerCase().includes('handled by') || companyName.toLowerCase().includes('company name')) continue;

      // Disambiguate Phone vs HR Name if columns are swapped or mixed
      let phone = '';
      let hrName = '';

      if (isPhoneNumber(fieldA) && !isPhoneNumber(fieldB)) {
        phone = fieldA;
        hrName = fieldB;
      } else if (isPhoneNumber(fieldB) && !isPhoneNumber(fieldA)) {
        phone = fieldB;
        hrName = fieldA;
      } else {
        phone = fieldA;
        hrName = fieldB;
      }

      // If email was placed in fieldA or fieldB
      if (isEmail(fieldA) && !email) email = fieldA;
      if (isEmail(fieldB) && !email) email = fieldB;

      // Standardize date string
      let formattedDate = '';
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split('T')[0];
        } else {
          formattedDate = dateVal;
        }
      }

      if (companyName) {
        extractedList.push({
          college: sheetName.trim(),
          sheetName,
          rowNumber: r + 1,
          rawDate: dateVal,
          date: formattedDate,
          companyName,
          hrName,
          phone,
          email,
          responseStatus: status,
          followUpMonth: followup,
          comments,
          companyType: compType
        });
        validCount++;
      }
    }

    collegeStats[sheetName.trim()] = {
      totalRows: rawRows.length,
      validContacts: validCount,
      coordinator
    };
  }

  console.log(`\n📊 Extracted Total Logged Daily Call Records: ${extractedList.length}`);
  console.log('\n🏫 College-Wise Daily Tracker Summary:');
  for (const [col, stat] of Object.entries(collegeStats)) {
    if (stat.validContacts > 0) {
      console.log(`   • ${col.padEnd(14)}: ${String(stat.validContacts).padStart(3)} call rows | Coordinator: ${stat.coordinator || '—'}`);
    }
  }

  // ── Group by Unique Companies from Tracker ────────────────────────────────
  interface AggregatedCompany {
    companyName: string;
    norm: string;
    hrNames: Set<string>;
    mobiles: Set<string>;
    emails: Set<string>;
    records: ExtractedContact[];
  }

  const trackerMap = new Map<string, AggregatedCompany>();

  for (const item of extractedList) {
    const norm = normalizeCompanyName(item.companyName);
    if (!norm) continue;

    if (!trackerMap.has(norm)) {
      trackerMap.set(norm, {
        companyName: item.companyName,
        norm,
        hrNames: new Set(),
        mobiles: new Set(),
        emails: new Set(),
        records: []
      });
    }

    const c = trackerMap.get(norm)!;
    if (item.hrName && item.hrName !== '—' && item.hrName !== '-') c.hrNames.add(item.hrName);
    parsePhoneNumbers(item.phone).forEach((p) => c.mobiles.add(p));
    parseEmails(item.email).forEach((e) => c.emails.add(e));
    c.records.push(item);
  }

  console.log(`\n🏢 Unique Companies Encountered Across All College Sheets: ${trackerMap.size}`);

  // ── Reconciliation with Metadata Database ─────────────────────────────────
  const placeholderEnrichments: any[] = [];
  const completeMatches: any[] = [];
  const notInMetadataList: any[] = [];

  for (const [norm, c] of trackerMap.entries()) {
    let matches = metaByNorm.get(norm) || metaByExact.get(c.companyName.trim().toLowerCase()) || [];

    // Prefix/Fuzzy match fallback
    if (matches.length === 0 && norm.length >= 6) {
      for (const [mNorm, docs] of metaByNorm.entries()) {
        if (mNorm.startsWith(norm) || norm.startsWith(mNorm)) {
          matches = docs;
          break;
        }
      }
    }

    if (matches.length > 0) {
      // Check if any matched metadata doc is a placeholder or has missing info
      const placeholders = matches.filter((d) => {
        const isSnoPlaceholder = (d.serial_number || 0) >= 3807 && (d.serial_number || 0) <= 3998;
        const isMissingInfo = !d.primary_mobile || !d.hr_name || !d.primary_email;
        return isSnoPlaceholder || isMissingInfo;
      });

      if (placeholders.length > 0) {
        placeholderEnrichments.push({
          trackerCompany: c.companyName,
          hrNames: Array.from(c.hrNames),
          mobiles: Array.from(c.mobiles),
          emails: Array.from(c.emails),
          matchedPlaceholders: placeholders.map((p) => ({
            sno: p.serial_number,
            name: p.company_name,
            current_hr: p.hr_name || '—',
            current_mobile: p.primary_mobile || '—',
            current_email: p.primary_email || '—'
          })),
          occurrences: c.records.map((r) => `${r.college} (${r.date || 'Sept'})`)
        });
      } else {
        completeMatches.push({
          trackerCompany: c.companyName,
          metaSno: matches[0].serial_number,
          metaName: matches[0].company_name,
          occurrencesCount: c.records.length
        });
      }
    } else {
      notInMetadataList.push({
        companyName: c.companyName,
        hrName: Array.from(c.hrNames).join(' / ') || '—',
        mobile: Array.from(c.mobiles).join(', ') || '—',
        email: Array.from(c.emails).join(', ') || '—',
        loggedColleges: Array.from(new Set(c.records.map((r) => r.college))).join(', '),
        latestDate: c.records[c.records.length - 1]?.date || 'September 2026',
        sampleComments: c.records.find((r) => r.comments)?.comments || '—',
        totalCalls: c.records.length
      });
    }
  }

  console.log('\n===============================================================');
  console.log('🏁 FINAL AUDIT SUMMARY:');
  console.log('===============================================================');
  console.log(`1. Total College Call Records in Sept Tracker : ${extractedList.length}`);
  console.log(`2. Unique Companies in Sept Tracker          : ${trackerMap.size}`);
  console.log(`3. Complete Metadata Matches (No action need) : ${completeMatches.length}`);
  console.log(`4. Existing Placeholders to Enrich           : ${placeholderEnrichments.length}`);
  console.log(`5. Companies NOT in Metadata Database        : ${notInMetadataList.length}`);
  console.log('===============================================================\n');

  // Write out comprehensive results
  const outPath = path.resolve(__dirname, '../../../scratch/september_deep_audit.json');
  fs.writeFileSync(outPath, JSON.stringify({
    stats: {
      totalExtractedCalls: extractedList.length,
      uniqueCompanies: trackerMap.size,
      completeMatches: completeMatches.length,
      placeholderEnrichments: placeholderEnrichments.length,
      notInMetadataCount: notInMetadataList.length
    },
    collegeStats,
    placeholderEnrichments,
    notInMetadataList
  }, null, 2));

  console.log(`💾 Full Audit Output Saved to: ${outPath}`);

  await disconnectDatabase();
}

runDeepAnalysis().catch(console.error);
