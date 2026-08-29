import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { CompanyMetadata } from '../models/CompanyMetadata';

const cleanString = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

const getRowVal = (row: any, candidates: string[]): any => {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    if (row[candidate] !== undefined && row[candidate] !== null && String(row[candidate]).trim() !== '') {
      return row[candidate];
    }
  }
  // Try case-insensitive / stripped match
  for (const candidate of candidates) {
    const candNorm = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k of keys) {
      const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (kNorm === candNorm && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return row[k];
      }
    }
  }
  return '';
};

const parsePhoneNumbers = (val: any): string[] => {
  if (val === undefined || val === null) return [];
  const raw = String(val).trim();
  if (!raw || raw === '-' || raw === '—' || raw === 'N/A' || raw === 'NA') return [];
  return raw
    .split(/[,;\/\n\r|]+/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/[^\d]/g, '').length >= 7);
};

const parseEmails = (val: any): string[] => {
  if (val === undefined || val === null) return [];
  const raw = String(val).trim();
  if (!raw || raw === '-' || raw === '—' || raw === 'N/A' || raw === 'NA') return [];
  return raw
    .split(/[,;\/\s\n\r|]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@') && e.includes('.'));
};

const detectCompanyType = (companyName: string): string => {
  const name = companyName.toLowerCase();
  if (name.includes('construction') || name.includes('builder') || name.includes('infra') || name.includes('estate')) return 'construction';
  if (name.includes('pharma') || name.includes('health') || name.includes('biotech') || name.includes('medical') || name.includes('hospital')) return 'pharma';
  if (name.includes('bank') || name.includes('finance') || name.includes('fintech') || name.includes('capital') || name.includes('invest')) return 'banking';
  if (name.includes('edtech') || name.includes('academy') || name.includes('learning') || name.includes('school')) return 'edtech';
  if (name.includes('ai ') || name.includes('robotics') || name.includes('analytics') || name.includes('intelligence')) return 'ai';
  if (name.includes('tech') || name.includes('soft') || name.includes('info') || name.includes('solution') || name.includes('digital') || name.includes('cloud') || name.includes('system') || name.includes('cyber')) return 'software';
  if (name.includes('auto') || name.includes('motor') || name.includes('engineer') || name.includes('steel') || name.includes('power')) return 'core_engineering';
  if (name.includes('bpo') || name.includes('consulting') || name.includes('service')) return 'consulting';
  return 'other';
};

export async function importUniqueCompaniesList(): Promise<{
  success: boolean;
  importedCount: number;
  totalBefore: number;
  totalAfter: number;
  message: string;
  sampleImported: any[];
}> {
  const filePath = 'C:\\Projects\\iPOMS\\unique_companies_list.xlsx';
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      importedCount: 0,
      totalBefore: 0,
      totalAfter: 0,
      message: `File not found at ${filePath}`,
      sampleImported: [],
    };
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    return {
      success: false,
      importedCount: 0,
      totalBefore: 0,
      totalAfter: 0,
      message: `No data found in sheet "${sheetName}" of ${filePath}`,
      sampleImported: [],
    };
  }

  console.log(`📑 [Unique Companies] Found ${rawRows.length} rows in sheet "${sheetName}". Sample keys:`, Object.keys(rawRows[0] || {}));

  // 1. Delete all existing records from S.No 3574 onwards to remove any duplicates or previous imports
  const deleteResult = await CompanyMetadata.deleteMany({ serial_number: { $gte: 3574 } });
  console.log(`🗑️ [Unique Companies Clean] Removed ${deleteResult.deletedCount} records with S.No >= 3574.`);

  // 2. Reset all remaining metadata created_at dates to 30 days ago so they exit the "Recent Data" window
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await CompanyMetadata.updateMany({}, { $set: { created_at: thirtyDaysAgo } });

  // 3. Starting serial number is exactly 3573 (so next starts at 3574)
  const maxRecord = await CompanyMetadata.findOne({ is_deleted: false }).sort({ serial_number: -1 }).select('serial_number');
  let currentMaxSno = maxRecord && typeof maxRecord.serial_number === 'number' ? maxRecord.serial_number : 3573;
  if (currentMaxSno > 3573) currentMaxSno = 3573;

  const totalBefore = await CompanyMetadata.countDocuments({});

  const now = new Date();
  const docsToInsert: any[] = [];
  const seenCompanies = new Set<string>();

  for (const row of rawRows) {
    const rawComp = getRowVal(row, ['Company Name', 'Company', 'company_name', 'COMPANY NAME', 'Organization', 'Employer']);
    const companyName = cleanString(rawComp || Object.values(row)[1] || Object.values(row)[0] || '');

    if (!companyName || companyName === '#VALUE!' || companyName.length < 2) continue;

    // Deduplicate within the file itself if any duplicate company exists
    const compKey = companyName.toLowerCase().trim();
    if (seenCompanies.has(compKey)) {
      continue;
    }
    seenCompanies.add(compKey);

    const rawHr = getRowVal(row, ['HR Name', 'HR Contact Person', 'hr_name', 'HR NAME', 'Contact Person', 'Name', 'HR']);
    const hrName = cleanString(rawHr);

    const rawDesig = getRowVal(row, ['HR Designation', 'Designation', 'hr_designation', 'DESIGNATION', 'Role']);
    const designation = cleanString(rawDesig);

    const rawMobile = getRowVal(row, ['Mobile Number', 'Mobile Numbers', 'Mobile', 'Phone Number', 'Phone', 'Contact Number', 'primary_mobile', 'MOBILE', 'Contact']);
    const mobileNumbers = parsePhoneNumbers(rawMobile);
    const primaryMobile = mobileNumbers[0] || (cleanString(rawMobile).replace(/[^\d+]/g, '').trim() || '');

    const rawEmail = getRowVal(row, ['Email ID', 'Email IDs', 'Email ID(s)', 'Email', 'Email Address', 'Official Email', 'primary_email', 'EMAIL', 'Mail']);
    const emailIds = parseEmails(rawEmail);
    const primaryEmail = emailIds[0] || (cleanString(rawEmail).includes('@') ? cleanString(rawEmail).toLowerCase().trim() : '');

    const rawType = getRowVal(row, ['Industry', 'Sector', 'company_type', 'Type', 'INDUSTRY', 'Sector / Industry']);
    const companyType = cleanString(rawType).toLowerCase() || detectCompanyType(companyName);

    const rawNotes = getRowVal(row, ['Notes', 'notes', 'Remarks', 'REMARKS', 'Comment']);
    const notes = cleanString(rawNotes);

    currentMaxSno += 1;

    docsToInsert.push({
      serial_number: currentMaxSno,
      company_name: companyName,
      hr_name: hrName,
      hr_designation: designation,
      primary_mobile: primaryMobile,
      mobile_numbers: mobileNumbers.length > 0 ? mobileNumbers : (primaryMobile ? [primaryMobile] : []),
      primary_email: primaryEmail,
      email_ids: emailIds.length > 0 ? emailIds : (primaryEmail ? [primaryEmail] : []),
      company_type: companyType || 'other',
      notes: notes,
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });
  }

  let insertedCount = 0;
  if (docsToInsert.length > 0) {
    const inserted = await CompanyMetadata.insertMany(docsToInsert);
    insertedCount = inserted.length;
  }

  const totalAfter = await CompanyMetadata.countDocuments({});

  return {
    success: true,
    importedCount: insertedCount,
    totalBefore,
    totalAfter,
    message: `Successfully purged duplicates >= 3574 and imported ${insertedCount} unique contacts with full mobile numbers from unique_companies_list.xlsx starting at S.No 3574 to ${currentMaxSno}. Total metadata count: ${totalAfter}.`,
    sampleImported: docsToInsert.slice(0, 8),
  };
}
