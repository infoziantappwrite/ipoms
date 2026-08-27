import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { CompanyMetadata } from '../models/CompanyMetadata';

const cleanString = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

const parsePhoneNumbers = (val: any): string[] => {
  const raw = cleanString(val);
  if (!raw) return [];
  return raw
    .split(/[,;\/\n\r]+/)
    .map((p) => p.replace(/[^\d+]/g, '').trim())
    .filter((p) => p.length >= 7);
};

const parseEmails = (val: any): string[] => {
  const raw = cleanString(val);
  if (!raw) return [];
  return raw
    .split(/[,;\/\s\n\r]+/)
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function syncMetaDatabase() {
  console.log('\n=============================================================');
  console.log('🚀 INFOZIANT iPOMS — SYNCING UPDATED META DATABASE');
  console.log('=============================================================\n');

  const candidatePaths = [
    'C:/Projects/iPOMS/Meta_Database.xlsx',
    path.resolve(process.cwd(), '../Meta_Database.xlsx'),
    path.resolve(process.cwd(), 'Meta_Database.xlsx'),
    'C:/Users/admin/Downloads/Meta_Database.xlsx',
  ];

  let excelPath = '';
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }

  if (!excelPath) {
    console.error('❌ Could not find Meta_Database.xlsx.');
    return;
  }

  console.log(`📖 Found workbook: ${excelPath}`);
  const stats = fs.statSync(excelPath);
  console.log(`📅 File Last Modified: ${stats.mtime.toLocaleString()} (${stats.size} bytes)`);

  const workbook = xlsx.readFile(excelPath);
  console.log(`📑 Sheets in workbook:`, workbook.SheetNames);

  const sheetName = workbook.SheetNames.includes('Meta Database') ? 'Meta Database' : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📊 Total rows in sheet "${sheetName}": ${rawRows.length}`);

  if (rawRows.length === 0) {
    console.warn('⚠️ No data rows found.');
    return;
  }

  await connectDatabase();

  // Load existing records into memory map for ultra-fast matching
  console.log('⚡ [Cache] Fetching existing metadata from MongoDB...');
  const existingDocs = await CompanyMetadata.find({});
  const existingMap = new Map<string, any>();
  for (const doc of existingDocs) {
    const key = doc.company_name.trim().toLowerCase();
    existingMap.set(key, doc);
  }
  console.log(`📦 Loaded ${existingDocs.length} existing companies from DB.`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const bulkOps: any[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    const serialNumber = Number(row['Serial Number'] || row['S.No'] || row['S. No'] || row['SNo'] || (i + 1));
    const companyName = cleanString(row['Company Name'] || row['Company'] || row['company_name']);
    const hrName = cleanString(row['HR Name'] || row['HR Contact Name'] || row['Contact Person'] || row['hr_name']);
    const rawMobile = row['Mobile Number'] || row['Phone Number'] || row['Mobile'] || row['Contact Number'] || row['mobile_number'];
    const rawEmail = row['Email ID'] || row['Email'] || row['Official Email'] || row['email_id'];
    const rawDesignation = cleanString(row['Designation'] || row['HR Designation'] || row['Role']);
    const rawLocation = cleanString(row['Location'] || row['City'] || row['Address']);
    const rawIndustry = cleanString(row['Industry'] || row['Sector'] || row['Industry Sector']);

    if (!companyName) {
      skippedCount++;
      continue;
    }

    const mobileNumbers = parsePhoneNumbers(rawMobile);
    const emailIds = parseEmails(rawEmail);
    const primaryMobile = mobileNumbers.length > 0 ? mobileNumbers[0] : '';
    const primaryEmail = emailIds.length > 0 ? emailIds[0] : '';
    const companyType = detectCompanyType(companyName);

    const normKey = companyName.trim().toLowerCase();
    const existing = existingMap.get(normKey);

    if (existing) {
      const mergedMobiles = Array.from(new Set([...(existing.contact_numbers || []), ...mobileNumbers]));
      const mergedEmails = Array.from(new Set([...(existing.email_ids || []), ...emailIds]));

      bulkOps.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              hr_name: hrName || existing.hr_name || 'Placement HR',
              hr_designation: rawDesignation || existing.hr_designation || 'HR Manager',
              primary_mobile: primaryMobile || existing.primary_mobile || '',
              primary_email: primaryEmail || existing.primary_email || '',
              location: rawLocation || existing.location || 'Chennai, Tamil Nadu',
              contact_numbers: mergedMobiles,
              email_ids: mergedEmails,
              is_active: true,
            },
          },
        },
      });
      updatedCount++;
    } else {
      bulkOps.push({
        insertOne: {
          document: {
            serial_number: serialNumber || (i + 1),
            company_name: companyName.trim(),
            company_type: companyType,
            industry_sector: rawIndustry || 'Information Technology',
            hr_name: hrName || 'Placement HR',
            hr_designation: rawDesignation || 'HR Manager',
            primary_mobile: primaryMobile,
            primary_email: primaryEmail,
            location: rawLocation || 'Chennai, Tamil Nadu',
            contact_numbers: mobileNumbers,
            email_ids: emailIds,
            is_verified: true,
            is_active: true,
          },
        },
      });
      insertedCount++;
    }
  }

  console.log(`🚀 [BulkWrite] Executing ${bulkOps.length} bulk operations...`);
  if (bulkOps.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      const chunk = bulkOps.slice(i, i + chunkSize);
      await CompanyMetadata.bulkWrite(chunk, { ordered: false });
    }
  }

  const totalInDb = await CompanyMetadata.countDocuments({});

  console.log('\n=============================================================');
  console.log(`🎉 METADATA SYNC COMPLETED SUCCESSFULLY:`);
  console.log(`   ➕ New Leads Inserted: ${insertedCount}`);
  console.log(`   🔄 Existing Records Updated: ${updatedCount}`);
  console.log(`   ⏭️ Skipped Rows: ${skippedCount}`);
  console.log(`   📚 Total Records in Database: ${totalInDb}`);
  console.log('=============================================================\n');

  await disconnectDatabase();
}

syncMetaDatabase().catch(console.error);
