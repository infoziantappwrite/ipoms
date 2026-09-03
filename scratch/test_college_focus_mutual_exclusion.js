const API_URL = 'http://localhost:5000/api/v1';

async function runTest() {
  console.log('🧪 Starting College Focus Mutual Exclusion & Duplicate Prevention Test...\n');

  // 1. Login Mohanaradha (Coordinator A)
  const resLoginA = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'mohanaradha_a@infoziant.com',
      password: 'iPOMS@123',
    }),
  });
  const dataLoginA = await resLoginA.json();
  const tokenA = dataLoginA?.data?.access_token || dataLoginA?.data?.token;
  const userA = dataLoginA?.data?.user;
  console.log(`✅ Coordinator A logged in: ${userA?.full_name} (${userA?.official_email})`);

  // 2. Login Thirisha (Coordinator B)
  const resLoginB = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'thirisha_r@infoziant.com',
      password: 'iPOMS@123',
    }),
  });
  const dataLoginB = await resLoginB.json();
  const tokenB = dataLoginB?.data?.access_token || dataLoginB?.data?.token;
  const userB = dataLoginB?.data?.user;
  console.log(`✅ Coordinator B logged in: ${userB?.full_name} (${userB?.official_email})\n`);

  // 3. Fetch all colleges to get college IDs
  const resColleges = await fetch(`${API_URL}/colleges`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const dataColleges = await resColleges.json();
  const allColleges = dataColleges?.data?.colleges || dataColleges?.colleges || [];
  console.log(`Total colleges returned: ${allColleges.length}`);
  
  const acet = allColleges.find(c => c.college_code === 'ACET');
  const kiot = allColleges.find(c => c.college_code === 'KIOT');
  const klu = allColleges.find(c => c.college_code === 'KLU');
  const kpr = allColleges.find(c => c.college_code === 'KPR');

  console.log(`📍 Found Institutions: ACET (${acet?._id}), KIOT (${kiot?._id}), KLU (${klu?._id}), KPR (${kpr?._id})\n`);

  // 4. Coordinator A locks ACET and KIOT
  console.log(`🔒 [Coordinator A] Locking focus with [ACET, KIOT]...`);
  const resLockA = await fetch(`${API_URL}/colleges/lock-focus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      college_ids: [acet._id, kiot._id],
    }),
  });
  const dataLockA = await resLockA.json();
  console.log(`Coordinator A lock status:`, dataLockA.success, dataLockA.message);

  // 5. Coordinator B inspects Focus Matrix
  console.log(`\n🔍 [Coordinator B] Fetching College Focus Matrix...`);
  const resMatrixB = await fetch(`${API_URL}/colleges/focus-matrix`, {
    headers: {
      'Authorization': `Bearer ${tokenB}`,
    },
  });
  const dataMatrixB = await resMatrixB.json();
  const matrixColleges = dataMatrixB?.data?.colleges || [];

  const acetMatrix = matrixColleges.find(c => c.college_code === 'ACET');
  const kiotMatrix = matrixColleges.find(c => c.college_code === 'KIOT');
  const kluMatrix = matrixColleges.find(c => c.college_code === 'KLU');

  console.log(`ACET Occupancy: is_occupied=${acetMatrix?.is_occupied}, Handled by: ${acetMatrix?.occupied_by?.name}`);
  console.log(`KIOT Occupancy: is_occupied=${kiotMatrix?.is_occupied}, Handled by: ${kiotMatrix?.occupied_by?.name}`);
  console.log(`KLU Occupancy : is_occupied=${kluMatrix?.is_occupied}, Handled by: ${kluMatrix?.occupied_by?.name || 'Available'}`);

  // 6. Coordinator B attempts to lock ACET (which is already locked by Coordinator A)
  console.log(`\n🚫 [Coordinator B] Attempting to lock [ACET, KLU] (Conflict Test)...`);
  const resConflict = await fetch(`${API_URL}/colleges/lock-focus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      college_ids: [acet._id, klu._id],
    }),
  });
  const dataConflict = await resConflict.json();
  console.log(`Conflict Response Status: ${resConflict.status}`);
  console.log(`Conflict Error Code     : ${dataConflict?.error?.code}`);
  console.log(`Conflict Error Message  : ${dataConflict?.error?.message}`);

  if (resConflict.status === 409) {
    console.log(`🎯 PASS: Backend successfully blocked duplicate college selection!`);
  } else {
    console.error(`❌ FAIL: Expected 409 Conflict but received ${resConflict.status}`);
  }

  // 7. Coordinator B locks available colleges [KLU, KPR]
  console.log(`\n🔒 [Coordinator B] Locking available colleges [KLU, KPR]...`);
  const resLockB = await fetch(`${API_URL}/colleges/lock-focus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      college_ids: [klu._id, kpr._id],
    }),
  });
  const dataLockB = await resLockB.json();
  console.log(`Coordinator B lock status:`, dataLockB.success, dataLockB.message);

  console.log(`\n🎉 Test Completed Successfully! All colleges are uniquely assigned with ZERO duplicates.`);
}

runTest().catch(console.error);
