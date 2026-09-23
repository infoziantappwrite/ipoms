import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { CompanyMetadata } from '../models/CompanyMetadata';
import { validateAndNormalizeIndianContact, validateAndNormalizeEmail } from '../lib/contactValidation';

async function autoCleanMetadata() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB database.');

  const allRecords = await CompanyMetadata.find({ is_deleted: { $ne: true } });
  console.log(`Total active records to process: ${allRecords.length}`);

  let removedCount = 0;
  let fixedCount = 0;
  let renumberedCount = 0;

  const isIndustryPlaceholder = (name: string) => {
    const trimmed = name.trim();
    // Patterns matching category labels like "IT / Software & Technology", "Manufacturing/Engineering Company"
    if (/^(IT|Software|Engineering|Electronics|Food & Beverage|FMCG|Cybersecurity|Embedded Systems|AI \/ Machine Learning|Automotive|Electrical|Industrial|Construction|Automation|Manufacturing)\s*[\/&]/i.test(trimmed)) {
      return true;
    }
    if (/\b(Company|Services\/Consulting|Digital Transformation|Housing Finance Company|Talent Hub)\b/i.test(trimmed) && !/\b(Pvt|Ltd|Inc|Corp|LLC|LLP|Solutions|Technologies|Software)\b/i.test(trimmed)) {
      return true;
    }
    return false;
  };

  const isNameString = (str: string) => {
    // Contains letters, spaces, dots, e.g. "Ajaykumar", "Ramesh", "Gowri Chellamuthu", "imran waheed"
    return /^[a-zA-Z\s\.\-]{2,30}$/.test(str.trim()) && !str.includes('@') && !/\d/.test(str);
  };

  for (const doc of allRecords) {
    const name = doc.company_name?.trim() || '';

    // 1. Check if industry placeholder or dummy company name
    if (isIndustryPlaceholder(name) || ['test', 'abc', 'xyz', 'demo', 'sample'].includes(name.toLowerCase())) {
      doc.is_deleted = true;
      doc.deleted_at = new Date();
      await doc.save();
      removedCount++;
      console.log(`[REMOVED Placeholder] #${doc.serial_number} - "${name}"`);
      continue;
    }

    let modified = false;

    // 2. Fix misplaced HR Name inside email or mobile fields
    if (doc.primary_email && isNameString(doc.primary_email)) {
      if (!doc.hr_name || doc.hr_name === 'N/A' || doc.hr_name === 'HR Contact') {
        doc.hr_name = doc.primary_email.trim();
      }
      doc.primary_email = '';
      modified = true;
    }

    if (doc.primary_mobile && isNameString(doc.primary_mobile)) {
      if (!doc.hr_name || doc.hr_name === 'N/A' || doc.hr_name === 'HR Contact') {
        doc.hr_name = doc.primary_mobile.trim();
      }
      doc.primary_mobile = '';
      modified = true;
    }

    // Clean mobile_numbers array of misplaced names
    const cleanedMobiles: string[] = [];
    for (const m of doc.mobile_numbers || []) {
      if (!m) continue;
      if (isNameString(m)) {
        if (!doc.hr_name || doc.hr_name === 'N/A' || doc.hr_name === 'HR Contact') {
          doc.hr_name = m.trim();
        }
        modified = true;
      } else {
        const cleanDigits = m.replace(/\D/g, '');
        // Remove 9 digit or invalid numbers
        if (cleanDigits.length > 0 && cleanDigits.length < 10) {
          console.log(`[CLEANED Invalid Mobile] #${doc.serial_number} ${doc.company_name}: Removed short mobile "${m}"`);
          modified = true;
        } else if (cleanDigits.length >= 10) {
          cleanedMobiles.push(m.trim());
        }
      }
    }
    if (modified) {
      doc.mobile_numbers = cleanedMobiles;
    }

    // Validate and normalize primary mobile
    if (doc.primary_mobile) {
      const cleanDigits = doc.primary_mobile.replace(/\D/g, '');
      if (cleanDigits.length > 0 && cleanDigits.length < 10) {
        console.log(`[CLEANED Invalid Primary Mobile] #${doc.serial_number} ${doc.company_name}: Removed "${doc.primary_mobile}"`);
        doc.primary_mobile = doc.mobile_numbers.find(m => m.replace(/\D/g, '').length >= 10) || '';
        modified = true;
      }
    }

    // Clean email_ids array
    const cleanedEmails: string[] = [];
    for (const e of doc.email_ids || []) {
      if (!e) continue;
      if (isNameString(e)) {
        if (!doc.hr_name || doc.hr_name === 'N/A' || doc.hr_name === 'HR Contact') {
          doc.hr_name = e.trim();
        }
        modified = true;
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())) {
        cleanedEmails.push(e.trim().toLowerCase());
      } else {
        modified = true;
      }
    }
    if (modified) {
      doc.email_ids = cleanedEmails;
    }

    // Validate primary email
    if (doc.primary_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.primary_email.trim())) {
      doc.primary_email = doc.email_ids.find(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) || '';
      modified = true;
    }

    // If doc missing both mobile and email and HR name after cleanup, mark soft-deleted
    const hasMobile = Boolean(doc.primary_mobile) || (doc.mobile_numbers && doc.mobile_numbers.length > 0);
    const hasEmail = Boolean(doc.primary_email) || (doc.email_ids && doc.email_ids.length > 0);

    if (!hasMobile && !hasEmail && (!doc.hr_name || doc.hr_name === 'N/A' || doc.hr_name === 'HR Contact')) {
      doc.is_deleted = true;
      doc.deleted_at = new Date();
      await doc.save();
      removedCount++;
      console.log(`[REMOVED No-Contact Record] #${doc.serial_number} - "${doc.company_name}"`);
      continue;
    }

    if (modified) {
      await doc.save();
      fixedCount++;
    }
  }

  // Deduplicate identical companies missing contacts
  const activeRemaining = await CompanyMetadata.find({ is_deleted: { $ne: true } }).sort({ serial_number: 1 });
  const seenMap = new Map<string, any>();

  for (const doc of activeRemaining) {
    const key = doc.company_name.trim().toLowerCase();
    const hasContact = (doc.primary_mobile || (doc.mobile_numbers && doc.mobile_numbers.length > 0) || doc.primary_email || (doc.email_ids && doc.email_ids.length > 0));

    if (seenMap.has(key)) {
      const existing = seenMap.get(key);
      const existingHasContact = (existing.primary_mobile || (existing.mobile_numbers && existing.mobile_numbers.length > 0) || existing.primary_email || (existing.email_ids && existing.email_ids.length > 0));

      if (!hasContact && existingHasContact) {
        doc.is_deleted = true;
        doc.deleted_at = new Date();
        await doc.save();
        removedCount++;
        console.log(`[REMOVED Duplicate No-Contact Record] #${doc.serial_number} - "${doc.company_name}"`);
      } else if (!existingHasContact && hasContact) {
        existing.is_deleted = true;
        existing.deleted_at = new Date();
        await existing.save();
        seenMap.set(key, doc);
        removedCount++;
        console.log(`[REMOVED Duplicate No-Contact Record] #${existing.serial_number} - "${existing.company_name}"`);
      }
    } else {
      seenMap.set(key, doc);
    }
  }

  // Renumber serial numbers
  const finalActive = await CompanyMetadata.find({ is_deleted: { $ne: true } }).sort({ created_at: 1 });
  for (let i = 0; i < finalActive.length; i++) {
    if (finalActive[i].serial_number !== i + 1) {
      finalActive[i].serial_number = i + 1;
      await finalActive[i].save();
      renumberedCount++;
    }
  }

  console.log(`\n=== AUTO CLEANUP COMPLETED ===`);
  console.log(`Removed Placeholder / Invalid Records: ${removedCount}`);
  console.log(`Fixed Misplaced Fields & Normalized Contacts: ${fixedCount}`);
  console.log(`Renumbered Serial Numbers: ${renumberedCount}`);
  console.log(`Final Active Metadata Count: ${finalActive.length}`);

  await mongoose.disconnect();
}

autoCleanMetadata().catch((err) => {
  console.error('Error during auto clean:', err);
  process.exit(1);
});
