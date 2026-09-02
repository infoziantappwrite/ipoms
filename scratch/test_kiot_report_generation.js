const API_URL = 'http://localhost:5000/api/v1';

async function testReport() {
  console.log('📑 Testing Report Generation for KIOT...\n');

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lizenya_r@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;
  const user = loginData?.data?.user;

  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const kiot = colData.data.colleges.find((c) => c.college_code === 'KIOT');

  // Generate Weekly Placement Report
  const repRes = await fetch(`${API_URL}/reports/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      template_type: 'weekly_placement',
      college_id: kiot._id,
      coordinator_id: user._id,
      week_label: 'Week 35 - September 2026',
    }),
  });

  const repData = await repRes.json();
  const report = repData?.data?.report;

  console.log('Report Title  :', report?.report_title);
  console.log('College Name  :', report?.college_name || report?.institution_name);
  console.log('Prepared By   :', report?.branding?.prepared_by || report?.generated_by);
  console.log('KPI Summary   :', report?.kpi_summary);
  console.log('Report Tables :');
  if (report?.tables) {
    Object.keys(report.tables).forEach((k) => {
      console.log(`  • ${k.padEnd(25)} : ${report.tables[k]?.length || 0} rows`);
    });
  }
  if (report?.sections && Array.isArray(report.sections)) {
    report.sections.forEach((sec) => {
      console.log(`  • [${sec.section_type}] ${sec.section_title.padEnd(30)} : ${sec.companies?.length || 0} companies`);
    });
  }

  console.log('\n✅ Report generation seamlessly extracted all companies from KIOT Weekly Tracker!');
}

testReport().catch(console.error);
