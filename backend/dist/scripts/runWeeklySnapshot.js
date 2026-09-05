"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '8.8.4.4']);
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = require("../config/database");
const College_1 = require("../models/College");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const updateNehruWeeklyTracker_1 = require("./updateNehruWeeklyTracker");
const updateHitsWeeklyTracker_1 = require("./updateHitsWeeklyTracker");
const MATCH = {
    nehru: /nehru/i,
    hits: /hindustan|hits/i,
};
async function run() {
    const target = (process.argv[2] || '').toLowerCase();
    const apply = process.argv.includes('--apply');
    if (target !== 'nehru' && target !== 'hits') {
        console.error('[ERROR] Usage: ts-node src/scripts/runWeeklySnapshot.ts <nehru|hits> [--apply]');
        process.exitCode = 1;
        return;
    }
    try {
        await (0, database_1.connectDatabase)();
        const colleges = await College_1.College.find({ college_name: { $regex: MATCH[target] } }).select('_id college_name');
        const ids = colleges.map((c) => c._id);
        const atRisk = ids.length ? await WeeklyTracker_1.WeeklyTracker.countDocuments({ college_id: { $in: ids } }) : 0;
        console.log(`\n  Target college(s): ${colleges.map((c) => c.college_name).join(', ') || '(none found)'}`);
        console.log(`  Existing WeeklyTracker rows that would be DELETED: ${atRisk}`);
        if (!apply) {
            console.log('\n  DRY RUN — nothing was changed.');
            console.log(`  Re-run with --apply to replace those ${atRisk} row(s) with the hardcoded snapshot.\n`);
            return;
        }
        console.warn(`\n  --apply given: deleting ${atRisk} row(s) and re-inserting the snapshot...\n`);
        const result = target === 'nehru' ? await (0, updateNehruWeeklyTracker_1.updateNehruWeeklyTracker)() : await (0, updateHitsWeeklyTracker_1.updateHitsWeeklyTracker)();
        console.log(`\n  Done: ${result.message}\n`);
    }
    catch (error) {
        console.error('[ERROR] Weekly snapshot run failed:', error);
        process.exitCode = 1;
    }
    finally {
        await (0, database_1.disconnectDatabase)();
    }
}
run();
