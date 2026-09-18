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

async function testWeeklySync() {
  await connectDatabase();

  const acetCollege = await College.findOne({ college_code: 'ACET' });
  if (!acetCollege) {
    console.error('ACET college not found');
    return;
  }

  console.log(`\nTesting Weekly Tracker Sync for college: ${acetCollege.college_name} (${acetCollege._id})`);

  // Check Daily Leads positives for ACET
  const dailyLeads = await DailyLead.find({
    college_id: acetCollege._id,
    lead_type: 'positive',
    is_deleted: false,
  });
  console.log(`Found ${dailyLeads.length} positive leads in Daily Leads for ACET.`);
  dailyLeads.forEach((dl) => {
    console.log(`- DailyLead: "${dl.company_name}" | Role: "${dl.job_role}" | CTC: "${dl.ctc}" | Batch: "${dl.eligible_batch}"`);
  });

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

  console.log('\n1. Sending First Sync Request...');
  const res1 = await fetch(syncUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data1: any = await res1.json();
  console.log('First Sync Response:', JSON.stringify(data1, null, 2));

  console.log('\n2. Sending Second Sync Request (testing deduplication / multiple clicks)...');
  const res2 = await fetch(syncUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data2: any = await res2.json();
  console.log('Second Sync Response:', JSON.stringify(data2, null, 2));

  // Check WeeklyTracker pipeline rows for ACET
  const weeklyRows = await WeeklyTracker.find({
    college_id: acetCollege._id,
    academic_year: 2027,
    pipeline_section: 'pipeline',
    is_deleted: false,
  });

  console.log(`\nCurrent Companies in Pipeline for ACET (2027): ${weeklyRows.length}`);
  weeklyRows.forEach((r, i) => {
    console.log(`  ${i + 1}. "${r.company_name}" | Status: "${r.current_status_text}" | Role: "${r.job_role}" | CTC: "${r.ctc_lpa}" | Order: ${r.order_index}`);
  });

  await disconnectDatabase();
}

testWeeklySync().catch(console.error);
