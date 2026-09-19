import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { College } from '../models/College';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function run() {
  await connectDatabase();
  const acet = await College.findOne({ college_code: 'ACET' });
  console.log('ACET College:', acet?._id, acet?.college_name);
  if (acet) {
    const count = await DailyTracker.countDocuments({ college_id: acet._id });
    console.log('Existing DailyTracker count for ACET:', count);
    const sample = await DailyTracker.find({ college_id: acet._id }).limit(5).lean();
    console.log('Sample rows:', sample);
  }
  const totalCount = await DailyTracker.countDocuments({});
  console.log('Total DailyTracker count in DB:', totalCount);
  await disconnectDatabase();
}

run().catch(console.error);
