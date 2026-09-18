import '../models/College';
import '../models/User';
import '../models/DailyTracker';
import '../models/DailyLead';
import '../models/WeeklyTracker';
import { DailyLead } from '../models/DailyLead';
import { DailyTracker } from '../models/DailyTracker';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function clean() {
  await connectDatabase();

  const targetDate = new Date(Date.UTC(2026, 8, 17, 0, 0, 0, 0));
  const nextDate = new Date(Date.UTC(2026, 8, 18, 0, 0, 0, 0));

  console.log(`\n🧹 Cleaning up extraneous DailyLead records for 17 Sept 2026...`);

  // Find all DailyLead records for today
  const leads = await DailyLead.find({
    lead_date: { $gte: targetDate, $lt: nextDate },
  });

  console.log(`Found ${leads.length} total DailyLead records for today.`);

  let deletedCount = 0;
  for (const lead of leads) {
    // If it has no daily_tracker_id or its daily_tracker_id does not exist in DailyTracker, delete it
    if (!lead.daily_tracker_id) {
      console.log(`  ❌ Deleting spurious lead: [${lead.company_name}] (Remarks: "${lead.remarks}")`);
      await DailyLead.deleteOne({ _id: lead._id });
      deletedCount++;
    } else {
      const dt = await DailyTracker.findById(lead.daily_tracker_id);
      if (!dt || (dt.outcome_status !== 'invite_mail' && dt.outcome_status !== 'jd_received')) {
        console.log(`  ❌ Deleting lead with invalid DT link: [${lead.company_name}]`);
        await DailyLead.deleteOne({ _id: lead._id });
        deletedCount++;
      } else {
        console.log(`  ✅ Keeping valid positive lead: [${lead.company_name}] from DailyTracker ${lead.daily_tracker_id}`);
      }
    }
  }

  console.log(`\nDeleted ${deletedCount} spurious leads. Remaining valid leads for today: ${leads.length - deletedCount}`);

  // Print remaining
  const remaining = await DailyLead.find({
    lead_date: { $gte: targetDate, $lt: nextDate },
    is_deleted: false,
  }).populate('college_id', 'college_code college_name');

  console.log(`\n📋 Verified remaining DailyLead documents for today: ${remaining.length}`);
  remaining.forEach((dl: any, i) => {
    console.log(`[#${i + 1}] College: ${dl.college_id?.college_code} (${dl.college_id?.college_name}) | Company: "${dl.company_name}" | Type: ${dl.lead_type} | Time: ${dl.event_time} | Remarks: "${dl.remarks}"`);
  });

  await disconnectDatabase();
}

clean().catch(console.error);
