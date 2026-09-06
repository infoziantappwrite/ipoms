import { Types } from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import type { IDailyTracker } from '../models/DailyTracker';

// Same pure date-math as server.ts's getFridayWeekBounds() — duplicated here
// (not exported from server.ts) rather than risking a wider refactor.
function getFridayWeekBounds(targetDate: Date = new Date()) {
  const d = new Date(targetDate);
  const day = d.getDay();
  const diffToFriday = day >= 5 ? day - 5 : day + 2;
  const startFriday = new Date(d);
  startFriday.setDate(d.getDate() - diffToFriday);
  startFriday.setHours(0, 0, 0, 0);

  const endThursday = new Date(startFriday);
  endThursday.setDate(startFriday.getDate() + 6);
  endThursday.setHours(23, 59, 59, 999);

  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  return { startFriday, endThursday, weekNumber };
}

/**
 * Creates the Weekly Tracker "Companies in Pipeline" row for a positive Daily
 * Tracker call, if one doesn't already exist for that company/college/year —
 * the same core logic `POST /weekly-tracker/sync-daily-positives` uses.
 *
 * Shared so every path that promotes a row (the manual sync button, the
 * 8 PM/10 PM reminder+auto-sync jobs, and the 6 AM stale-row catch-all) does
 * a REAL promotion rather than just flipping `is_promoted_to_weekly` with
 * nothing behind it — that flag-only version was a real bug: rows ended up
 * marked "promoted" while no Weekly Tracker row was ever created.
 *
 * Returns whether a new Weekly Tracker row was actually created.
 */
export async function promoteDailyTrackerRowToWeekly(
  dRow: IDailyTracker & { _id: Types.ObjectId; save: () => Promise<any> },
  targetYear = 2026,
): Promise<boolean> {
  if (!dRow.company_name || !dRow.company_name.trim()) return false;

  const escapedName = dRow.company_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await WeeklyTracker.findOne({
    college_id: dRow.college_id,
    academic_year: targetYear,
    company_name: { $regex: `^${escapedName}$`, $options: 'i' },
    is_deleted: false,
  });

  let created = false;
  if (!existing) {
    const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();
    await WeeklyTracker.create({
      academic_year: targetYear,
      college_id: dRow.college_id,
      coordinator_id: dRow.coordinator_id,
      company_id: dRow.company_id || new Types.ObjectId(),
      daily_tracker_id: dRow._id,
      company_name: dRow.company_name.trim(),
      job_role: 'Graduate Trainee',
      cdc_reference: dRow.hr_name ? `${dRow.hr_name}${dRow.mobile_number ? ` (${dRow.mobile_number})` : ''}` : '',
      company_type: 'Software / IT',
      ctc_lpa: 'To be disclosed',
      eligible_batch: `${targetYear} Batch`,
      pipeline_section: 'pipeline',
      current_status_text: dRow.outcome_status === 'invite_mail'
        ? 'Invite email sent'
        : (dRow.outcome_status || 'positive').replace(/_/g, ' '),
      follow_up_date: dRow.follow_up_date || null,
      week_number: weekNumber,
      week_start_date: startFriday,
      week_end_date: endThursday,
      created_at: new Date(),
      updated_at: new Date(),
      last_status_updated_at: new Date(),
    });
    created = true;
  }

  if (!dRow.is_promoted_to_weekly) {
    dRow.is_promoted_to_weekly = true;
    await dRow.save();
  }

  return created;
}
