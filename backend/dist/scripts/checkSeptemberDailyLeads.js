"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../models/College");
require("../models/User");
require("../models/DailyTracker");
require("../models/DailyLead");
require("../models/WeeklyTracker");
const DailyLead_1 = require("../models/DailyLead");
const database_1 = require("../config/database");
async function checkSeptember() {
    await (0, database_1.connectDatabase)();
    const startDate = new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999));
    const leads = await DailyLead_1.DailyLead.find({
        lead_date: { $gte: startDate, $lte: endDate },
        is_deleted: false,
    }).populate('college_id', 'college_code');
    console.log(`\nTotal September DailyLead records: ${leads.length}`);
    const byDate = {};
    leads.forEach((l) => {
        const dStr = l.lead_date ? l.lead_date.toISOString().split('T')[0] : 'Unknown';
        if (!byDate[dStr])
            byDate[dStr] = [];
        byDate[dStr].push(l);
    });
    Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).forEach(([dStr, rows]) => {
        console.log(`\n📅 Date: ${dStr} (${rows.length} leads)`);
        rows.forEach((r, idx) => {
            console.log(`  ${idx + 1}. [${r.college_id?.college_code}] ${r.company_name} | Type: ${r.lead_type} | DT_ID: ${r.daily_tracker_id || 'NONE'} | Remarks: "${r.remarks}"`);
        });
    });
    await (0, database_1.disconnectDatabase)();
}
checkSeptember().catch(console.error);
