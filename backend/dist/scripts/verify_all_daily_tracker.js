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
    void User_1.User;
    const colleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    console.log('\n================ DAILY TRACKER DATABASE VERIFICATION ================');
    const stats = [];
    let totalCount = 0;
    for (const c of colleges) {
        const count = await DailyTracker_1.DailyTracker.countDocuments({ college_id: c._id });
        if (count > 0) {
            const distinctDates = await DailyTracker_1.DailyTracker.distinct('session_date', { college_id: c._id });
            const sample = await DailyTracker_1.DailyTracker.findOne({ college_id: c._id })
                .populate('coordinator_id', 'full_name official_email')
                .lean();
            stats.push({
                college_code: c.college_code,
                college_name: c.college_name,
                coordinator: sample?.coordinator_id?.full_name || 'N/A',
                total_records: count,
                distinct_dates: distinctDates.length,
            });
            totalCount += count;
        }
    }
    console.table(stats);
    console.log(`\nTOTAL DAILY TRACKER RECORDS IN DATABASE: ${totalCount}`);
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
