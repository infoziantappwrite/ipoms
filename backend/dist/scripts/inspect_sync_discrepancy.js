"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const ActiveLead_1 = require("../models/ActiveLead");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    const allWeekly = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();
    const allActive = await ActiveLead_1.ActiveLead.find({ is_deleted: { $ne: true } }).lean();
    console.log(`Weekly Tracker Total: ${allWeekly.length}`);
    console.log(`Active Leads Total: ${allActive.length}`);
    // Let's inspect active leads pipeline_section distribution
    const sectionCounts = {};
    for (const a of allActive) {
        const key = `${a.lead_type} | ${a.pipeline_section || 'none'}`;
        sectionCounts[key] = (sectionCounts[key] || 0) + 1;
    }
    console.log('\nActive Leads Distribution by lead_type & pipeline_section:');
    console.table(sectionCounts);
    // Let's inspect weekly tracker pipeline_section distribution
    const weeklySections = {};
    for (const w of allWeekly) {
        const key = String(w.pipeline_section || 'none');
        weeklySections[key] = (weeklySections[key] || 0) + 1;
    }
    console.log('\nWeekly Tracker Distribution by pipeline_section:');
    console.table(weeklySections);
    // Check how many Weekly Tracker companies are present in Active Leads
    const weeklyJdCompanies = allWeekly.filter((w) => ['in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed'].includes((w.pipeline_section || '').toLowerCase()));
    const activeJdCompanyNames = new Set(allActive.filter((a) => a.lead_type === 'jd_received').map((a) => a.company_name.trim().toLowerCase()));
    const missingJdInActive = weeklyJdCompanies.filter((w) => !activeJdCompanyNames.has(w.company_name.trim().toLowerCase()));
    console.log(`\nWeekly JD rows: ${weeklyJdCompanies.length}`);
    console.log(`Unique Weekly JD company names: ${new Set(weeklyJdCompanies.map(w => w.company_name.trim().toLowerCase())).size}`);
    console.log(`Active Leads JD records: ${allActive.filter(a => a.lead_type === 'jd_received').length}`);
    console.log(`Unique Active Leads JD company names: ${activeJdCompanyNames.size}`);
    console.log(`Weekly JD companies not in Active Leads JD: ${new Set(missingJdInActive.map(w => w.company_name.trim().toLowerCase())).size}`);
    if (missingJdInActive.length > 0) {
        console.log('Sample missing:', missingJdInActive.slice(0, 10).map(w => ({
            name: w.company_name,
            section: w.pipeline_section,
            role: w.job_role,
            ctc: w.ctc_lpa
        })));
    }
    await (0, database_1.disconnectDatabase)();
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
