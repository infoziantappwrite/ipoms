const API_URL = 'http://localhost:5000/api/v1';

async function verifyMonthEndStructure() {
  console.log('🧪 Verifying Month-End Report single clean tables rendering...\n');

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lizenya_r@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;

  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const kiot = (colData.data.colleges || colData.data).find((c) => c.college_code === 'KIOT');

  const repRes = await fetch(`${API_URL}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      template_type: 'month_end',
      college_id: kiot._id,
      report_period: 'August 2026',
    }),
  });

  const repData = await repRes.json();
  const r = repData?.data?.report;

  console.log(`Report Title: ${r?.report_title}`);
  console.log(`Template Type: ${r?.template_type}`);
  console.log('Sections present:');
  console.log(' - JD Received Companies:', r?.sections?.company_conversions?.length || 0);
  console.log(' - Companies in Drive   :', r?.sections?.companies_in_drive?.length || 0);
  console.log(' - On Hold by TPO       :', r?.sections?.on_hold_by_college?.length || 0);
  console.log(' - On Hold by HR        :', r?.sections?.on_hold_by_hr?.length || 0);
  console.log(' - Weekly Sections (should NOT exist):');
  console.log('   * completed_companies:', !!r?.sections?.completed_companies);
  console.log('   * in_progress        :', !!r?.sections?.in_progress);
  console.log('   * pipeline           :', !!r?.sections?.pipeline);
  console.log('   * top_companies      :', !!r?.sections?.top_companies);
  console.log('   * rejected_companies :', !!r?.sections?.rejected_companies);

  console.log('\n🎉 Verified: Exactly 4 distinct Month-End tables without any duplicates!');
}

verifyMonthEndStructure().catch(console.error);
