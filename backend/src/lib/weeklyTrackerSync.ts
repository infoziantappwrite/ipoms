import { Types } from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import type { IDailyTracker } from '../models/DailyTracker';
import { getCurrentAcademicYear, getCurrentGraduatingBatchYear } from './academicYear';

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
const SECTION_LABELS: Record<string, string> = {
  completed: '1. Companies Completed',
  drive_in_progress: '2. Drive in Progress',
  in_drive: '3. Upcoming Drives',
  upcoming_drives: '3. Upcoming Drives',
  companies_in_drive: '3. Upcoming Drives',
  in_progress: '4. Companies In Progress',
  pipeline: '5. Companies In Pipeline',
  companies_in_pipeline: '5. Companies In Pipeline',
  top_companies: '6. Top Companies',
  rejected_companies: '7. Rejected Companies',
  rejected_by_hr: '7. Rejected Companies',
  rejected_by_college: '7. Rejected Companies',
  on_hold_by_college: '8. Companies On Hold By College',
  on_hold_by_hr: '9. Companies On Hold By HR',
};

export async function promoteDailyTrackerRowToWeekly(
  dRow: IDailyTracker & { _id: Types.ObjectId; save: () => Promise<any> },
  targetYear?: number,
): Promise<{ created: boolean; existing?: any; message?: string }> {
  if (!dRow.company_name || !dRow.company_name.trim()) return { created: false };
  const resolvedYear = targetYear ?? (await getCurrentAcademicYear());
  const batchYear = await getCurrentGraduatingBatchYear();

  const escapedName = dRow.company_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await WeeklyTracker.findOne({
    college_id: dRow.college_id,
    academic_year: resolvedYear,
    $or: [
      { daily_tracker_id: dRow._id },
      { company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
    ],
    is_deleted: false,
  });

  let created = false;
  let message = '';

  if (existing) {
    const sectionName = SECTION_LABELS[existing.pipeline_section] || existing.pipeline_section;
    message = `Company '${dRow.company_name.trim()}' is already present for this college in '${sectionName}' section of Weekly Tracker.`;
  } else {
    const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();
    const isJd = dRow.outcome_status === 'jd_received';
    const targetSection = isJd ? 'in_progress' : 'pipeline';
    const statusText = isJd
      ? 'JD Received'
      : dRow.outcome_status === 'invite_mail'
      ? 'Invite email sent'
      : (dRow.outcome_status || 'positive').replace(/_/g, ' ');

    await WeeklyTracker.create({
      academic_year: resolvedYear,
      college_id: dRow.college_id,
      coordinator_id: dRow.coordinator_id,
      company_id: dRow.company_id || new Types.ObjectId(),
      daily_tracker_id: dRow._id,
      company_name: dRow.company_name.trim(),
      job_role: 'Graduate Trainee',
      cdc_reference: dRow.hr_name ? `${dRow.hr_name}${dRow.mobile_number ? ` (${dRow.mobile_number})` : ''}` : '',
      company_type: '',
      ctc_lpa: 'To be disclosed',
      eligible_batch: `${batchYear} Batch`,
      pipeline_section: targetSection,
      current_status_text: statusText,
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

  return { created, existing, message };
}
