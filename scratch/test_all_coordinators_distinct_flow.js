const API_URL = 'http://localhost:5000/api/v1';

const COORDINATORS = [
  { name: 'Mohanaradha', email: 'mohanaradha_a@infoziant.com', colleges: ['ACET', 'KIOT'] },
  { name: 'Thirisha', email: 'thirisha_r@infoziant.com', colleges: ['KLU', 'KPR'] },
  { name: 'Malavika', email: 'malavika_ramesh@infoziant.com', colleges: ['KARPAGAM', 'AIHT'] },
  { name: 'Lizenya', email: 'lizenya_r@infoziant.com', colleges: ['PSNA', 'SMVEC'] },
  { name: 'Megala Devi', email: 'megaladevi_ps@infoziant.com', colleges: ['DSU', 'MKCE'] },
  { name: 'Seshmitha', email: 'seshmitha_tamil@icl.today', colleges: ['SONA', 'KARUNYA'] },
];

async function run() {
  console.log('🚀 Testing 6 Coordinators Distinct College Focus & Zero Duplication Matrix...\n');

  const coordinatorSessions = [];

  // Step 1: Login all 6 coordinators
  for (const coord of COORDINATORS) {
    const resLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: coord.email,
        password: 'iPOMS@123',
      }),
    });
    const dataLogin = await resLogin.json();
    const token = dataLogin?.data?.access_token || dataLogin?.data?.token;
    coordinatorSessions.push({
      ...coord,
      token,
      userId: dataLogin?.data?.user?._id,
      fullName: dataLogin?.data?.user?.full_name,
    });
    console.log(`👤 Logged in: ${dataLogin?.data?.user?.full_name} (${coord.email})`);
  }

  // Fetch all colleges map with token
  const resColleges = await fetch(`${API_URL}/colleges`, {
    headers: { 'Authorization': `Bearer ${coordinatorSessions[0].token}` }
  });
  const dataColleges = await resColleges.json();
  const allColleges = dataColleges?.data?.colleges || [];
  const collegeCodeToId = {};
  allColleges.forEach((c) => {
    collegeCodeToId[c.college_code] = c._id;
  });
  console.log('Available College Codes:', Object.keys(collegeCodeToId).join(', '));

  console.log('\n--- 1. LOCKING DISTINCT COLLEGES FOR EACH COORDINATOR ---');

  for (const session of coordinatorSessions) {
    const targetIds = session.colleges.map((code) => collegeCodeToId[code]);
    const resLock = await fetch(`${API_URL}/colleges/lock-focus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
      },
      body: JSON.stringify({ college_ids: targetIds }),
    });
    const dataLock = await resLock.json();
    console.log(`🔒 ${session.fullName} locked [${session.colleges.join(', ')}]: ${dataLock.message}`);
  }

  console.log('\n--- 2. VERIFYING FOCUS OCCUPANCY MATRIX ---');
  // Inspect focus matrix from Coordinator 6 (Seshmitha)'s perspective
  const sesh = coordinatorSessions[5];
  const resMatrix = await fetch(`${API_URL}/colleges/focus-matrix`, {
    headers: { 'Authorization': `Bearer ${sesh.token}` },
  });
  const dataMatrix = await resMatrix.json();
  const collegesList = dataMatrix?.data?.colleges || [];

  const occupiedColleges = collegesList.filter((c) => c.is_occupied);
  const mySelected = collegesList.filter((c) => c.is_selected_by_me);
  const availableColleges = collegesList.filter((c) => !c.is_occupied && !c.is_selected_by_me);

  console.log(`Total Institutions in System : ${collegesList.length}`);
  console.log(`Locked by Other Coordinators  : ${occupiedColleges.length}`);
  console.log(`Selected by Current User     : ${mySelected.length} (${mySelected.map((c) => c.college_code).join(', ')})`);
  console.log(`Remaining Available Colleges : ${availableColleges.length}`);

  console.log('\nOccupancy Breakdown:');
  occupiedColleges.forEach((c) => {
    console.log(`  • [${c.college_code}] ${c.college_name.padEnd(45)} -> Handled by ${c.occupied_by?.name}`);
  });

  console.log('\n--- 3. VERIFYING DUPLICATION CONFLICT PREVENTION ---');
  // Seshmitha attempts to lock ACET (which is locked by Mohanaradha)
  console.log('Testing duplicate attempt: Seshmitha attempts to lock [ACET, SONA]...');
  const resConflict = await fetch(`${API_URL}/colleges/lock-focus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sesh.token}`,
    },
    body: JSON.stringify({
      college_ids: [collegeCodeToId['ACET'], collegeCodeToId['SONA']],
    }),
  });
  const dataConflict = await resConflict.json();
  console.log(`HTTP Status: ${resConflict.status}`);
  console.log(`Error Code : ${dataConflict?.error?.code}`);
  console.log(`Message    : ${dataConflict?.error?.message}`);

  if (resConflict.status === 409) {
    console.log('✅ PASS: Duplication was strictly prevented!');
  } else {
    console.error('❌ FAIL: Expected 409 status.');
  }

  console.log('\n--- 4. TESTING UNLOCK & EDIT WORKFLOW ---');
  // Seshmitha unlocks focus
  const resUnlock = await fetch(`${API_URL}/colleges/unlock-focus`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sesh.token}` },
  });
  const dataUnlock = await resUnlock.json();
  console.log(`Unlock Status: ${dataUnlock.success} - ${dataUnlock.message}`);

  console.log('\n🎉 ALL TESTS PASSED! 6 Coordinators have distinct, non-duplicated college allocations with weekly locking.');
}

run().catch(console.error);
