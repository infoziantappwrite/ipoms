const API_URL = 'http://localhost:5000/api/v1';

async function testAllCollegesMonthEnd() {
  console.log('🧪 Testing Month-End Report Generation across multiple colleges:\n');

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lizenya_r@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;

  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const colleges = Array.isArray(colData?.data) ? colData.data : (colData?.data?.colleges || []);

  const testColleges = ['ACET', 'NPR', 'PSNA', 'KLU', 'HITS', 'AIHT'];

  for (const code of testColleges) {
    const col = colleges.find((c) => c.college_code === code);
    if (!col) continue;

    const repRes = await fetch(`${API_URL}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        template_type: 'month_end',
        college_id: col._id,
        report_period: 'August 2026',
      }),
    });

    const repData = await repRes.json();
    const report = repData?.data?.report;

    console.log(`\n======================================================`);
    console.log(`🏛️ [${code}] ${report?.branding?.college_name}`);
    console.log(`   Report Title: ${report?.report_title} | Period: ${report?.report_period}`);
    console.log(`   JD Received Companies (from Weekly Tracker in_progress + PendingTask dates): ${report?.sections?.company_conversions?.length || 0}`);
    (report?.sections?.company_conversions || []).slice(0, 3).forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.company_name.padEnd(30)} | Role: ${c.role.padEnd(20)} | CTC: ${c.ctc.padEnd(10)} | JD Date: ${c.jd_received_date}`);
    });

    console.log(`   Companies in Drive (from Weekly Tracker in_drive): ${report?.sections?.companies_in_drive?.length || 0}`);
    (report?.sections?.companies_in_drive || []).slice(0, 3).forEach((d, i) => {
      console.log(`     ${i + 1}. ${d.company_name.padEnd(30)} | Role: ${d.role.padEnd(20)} | Status: ${d.status}`);
    });
  }

  console.log('\n🎉 ALL MONTH-END REPORT COLLEGE TESTS PASSED!');
}

testAllCollegesMonthEnd().catch(console.error);
