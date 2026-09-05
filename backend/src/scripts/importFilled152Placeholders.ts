import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

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

export async function importFilled152Placeholders(customPath?: string) {
  console.log('\n===============================================================');
  console.log('📥 IMPORTING COMPLETED 152 PLACEHOLDER DATA INTO METADATA');
  console.log('===============================================================\n');

  const possiblePaths = [
    customPath,
    'C:\\Users\\admin\\Downloads\\152_Missing_Placeholder_Companies.xlsx',
    path.resolve(__dirname, '../../../152_Missing_Placeholder_Companies.xlsx'),
    path.resolve(__dirname, '../../152_Missing_Placeholder_Companies.xlsx')
  ].filter(Boolean) as string[];

  let excelPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }

  if (!excelPath) {
    console.error(`❌ Could not locate the filled Excel workbook at any of:\n${possiblePaths.join('\n')}`);
    return;
  }

  console.log(`📖 Loading Filled Workbook: ${excelPath}`);
  const wb = xlsx.readFile(excelPath, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`📋 Total rows to process: ${rows.length}`);

  await connectDatabase();

  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const snoRaw = row['S.No'] || row['sno'] || row['S.NO'] || row['Serial Number'];
    const sno = parseInt(String(snoRaw).trim(), 10);
    if (!sno || isNaN(sno)) {
      skippedCount++;
      continue;
    }

    const companyName = cleanString(row['Company Name'] || row['company_name']);
    const hrName = cleanString(row['HR Name'] || row['hr_name']);
    const hrDesignation = cleanString(row['HR Designation'] || row['hr_designation']);
    const primaryMobileRaw = cleanString(row['Mobile Number (Primary)*'] || row['primary_mobile'] || row['Mobile Number'] || row['Phone']);
    const altMobilesRaw = cleanString(row['Alternate Mobile Numbers'] || row['alt_mobiles']);
    const primaryEmailRaw = cleanString(row['Email ID (Primary)'] || row['primary_email'] || row['Email ID'] || row['Email']);
    const companyType = cleanString(row['Company Type / Sector'] || row['company_type']);
    const notes = cleanString(row['Notes / Remarks'] || row['notes']);

    const primaryMobiles = parsePhoneNumbers(primaryMobileRaw);
    const altMobiles = parsePhoneNumbers(altMobilesRaw);
    const allMobiles = Array.from(new Set([...primaryMobiles, ...altMobiles]));

    const emails = parseEmails(primaryEmailRaw);

    const targetDoc = await CompanyMetadata.findOne({ serial_number: sno, is_deleted: false });
    if (!targetDoc) {
      console.warn(`   ⚠️ Record #${sno} ("${companyName}") not found in DB.`);
      skippedCount++;
      continue;
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date()
    };

    if (hrName && hrName !== '—') updatePayload.hr_name = hrName;
    if (hrDesignation && hrDesignation !== '—') updatePayload.hr_designation = hrDesignation;
    if (allMobiles.length > 0) {
      updatePayload.primary_mobile = allMobiles[0];
      updatePayload.mobile_numbers = Array.from(new Set([...(targetDoc.mobile_numbers || []), ...allMobiles]));
    }
    if (emails.length > 0) {
      updatePayload.primary_email = emails[0];
      updatePayload.email_ids = Array.from(new Set([...(targetDoc.email_ids || []), ...emails]));
    }
    if (companyType && companyType !== 'other' && !targetDoc.company_type) {
      updatePayload.company_type = companyType;
    }
    if (notes) {
      updatePayload.notes = targetDoc.notes ? `${targetDoc.notes} | ${notes}` : notes;
    }

    await CompanyMetadata.updateOne({ _id: targetDoc._id }, { $set: updatePayload });
    console.log(`   ✅ Updated #${sno} "${targetDoc.company_name}" -> HR: "${hrName || '—'}", Mobile: "${allMobiles[0] || '—'}", Email: "${emails[0] || '—'}"`);
    updatedCount++;
  }

  console.log('\n===============================================================');
  console.log(`✨ IMPORT SUMMARY: Successfully updated ${updatedCount} records (Skipped: ${skippedCount})`);
  console.log('===============================================================\n');

  await disconnectDatabase();
}

if (require.main === module) {
  importFilled152Placeholders().catch(console.error);
}
