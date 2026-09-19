import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { DailyLead } from '../models/DailyLead';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { ActiveLead } from '../models/ActiveLead';
import { PendingTask } from '../models/PendingTask';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function purgeOperationalData() {
  await connectDatabase();

  console.log('🗑️  [Purge] Erasing old operational entries...');

  const [dtRes, dlRes, wtRes, alRes, ptRes] = await Promise.all([
    DailyTracker.deleteMany({}),
    DailyLead.deleteMany({}),
    WeeklyTracker.deleteMany({}),
    ActiveLead.deleteMany({}),
    PendingTask.deleteMany({}),
  ]);

  console.log('==============================================');
  console.log(' PURGE OPERATION COMPLETED SUCCESSFULLY');
  console.log('==============================================');
  console.log(`✅ Daily Tracker:  Deleted ${dtRes.deletedCount} entries`);
  console.log(`✅ Daily Leads:    Deleted ${dlRes.deletedCount} entries (Positives & JD Received)`);
  console.log(`✅ Weekly Tracker: Deleted ${wtRes.deletedCount} entries`);
  console.log(`✅ Active Leads:   Deleted ${alRes.deletedCount} entries`);
  console.log(`✅ Pending Tasks:  Deleted ${ptRes.deletedCount} entries`);
  console.log('----------------------------------------------');
  console.log('🔒 Master Colleges, Users, Roles & Companies were PRESERVED.');
  console.log('==============================================');

  await disconnectDatabase();
}

if (require.main === module) {
  purgeOperationalData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to purge operational data:', err);
      process.exit(1);
    });
}
