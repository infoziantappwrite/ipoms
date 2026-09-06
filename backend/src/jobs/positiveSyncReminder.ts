import cron from 'node-cron';
import { Types } from 'mongoose';
import { DailyTracker, PIPELINE_SYNC_OUTCOME } from '../models/DailyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { promoteDailyTrackerRowToWeekly } from '../lib/weeklyTrackerSync';
import { sendPositiveSyncReminderEmail } from '../lib/mailer';

// ─────────────────────────────────────────────────────────────────────────────
// Same-day safety net for positive Daily Tracker calls (invite_mail, hiring,
// jd_received, drive_completed) that never made it into Weekly Tracker —
// user-requested, 6 Sep 2026:
//   8:00 PM IST — email the coordinator a reminder listing what's still unsynced.
//   10:00 PM IST — if still unsynced, auto-sync it for real (creates the
//     Weekly Tracker row, not just a flag — see weeklyTrackerSync.ts) and
//     raises a Notification so the coordinator sees a review prompt on their
//     Dashboard the next morning.
// The existing 6:00 AM job stays as a catch-all for anything even older that
// slipped through (e.g. the server was down at 10 PM).
// ─────────────────────────────────────────────────────────────────────────────

function getTodaySessionDateBounds(): { start: Date; end: Date } {
  const now = new Date();
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  const start = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

async function findTodaysUnsyncedPositives() {
  const { start, end } = getTodaySessionDateBounds();
  // Invite Mail alone triggers Weekly Tracker promotion (user decision,
  // 6 Sep 2026 — see PIPELINE_SYNC_OUTCOME in DailyTracker.ts).
  return DailyTracker.find({
    session_date: { $gte: start, $lt: end },
    outcome_status: PIPELINE_SYNC_OUTCOME,
    is_promoted_to_weekly: false,
    is_skipped: false,
  });
}

type GroupKey = string; // `${coordinator_id}|${college_id}`

function groupByCoordinatorCollege<T extends { coordinator_id: any; college_id: any }>(rows: T[]) {
  const groups = new Map<GroupKey, T[]>();
  rows.forEach((r) => {
    const key = `${r.coordinator_id}|${r.college_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });
  return groups;
}

export function startPositiveSyncReminderJob(): void {
  // ── JOB: 8:00 PM IST — Reminder Email ──
  cron.schedule('0 0 20 * * *', async () => {
    const now = new Date();
    console.log(`\n📧 [Positive Sync Reminder] Triggered at ${now.toISOString()} (08:00 PM IST)`);
    try {
      const rows = await findTodaysUnsyncedPositives();
      if (rows.length === 0) {
        console.log('📧 [Positive Sync Reminder] Nothing unsynced — no emails needed.');
        return;
      }

      const groups = groupByCoordinatorCollege(rows);
      let sent = 0;
      for (const [, groupRows] of groups) {
        const coordinator = await User.findById(groupRows[0].coordinator_id);
        const college = await College.findById(groupRows[0].college_id);
        if (!coordinator?.official_email || !college) continue;

        const result = await sendPositiveSyncReminderEmail(coordinator.official_email, {
          coordinatorName: coordinator.full_name || 'there',
          collegeName: college.college_name,
          companies: groupRows.map((r) => r.company_name),
          date: now,
        });
        if (result.delivered) sent++;
      }
      console.log(`📧 [Positive Sync Reminder] Sent ${sent} reminder email(s) across ${groups.size} coordinator/college group(s).\n`);
    } catch (error: any) {
      console.error('❌ [Positive Sync Reminder] ERROR during 8 PM reminder job:', error.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── JOB: 10:00 PM IST — Auto-Sync Fallback ──
  cron.schedule('0 0 22 * * *', async () => {
    const now = new Date();
    console.log(`\n🔄 [Positive Auto-Sync] Triggered at ${now.toISOString()} (10:00 PM IST)`);
    try {
      const rows = await findTodaysUnsyncedPositives();
      if (rows.length === 0) {
        console.log('🔄 [Positive Auto-Sync] Nothing left unsynced — no auto-sync needed.');
        return;
      }

      const groups = groupByCoordinatorCollege(rows);
      let totalCreated = 0;
      for (const [, groupRows] of groups) {
        const created: string[] = [];
        for (const row of groupRows) {
          const wasCreated = await promoteDailyTrackerRowToWeekly(row as any);
          if (wasCreated) created.push(row.company_name);
        }
        if (created.length === 0) continue;
        totalCreated += created.length;

        const college = await College.findById(groupRows[0].college_id);
        await Notification.create({
          notification_type: 'reminder',
          sender_id: groupRows[0].coordinator_id,
          sender_role: 'system',
          audience_type: 'individual',
          target_user_ids: [groupRows[0].coordinator_id],
          target_college_id: groupRows[0].college_id,
          title: 'Positive calls auto-synced to Weekly Tracker',
          message: `${created.length} Invite Mail call(s) for ${college?.college_name || 'a college'} `
            + `weren't synced by 10:00 PM, so iPOMS auto-synced them into Weekly Tracker: `
            + `${created.join(', ')}. Review them now?`,
          icon_type: 'warning',
          priority: 'high',
          action_url: '/weekly-tracker',
          requires_acknowledgment: true,
        });
      }
      console.log(`🔄 [Positive Auto-Sync] Auto-synced ${totalCreated} row(s) across ${groups.size} coordinator/college group(s).\n`);
    } catch (error: any) {
      console.error('❌ [Positive Auto-Sync] ERROR during 10 PM auto-sync job:', error.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('⏱️  [Scheduler] Positive Sync reminder email scheduled (08:00 PM IST daily)');
  console.log('⏱️  [Scheduler] Positive Sync auto-sync fallback scheduled (10:00 PM IST daily)');
}
