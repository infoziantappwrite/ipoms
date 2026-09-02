const API_URL = 'http://localhost:5000/api/v1';

async function testKiotApi() {
  console.log('🧪 Testing Weekly Tracker API for KIOT...\n');

  // Login as Lizenya (Assigned Coordinator for KIOT)
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'lizenya_r@infoziant.com',
      password: 'iPOMS@123',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;
  console.log(`✅ Logged in as: ${loginData?.data?.user?.full_name}`);

  // Fetch KIOT college ID
  const colRes = await fetch(`${API_URL}/colleges`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const colData = await colRes.json();
  const kiot = colData.data.colleges.find((c) => c.college_code === 'KIOT');
  console.log(`🏛️ KIOT College ID: ${kiot._id}`);

  // Fetch KPI Summary
  const kpiRes = await fetch(`${API_URL}/weekly-tracker/kpi?college_id=${kiot._id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const kpiData = await kpiRes.json();
  console.log('\n📊 --- KIOT KPI SUMMARY ---');
  console.log('Total Companies In Progress :', kpiData?.data?.in_progress_count ?? kpiData?.data?.companies_in_progress);
  console.log('Total Companies In Pipeline :', kpiData?.data?.pipeline_count ?? kpiData?.data?.companies_in_pipeline);
  console.log('Total Top Companies         :', kpiData?.data?.top_companies_count ?? kpiData?.data?.top_companies);
  console.log('Total On Hold By College    :', kpiData?.data?.on_hold_college_count ?? kpiData?.data?.on_hold_by_college);
  console.log('Total On Hold By HR         :', kpiData?.data?.on_hold_hr_count ?? kpiData?.data?.on_hold_by_hr);

  // Fetch Weekly Tracker rows
  const rowsRes = await fetch(`${API_URL}/weekly-tracker?college_id=${kiot._id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rowsData = await rowsRes.json();
  const sections = rowsData?.data?.sections || {};
  console.log(`\n📋 Total Records: ${rowsData?.data?.total_records}`);
  console.log('--- SECTION BREAKDOWN ---');
  console.log('In Progress Count        :', sections.in_progress?.rows?.length);
  console.log('Pipeline Count           :', sections.pipeline?.rows?.length);
  console.log('Top Companies Count      :', sections.top_companies?.rows?.length);
  console.log('On Hold by College Count :', sections.on_hold_by_college?.rows?.length);
  console.log('On Hold by HR Count      :', sections.on_hold_by_hr?.rows?.length);

  // Print in_progress companies sample
  console.log('\n🚀 In Progress Companies (5):');
  (sections.in_progress?.rows || []).forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.company_name.padEnd(35)} | Role: ${r.job_role.padEnd(30)} | CTC: ${r.ctc_lpa.padEnd(15)} | Status: ${r.current_status_text}`);
  });

  // Print top companies sample
  console.log('\n⭐ Top Companies (9):');
  (sections.top_companies?.rows || []).forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.company_name.padEnd(35)} | Role: ${r.job_role.padEnd(30)} | CTC: ${r.ctc_lpa}`);
  });

  // Print on hold by college sample
  console.log('\n⏸️ On Hold By College (5):');
  (sections.on_hold_by_college?.rows || []).forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.company_name.padEnd(45)} | Role: ${r.job_role.padEnd(30)} | CTC: ${r.ctc_lpa} | Reason: ${r.current_status_text}`);
  });

  // Print on hold by HR sample
  console.log('\n⏸️ On Hold By HR (1):');
  (sections.on_hold_by_hr?.rows || []).forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.company_name.padEnd(35)} | Role: ${r.job_role} | CTC: ${r.ctc_lpa} | Reason: ${r.current_status_text}`);
  });
}

testKiotApi().catch(console.error);
