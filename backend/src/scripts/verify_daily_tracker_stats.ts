import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { College } from '../models/College';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();

  const total = await DailyTracker.countDocuments({ year: 2026, month: 9 });
  console.log(`=== TOTAL SEPTEMBER 2026 DAILY TRACKER RECORDS IN DB: ${total} ===\n`);

  const outcomeStats = await DailyTracker.aggregate([
    { $match: { year: 2026, month: 9 } },
    { $group: { _id: '$outcome_status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  console.log('--- CALL OUTCOME DISTRIBUTION ---');
  console.table(outcomeStats);

  const allColleges = await College.find({ is_deleted: { $ne: true } }).lean();
  console.log(`=== ALL REGISTERED COLLEGES AND THEIR DAILY TRACKER RECORD COUNTS ===`);
  const collegeCounts = [];
  for (const c of allColleges) {
    const count = await DailyTracker.countDocuments({ college_id: c._id });
    const septCount = await DailyTracker.countDocuments({ college_id: c._id, year: 2026, month: 9 });
    collegeCounts.push({
      code: c.college_code,
      name: c.college_name,
      totalCount: count,
      sept2026Count: septCount,
    });
  }
  console.table(collegeCounts.filter(c => c.totalCount > 0));


  await disconnectDatabase();
}

main().catch(console.error);
