const http = require('http');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: '65e000000000000000000001', email: 'admin@ipoms.edu', roles: ['ADMINISTRATOR'], fullName: 'Super Admin' },
  '7d8d47c9cdc4890b90a0a680643d785ea402e65a94a7ed23d86517096bf39890777e0f2f186838f26784e1010a6e2ab7'
);

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/daily-leads?date=2026-08-25&lead_type=jd_received',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    const data = JSON.parse(body);
    console.log('SUCCESS:', data.success);
    console.log('TOTAL JD:', data.data?.total);
    if (data.data?.leads?.length) {
      console.log('JD RECEIVED LEADS:');
      data.data.leads.forEach((l, i) => console.log(`  ${i+1}. [${l.college_id?.college_code}] ${l.company_name} | ${l.job_role}`));
    }
    process.exit(0);
  });
});

req.on('error', console.error);
req.end();
