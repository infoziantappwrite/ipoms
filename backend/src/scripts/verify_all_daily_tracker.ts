import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();
  void User;

  const colleges = await College.find({ is_deleted: { $ne: true } }).lean();

  console.log('\n================ DAILY TRACKER DATABASE VERIFICATION ================');

  const stats: any[] = [];
  let totalCount = 0;

  for (const c of colleges) {
    const count = await DailyTracker.countDocuments({ college_id: c._id });
    if (count > 0) {
      const distinctDates = await DailyTracker.distinct('session_date', { college_id: c._id });
      const sample = await DailyTracker.findOne({ college_id: c._id })
        .populate('coordinator_id', 'full_name official_email')
        .lean();

      stats.push({
        college_code: c.college_code,
        college_name: c.college_name,
        coordinator: (sample as any)?.coordinator_id?.full_name || 'N/A',
        total_records: count,
        distinct_dates: distinctDates.length,
      });
      totalCount += count;
    }
  }

  console.table(stats);
  console.log(`\nTOTAL DAILY TRACKER RECORDS IN DATABASE: ${totalCount}`);

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
