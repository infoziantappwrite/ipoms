import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import '../models/College';
import '../models/User';
import '../models/DailyLead';
import '../models/WeeklyTracker';
import { College } from '../models/College';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { DailyLead } from '../models/DailyLead';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function testUpdateSync() {
  await connectDatabase();

  const acetCollege = await College.findOne({ college_code: 'ACET' });
  if (!acetCollege) return;

  // Let's update 100Pillars in DailyLead to have Role="Civil Engineer" and CTC="4.5 LPA"
  const lead = await DailyLead.findOne({
    college_id: acetCollege._id,
    company_name: '100Pillars Constructions Private Limited',
  });
  if (lead) {
    lead.job_role = 'Civil Engineer';
    lead.ctc = '4.5 LPA';
    await lead.save();
    console.log('Updated 100Pillars in DailyLead to Role="Civil Engineer", CTC="4.5 LPA"');
  }

  const secret = process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026';
  const token = jwt.sign(
    {
      userId: '6a847199fa3bf51271bc14eb',
      role: 'PLACEMENT_COORDINATOR',
      role_code: 'PLACEMENT_COORDINATOR',
      roles: ['PLACEMENT_COORDINATOR', 'SUPER_ADMIN'],
      email: 'admin@infoziant.com',
    },
    secret,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const syncUrl = 'http://127.0.0.1:5000/api/v1/weekly-tracker/sync-daily-positives';
  const payload = {
    college_id: String(acetCollege._id),
    academic_year: 2027,
  };

  console.log('\nSending Sync Request after DailyLead update...');
  const res = await fetch(syncUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data: any = await res.json();
  console.log('Sync Response:', JSON.stringify(data, null, 2));

  const weekly100 = await WeeklyTracker.findOne({
    college_id: acetCollege._id,
    academic_year: 2027,
    company_name: /100Pillars/i,
    is_deleted: false,
  });
  console.log(`WeeklyTracker 100Pillars: Role="${weekly100?.job_role}", CTC="${weekly100?.ctc_lpa}"`);

  // Reset back to empty role and CTC for 100Pillars
  if (lead) {
    lead.job_role = '';
    lead.ctc = '';
    await lead.save();
  }
  if (weekly100) {
    weekly100.job_role = '';
    weekly100.ctc_lpa = '';
    await weekly100.save();
    console.log('Reset 100Pillars back to empty role and CTC.');
  }

  await disconnectDatabase();
}

testUpdateSync().catch(console.error);
