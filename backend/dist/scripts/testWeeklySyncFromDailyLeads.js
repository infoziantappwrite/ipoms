"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("../models/College");
require("../models/User");
require("../models/DailyLead");
require("../models/WeeklyTracker");
const College_1 = require("../models/College");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const DailyLead_1 = require("../models/DailyLead");
const database_1 = require("../config/database");
async function testWeeklySync() {
    await (0, database_1.connectDatabase)();
    const acetCollege = await College_1.College.findOne({ college_code: 'ACET' });
    if (!acetCollege) {
        console.error('ACET college not found');
        return;
    }
    console.log(`\nTesting Weekly Tracker Sync for college: ${acetCollege.college_name} (${acetCollege._id})`);
    // Check Daily Leads positives for ACET
    const dailyLeads = await DailyLead_1.DailyLead.find({
        college_id: acetCollege._id,
        lead_type: 'positive',
        is_deleted: false,
    });
    console.log(`Found ${dailyLeads.length} positive leads in Daily Leads for ACET.`);
    dailyLeads.forEach((dl) => {
        console.log(`- DailyLead: "${dl.company_name}" | Role: "${dl.job_role}" | CTC: "${dl.ctc}" | Batch: "${dl.eligible_batch}"`);
    });
    const secret = process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026';
    const token = jsonwebtoken_1.default.sign({
        userId: '6a847199fa3bf51271bc14eb',
        role: 'PLACEMENT_COORDINATOR',
        role_code: 'PLACEMENT_COORDINATOR',
        roles: ['PLACEMENT_COORDINATOR', 'SUPER_ADMIN'],
        email: 'admin@infoziant.com',
    }, secret, { expiresIn: '1h' });
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
    const syncUrl = 'http://127.0.0.1:5000/api/v1/weekly-tracker/sync-daily-positives';
    const payload = {
        college_id: String(acetCollege._id),
        academic_year: 2027,
    };
    console.log('\n1. Sending First Sync Request...');
    const res1 = await fetch(syncUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    const data1 = await res1.json();
    console.log('First Sync Response:', JSON.stringify(data1, null, 2));
    console.log('\n2. Sending Second Sync Request (testing deduplication / multiple clicks)...');
    const res2 = await fetch(syncUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    const data2 = await res2.json();
    console.log('Second Sync Response:', JSON.stringify(data2, null, 2));
    // Check WeeklyTracker pipeline rows for ACET
    const weeklyRows = await WeeklyTracker_1.WeeklyTracker.find({
        college_id: acetCollege._id,
        academic_year: 2027,
        pipeline_section: 'pipeline',
        is_deleted: false,
    });
    console.log(`\nCurrent Companies in Pipeline for ACET (2027): ${weeklyRows.length}`);
    weeklyRows.forEach((r, i) => {
        console.log(`  ${i + 1}. "${r.company_name}" | Status: "${r.current_status_text}" | Role: "${r.job_role}" | CTC: "${r.ctc_lpa}" | Order: ${r.order_index}`);
    });
    await (0, database_1.disconnectDatabase)();
}
testWeeklySync().catch(console.error);
