const API_URL = 'http://localhost:5000/api/v1';

async function checkLogin() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a_mohanaradha@infoziant.com', password: 'iPOMS@123' }),
  });
  const loginData = await loginRes.json();
  console.log('loginData keys:', Object.keys(loginData.data || {}));
  console.log('token structure:', loginData.data?.tokens);
  const token = loginData?.data?.tokens?.accessToken || loginData?.data?.access_token || loginData?.data?.token;

  const colRes = await fetch(`${API_URL}/colleges`, { headers: { Authorization: `Bearer ${token}` } });
  const colData = await colRes.json();
  const cols = colData.data?.colleges || colData.data || [];
  console.log('Found colleges count:', cols.length);
  cols.slice(0, 5).forEach(c => console.log(` - [${c.college_code}] ${c.college_name}`));
}

checkLogin().catch(console.error);
