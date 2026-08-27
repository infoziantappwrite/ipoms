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
  if (name.includes('construction') || name.includes('builder') || name.includes('infra') || name.includes('estate') || name.includes('architect') || name.includes('housing')) return 'construction';
  if (name.includes('pharma') || name.includes('health') || name.includes('biotech') || name.includes('medical') || name.includes('hospital') || name.includes('clinic')) return 'pharma';
  if (name.includes('bank') || name.includes('finance') || name.includes('fintech') || name.includes('capital') || name.includes('invest') || name.includes('wealth')) return 'banking';
  if (name.includes('edtech') || name.includes('academy') || name.includes('learning') || name.includes('school') || name.includes('institute') || name.includes('education')) return 'edtech';
  if (name.includes('ai ') || name.includes('robotics') || name.includes('analytics') || name.includes('intelligence') || name.includes('agentic')) return 'ai';
  if (name.includes('auto') || name.includes('motor') || name.includes('engineer') || name.includes('steel') || name.includes('power') || name.includes('forge') || name.includes('mech') || name.includes('electric') || name.includes('appliances')) return 'core_engineering';
  if (name.includes('bpo') || name.includes('kpo') || name.includes('call center')) return 'bpo';
  if (name.includes('consulting') || name.includes('advisory') || name.includes('staffing') || name.includes('hr services') || name.includes('manpower')) return 'consulting';
  if (name.includes('product') || name.includes('technologies') || name.includes('labs') || name.includes('devices')) return 'product';
  if (name.includes('tech') || name.includes('soft') || name.includes('info') || name.includes('solution') || name.includes('digital') || name.includes('cloud') || name.includes('system') || name.includes('cyber') || name.includes('corp') || name.includes('infotech')) return 'software';
  return 'other';
};

async function resetAndImportMetaDatabase() {
  console.log('\n=============================================================');
  console.log('🚀 INFOZIANT iPOMS — FULL RESET & IMPORT META DATABASE');
  console.log('=============================================================\n');

  const excelPath = 'C:/Projects/iPOMS/Meta_Database.xlsx';

  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Could not locate file at: ${excelPath}`);
    return;
  }

  console.log(`📖 [Workbook] Reading: ${excelPath}`);
  const stats = fs.statSync(excelPath);
  console.log(`📅 File Last Modified: ${stats.mtime.toLocaleString()} (${stats.size} bytes)`);

  const workbook = xlsx.readFile(excelPath);
  console.log(`📑 Sheets in workbook:`, workbook.SheetNames);

  const sheetName = workbook.SheetNames.includes('Meta Database')
    ? 'Meta Database'
    : workbook.SheetNames[0];

  console.log(`📄 Active sheet: "${sheetName}"`);
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`📊 Total rows in Excel sheet: ${rawRows.length}`);

  if (rawRows.length === 0) {
    console.error('❌ No rows found in the workbook.');
    return;
  }

  console.log('🔍 Headers detected:', Object.keys(rawRows[0] || {}));
  console.log('🔎 First Row Preview:', rawRows[0]);
  console.log('🔎 Last Row Preview:', rawRows[rawRows.length - 1]);

  await connectDatabase();

  // 1. Delete all existing contacts in company_metadata collection
  console.log('\n🗑️ [MongoDB] Resetting and deleting all existing metadata contacts...');
  const deleteResult = await CompanyMetadata.deleteMany({});
  console.log(`✅ [MongoDB] Deleted ${deleteResult.deletedCount} existing records from database.`);

  // 2. Transform Excel rows in exact serial order
  console.log('⚙️ [Parser] Transforming records in exact spreadsheet order...');
  const documentsToInsert = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    const serialNumber = Number(row['Serial Number'] || row['S.No'] || row['S. No'] || row['SNo'] || (i + 1));
    const companyName = cleanString(row['Company Name'] || row['Company'] || row['company_name']);
    const hrName = cleanString(row['HR Name'] || row['HR Contact Name'] || row['Contact Person'] || row['hr_name']);
    const rawMobile = cleanString(row['Mobile Number'] || row['Phone Number'] || row['Mobile'] || row['Contact Number'] || row['mobile_number']);
    const rawEmail = cleanString(row['Email ID'] || row['Email'] || row['Official Email'] || row['email_id']);
    const rawDesignation = cleanString(row['Designation'] || row['HR Designation'] || row['Role'] || '');
    const rawLocation = cleanString(row['Location'] || row['City'] || row['Address'] || '');
    const rawIndustry = cleanString(row['Industry'] || row['Sector'] || row['Industry Sector'] || '');

    if (!companyName) {
      // If no company name is provided, skip blank row
      continue;
    }

    const mobileNumbers = parsePhoneNumbers(rawMobile);
    const emailIds = parseEmails(rawEmail);
    const primaryMobile = mobileNumbers.length > 0 ? mobileNumbers[0] : (rawMobile || '');
    const primaryEmail = emailIds.length > 0 ? emailIds[0] : (rawEmail ? rawEmail.toLowerCase() : '');
    const companyType = detectCompanyType(companyName);

    documentsToInsert.push({
      serial_number: serialNumber,
      company_name: companyName,
      company_type: companyType,
      industry_sector: rawIndustry || 'Information Technology',
      hr_name: hrName || '',
      hr_designation: rawDesignation || 'HR Contact',
      primary_mobile: primaryMobile,
      primary_email: primaryEmail,
      mobile_numbers: mobileNumbers.length > 0 ? mobileNumbers : (primaryMobile ? [primaryMobile] : []),
      email_ids: emailIds.length > 0 ? emailIds : (primaryEmail ? [primaryEmail] : []),
      location: rawLocation || 'Chennai, Tamil Nadu',
      notes: '',
      is_deleted: false,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  console.log(`📦 Prepared ${documentsToInsert.length} documents for batch insertion.`);

  // 3. Batch insert in chunks of 1000 to maintain high performance & order
  const chunkSize = 1000;
  for (let i = 0; i < documentsToInsert.length; i += chunkSize) {
    const chunk = documentsToInsert.slice(i, i + chunkSize);
    await CompanyMetadata.insertMany(chunk, { ordered: true });
    console.log(`   ↳ Inserted records ${i + 1} to ${Math.min(i + chunkSize, documentsToInsert.length)}...`);
  }

  // 4. Verify Total Count
  const totalInDb = await CompanyMetadata.countDocuments({});
  const firstDoc = await CompanyMetadata.findOne({}).sort({ serial_number: 1 });
  const lastDoc = await CompanyMetadata.findOne({}).sort({ serial_number: -1 });

  console.log('\n=============================================================');
  console.log(`🎉 META DATABASE IMPORT COMPLETED SUCCESSFULLY:`);
  console.log(`   📚 Total Records in Database: ${totalInDb}`);
  console.log(`   🥇 First Record (#${firstDoc?.serial_number}): "${firstDoc?.company_name}" | HR: "${firstDoc?.hr_name}" | Tel: "${firstDoc?.primary_mobile}"`);
  console.log(`   🏁 Last Record (#${lastDoc?.serial_number}): "${lastDoc?.company_name}" | HR: "${lastDoc?.hr_name}" | Tel: "${lastDoc?.primary_mobile}"`);
  console.log('=============================================================\n');

  await disconnectDatabase();
}

resetAndImportMetaDatabase().catch(console.error);
