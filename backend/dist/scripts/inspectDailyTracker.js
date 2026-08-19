"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DailyTracker_1 = require("../models/DailyTracker");
const database_1 = require("../config/database");
async function inspectMongoDB() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "daily_tracker" Collection');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const count = await DailyTracker_1.DailyTracker.countDocuments({});
    console.log(`📊 Total Documents in 'daily_tracker' collection: ${count}\n`);
    const sampleRows = await DailyTracker_1.DailyTracker.find({})
        .sort({ created_at: -1 })
        .limit(3);
    console.log('📄 Latest 3 Saved Call Records:\n');
    sampleRows.forEach((r, idx) => {
        console.log(`[Record #${idx + 1}]`);
        console.log(`  ID              : ${r._id}`);
        console.log(`  Coordinator ID  : ${r.coordinator_id}`);
        console.log(`  College ID      : ${r.college_id}`);
        console.log(`  Company         : ${r.company_name} (HR: ${r.hr_name})`);
        console.log(`  Mobile          : ${r.mobile_number}`);
        console.log(`  Start Time      : ${r.call_start_time ? r.call_start_time.toISOString() : 'None'}`);
        console.log(`  End Time        : ${r.call_end_time ? r.call_end_time.toISOString() : 'None'}`);
        console.log(`  Duration        : ${r.duration_seconds}s`);
        console.log(`  Outcome Status  : ${r.outcome_status}`);
        console.log(`  Promoted Weekly : ${r.is_promoted_to_weekly}`);
        console.log(`  Save Count      : ${r.save_count}`);
        console.log(`  Comments        : "${r.comments}"`);
        console.log('---------------------------------------------------------------');
    });
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ Database inspection verified successfully!\n');
}
inspectMongoDB().catch(console.error);
