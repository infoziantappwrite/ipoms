"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DailyLead_1 = require("../models/DailyLead");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const DailyTracker_1 = require("../models/DailyTracker");
const database_1 = require("../config/database");
async function inspectDailyLeads() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE AUDIT: "daily_leads" Collection');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const _ = [College_1.College.modelName, User_1.User.modelName, DailyTracker_1.DailyTracker.modelName];
    const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
    // 1. Pre-August audit
    const preAugustCount = await DailyLead_1.DailyLead.countDocuments({ lead_date: { $lt: augStart } });
    console.log(`🧹 Pre-August 2026 Records: ${preAugustCount} ${preAugustCount === 0 ? '✅ (PERFECT ZERO)' : '❌ (NEEDS PURGE)'}`);
    // 2. August Positives count
    const augustPositivesCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', lead_date: { $gte: augStart } });
    console.log(`📊 August 2026 Positives Count: ${augustPositivesCount}`);
    // 3. Breakdown by College
    const positives = await DailyLead_1.DailyLead.find({ lead_type: 'positive', lead_date: { $gte: augStart } })
        .populate('college_id', 'college_name college_code')
        .sort({ lead_date: 1 });
    const byCollege = {};
    const byDate = {};
    positives.forEach((p) => {
        const code = p.college_id?.college_code || 'UNKNOWN';
        byCollege[code] = (byCollege[code] || 0) + 1;
        const dateStr = p.lead_date.toISOString().split('T')[0];
        byDate[dateStr] = (byDate[dateStr] || 0) + 1;
    });
    console.log('\n🏛️ Positives Breakdown by College:');
    console.table(byCollege);
    console.log('\n📅 Positives Breakdown by Date:');
    console.table(byDate);
    console.log('\n🔍 Sample Today Records (2026-08-24):');
    const todayRecords = positives.filter((p) => p.lead_date.toISOString().startsWith('2026-08-24'));
    todayRecords.forEach((r, idx) => {
        console.log(`  #${idx + 1} | [${r.college_id?.college_code}] ${r.company_name} | Role: ${r.job_role} | CTC: ${r.ctc} | Time: ${r.event_time} | Batch: ${r.eligible_batch}`);
    });
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ Database verification audit complete!\n');
}
inspectDailyLeads().catch(console.error);
