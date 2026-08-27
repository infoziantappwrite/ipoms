import mongoose from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { College } from '../models/College';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const colleges = await College.find();
  
  for (const c of colleges) {
    const list = await WeeklyTracker.find({
      college_id: { $in: [c._id, c._id.toString()] },
      is_deleted: { $ne: true }
    });
    if (list.length > 0) {
      const secMap: Record<string, number> = {};
      list.forEach(item => {
        const sec = item.pipeline_section || 'unknown';
        secMap[sec] = (secMap[sec] || 0) + 1;
      });
      console.log(`[${c.college_code}] ${c.college_name}: Total ${list.length} rows ->`, secMap);
    }
  }

  await mongoose.disconnect();
}
run();
