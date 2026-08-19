import mongoose from 'mongoose';
import { ReportLibrary } from '../models/ReportLibrary';
import { College } from '../models/College';
import { User } from '../models/User';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function inspectReportLibrary() {
  console.log('\n===============================================================');
  console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "report_library" Collection');
  console.log('===============================================================\n');

  await connectDatabase();
  const _ = [College.modelName, User.modelName];

  const count = await ReportLibrary.countDocuments({});
  console.log(`📊 Total Documents in 'report_library' collection: ${count}\n`);

  const rows = await ReportLibrary.find({})
    .sort({ created_at: -1 })
    .limit(5)
    .populate('college_id', 'college_name college_code')
    .populate('coordinator_id', 'full_name official_email');

  rows.forEach((r: any, idx) => {
    console.log(`[Report Preset #${idx + 1}]`);
    console.log(`  ID             : ${r._id}`);
    console.log(`  Preset Name    : "${r.preset_name}"`);
    console.log(`  Template Type  : ${r.template_type}`);
    console.log(`  Target College : [${r.college_id?.college_code || 'ALL'}] ${r.college_id?.college_name || 'All Colleges'}`);
    console.log(`  Coordinator    : ${r.coordinator_id?.full_name}`);
    console.log(`  Theme          : ${r.theme}`);
    console.log(`  Is Deleted     : ${r.is_deleted}`);
    console.log(`  Created At     : ${r.created_at.toISOString()}`);
    console.log('---------------------------------------------------------------');
  });

  await disconnectDatabase();
  console.log('\n✅ Report Library database inspection verified successfully!\n');
}

inspectReportLibrary().catch(console.error);
