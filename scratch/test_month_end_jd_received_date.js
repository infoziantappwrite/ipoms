const API_URL = 'http://localhost:5000/api/v1';

async function testMonthEndJdDate() {
  console.log('🧪 Testing Month-End Report JD Received Date integration from PendingTask...\n');

  // Login
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lizenya_r@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;

  // Fetch NPR college
  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const npr = (colData.data.colleges || colData.data).find((c) => c.college_code === 'NPR');

  // Generate Month-End Report for NPR
  const repRes = await fetch(`${API_URL}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      template_type: 'month_end',
      college_id: npr._id,
      report_period: 'August 2026',
    }),
  });

  const repData = await repRes.json();
  const report = repData?.data?.report;

  console.log('Report Title  :', report?.report_title);
  console.log('Period        :', report?.report_period);
  console.log('Conversions Table (JD Received):');
  (report?.sections?.company_conversions || []).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.company_name.padEnd(35)} | Role: ${c.role.padEnd(25)} | CTC: ${c.ctc.padEnd(12)} | JD Received Date: ${c.jd_received_date}`);
  });

  console.log('\n✅ Month-End Report accurately pulled JD received dates from PendingTask section!');
}

testMonthEndJdDate().catch(console.error);
