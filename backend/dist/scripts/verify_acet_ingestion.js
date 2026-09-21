"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const DailyTracker_1 = require("../models/DailyTracker");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    void User_1.User; // ensure model registration
    const college = await College_1.College.findOne({ college_code: 'ACET' });
    if (!college) {
        console.error('ACET not found');
        return;
    }
    const rows = await DailyTracker_1.DailyTracker.find({ college_id: college._id })
        .populate('coordinator_id', 'full_name official_email')
        .sort({ created_at: 1 })
        .lean();
    console.log(`\n================ VERIFIED DAILY TRACKER FOR [ACET] (${rows.length} records) ================`);
    console.log('College:', college.college_name, `(${college.college_code})`);
    rows.forEach((r, idx) => {
        console.log(`\n[#${idx + 1}] ${r.company_name}`);
        console.log(`  - Coordinator: ${r.coordinator_id?.full_name} (${r.coordinator_id?.official_email})`);
        console.log(`  - Date: ${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')} (session_date: ${r.session_date?.toISOString()?.slice(0, 10)})`);
        console.log(`  - Time (call_start_time): ${r.call_start_time ? r.call_start_time.toISOString() : 'None'}`);
        console.log(`  - HR: ${r.hr_name} | Phone: ${r.mobile_number} | Email: ${r.email_id || 'N/A'}`);
        console.log(`  - Outcome: ${r.outcome_status || 'Pending'} | Comments: ${r.comments || 'N/A'}`);
    });
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
