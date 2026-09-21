"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const DailyTracker_1 = require("../models/DailyTracker");
const DailyLead_1 = require("../models/DailyLead");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const ActiveLead_1 = require("../models/ActiveLead");
const PendingTask_1 = require("../models/PendingTask");
const AssignedWork_1 = require("../models/AssignedWork");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const AuditLog_1 = require("../models/AuditLog");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    const [dailyTrackerCount, dailyLeadTotal, dailyLeadPositives, dailyLeadJdReceived, weeklyTrackerCount, activeLeadCount, pendingTaskCount, assignedWorkCount, companyMetaCount, collegeCount, userCount, roleCount, auditLogCount] = await Promise.all([
        DailyTracker_1.DailyTracker.countDocuments({}),
        DailyLead_1.DailyLead.countDocuments({}),
        DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive' }),
        DailyLead_1.DailyLead.countDocuments({ lead_type: 'jd_received' }),
        WeeklyTracker_1.WeeklyTracker.countDocuments({}),
        ActiveLead_1.ActiveLead.countDocuments({}),
        PendingTask_1.PendingTask.countDocuments({}),
        AssignedWork_1.AssignedWork.countDocuments({}),
        CompanyMetadata_1.CompanyMetadata.countDocuments({}),
        College_1.College.countDocuments({}),
        User_1.User.countDocuments({}),
        Role_1.Role.countDocuments({}),
        AuditLog_1.AuditLog.countDocuments({})
    ]);
    console.log('========================================');
    console.log(' DATABASE RECORD COUNTS IN IPOMS');
    console.log('========================================');
    console.log(`1. Daily Tracker (Calls/Logs):      ${dailyTrackerCount}`);
    console.log(`2. Daily Leads (Total):             ${dailyLeadTotal}`);
    console.log(`   - Positives:                     ${dailyLeadPositives}`);
    console.log(`   - JD Received:                   ${dailyLeadJdReceived}`);
    console.log(`3. Weekly Tracker (Pipeline/Drives):${weeklyTrackerCount}`);
    console.log(`4. Active Leads:                    ${activeLeadCount}`);
    console.log(`5. Pending Tasks:                   ${pendingTaskCount}`);
    console.log(`6. Assigned Work:                   ${assignedWorkCount}`);
    console.log(`7. Company Metadata:                ${companyMetaCount}`);
    console.log('----------------------------------------');
    console.log(`System / Master Collections (PRESERVED):`);
    console.log(`- Colleges:                         ${collegeCount}`);
    console.log(`- Users:                            ${userCount}`);
    console.log(`- Roles:                            ${roleCount}`);
    console.log(`- Audit Logs:                       ${auditLogCount}`);
    console.log('========================================');
    await (0, database_1.disconnectDatabase)();
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
