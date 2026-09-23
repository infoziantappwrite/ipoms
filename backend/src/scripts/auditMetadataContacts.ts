import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { CompanyMetadata } from '../models/CompanyMetadata';

async function auditMetadata() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB database.');

  const allRecords = await CompanyMetadata.find({ is_deleted: { $ne: true } }).lean();
  console.log(`Total active Company Metadata records: ${allRecords.length}\n`);

  const suspiciousRecords: any[] = [];

  for (const c of allRecords) {
    const issues: string[] = [];

    // 1. Mobile Number Audit
    const mobs = [...(c.mobile_numbers || [])];
    if (c.primary_mobile) mobs.push(c.primary_mobile);
    const invalidMobiles: string[] = [];
    for (const m of mobs) {
      if (!m) continue;
      const clean = m.replace(/[\s\-\(\)\+]/g, '');
      if (clean.length > 0 && clean.length < 10) {
        invalidMobiles.push(`${m} (Short < 10 digits)`);
      } else if (/^(\d)\1{9,}$/.test(clean)) {
        invalidMobiles.push(`${m} (Repeated digits)`);
      } else if (['1234567890', '9876543210', '0000000000', '1111111111'].includes(clean)) {
        invalidMobiles.push(`${m} (Dummy/Placeholder)`);
      }
    }
    if (invalidMobiles.length > 0) {
      issues.push(`Invalid/Suspicious Mobile: ${Array.from(new Set(invalidMobiles)).join(', ')}`);
    }

    // 2. Email ID Audit
    const emails = [...(c.email_ids || [])];
    if (c.primary_email) emails.push(c.primary_email);
    const invalidEmails: string[] = [];
    for (const e of emails) {
      if (!e) continue;
      const trimmed = e.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        invalidEmails.push(`${e} (Invalid Email Syntax)`);
      } else if (trimmed.includes('test.com') || trimmed.includes('example.com') || trimmed.includes('noemail') || trimmed.includes('abc.com')) {
        invalidEmails.push(`${e} (Dummy/Placeholder Domain)`);
      }
    }
    if (invalidEmails.length > 0) {
      issues.push(`Invalid/Suspicious Email: ${Array.from(new Set(invalidEmails)).join(', ')}`);
    }

    // 3. Complete Contact Information Missing
    const hasValidMobile = mobs.some(m => m && m.replace(/\D/g, '').length >= 10);
    const hasValidEmail = emails.some(e => e && e.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
    if (!hasValidMobile && !hasValidEmail) {
      issues.push('Missing both valid Mobile Number and valid Email ID');
    }

    // 4. Missing/Generic HR Name
    if (!c.hr_name || c.hr_name.trim() === '' || ['hr', 'test', 'unknown', 'na', 'n/a', 'nil'].includes(c.hr_name.trim().toLowerCase())) {
      issues.push(`Missing/Generic HR Name (${c.hr_name ? `"${c.hr_name}"` : 'Empty'})`);
    }

    // 5. Suspicious or Generic Company Name
    if (!c.company_name || ['test', 'abc', 'xyz', 'demo', 'sample'].includes(c.company_name.trim().toLowerCase())) {
      issues.push(`Suspicious/Generic Company Name ("${c.company_name}")`);
    }

    if (issues.length > 0) {
      suspiciousRecords.push({
        id: c._id.toString(),
        serial_number: c.serial_number || 'N/A',
        company_name: c.company_name,
        hr_name: c.hr_name || 'N/A',
        primary_mobile: c.primary_mobile || 'N/A',
        primary_email: c.primary_email || 'N/A',
        issues
      });
    }
  }

  console.log(`=== AUDIT RESULT ===`);
  console.log(`Total Suspicious Records: ${suspiciousRecords.length}\n`);

  console.log(JSON.stringify(suspiciousRecords, null, 2));

  await mongoose.disconnect();
}

auditMetadata().catch((err) => {
  console.error(err);
  process.exit(1);
});
