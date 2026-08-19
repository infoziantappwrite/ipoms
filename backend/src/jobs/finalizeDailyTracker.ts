import cron from 'node-cron';
import { DailyTracker, POSITIVE_OUTCOMES } from '../models/DailyTracker';

// ─────────────────────────────────────────────────────────────────────────────
// Midnight Auto-Finalization Job
//
// Spec: Module_03_Daily_Tracker_Specification_v1.0.md — Section 14
//
// "At 11:59:59 PM, the system automatically saves all pending changes, marks
//  today's tracker entries as finalized/read-only (is_finalized = true), and
//  archives the day's record for management reporting."
//
// This job:
//  1. Runs at 23:59:59 every day via cron
//  2. Finds all unfinalized daily_tracker records for today
//  3. Promotes any positive-outcome rows that haven't been promoted yet
//  4. Sets is_finalized = true on all of today's rows
//
// After finalization, these rows are permanently read-only from the API.
// ─────────────────────────────────────────────────────────────────────────────

export function startFinalizationJob(): void {
  // Cron: every day at 23:59:59
  // Format: second minute hour day-of-month month day-of-week
  cron.schedule('59 59 23 * * *', async () => {
    const now = new Date();
    console.log(`\n⏰ [Finalization Job] Triggered at ${now.toISOString()}`);

    try {
      // Build today's midnight UTC boundary
      const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      // Step 1: Find all positive-outcome rows not yet promoted
      const unpromoted = await DailyTracker.find({
        session_date: todayMidnight,
        outcome_status: { $in: POSITIVE_OUTCOMES },
        is_promoted_to_weekly: false,
        is_finalized: false,
      });

      if (unpromoted.length > 0) {
        console.log(`📤 [Finalization Job] Promoting ${unpromoted.length} positive outcome(s) to Weekly Tracker flag...`);
        for (const row of unpromoted) {
          row.is_promoted_to_weekly = true;
          await row.save();
        }
      }

      // Step 2: Finalize all today's rows — set is_finalized = true, making them read-only
      const result = await DailyTracker.updateMany(
        {
          session_date: todayMidnight,
          is_finalized: false,
        },
        {
          $set: {
            is_finalized: true,
            last_saved_at: now,
          },
        }
      );

      console.log(`🔒 [Finalization Job] Finalized ${result.modifiedCount} row(s) for ${todayMidnight.toISOString().split('T')[0]}`);
      console.log(`✅ [Finalization Job] Daily Tracker auto-finalization complete.\n`);
    } catch (error: any) {
      console.error(`❌ [Finalization Job] ERROR during auto-finalization:`, error.message);
    }
  }, {
    timezone: 'Asia/Kolkata', // IST — matches Infoziant office timezone
  });

  console.log('⏱️  [Finalization Job] Midnight auto-finalization job scheduled (23:59:59 IST daily)');
}
