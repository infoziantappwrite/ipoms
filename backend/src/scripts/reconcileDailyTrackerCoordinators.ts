import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();
  void User;

  const users = await User.find({ is_active: { $ne: false }, role_codes: { $ne: 'ADMINISTRATOR' } }).lean();
  const collegeCoordinators = new Map<string, any>();

  users.forEach((u: any) => {
    (u.assigned_college_ids || []).forEach((cId: any) => {
      collegeCoordinators.set(String(cId), u);
    });
  });

  const admin = await User.findOne({ official_email: 'placement_management@infoziant.com' }).lean();

  const allTrackers = await DailyTracker.find({ coordinator_id: admin?._id }).lean();
  console.log(`Found ${allTrackers.length} DailyTracker records assigned to Administrator.`);

  let updatedCount = 0;
  for (const t of allTrackers) {
    const assignedUser = collegeCoordinators.get(String(t.college_id));
    if (assignedUser) {
      await DailyTracker.updateOne({ _id: t._id }, { $set: { coordinator_id: assignedUser._id } });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} records to their assigned coordinators.`);

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
