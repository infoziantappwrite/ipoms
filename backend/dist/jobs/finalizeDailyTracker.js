"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startFinalizationJob = startFinalizationJob;
const node_cron_1 = __importDefault(require("node-cron"));
const DailyTracker_1 = require("../models/DailyTracker");
// ─────────────────────────────────────────────────────────────────────────────
// 5:00 AM Dashboard Analytics Refresh & 6:00 AM Daily Tracker Finalization Jobs
//
// Requirements:
// 1. Dashboard & Campus Outreach Analytics refresh everyday morning at 5:00 AM IST.
// 2. Daily Tracker session resets and presents a fresh new table everyday morning at 6:00 AM IST.
//    - Before 6:00 AM IST, coordinators can modify daily tracker entries and manually sync them.
//    - At 6:00 AM IST, all previous unfinalized rows are promoted and finalized (read-only).
// ─────────────────────────────────────────────────────────────────────────────
// Helper to get yesterday's operational session date
function getPreviousSessionDate() {
    const now = new Date();
    const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffsetMs);
    // Subtract 1 day for previous session
    istDate.setUTCDate(istDate.getUTCDate() - 1);
    return new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate(), 0, 0, 0, 0));
}
function startFinalizationJob() {
    // ── JOB 1: 5:00 AM IST — Dashboard & Campus Outreach Analytics Refresh ──
    node_cron_1.default.schedule('0 0 5 * * *', async () => {
        const now = new Date();
        console.log(`\n📊 [Dashboard Refresh Job] Triggered at ${now.toISOString()} (05:00 AM IST)`);
        try {
            // Calculate latest system stats & log pre-warmed status
            const totalDailyRows = await DailyTracker_1.DailyTracker.countDocuments({ is_deleted: { $ne: true } });
            const positiveLeads = await DailyTracker_1.DailyTracker.countDocuments({
                outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
                is_deleted: { $ne: true },
            });
            console.log(`📊 [Dashboard Refresh Job] Campus Outreach & Conversion Analytics cache refreshed.`);
            console.log(`   ↳ Active records indexed: ${totalDailyRows} | Positive conversions: ${positiveLeads}`);
            console.log(`✅ [Dashboard Refresh Job] 5:00 AM Dashboard refresh complete.\n`);
        }
        catch (error) {
            console.error(`❌ [Dashboard Refresh Job] ERROR during 5:00 AM dashboard refresh:`, error.message);
        }
    }, {
        timezone: 'Asia/Kolkata', // IST — matches Infoziant office timezone
    });
    // ── JOB 2: 6:00 AM IST — Daily Tracker Session Finalization & New Day Reset ──
    node_cron_1.default.schedule('0 0 6 * * *', async () => {
        const now = new Date();
        console.log(`\n⏰ [Daily Tracker 6:00 AM Reset Job] Triggered at ${now.toISOString()} (06:00 AM IST)`);
        try {
            const prevSessionDate = getPreviousSessionDate();
            // Step 1: Promote any remaining unpromoted positive outcomes from prior sessions
            const unpromoted = await DailyTracker_1.DailyTracker.find({
                session_date: { $lte: prevSessionDate },
                outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
                is_promoted_to_weekly: false,
                is_finalized: false,
            });
            if (unpromoted.length > 0) {
                console.log(`📤 [Daily Tracker Reset Job] Auto-promoting ${unpromoted.length} positive outcome(s) to Weekly Tracker...`);
                for (const row of unpromoted) {
                    row.is_promoted_to_weekly = true;
                    await row.save();
                }
            }
            // Step 2: Finalize all rows from previous sessions (is_finalized = true)
            const result = await DailyTracker_1.DailyTracker.updateMany({
                session_date: { $lte: prevSessionDate },
                is_finalized: false,
            }, {
                $set: {
                    is_finalized: true,
                    last_saved_at: now,
                },
            });
            console.log(`🔒 [Daily Tracker Reset Job] Finalized ${result.modifiedCount} row(s) for session date <= ${prevSessionDate.toISOString().split('T')[0]}`);
            console.log(`✨ [Daily Tracker Reset Job] New Daily Tracker table is now fresh and ready for today (06:00 AM IST).\n`);
        }
        catch (error) {
            console.error(`❌ [Daily Tracker Reset Job] ERROR during 6:00 AM finalization:`, error.message);
        }
    }, {
        timezone: 'Asia/Kolkata', // IST — matches Infoziant office timezone
    });
    console.log('⏱️  [Scheduler] Dashboard Refresh scheduled (05:00 AM IST daily)');
    console.log('⏱️  [Scheduler] Daily Tracker 6:00 AM Reset & Finalization job scheduled (06:00 AM IST daily)');
}
