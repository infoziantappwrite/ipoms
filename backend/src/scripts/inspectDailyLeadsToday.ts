import '../models/College';
import '../models/User';
import '../models/DailyTracker';
import '../models/DailyLead';
import '../models/WeeklyTracker';
import { DailyTracker } from '../models/DailyTracker';
import { DailyLead } from '../models/DailyLead';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function inspect() {
  await connectDatabase();

  const targetDate = new Date(Date.UTC(2026, 8, 17, 0, 0, 0, 0)); // 17 Sept 2026
  const nextDate = new Date(Date.UTC(2026, 8, 18, 0, 0, 0, 0));

  console.log(`\n📅 Checking Daily Tracker calls for Date: ${targetDate.toISOString()} to ${nextDate.toISOString()}`);

  const dtCalls = await DailyTracker.find({
    $or: [
      { session_date: { $gte: targetDate, $lt: nextDate } },
      { call_start_time: { $gte: targetDate, $lt: nextDate } },
      { created_at: { $gte: targetDate, $lt: nextDate } },
    ],
  }).populate('college_id', 'college_name college_code');

  console.log(`Total DailyTracker rows found for today: ${dtCalls.length}`);
  dtCalls.forEach((c: any, i) => {
    console.log(`[DT Call #${i + 1}] College: ${c.college_id?.college_code} (${c.college_id?.college_name}) | Company: "${c.company_name}" | Outcome: "${c.outcome_status}" | SessionDate: ${c.session_date?.toISOString()} | StartTime: ${c.call_start_time?.toISOString() || c.created_at?.toISOString()}`);
  });

  const positiveDtCalls = dtCalls.filter((c: any) => c.outcome_status === 'invite_mail' || c.outcome_status === 'jd_received');
  console.log(`\n✅ Positive / Invite Mail / JD Received DT Calls for today: ${positiveDtCalls.length}`);
  positiveDtCalls.forEach((c: any, i) => {
    console.log(`  -> Positive #${i + 1}: College=${c.college_id?.college_code}, Company="${c.company_name}", Outcome="${c.outcome_status}", ID=${c._id}`);
  });

  const currentDailyLeads = await DailyLead.find({
    lead_date: { $gte: targetDate, $lt: nextDate },
    is_deleted: false,
  }).populate('college_id', 'college_name college_code');

  console.log(`\n📋 Current DailyLead documents for today: ${currentDailyLeads.length}`);
  currentDailyLeads.forEach((dl: any, i) => {
    console.log(`[DailyLead #${i + 1}] College: ${dl.college_id?.college_code} | Company: "${dl.company_name}" | Type: ${dl.lead_type} | DailyTrackerId: ${dl.daily_tracker_id} | Remarks: "${dl.remarks}"`);
  });

  await disconnectDatabase();
}

inspect().catch(console.error);
