import mongoose from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { College } from '../models/College';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const colleges = await College.find();
  console.log('Colleges:', colleges.map(c => ({ id: c._id.toString(), name: c.college_name })));

  const count = await WeeklyTracker.countDocuments({ is_deleted: { $ne: true } });
  console.log('Total active WeeklyTracker documents:', count);

  const samples = await WeeklyTracker.find({ is_deleted: { $ne: true } }).limit(10);
  console.log('Sample documents:', samples.map(s => ({
    id: s._id,
    college_id: s.college_id,
    academic_year: s.academic_year,
    pipeline_section: s.pipeline_section,
    company_name: s.company_name,
    is_pinned_top: (s as any).is_pinned_top
  })));

  const byYear = await WeeklyTracker.aggregate([
    { $match: { is_deleted: { $ne: true } } },
    { $group: { _id: { year: '$academic_year', section: '$pipeline_section', college: '$college_id' }, count: { $sum: 1 } } }
  ]);
  console.log('Aggregated by year, section, college:', byYear);

  await mongoose.disconnect();
}
run();
