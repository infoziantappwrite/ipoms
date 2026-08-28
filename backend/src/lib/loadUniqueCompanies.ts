import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { CompanyMetadata } from '../models/CompanyMetadata';

const cleanString = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

const parsePhoneNumbers = (val: any): string[] => {
  const raw = cleanString(val);
  if (!raw) return [];
  return raw
    .split(/[,;\/\n\r|]+/)
    .map((p) => p.replace(/[^\d+]/g, '').trim())
    .filter((p) => p.length >= 7);
};

const parseEmails = (val: any): string[] => {
  const raw = cleanString(val);
  if (!raw) return [];
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

  // 1. Reset all existing metadata created_at dates to 30 days ago so they exit the "Recent Data" window
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await CompanyMetadata.updateMany({}, { $set: { created_at: thirtyDaysAgo } });

  // 2. Find maximum existing serial_number
  const maxRecord = await CompanyMetadata.findOne({}).sort({ serial_number: -1 }).select('serial_number');
  let currentMaxSno = maxRecord && typeof maxRecord.serial_number === 'number' ? maxRecord.serial_number : 0;
  const totalBefore = await CompanyMetadata.countDocuments({});

  const now = new Date();
  const docsToInsert: any[] = [];

  for (const row of rawRows) {
    // Look for various possible column name permutations
    const companyName = cleanString(
      row['Company Name'] || row['company_name'] || row['Company'] || row['COMPANY NAME'] || row['COMPANY'] || Object.values(row)[0] || ''
    );

    if (!companyName) continue;

    const hrName = cleanString(
      row['HR Contact Person'] || row['HR Name'] || row['hr_name'] || row['HR NAME'] || row['Contact Person'] || row['HR'] || ''
    );

    const designation = cleanString(
      row['HR Designation'] || row['Designation'] || row['hr_designation'] || row['DESIGNATION'] || ''
    );

    const rawMobile = cleanString(
      row['Mobile Numbers'] || row['Mobile'] || row['primary_mobile'] || row['MOBILE'] || row['Phone'] || row['Contact Number'] || ''
    );
    const mobileNumbers = parsePhoneNumbers(rawMobile);
    const primaryMobile = mobileNumbers[0] || (rawMobile.replace(/[^\d+]/g, '').trim() || '');

    const rawEmail = cleanString(
      row['Email ID(s)'] || row['Email'] || row['primary_email'] || row['EMAIL'] || row['Email ID'] || ''
    );
    const emailIds = parseEmails(rawEmail);
    const primaryEmail = emailIds[0] || (rawEmail.includes('@') ? rawEmail.toLowerCase().trim() : '');

    const companyType = cleanString(
      row['Industry'] || row['company_type'] || row['Type'] || row['INDUSTRY'] || ''
    ).toLowerCase() || detectCompanyType(companyName);

    const notes = cleanString(row['Notes'] || row['notes'] || row['Remarks'] || row['REMARKS'] || '');

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
    message: `Successfully imported ${insertedCount} contacts from unique_companies_list.xlsx into Master Metadata as Recent Data.`,
    sampleImported: docsToInsert.slice(0, 5),
  };
}
