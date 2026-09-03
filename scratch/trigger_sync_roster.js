const API_URL = 'http://localhost:5000/api/v1';

async function main() {
  console.log('Logging in to obtain JWT token...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'placement_management@infoziant.com',
      password: 'iPOMS@123',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;

  console.log('Triggering college roster sync via API...');
  const res = await fetch(`${API_URL}/colleges/sync-roster`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  console.log('Sync response:', JSON.stringify(data, null, 2));

  // Verify /colleges endpoint (should only return active ones)
  const activeRes = await fetch(`${API_URL}/colleges`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const activeData = await activeRes.json();
  console.log(`\nActive colleges count from /colleges: ${activeData?.data?.total || activeData?.data?.colleges?.length}`);
  (activeData?.data?.colleges || []).forEach(c => {
    console.log(`  ✅ [${c.college_code}] ${c.college_name}`);
  });

  // Verify /colleges/all endpoint
  const allRes = await fetch(`${API_URL}/colleges/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allData = await allRes.json();
  console.log(`\nAll colleges count: ${allData?.data?.total} (Active: ${allData?.data?.active_count}, Inactive: ${allData?.data?.inactive_count})`);
  const inactive = (allData?.data?.colleges || []).filter(c => c.status !== 'active');
  console.log('Inactive colleges:');
  inactive.forEach(c => {
    console.log(`  ⏸️ [${c.college_code}] ${c.college_name} (${c.status})`);
  });
}

main().catch(console.error);
