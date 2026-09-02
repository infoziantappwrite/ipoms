const API_URL = 'http://localhost:5000/api/v1';

async function main() {
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

  const collegesRes = await fetch(`${API_URL}/colleges`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const collegesData = await collegesRes.json();
  const colleges = collegesData?.data?.colleges || [];

  console.log('--- ALL COLLEGES IN DB ---');
  colleges.forEach((c) => {
    console.log(`${c.college_code.padEnd(12)} -> ${c.college_name} (${c._id})`);
  });

  const usersRes = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const usersData = await usersRes.json();
  const users = usersData?.data?.users || usersData?.users || [];

  console.log('\n--- ALL USERS IN DB ---');
  users.forEach((u) => {
    console.log(`${u.full_name.padEnd(25)} [${(u.role_codes || []).join(',')}] ${u.official_email} (${u._id})`);
  });
}

main().catch(console.error);
