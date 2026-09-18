import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';

async function testSync() {
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

  const url = 'http://127.0.0.1:5000/api/v1/daily-leads/sync-positives';
  const payload = {
    date: '2026-09-17',
    college_id: 'all',
  };

  console.log('Sending sync-positives request to:', url);
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data: any = await response.json();
  console.log('Sync Response:\n', JSON.stringify(data, null, 2));

  // Also query GET /api/v1/daily-leads?date=2026-09-17
  const listUrl = 'http://127.0.0.1:5000/api/v1/daily-leads?date=2026-09-17&lead_type=positive';
  const listRes = await fetch(listUrl, { headers });
  const listData: any = await listRes.json();
  console.log('\nGET Daily Leads Positives Count:', listData.data?.total);
  listData.data?.leads?.forEach((l: any, i: number) => {
    console.log(`  ${i + 1}. [${l.college_id?.college_code}] ${l.company_name} | Role: "${l.job_role}" | CTC: "${l.ctc}" | EventTime: ${l.event_time} | Remarks: "${l.remarks}"`);
  });

  // Also query Summary
  const summaryRes = await fetch('http://127.0.0.1:5000/api/v1/daily-leads/summary?date=2026-09-17', { headers });
  const summaryData: any = await summaryRes.json();
  console.log('\nDaily Leads Summary for 2026-09-17:\n', JSON.stringify(summaryData.data, null, 2));
}

testSync().catch(console.error);
