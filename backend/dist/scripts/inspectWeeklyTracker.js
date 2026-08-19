"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const database_1 = require("../config/database");
async function inspectWeeklyTracker() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "weekly_tracker" Collection');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const count = await WeeklyTracker_1.WeeklyTracker.countDocuments({});
    console.log(`📊 Total Documents in 'weekly_tracker' collection: ${count}\n`);
    const rows = await WeeklyTracker_1.WeeklyTracker.find({})
        .sort({ created_at: -1 })
        .limit(5);
    rows.forEach((r, idx) => {
        console.log(`[Drive #${idx + 1}]`);
        console.log(`  ID              : ${r._id}`);
        console.log(`  College ID      : ${r.college_id}`);
        console.log(`  Coordinator ID  : ${r.coordinator_id}`);
        console.log(`  Company         : ${r.company_name}`);
        console.log(`  Roles           : ${r.job_role}`);
        console.log(`  Type            : ${r.company_type}`);
        console.log(`  CTC             : ${r.ctc_lpa || 'N/A'}`);
        console.log(`  Section         : ${r.pipeline_section}`);
        console.log(`  Status Notes    : "${r.current_status_text}"`);
        console.log(`  Offers Placed   : ${r.selected_count}`);
        console.log(`  Top Pinned      : ${r.is_pinned_top}`);
        console.log(`  Is Deleted      : ${r.is_deleted}`);
        console.log(`  Created At      : ${r.created_at.toISOString()}`);
        console.log('---------------------------------------------------------------');
    });
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ Weekly Tracker database inspection verified successfully!\n');
}
inspectWeeklyTracker().catch(console.error);
