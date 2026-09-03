const API_URL = 'http://localhost:5000/api/v1';

const COORDINATOR_LOGINS = [
  { name: 'Mohana', email: 'mohanaradha_a@infoziant.com', expected: ['KARPAGAM', 'AIHT', 'ACET', 'KPR'] },
  { name: 'Thirisha', email: 'thirisha_r@infoziant.com', expected: ['PSNA', 'DSU', 'SMVEC'] },
  { name: 'Malvika', email: 'malavika_ramesh@infoziant.com', expected: ['KLU', 'NGCE'] },
  { name: 'Lizenya', email: 'lizenya_r@infoziant.com', expected: ['NPR', 'KIOT', 'ACEW'] },
  { name: 'Megala', email: 'megaladevi_ps@infoziant.com', expected: ['NGP', 'KAMARAJ'] },
  { name: 'Tamil (Seshmitha)', email: 'seshmitha_tamil@icl.today', expected: ['MCET', 'MEC'] },
];

async function main() {
  console.log('📋 Verifying Official Default College Roster across all 6 Coordinators...\n');

  for (const coord of COORDINATOR_LOGINS) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: coord.email, password: 'iPOMS@123' }),
    });
    const data = await res.json();
    const token = data?.data?.access_token || data?.data?.token;

    const matrixRes = await fetch(`${API_URL}/colleges/focus-matrix`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const matrixData = await matrixRes.json();
    const colleges = matrixData?.data?.colleges || [];

    const myColleges = colleges.filter((c) => c.is_selected_by_me).map((c) => c.college_code);
    const isLocked = matrixData?.data?.current_user_focus?.is_locked;

    console.log(`👤 ${coord.name.padEnd(20)} | Expected: [${coord.expected.join(', ')}]`);
    console.log(`   Actual Assigned Focus : [${myColleges.join(', ')}] (Count: ${myColleges.length})`);
    console.log(`   Status                : ${isLocked ? '🔒 Locked (Modules Unlocked)' : '🔓 Unlocked'}\n`);
  }
}

main().catch(console.error);
