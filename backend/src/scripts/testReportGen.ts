import mongoose, { Types } from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { College } from '../models/College';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const acet = await College.findOne({ college_code: 'ACET' });
  const kgisl = await College.findOne({ college_code: 'KGISL' });

  for (const col of [acet, kgisl].filter(Boolean)) {
    console.log(`\n=== Testing for ${col!.college_name} (${col!.college_code}) ===`);
    const cId = col!._id;
    const academic_year: string = '2026';
    const yearQueries: any[] = [academic_year, Number(academic_year), String(academic_year)];

    const wtFilter: any = {
      is_deleted: { $ne: true },
      college_id: { $in: [cId, cId.toString()] }
    };
    if (academic_year && academic_year !== 'all') {
      wtFilter.academic_year = { $in: yearQueries };
    }

    const [completed, inProgress, pipeline, topCompanies] = await Promise.all([
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'completed' }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'in_progress' }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'pipeline' }),
      WeeklyTracker.find({
        ...wtFilter,
        $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }]
      })
    ]);

    console.log(`- Completed: ${completed.length}`);
    console.log(`- In Progress: ${inProgress.length}`);
    console.log(`- Pipeline: ${pipeline.length}`);
    console.log(`- Top Companies: ${topCompanies.length}`);
  }

  await mongoose.disconnect();
}
run();
