"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeOperationalData = purgeOperationalData;
const database_1 = require("../config/database");
const DailyTracker_1 = require("../models/DailyTracker");
const DailyLead_1 = require("../models/DailyLead");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const ActiveLead_1 = require("../models/ActiveLead");
const PendingTask_1 = require("../models/PendingTask");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function purgeOperationalData() {
    await (0, database_1.connectDatabase)();
    console.log('🗑️  [Purge] Erasing old operational entries...');
    const [dtRes, dlRes, wtRes, alRes, ptRes] = await Promise.all([
        DailyTracker_1.DailyTracker.deleteMany({}),
        DailyLead_1.DailyLead.deleteMany({}),
        WeeklyTracker_1.WeeklyTracker.deleteMany({}),
        ActiveLead_1.ActiveLead.deleteMany({}),
        PendingTask_1.PendingTask.deleteMany({}),
    ]);
    console.log('==============================================');
    console.log(' PURGE OPERATION COMPLETED SUCCESSFULLY');
    console.log('==============================================');
    console.log(`✅ Daily Tracker:  Deleted ${dtRes.deletedCount} entries`);
    console.log(`✅ Daily Leads:    Deleted ${dlRes.deletedCount} entries (Positives & JD Received)`);
    console.log(`✅ Weekly Tracker: Deleted ${wtRes.deletedCount} entries`);
    console.log(`✅ Active Leads:   Deleted ${alRes.deletedCount} entries`);
    console.log(`✅ Pending Tasks:  Deleted ${ptRes.deletedCount} entries`);
    console.log('----------------------------------------------');
    console.log('🔒 Master Colleges, Users, Roles & Companies were PRESERVED.');
    console.log('==============================================');
    await (0, database_1.disconnectDatabase)();
}
if (require.main === module) {
    purgeOperationalData()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('❌ Failed to purge operational data:', err);
        process.exit(1);
    });
}
