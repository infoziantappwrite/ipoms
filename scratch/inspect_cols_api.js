const API_URL = 'http://localhost:5000/api/v1';

async function inspectColleges() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ipoms.edu', password: 'Password@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.access_token || loginData?.data?.token;

  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  console.log('colData keys:', Object.keys(colData));
  console.log('colData.data keys / type:', typeof colData.data, Array.isArray(colData.data));
  const cols = colData.data?.colleges || colData.data || [];
  console.log('Found colleges count:', cols.length);
  cols.slice(0, 10).forEach(c => console.log(` - [${c.college_code}] ${c.college_name} (${c._id})`));
}

inspectColleges().catch(console.error);
