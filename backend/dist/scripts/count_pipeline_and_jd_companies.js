"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const ActiveLead_1 = require("../models/ActiveLead");
const College_1 = require("../models/College");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    console.log('\n======================================================');
    console.log('📊 COMPREHENSIVE PIPELINE & JD RECEIVED AUDIT REPORT');
    console.log('======================================================\n');
    const colleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const collegeMap = new Map();
    for (const c of colleges) {
        collegeMap.set(String(c._id), c.college_name || c.college_code);
    }
    // 1. Weekly Tracker Analysis
    const allWeekly = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();
    console.log(`📌 TOTAL RAW ROWS IN WEEKLY TRACKER: ${allWeekly.length}\n`);
    // Section Groupings
    const pipelineRows = [];
    const inProgressRows = [];
    const upcomingDriveRows = [];
    const driveInProgressRows = [];
    const completedRows = [];
    const otherRows = [];
    for (const row of allWeekly) {
        const sec = (row.pipeline_section || '').toLowerCase().trim();
        if (sec === 'pipeline') {
            pipelineRows.push(row);
        }
        else if (sec === 'in_progress' || sec === 'in progress') {
            inProgressRows.push(row);
        }
        else if (sec === 'upcoming_drives' ||
            sec === 'upcoming_drive' ||
            sec === 'companies_in_drive' ||
            sec === 'in_drive' ||
            sec === 'upcoming drives' ||
            sec === 'companies in drive') {
            upcomingDriveRows.push(row);
        }
        else if (sec === 'drive_in_progress' || sec === 'drive in progress') {
            driveInProgressRows.push(row);
        }
        else if (sec === 'completed') {
            completedRows.push(row);
        }
        else {
            otherRows.push(row);
        }
    }
    const jdReceivedTotalRaw = inProgressRows.length +
        upcomingDriveRows.length +
        driveInProgressRows.length +
        completedRows.length;
    console.log('─── 1. RAW COUNTS IN WEEKLY TRACKER (BEFORE DEDUPLICATION) ───');
    console.log(`🔹 Pipeline Section (Companies in Pipeline): ${pipelineRows.length}`);
    console.log(`🔹 JD Received Sections Combined (Total):     ${jdReceivedTotalRaw}`);
    console.log(`   ├─ 1. Companies In Progress:               ${inProgressRows.length}`);
    console.log(`   ├─ 2. Upcoming Drives / In Drive:          ${upcomingDriveRows.length}`);
    console.log(`   ├─ 3. Drive In Progress:                   ${driveInProgressRows.length}`);
    console.log(`   └─ 4. Companies Completed:                 ${completedRows.length}`);
    if (otherRows.length > 0) {
        console.log(`🔹 Other Sections (Top/On Hold/Rejected):     ${otherRows.length}`);
    }
    console.log(`\nTOTAL ALL SECTIONS: ${allWeekly.length}\n`);
    // Breakdown by College
    console.log('─── 2. BREAKDOWN BY COLLEGE (RAW COUNTS IN WEEKLY TRACKER) ───');
    const collegeBreakdown = {};
    for (const row of allWeekly) {
        const cName = collegeMap.get(String(row.college_id)) || 'Unknown College';
        if (!collegeBreakdown[cName]) {
            collegeBreakdown[cName] = {
                pipeline: 0,
                in_progress: 0,
                upcoming: 0,
                drive_in_progress: 0,
                completed: 0,
                total_jd: 0,
                total_all: 0,
            };
        }
        const b = collegeBreakdown[cName];
        b.total_all++;
        const sec = (row.pipeline_section || '').toLowerCase().trim();
        if (sec === 'pipeline') {
            b.pipeline++;
        }
        else if (sec === 'in_progress' || sec === 'in progress') {
            b.in_progress++;
            b.total_jd++;
        }
        else if (sec === 'upcoming_drives' ||
            sec === 'upcoming_drive' ||
            sec === 'companies_in_drive' ||
            sec === 'in_drive' ||
            sec === 'upcoming drives' ||
            sec === 'companies in drive') {
            b.upcoming++;
            b.total_jd++;
        }
        else if (sec === 'drive_in_progress' || sec === 'drive in progress') {
            b.drive_in_progress++;
            b.total_jd++;
        }
        else if (sec === 'completed') {
            b.completed++;
            b.total_jd++;
        }
    }
    console.table(collegeBreakdown);
    // Unique Company Names Analysis
    const pipelineUniqueNames = new Set(pipelineRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean));
    const inProgressUniqueNames = new Set(inProgressRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean));
    const upcomingUniqueNames = new Set(upcomingDriveRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean));
    const driveInProgUniqueNames = new Set(driveInProgressRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean));
    const completedUniqueNames = new Set(completedRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean));
    const allJdUniqueNames = new Set([
        ...inProgressRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean),
        ...upcomingDriveRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean),
        ...driveInProgressRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean),
        ...completedRows.map((r) => r.company_name.trim().toLowerCase()).filter(Boolean),
    ]);
    console.log('\n─── 3. UNIQUE COMPANY NAMES (CROSS-COLLEGE DEDUPLICATION) ───');
    console.log(`🔹 Pipeline Unique Companies:              ${pipelineUniqueNames.size} (from ${pipelineRows.length} raw)`);
    console.log(`🔹 JD Received Unique Companies (Combined): ${allJdUniqueNames.size} (from ${jdReceivedTotalRaw} raw)`);
    console.log(`   ├─ In Progress Unique:                  ${inProgressUniqueNames.size} (from ${inProgressRows.length} raw)`);
    console.log(`   ├─ Upcoming / In Drive Unique:          ${upcomingUniqueNames.size} (from ${upcomingDriveRows.length} raw)`);
    console.log(`   ├─ Drive In Progress Unique:            ${driveInProgUniqueNames.size} (from ${driveInProgressRows.length} raw)`);
    console.log(`   └─ Completed Unique:                    ${completedUniqueNames.size} (from ${completedRows.length} raw)`);
    // 4. Active Leads Collection Analysis
    const allActiveLeads = await ActiveLead_1.ActiveLead.find({ is_deleted: { $ne: true } }).lean();
    const activePipeline = allActiveLeads.filter((l) => l.lead_type === 'pipeline');
    const activeJdReceived = allActiveLeads.filter((l) => l.lead_type === 'jd_received');
    const activeJdInProgress = activeJdReceived.filter((l) => l.pipeline_section === 'in_progress' || l.pipeline_section === 'in progress');
    const activeJdUpcoming = activeJdReceived.filter((l) => l.pipeline_section === 'upcoming_drive' ||
        l.pipeline_section === 'upcoming_drives' ||
        l.pipeline_section === 'companies_in_drive' ||
        l.pipeline_section === 'in_drive');
    const activeJdDriveInProg = activeJdReceived.filter((l) => l.pipeline_section === 'drive_in_progress' || l.pipeline_section === 'drive in progress');
    const activeJdCompleted = activeJdReceived.filter((l) => l.pipeline_section === 'completed');
    console.log('\n─── 4. ACTIVE LEADS MANAGEMENT MODULE (STORED IN DB) ───');
    console.log(`⭐ Active Leads - Pipeline Tab:            ${activePipeline.length}`);
    console.log(`⭐ Active Leads - JD this year Tab (Total): ${activeJdReceived.length}`);
    console.log(`   ├─ 1. In Progress Sub-Tab:              ${activeJdInProgress.length}`);
    console.log(`   ├─ 2. Upcoming Drive Sub-Tab:           ${activeJdUpcoming.length}`);
    console.log(`   ├─ 3. Drive in Progress Sub-Tab:        ${activeJdDriveInProg.length}`);
    console.log(`   └─ 4. Companies Completed Sub-Tab:      ${activeJdCompleted.length}`);
    console.log(`⭐ Total Active Leads in System:           ${allActiveLeads.length}\n`);
    await (0, database_1.disconnectDatabase)();
}
main().catch((err) => {
    console.error('Audit script failed:', err);
    process.exit(1);
});
