import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { College } from '../models/College';
import { connectDatabase, disconnectDatabase } from '../config/database';

// ── Normalization Helpers ───────────────────────────────────────────────────

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
  if (!raw) return [];
  return raw
    .split(/[,;\/\n\r]+/)
    .map((p) => p.replace(/[^\d+]/g, '').trim())
    .filter((p) => p.length >= 7);
}

function parseEmails(val: any): string[] {
  const raw = cleanString(val);
  if (!raw) return [];
  return raw
    .split(/[,;\/\s\n\r]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@') && e.includes('.'));
}

// ── Main Analysis Function ──────────────────────────────────────────────────

async function analyzeSeptemberTracker() {
  console.log('\n===============================================================');
  console.log('📊 SEPTEMBER DAILY TRACKER DEEP ANALYSIS & RECONCILIATION');
  console.log('===============================================================\n');

  const possiblePaths = [
    'C:\\Users\\admin\\Downloads\\September Tracker.xlsx',
    path.resolve(__dirname, '../../../September Tracker.xlsx'),
    path.resolve(__dirname, '../../September Tracker.xlsx')
  ];

  let excelPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }

  if (!excelPath) {
    console.error(`❌ Could not locate "September Tracker.xlsx" at any of: \n${possiblePaths.join('\n')}`);
    process.exit(1);
  }

  console.log(`📖 Loading Workbook: ${excelPath}`);
  const workbook = xlsx.readFile(excelPath, { cellDates: true });
  console.log(`📑 Sheets Detected (${workbook.SheetNames.length}):`, workbook.SheetNames);

  await connectDatabase();

  // 1. Fetch all colleges for matching sheet names or college columns
  const colleges = await College.find({ is_active: true }).lean();
  console.log(`🏫 Active Colleges in System: ${colleges.length}`);

  // 2. Fetch all metadata records
  const allMetadata = await CompanyMetadata.find({ is_deleted: false }).lean();
  console.log(`🏢 Active Company Metadata Records: ${allMetadata.length}`);

  // Build metadata lookup indexes
  const metaByNorm = new Map<string, any[]>();
  const metaByExactName = new Map<string, any[]>();
  const metaBySno = new Map<number, any>();

  for (const meta of allMetadata) {
    if (meta.serial_number) {
      metaBySno.set(meta.serial_number, meta);
    }
    const norm = normalizeCompanyName(meta.company_name);
    if (norm) {
      if (!metaByNorm.has(norm)) metaByNorm.set(norm, []);
      metaByNorm.get(norm)!.push(meta);
    }
    const exact = meta.company_name.trim().toLowerCase();
    if (exact) {
      if (!metaByExactName.has(exact)) metaByExactName.set(exact, []);
      metaByExactName.get(exact)!.push(meta);
    }
  }

  // 3. Parse each sheet
  interface ParsedRow {
    sheetName: string;
    rowIndex: number;
    rawRow: any;
    companyName: string;
    hrName: string;
    primaryMobile: string;
    mobileNumbers: string[];
    primaryEmail: string;
    emailIds: string[];
    dateStr?: string;
    outcome?: string;
    comments?: string;
    collegeName?: string;
  }

  const allRows: ParsedRow[] = [];
  const sheetSummaries: Record<string, any> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawJson: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
    
    sheetSummaries[sheetName] = {
      rowCount: rawJson.length,
      sampleHeaders: rawJson.length > 0 ? Object.keys(rawJson[0]) : []
    };

    rawJson.forEach((row, idx) => {
      // Find company name from various possible column header keys
      let companyName = '';
      let hrName = '';
      let phone = '';
      let email = '';
      let dateStr = '';
      let outcome = '';
      let comments = '';
      let collegeName = '';

      for (const key of Object.keys(row)) {
        const k = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const val = cleanString(row[key]);
        if (!val) continue;

        if (k.includes('company') || k === 'name' || k.includes('organization') || k.includes('corporate')) {
          companyName = val;
        } else if (k.includes('hr') || k.includes('contactperson') || k.includes('spoc')) {
          hrName = val;
        } else if (k.includes('mobile') || k.includes('phone') || k.includes('contact') || k.includes('number')) {
          phone = val;
        } else if (k.includes('email') || k.includes('mail')) {
          email = val;
        } else if (k.includes('date') || k.includes('callingdate')) {
          dateStr = val;
        } else if (k.includes('outcome') || k.includes('status') || k.includes('response') || k.includes('callstatus')) {
          outcome = val;
        } else if (k.includes('comment') || k.includes('remark') || k.includes('note') || k.includes('feedback')) {
          comments = val;
        } else if (k.includes('college') || k.includes('institution') || k.includes('campus')) {
          collegeName = val;
        }
      }

      if (companyName) {
        const mobiles = parsePhoneNumbers(phone);
        const emails = parseEmails(email);
        allRows.push({
          sheetName,
          rowIndex: idx + 2,
          rawRow: row,
          companyName,
          hrName,
          primaryMobile: mobiles[0] || phone,
          mobileNumbers: mobiles,
          primaryEmail: emails[0] || email,
          emailIds: emails,
          dateStr,
          outcome,
          comments,
          collegeName: collegeName || sheetName
        });
      }
    });
  }

  console.log(`\n📋 Total Company Rows Extracted Across Sheets: ${allRows.length}`);
  console.log('\n📑 Sheet Breakdown:');
  for (const [name, summary] of Object.entries(sheetSummaries)) {
    console.log(`   • Sheet "${name}": ${summary.rowCount} rows. Headers: [${summary.sampleHeaders.slice(0, 6).join(', ')}${summary.sampleHeaders.length > 6 ? '...' : ''}]`);
  }

  // 4. Reconciliation against Metadata
  interface UniqueCompanyContact {
    companyName: string;
    normalizedName: string;
    hrName: string;
    mobiles: Set<string>;
    emails: Set<string>;
    appearances: { sheet: string; date?: string; row: number; college?: string }[];
  }

  const uniqueCompanies = new Map<string, UniqueCompanyContact>();

  for (const row of allRows) {
    const norm = normalizeCompanyName(row.companyName);
    if (!norm) continue;

    if (!uniqueCompanies.has(norm)) {
      uniqueCompanies.set(norm, {
        companyName: row.companyName,
        normalizedName: norm,
        hrName: row.hrName,
        mobiles: new Set(),
        emails: new Set(),
        appearances: []
      });
    }

    const entry = uniqueCompanies.get(norm)!;
    if (row.hrName && !entry.hrName) entry.hrName = row.hrName;
    if (row.primaryMobile) entry.mobiles.add(row.primaryMobile);
    row.mobileNumbers.forEach((m) => entry.mobiles.add(m));
    if (row.primaryEmail) entry.emails.add(row.primaryEmail);
    row.emailIds.forEach((e) => entry.emails.add(e));
    entry.appearances.push({
      sheet: row.sheetName,
      date: row.dateStr,
      row: row.rowIndex,
      college: row.collegeName
    });
  }

  console.log(`\n🏢 Unique Company Names in September Tracker: ${uniqueCompanies.size}`);

  // Categorize
  const matchedPlaceholders: any[] = [];
  const matchedComplete: any[] = [];
  const notInMetadata: any[] = [];

  for (const [norm, entry] of uniqueCompanies.entries()) {
    // Try exact match or normalized match
    let matchDocs = metaByNorm.get(norm) || metaByExactName.get(entry.companyName.trim().toLowerCase()) || [];

    // Fuzzy prefix fallback if no direct match
    if (matchDocs.length === 0 && norm.length >= 5) {
      for (const [metaNorm, docs] of metaByNorm.entries()) {
        if (metaNorm.startsWith(norm) || norm.startsWith(metaNorm)) {
          matchDocs = docs;
          break;
        }
      }
    }

    if (matchDocs.length > 0) {
      const isPlaceholder = matchDocs.some((d) => {
        const isSnoPlaceholder = (d.serial_number || 0) >= 3807 && (d.serial_number || 0) <= 3998;
        const isMissingInfo = !d.primary_mobile || !d.hr_name || !d.primary_email;
        return isSnoPlaceholder || isMissingInfo;
      });

      if (isPlaceholder) {
        matchedPlaceholders.push({
          trackerCompany: entry.companyName,
          hrName: entry.hrName,
          mobiles: Array.from(entry.mobiles),
          emails: Array.from(entry.emails),
          matchedMetaDocs: matchDocs.map((d) => ({
            _id: d._id,
            sno: d.serial_number,
            name: d.company_name,
            hr_name: d.hr_name,
            primary_mobile: d.primary_mobile,
            primary_email: d.primary_email
          })),
          appearances: entry.appearances
        });
      } else {
        matchedComplete.push({
          trackerCompany: entry.companyName,
          matchedMeta: matchDocs[0],
          appearancesCount: entry.appearances.length
        });
      }
    } else {
      notInMetadata.push({
        trackerCompany: entry.companyName,
        hrName: entry.hrName,
        mobiles: Array.from(entry.mobiles),
        emails: Array.from(entry.emails),
        appearances: entry.appearances
      });
    }
  }

  console.log('\n===============================================================');
  console.log('📊 RECONCILIATION SUMMARY:');
  console.log('===============================================================');
  console.log(`✅ Matched Complete Metadata Records  : ${matchedComplete.length}`);
  console.log(`🔧 Matched Placeholders (Ready to Fill): ${matchedPlaceholders.length}`);
  console.log(`⚠️ Not Present in Metadata (New/Unmatched): ${notInMetadata.length}`);
  console.log('===============================================================\n');

  // Write out analysis results to an artifact scratch file for deep inspection
  const outDir = path.resolve(__dirname, '../../../scratch');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const resultPath = path.join(outDir, 'september_tracker_analysis.json');
  fs.writeFileSync(resultPath, JSON.stringify({
    totalRows: allRows.length,
    uniqueCompaniesCount: uniqueCompanies.size,
    matchedCompleteCount: matchedComplete.length,
    matchedPlaceholdersCount: matchedPlaceholders.length,
    notInMetadataCount: notInMetadata.length,
    matchedPlaceholders,
    notInMetadata: notInMetadata.slice(0, 300), // First 300 for inspection
    sheetSummaries
  }, null, 2));

  console.log(`💾 Detailed JSON report written to: ${resultPath}`);

  await disconnectDatabase();
}

analyzeSeptemberTracker().catch(console.error);
