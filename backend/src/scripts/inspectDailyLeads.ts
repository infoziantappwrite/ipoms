import mongoose from 'mongoose';
import { DailyLead } from '../models/DailyLead';
import { College } from '../models/College';
import { User } from '../models/User';
import { DailyTracker } from '../models/DailyTracker';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function inspectDailyLeads() {
  console.log('\n===============================================================');
  console.log('🔍 DIRECT MONGODB DATABASE AUDIT: "daily_leads" Collection');
  console.log('===============================================================\n');

  await connectDatabase();
  const _ = [College.modelName, User.modelName, DailyTracker.modelName];

  const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));

  // 1. Pre-August audit
  const preAugustCount = await DailyLead.countDocuments({ lead_date: { $lt: augStart } });
  console.log(`🧹 Pre-August 2026 Records: ${preAugustCount} ${preAugustCount === 0 ? '✅ (PERFECT ZERO)' : '❌ (NEEDS PURGE)'}`);

  // 2. August Positives count
  const augustPositivesCount = await DailyLead.countDocuments({ lead_type: 'positive', lead_date: { $gte: augStart } });
  console.log(`📊 August 2026 Positives Count: ${augustPositivesCount}`);

  // 3. Breakdown by College
  const positives = await DailyLead.find({ lead_type: 'positive', lead_date: { $gte: augStart } })
    .populate('college_id', 'college_name college_code')
    .sort({ lead_date: 1 });

  const byCollege: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  positives.forEach((p: any) => {
    const code = p.college_id?.college_code || 'UNKNOWN';
    byCollege[code] = (byCollege[code] || 0) + 1;
    const dateStr = p.lead_date.toISOString().split('T')[0];
    byDate[dateStr] = (byDate[dateStr] || 0) + 1;
  });

  console.log('\n🏛️ Positives Breakdown by College:');
  console.table(byCollege);

  console.log('\n📅 Positives Breakdown by Date:');
  console.table(byDate);

  console.log('\n🔍 Sample Today Records (2026-08-24):');
  const todayRecords = positives.filter((p: any) => p.lead_date.toISOString().startsWith('2026-08-24'));
  todayRecords.forEach((r: any, idx) => {
    console.log(`  #${idx + 1} | [${r.college_id?.college_code}] ${r.company_name} | Role: ${r.job_role} | CTC: ${r.ctc} | Time: ${r.event_time} | Batch: ${r.eligible_batch}`);
  });

  await disconnectDatabase();
  console.log('\n✅ Database verification audit complete!\n');
}

inspectDailyLeads().catch(console.error);
