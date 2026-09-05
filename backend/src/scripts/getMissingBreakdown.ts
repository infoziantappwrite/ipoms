import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function getStats() {
  await connectDatabase();

  const emptyFilter = {
    is_deleted: false,
    $and: [
      {
        $or: [
          { primary_mobile: { $exists: false } },
          { primary_mobile: null },
          { primary_mobile: '' },
          { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } }
        ]
      },
      {
        $or: [
          { mobile_numbers: { $exists: false } },
          { mobile_numbers: { $size: 0 } },
          { mobile_numbers: null }
        ]
      }
    ]
  };

  const totalActive = await CompanyMetadata.countDocuments({ is_deleted: false });
  const missing = await CompanyMetadata.find(emptyFilter).sort({ serial_number: 1 }).lean();

  const placeholdersMissing = missing.filter((c: any) => (c.serial_number || 0) >= 3807 && (c.serial_number || 0) <= 3998);
  const coreMissing = missing.filter((c: any) => (c.serial_number || 0) < 3807);
  const newMissing = missing.filter((c: any) => (c.serial_number || 0) > 3998);

  console.log(`TOTAL_ACTIVE: ${totalActive}`);
  console.log(`TOTAL_MISSING_MOBILE: ${missing.length}`);
  console.log(`CORE_MISSING_1_TO_3806: ${coreMissing.length}`);
  console.log(`PLACEHOLDERS_MISSING_3807_TO_3998: ${placeholdersMissing.length}`);
  console.log(`NEW_MISSING_GT_3998: ${newMissing.length}`);

  console.log('\n--- CORE MISSING (1 to 3806) ---');
  console.log(JSON.stringify(coreMissing.map((c: any) => ({
    sno: c.serial_number,
    name: c.company_name,
    hr: c.hr_name || '—',
    email: c.primary_email || '—'
  })), null, 2));

  console.log('\n--- PLACEHOLDERS MISSING (3807 to 3998) ---');
  console.log(JSON.stringify(placeholdersMissing.map((c: any) => ({
    sno: c.serial_number,
    name: c.company_name,
    hr: c.hr_name || '—',
    email: c.primary_email || '—'
  })), null, 2));

  await disconnectDatabase();
}

getStats().catch(console.error);
