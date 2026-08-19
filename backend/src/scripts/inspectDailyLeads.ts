import mongoose from 'mongoose';
import { DailyLead } from '../models/DailyLead';
import { College } from '../models/College';
import { User } from '../models/User';
import { DailyTracker } from '../models/DailyTracker';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { Role } from '../models/Role';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function inspectDailyLeads() {
  console.log('\n===============================================================');
  console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "daily_leads" Collection');
  console.log('===============================================================\n');

  await connectDatabase();
  // Ensure models are registered in Mongoose
  const _ = [College.modelName, User.modelName, DailyTracker.modelName];

  const count = await DailyLead.countDocuments({});
  console.log(`📊 Total Documents in 'daily_leads' collection: ${count}\n`);

  const rows = await DailyLead.find({})
    .sort({ created_at: -1 })
    .limit(5)
    .populate('college_id', 'college_name college_code')
    .populate('coordinator_id', 'full_name official_email');

  rows.forEach((r: any, idx) => {
    console.log(`[Daily Lead #${idx + 1}]`);
    console.log(`  ID             : ${r._id}`);
    console.log(`  Type (Tab)     : ${r.lead_type.toUpperCase()} (Moved to JD: ${r.is_moved_to_jd})`);
    console.log(`  Company        : ${r.company_name}`);
    console.log(`  Role           : ${r.job_role}`);
    console.log(`  CTC            : ${r.ctc || 'N/A'}`);
    console.log(`  Batch          : ${r.eligible_batch}`);
    console.log(`  College        : [${r.college_id?.college_code}] ${r.college_id?.college_name}`);
    console.log(`  Coordinator    : ${r.coordinator_id?.full_name}`);
    console.log(`  Time & Date    : ${r.event_time} | ${r.lead_date.toISOString().split('T')[0]}`);
    console.log(`  Remarks        : "${r.remarks}"`);
    console.log(`  Is Deleted     : ${r.is_deleted}`);
    console.log(`  Created At     : ${r.created_at.toISOString()}`);
    console.log('---------------------------------------------------------------');
  });

  await disconnectDatabase();
  console.log('\n✅ Daily Leads database inspection verified successfully!\n');
}

inspectDailyLeads().catch(console.error);
