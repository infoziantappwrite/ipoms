import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function findEmptyMobileContacts() {
  await connectDatabase();

  const emptyFilter = {
    is_deleted: false,
    $or: [
      { primary_mobile: { $exists: false } },
      { primary_mobile: null },
      { primary_mobile: '' },
      { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } }
    ]
  };

  const contacts = await CompanyMetadata.find(emptyFilter)
    .sort({ serial_number: 1 })
    .lean();

  console.log(`TOTAL_EMPTY_MOBILE_COUNT:${contacts.length}`);
  console.log(JSON.stringify(contacts.map((c: any) => ({
    serial_number: c.serial_number,
    company_name: c.company_name,
    hr_name: c.hr_name,
    hr_designation: c.hr_designation,
    primary_email: c.primary_email,
    company_type: c.company_type,
    notes: c.notes,
  })), null, 2));

  await disconnectDatabase();
}

findEmptyMobileContacts().catch(console.error);
