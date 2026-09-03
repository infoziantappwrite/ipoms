import { connectDatabase, disconnectDatabase } from '../config/database';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { College } from '../models/College';

async function main() {
  await connectDatabase();
  const totalCount = await WeeklyTracker.countDocuments({ is_deleted: false });
  console.log(`📊 Total WeeklyTracker active records in DB: ${totalCount}`);

  const byCollege = await WeeklyTracker.aggregate([
    { $match: { is_deleted: false } },
    { $group: { _id: '$college_id', count: { $sum: 1 } } },
  ]);

  for (const item of byCollege) {
    const col = await College.findById(item._id);
    console.log(`  • College: [${col?.college_code}] ${col?.college_name} -> ${item.count} rows`);
  }

  await disconnectDatabase();
}

main().catch(console.error);
