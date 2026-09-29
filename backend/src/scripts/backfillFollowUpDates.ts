import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { computeFollowUpDueDate } from '../lib/followUpDate';

/**
 * Backfills DailyTracker.follow_up_date for historical rows that only ever
 * had a bare follow_up_month ("November", no year) — see the Follow-Ups Due
 * feature. The due date is computed relative to each row's OWN session_date
 * (when it was actually logged), not today — so a "November" picked in
 * March 2025 backfills to November 2025, matching what the coordinator meant
 * at the time, not skipping years relative to whenever this script happens
 * to run.
 *
 *   npm run backfill:followups -- --dry     (report only, default)
 *   npm run backfill:followups -- --apply   (write changes)
 */
async function backfillFollowUpDates() {
  const apply = process.argv.includes('--apply');

  try {
    await connectDatabase();

    const rows = await DailyTracker.find({
      outcome_status: 'follow_up',
      follow_up_month: { $ne: null },
      follow_up_date: null,
    });

    console.log(`\nFound ${rows.length} follow_up row(s) with a month but no due date.\n`);

    let changed = 0;
    let skipped = 0;

    for (const row of rows) {
      const dueDate = computeFollowUpDueDate(row.follow_up_month, row.session_date || row.created_at);
      if (!dueDate) {
        console.log(`  [SKIP] ${row.company_name} — unrecognized month "${row.follow_up_month}"`);
        skipped++;
        continue;
      }

      console.log(
        `  ${apply ? '[FIXED]  ' : '[WOULD FIX]'} ${row.company_name} (logged ${row.session_date?.toISOString().slice(0, 10)}, month="${row.follow_up_month}") -> due ${dueDate.toISOString().slice(0, 10)}`
      );
      changed++;

      if (apply) {
        row.follow_up_date = dueDate;
        await row.save();
      }
    }

    console.log('\n=============================================================');
    console.log(`  Rows scanned  : ${rows.length}`);
    console.log(`  ${apply ? 'Backfilled' : 'Would backfill'}    : ${changed}`);
    console.log(`  Skipped       : ${skipped}`);
    if (!apply && changed > 0) console.log('\n  Dry run. Re-run with --apply to write these changes.');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('[ERROR] Follow-up date backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

backfillFollowUpDates();
