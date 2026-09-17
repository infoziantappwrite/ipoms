import '../models/College';
import '../models/User';
import '../models/DailyTracker';
import '../models/DailyLead';
import '../models/WeeklyTracker';
import { DailyLead } from '../models/DailyLead';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function updateTimeAmPm() {
  await connectDatabase();

  const leads = await DailyLead.find({ is_deleted: false });
  console.log(`Checking ${leads.length} DailyLead records for time formatting...`);

  let updatedCount = 0;
  for (const lead of leads) {
    if (lead.event_time && /(am|pm)/.test(lead.event_time)) {
      const upperTime = lead.event_time.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase()).trim();
      if (upperTime !== lead.event_time) {
        console.log(`Updating lead ${lead.company_name}: "${lead.event_time}" -> "${upperTime}"`);
        lead.event_time = upperTime;
        await lead.save();
        updatedCount++;
      }
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} DailyLead records to uppercase AM/PM.`);

  // Print today's records
  const targetDate = new Date(Date.UTC(2026, 8, 17, 0, 0, 0, 0));
  const nextDate = new Date(Date.UTC(2026, 8, 18, 0, 0, 0, 0));
  const todayLeads = await DailyLead.find({
    lead_date: { $gte: targetDate, $lt: nextDate },
    is_deleted: false,
  }).populate('college_id', 'college_code');

  console.log(`\n📋 Today's Leads (${todayLeads.length}):`);
  todayLeads.forEach((l: any, i) => {
    console.log(`  [#${i + 1}] [${l.college_id?.college_code}] ${l.company_name} | EventTime: "${l.event_time}" | Type: ${l.lead_type}`);
  });

  await disconnectDatabase();
}

updateTimeAmPm().catch(console.error);
