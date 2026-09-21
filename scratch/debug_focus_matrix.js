const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Projects/iPOMS/backend/.env' });

function getWeekMondayKey(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const College = mongoose.model('College', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const currentWeekMonday = getWeekMondayKey();
  console.log('Calculated currentWeekMonday:', currentWeekMonday);

  const allUsers = await User.find({ is_deleted: false });
  console.log('--- ALL ACTIVE USERS IN DB ---');
  for (const u of allUsers) {
    console.log({
      _id: String(u._id),
      full_name: u.full_name,
      username: u.username,
      official_email: u.official_email,
      role_codes: u.role_codes,
      weekly_focus_locked: u.weekly_focus_locked,
      weekly_focus_week_key: u.weekly_focus_week_key,
      assigned_college_ids: (u.assigned_college_ids || []).map(String)
    });
  }

  const allColleges = await College.find({ status: 'active' }).sort({ college_code: 1 });
  const collegesMap = new Map();
  allColleges.forEach(c => collegesMap.set(String(c._id), c));

  console.log('\n--- CHECKING FOR MOHANARADHA ---');
  const mohana = allUsers.find(u => u.official_email.includes('mohana') || u.full_name.includes('Mohana'));
  if (mohana) {
    console.log('Found Mohana:', mohana.full_name, mohana._id, 'assigned:', mohana.assigned_college_ids);
    for (const cid of (mohana.assigned_college_ids || [])) {
      const col = collegesMap.get(String(cid));
      console.log('  Assigned College:', cid, col ? `[${col.college_code}] ${col.college_name}` : 'UNKNOWN');
    }
  }

  // Let's check which users are assigned to ACET, AIHT, KARPAGAM, KPR
  const targetCodes = ['ACET', 'AIHT', 'KARPAGAM', 'KPR'];
  const targetColleges = allColleges.filter(c => targetCodes.includes(c.college_code));
  console.log('\n--- TARGET COLLEGES ---');
  for (const col of targetColleges) {
    console.log(`\nCollege: [${col.college_code}] ${col.college_name} (${col._id})`);
    console.log('  College.assigned_coordinator_ids in DB:', col.assigned_coordinator_ids);
    const usersWithThisAssigned = allUsers.filter(u => (u.assigned_college_ids || []).some(id => String(id) === String(col._id)));
    console.log('  Users having this in User.assigned_college_ids:', usersWithThisAssigned.map(u => `${u.full_name} (${u._id}, locked: ${u.weekly_focus_locked}, week: ${u.weekly_focus_week_key})`));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
