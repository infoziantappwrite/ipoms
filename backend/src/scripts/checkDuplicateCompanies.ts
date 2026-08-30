import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|ltd\.?|limited|inc\.?|llp|technologies|tech|solutions|services|group|india)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

async function checkDuplicates() {
  console.log('\n========================================================================================');
  console.log('🔍 DIRECT METADATABASE & MASTER EXCEL DUPLICATE COMPANY AUDIT');
  console.log('========================================================================================\n');

  // 1. Audit Live MongoDB Collection
  console.log('🔌 Connecting to MongoDB Database...');
  await connectDatabase();

  const totalActive = await CompanyMetadata.countDocuments({ is_deleted: false });
  const totalAll = await CompanyMetadata.countDocuments({});
  console.log(`📊 MongoDB "company_metadata": ${totalAll} Total Documents (${totalActive} Active)\n`);

  const allCompanies = await CompanyMetadata.find({ is_deleted: false }).lean();

  // (A) Exact Case-Insensitive Duplicate Company Names in MongoDB
  const exactNameMap = new Map<string, any[]>();
  for (const c of allCompanies) {
    const key = (c.company_name || '').trim().toLowerCase();
    if (!key) continue;
    if (!exactNameMap.has(key)) exactNameMap.set(key, []);
    exactNameMap.get(key)!.push(c);
  }

  const exactNameDuplicates = Array.from(exactNameMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`\n📌 1. EXACT CASE-INSENSITIVE NAME DUPLICATES IN MONGODB:`);
  console.log(`   Found ${exactNameDuplicates.length} duplicate company name groups (${exactNameDuplicates.reduce((sum, [_, l]) => sum + l.length, 0)} total rows affected).`);
  
  if (exactNameDuplicates.length > 0) {
    exactNameDuplicates.forEach(([name, list], idx) => {
      console.log(`\n   [${idx + 1}] Company Name: "${list[0].company_name}" (${list.length} duplicate entries)`);
      list.forEach((item) => {
        console.log(`       • S.No: ${item.serial_number || 'N/A'} | ID: ${item._id} | HR: "${item.hr_name || 'N/A'}" | Phone: "${item.primary_mobile || 'N/A'}" | Email: "${item.primary_email || 'N/A'}" | Type: "${item.company_type || 'N/A'}"`);
      });
    });
  } else {
    console.log('   ✅ No exact duplicate company names found in MongoDB!');
  }

  // (B) Normalized Name Variations (e.g. "ABC Pvt Ltd" vs "ABC" vs "ABC Technologies")
  const normalizedNameMap = new Map<string, any[]>();
  for (const c of allCompanies) {
    const norm = normalizeCompanyName(c.company_name || '');
    if (!norm || norm.length < 3) continue;
    if (!normalizedNameMap.has(norm)) normalizedNameMap.set(norm, []);
    normalizedNameMap.get(norm)!.push(c);
  }

  const suffixDuplicates = Array.from(normalizedNameMap.entries()).filter(([_, list]) => {
    if (list.length <= 1) return false;
    const distinctExact = new Set(list.map((c) => (c.company_name || '').trim().toLowerCase()));
    return distinctExact.size > 1;
  });

  console.log(`\n\n📌 2. COMPANY NAME SUFFIX / SPELLING VARIATIONS (e.g. "Pvt Ltd" vs "Limited" vs plain name):`);
  console.log(`   Found ${suffixDuplicates.length} variation groups.`);
  if (suffixDuplicates.length > 0) {
    suffixDuplicates.forEach(([root, list], idx) => {
      const distinctNames = Array.from(new Set(list.map((c) => c.company_name)));
      console.log(`\n   [${idx + 1}] Root: "${root}" (${list.length} records) -> Variations: [${distinctNames.map((n) => `"${n}"`).join(', ')}]`);
      list.forEach((item) => {
        console.log(`       • S.No: ${item.serial_number || 'N/A'} | "${item.company_name}" | HR: "${item.hr_name || 'N/A'}" | Phone: "${item.primary_mobile || 'N/A'}" | Email: "${item.primary_email || 'N/A'}"`);
      });
    });
  }

  // (C) Duplicate Primary Mobile Numbers
  const mobileMap = new Map<string, any[]>();
  for (const c of allCompanies) {
    const phone = normalizePhone(c.primary_mobile);
    if (!phone || phone.length < 10 || phone === '0000000000' || phone === '9999999999' || phone === '1234567890') continue;
    if (!mobileMap.has(phone)) mobileMap.set(phone, []);
    mobileMap.get(phone)!.push(c);
  }

  const mobileDuplicates = Array.from(mobileMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`\n\n📌 3. SHARED PHONE NUMBERS ACROSS DIFFERENT METADATA RECORDS:`);
  console.log(`   Found ${mobileDuplicates.length} phone numbers shared across multiple company records.`);
  if (mobileDuplicates.length > 0) {
    mobileDuplicates.slice(0, 20).forEach(([phone, list], idx) => {
      console.log(`\n   [${idx + 1}] Phone: "${phone}" (${list.length} records):`);
      list.forEach((item) => {
        console.log(`       • S.No: ${item.serial_number || 'N/A'} | Company: "${item.company_name}" | HR: "${item.hr_name || 'N/A'}" | Email: "${item.primary_email || 'N/A'}"`);
      });
    });
    if (mobileDuplicates.length > 20) {
      console.log(`     ... and ${mobileDuplicates.length - 20} more shared phone number groups.`);
    }
  }

  // (D) Duplicate Primary Email Addresses
  const emailMap = new Map<string, any[]>();
  for (const c of allCompanies) {
    const email = (c.primary_email || '').trim().toLowerCase();
    if (!email || email.includes('noemail') || email.includes('na@') || email.length < 5) continue;
    if (!emailMap.has(email)) emailMap.set(email, []);
    emailMap.get(email)!.push(c);
  }

  const emailDuplicates = Array.from(emailMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`\n\n📌 4. SHARED EMAIL ADDRESSES ACROSS DIFFERENT METADATA RECORDS:`);
  console.log(`   Found ${emailDuplicates.length} emails shared across multiple company records.`);
  if (emailDuplicates.length > 0) {
    emailDuplicates.slice(0, 20).forEach(([email, list], idx) => {
      console.log(`\n   [${idx + 1}] Email: "${email}" (${list.length} records):`);
      list.forEach((item) => {
        console.log(`       • S.No: ${item.serial_number || 'N/A'} | Company: "${item.company_name}" | HR: "${item.hr_name || 'N/A'}" | Phone: "${item.primary_mobile || 'N/A'}"`);
      });
    });
    if (emailDuplicates.length > 20) {
      console.log(`     ... and ${emailDuplicates.length - 20} more shared email groups.`);
    }
  }

  // (E) Exact Duplicate Contacts (Same Company Name + Same Phone)
  const exactContactMap = new Map<string, any[]>();
  for (const c of allCompanies) {
    const nameKey = (c.company_name || '').trim().toLowerCase();
    const phoneKey = normalizePhone(c.primary_mobile);
    if (!nameKey || !phoneKey) continue;
    const key = `${nameKey}___${phoneKey}`;
    if (!exactContactMap.has(key)) exactContactMap.set(key, []);
    exactContactMap.get(key)!.push(c);
  }
  const exactContactDuplicates = Array.from(exactContactMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`\n\n📌 5. IDENTICAL DUPLICATE CONTACTS (Same Company Name AND Same Phone Number):`);
  console.log(`   Found ${exactContactDuplicates.length} completely redundant duplicate contact pairs/groups.`);
  if (exactContactDuplicates.length > 0) {
    exactContactDuplicates.forEach(([_, list], idx) => {
      console.log(`\n   [${idx + 1}] Company: "${list[0].company_name}" (Phone: ${list[0].primary_mobile}) -> ${list.length} identical copies:`);
      list.forEach((item) => {
        console.log(`       • S.No: ${item.serial_number || 'N/A'} | ID: ${item._id} | HR: "${item.hr_name || 'N/A'}" | Email: "${item.primary_email || 'N/A'}"`);
      });
    });
  }

  // Also check Master Excel file for comparison
  const excelPath = path.resolve(__dirname, '../../../Meta_Database.xlsx');
  if (fs.existsSync(excelPath)) {
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    console.log(`\n\n📊 Master Excel Source ("Meta_Database.xlsx"): ${rows.length} total rows scanned.`);
  }

  await disconnectDatabase();

  console.log('\n========================================================================================');
  console.log('📋 AUDIT SUMMARY FOR METADATABASE:');
  console.log(`   • Total Active Companies in DB      : ${totalActive}`);
  console.log(`   • Exact Duplicate Name Groups       : ${exactNameDuplicates.length}`);
  console.log(`   • Exact Duplicate Rows Total        : ${exactNameDuplicates.reduce((sum, [_, l]) => sum + l.length, 0)}`);
  console.log(`   • Suffix / Name Variation Groups    : ${suffixDuplicates.length}`);
  console.log(`   • Shared Phone Number Groups        : ${mobileDuplicates.length}`);
  console.log(`   • Shared Email Address Groups       : ${emailDuplicates.length}`);
  console.log(`   • Identical Name + Phone Redundancy : ${exactContactDuplicates.length}`);
  console.log('========================================================================================\n');
}

checkDuplicates().catch(console.error);
