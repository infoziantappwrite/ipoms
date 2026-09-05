import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function fetchMissingMobileContacts() {
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
  const missingContacts = await CompanyMetadata.find(emptyFilter)
    .sort({ serial_number: 1 })
    .lean();

  console.log('\n===============================================================');
  console.log(`📊 TOTAL ACTIVE METADATA RECORDS : ${totalActive}`);
  console.log(`⚠️ RECORDS MISSING MOBILE NUMBER : ${missingContacts.length}`);
  console.log('===============================================================\n');

  const list = missingContacts.map((c: any) => ({
    sno: c.serial_number || '—',
    company_name: c.company_name,
    hr_name: c.hr_name || '—',
    primary_email: c.primary_email || (c.email_ids && c.email_ids[0]) || '—',
    company_type: c.company_type || 'other'
  }));

  console.log(JSON.stringify(list, null, 2));

  await disconnectDatabase();
}

fetchMissingMobileContacts().catch(console.error);
