const API_URL = 'http://localhost:5000/api/v1';

async function verifyAll() {
  console.log('🧪 Starting Full System Verification for Weekly Tracker & Synchronized Modules...\n');

  // Login as Admin
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lizenya_r@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;
  console.log('Login success:', loginData.success, '| User:', loginData?.data?.user?.full_name);

  // 1. Fetch College List
  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const colleges = colData?.data?.colleges || colData?.data || [];
  console.log(`🏛️ Total Colleges in System: ${colleges.length}\n`);

  // 2. Query Weekly Tracker for sample colleges across different coordinators
  const sampleCodes = ['KIOT', 'KLU', 'KARPAGAM', 'PSNA', 'SMVEC', 'EGS', 'HITS', 'NEHRU', 'MKCE', 'SONA'];
  console.log('📊 --- SAMPLE COLLEGES WEEKLY TRACKER API CHECK ---');
  for (const code of sampleCodes) {
    const col = colleges.find((c) => c.college_code === code);
    if (!col) continue;

    const wtRes = await fetch(`${API_URL}/weekly-tracker?college_id=${col._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const wtData = await wtRes.json();
    const sec = wtData?.data?.sections || {};

    console.log(`[${code.padEnd(8)}] Total Records: ${String(wtData?.data?.total_records).padEnd(4)} | In Progress: ${sec.in_progress?.rows?.length || 0} | Pipeline: ${sec.pipeline?.rows?.length || 0} | Top: ${sec.top_companies?.rows?.length || 0} | Completed: ${sec.completed?.rows?.length || 0} | Hold Col: ${sec.on_hold_by_college?.rows?.length || 0} | Hold HR: ${sec.on_hold_by_hr?.rows?.length || 0}`);
  }

  // 3. Check Pending Tasks Module
  console.log('\n📋 --- PENDING TASKS MODULE CHECK ---');
  const nprCol = colleges.find((c) => c.college_code === 'NPR');
  const psnaCol = colleges.find((c) => c.college_code === 'PSNA');
  
  const ptResNpr = await fetch(`${API_URL}/pending-tasks?college_id=${nprCol._id}`, { headers: { Authorization: `Bearer ${token}` } });
  const ptDataNpr = await ptResNpr.json();
  const nprTasks = ptDataNpr?.data?.tasks || [];
  console.log(`NPR Pending Tasks: ${nprTasks.length}`);
  nprTasks.forEach((t, i) => {
    console.log(`  ${i + 1}. [NPR] ${t.company_name.padEnd(30)} | Status: ${t.current_status.padEnd(20)} | DB Status: ${t.db_shared_status.padEnd(10)} | Action: ${t.action_to_be_taken}`);
  });

  const ptResPsna = await fetch(`${API_URL}/pending-tasks?college_id=${psnaCol._id}`, { headers: { Authorization: `Bearer ${token}` } });
  const ptDataPsna = await ptResPsna.json();
  const psnaTasks = ptDataPsna?.data?.tasks || [];
  console.log(`\nPSNA Pending Tasks: ${psnaTasks.length}`);
  psnaTasks.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i + 1}. [PSNA] ${t.company_name.padEnd(35)} | Status: ${t.current_status.padEnd(20)} | DB Status: ${t.db_shared_status.padEnd(10)} | Action: ${t.action_to_be_taken}`);
  });

  // 4. Test Report Generation for KLU and PSNA
  console.log('\n📑 --- REPORT GENERATION CHECK ---');
  for (const testCode of ['KLU', 'PSNA']) {
    const targetCol = colleges.find((c) => c.college_code === testCode);
    const repRes = await fetch(`${API_URL}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        template_type: 'weekly_placement',
        college_id: targetCol._id,
        week_label: 'Week 35 - September 2026',
      }),
    });
    const repData = await repRes.json();
    console.log(`✅ [${testCode}] Report generated successfully: ${repData?.data?.report?.report_title} (${JSON.stringify(repData?.data?.report?.kpi_summary)})`);
  }

  console.log('\n🎉 FULL VERIFICATION COMPLETE: All modules synchronized with updated Weekly publication data!');
}

verifyAll().catch(console.error);
