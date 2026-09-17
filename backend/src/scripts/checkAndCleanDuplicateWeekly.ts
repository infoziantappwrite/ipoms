import mongoose from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { College } from '../models/College';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function checkAndCleanDuplicates() {
  await connectDatabase();

  const allRows = await WeeklyTracker.find({ is_deleted: false }).sort({ created_at: 1 });
  console.log(`Total non-deleted weekly tracker rows: ${allRows.length}`);

  const seen = new Map<string, typeof allRows[0]>();
  const duplicateIds: string[] = [];

  for (const row of allRows) {
    const key = `${row.college_id}_${row.academic_year}_${row.company_name.trim().toLowerCase()}`;
    if (seen.has(key)) {
      console.log(`Found duplicate for key [${key}] - ID: ${row._id}, created: ${row.created_at}`);
      duplicateIds.push(row._id.toString());
    } else {
      seen.set(key, row);
    }
  }

  console.log(`Total duplicate IDs identified: ${duplicateIds.length}`);

  if (duplicateIds.length > 0) {
    const res = await WeeklyTracker.deleteMany({ _id: { $in: duplicateIds } });
    console.log(`Cleaned up ${res.deletedCount} duplicate rows.`);
  }

  await disconnectDatabase();
}

checkAndCleanDuplicates().catch(console.error);
