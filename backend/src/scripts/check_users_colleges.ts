import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { College } from '../models/College';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();

  const allColleges = await College.find({ is_deleted: { $ne: true } }).lean();
  const collegeMap = new Map();
  allColleges.forEach((c: any) => {
    collegeMap.set(String(c._id), c);
  });

  const users = await User.find({ is_deleted: { $ne: true } })
    .select('_id full_name username official_email role_codes account_status assigned_college_ids')
    .lean();

  console.log('=== TOTAL USERS IN IPOMS ===:', users.length);
  
  for (const u of users) {
    const assignedColleges = (u.assigned_college_ids || [])
      .map((id: any) => {
        const c = collegeMap.get(String(id));
        return c ? `${c.college_name} (${c.college_code})` : String(id);
      });

    console.log(`\nUser: ${u.full_name} (@${u.username})`);
    console.log(`Email: ${u.official_email}`);
    console.log(`Role: ${u.role_codes?.join(', ') || 'N/A'}`);
    console.log(`Status: ${u.account_status}`);
    console.log(`Assigned Colleges (${assignedColleges.length}):`);
    if (assignedColleges.length === 0) {
      console.log(`  - [All Institutions / None Specified]`);
    } else {
      assignedColleges.forEach((col: string) => console.log(`  - ${col}`));
    }
  }

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
