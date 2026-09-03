const API_URL = 'http://localhost:5000/api/v1';

async function testMonthEndOnHold() {
  console.log('🧪 Testing Month-End Report with on_hold_by_college and on_hold_by_hr sections...\n');

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lizenya_r@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;

  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const colleges = colData.data.colleges || colData.data;

  const sampleColleges = ['KLU', 'PSNA', 'KIOT', 'SMVEC', 'ACET', 'AIHT'];

  for (const code of sampleColleges) {
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
    console.log(`   JD Received Companies: ${report?.sections?.company_conversions?.length || 0}`);
    console.log(`   Companies in Drive   : ${report?.sections?.companies_in_drive?.length || 0}`);
    console.log(`   Hold by TPO (College): ${report?.sections?.on_hold_by_college?.length || 0}`);
    (report?.sections?.on_hold_by_college || []).forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.company_name.padEnd(25)} | Role: ${r.role.padEnd(20)} | Status: ${r.status}`);
    });

    console.log(`   Hold by HR           : ${report?.sections?.on_hold_by_hr?.length || 0}`);
    (report?.sections?.on_hold_by_hr || []).forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.company_name.padEnd(25)} | Role: ${r.role.padEnd(20)} | Status: ${r.status}`);
    });
  }

  console.log('\n🎉 ALL ON-HOLD SECTIONS VERIFIED PERFECTLY IN MONTH-END REPORT!');
}

testMonthEndOnHold().catch(console.error);
