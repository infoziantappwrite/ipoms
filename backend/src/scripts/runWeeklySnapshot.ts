/**
 * Manual runner for the per-college Weekly Tracker snapshot loaders.
 *
 * These loaders are DESTRUCTIVE: each one deletes every WeeklyTracker row for
 * its college and re-inserts a hardcoded snapshot. They used to run on every
 * server boot, which silently reverted real coordinator edits on each restart
 * (and, under `ts-node-dev --respawn`, on every backend file save). They are
 * now invoked deliberately through this script only.
 *
 *   npm run seed:nehru              # dry run — reports what would be replaced
 *   npm run seed:nehru -- --apply   # actually replaces the data
 *   npm run seed:hits  -- --apply
 */
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { updateNehruWeeklyTracker } from './updateNehruWeeklyTracker';
import { updateHitsWeeklyTracker } from './updateHitsWeeklyTracker';

type Target = 'nehru' | 'hits';

const MATCH: Record<Target, RegExp> = {
  nehru: /nehru/i,
  hits: /hindustan|hits/i,
};

async function run() {
  const target = (process.argv[2] || '').toLowerCase() as Target;
  const apply = process.argv.includes('--apply');

  if (target !== 'nehru' && target !== 'hits') {
    console.error('[ERROR] Usage: ts-node src/scripts/runWeeklySnapshot.ts <nehru|hits> [--apply]');
    process.exitCode = 1;
    return;
  }

  try {
    await connectDatabase();

    const colleges = await College.find({ college_name: { $regex: MATCH[target] } }).select('_id college_name');
    const ids = colleges.map((c) => c._id);
    const atRisk = ids.length ? await WeeklyTracker.countDocuments({ college_id: { $in: ids } }) : 0;

    console.log(`\n  Target college(s): ${colleges.map((c: any) => c.college_name).join(', ') || '(none found)'}`);
    console.log(`  Existing WeeklyTracker rows that would be DELETED: ${atRisk}`);

    if (!apply) {
      console.log('\n  DRY RUN — nothing was changed.');
      console.log(`  Re-run with --apply to replace those ${atRisk} row(s) with the hardcoded snapshot.\n`);
      return;
    }

    console.warn(`\n  --apply given: deleting ${atRisk} row(s) and re-inserting the snapshot...\n`);
    const result = target === 'nehru' ? await updateNehruWeeklyTracker() : await updateHitsWeeklyTracker();
    console.log(`\n  Done: ${result.message}\n`);
  } catch (error) {
    console.error('[ERROR] Weekly snapshot run failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

run();
