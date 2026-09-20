"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const DailyTracker_1 = require("../models/DailyTracker");
const College_1 = require("../models/College");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    const total = await DailyTracker_1.DailyTracker.countDocuments({ year: 2026, month: 9 });
    console.log(`=== TOTAL SEPTEMBER 2026 DAILY TRACKER RECORDS IN DB: ${total} ===\n`);
    const outcomeStats = await DailyTracker_1.DailyTracker.aggregate([
        { $match: { year: 2026, month: 9 } },
        { $group: { _id: '$outcome_status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    console.log('--- CALL OUTCOME DISTRIBUTION ---');
    console.table(outcomeStats);
    const allColleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    console.log(`=== ALL REGISTERED COLLEGES AND THEIR DAILY TRACKER RECORD COUNTS ===`);
    const collegeCounts = [];
    for (const c of allColleges) {
        const count = await DailyTracker_1.DailyTracker.countDocuments({ college_id: c._id });
        const septCount = await DailyTracker_1.DailyTracker.countDocuments({ college_id: c._id, year: 2026, month: 9 });
        collegeCounts.push({
            code: c.college_code,
            name: c.college_name,
            totalCount: count,
            sept2026Count: septCount,
        });
    }
    console.table(collegeCounts.filter(c => c.totalCount > 0));
    await (0, database_1.disconnectDatabase)();
}
main().catch(console.error);
