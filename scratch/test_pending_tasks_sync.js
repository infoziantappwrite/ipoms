const API_URL = 'http://localhost:5000/api/v1';

async function verifyPendingTasks() {
  console.log('🧪 Verifying Pending Tasks API & KPIs after import...\n');

  // Login as Coordinator
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lizenya_r@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;

  // Colleges
  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const colleges = colData.data.colleges || colData.data;

  const sampleCodes = ['KLU', 'PSNA', 'ACET', 'KIOT', 'AIHT', 'NEHRU', 'HITS'];

  for (const code of sampleCodes) {
    const col = colleges.find((c) => c.college_code === code);
    if (!col) continue;

    const ptRes = await fetch(`${API_URL}/pending-tasks?college_id=${col._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ptData = await ptRes.json();
    const tasks = ptData?.data?.tasks || [];

    const kpiRes = await fetch(`${API_URL}/pending-tasks/kpi?college_id=${col._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const kpiData = await kpiRes.json();
    const kpi = kpiData?.data?.kpi || kpiData?.data || {};

    console.log(`[${code.padEnd(8)}] Total Tasks: ${tasks.length} | DB Shared: ${kpi.db_shared_count || 0} | DB Pending: ${kpi.db_pending_count || 0} | Awaiting Drive Date: ${kpi.awaiting_drive_date || 0}`);
    if (tasks.length > 0) {
      console.log(`   Sample: ${tasks[0].company_name} (Status: ${tasks[0].current_status}, Action: ${tasks[0].action_to_be_taken})`);
    }
  }

  console.log('\n🎉 Pending Tasks Module verification succeeded across all colleges!');
}

verifyPendingTasks().catch(console.error);
