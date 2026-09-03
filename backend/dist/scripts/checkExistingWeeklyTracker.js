"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const College_1 = require("../models/College");
async function main() {
    await (0, database_1.connectDatabase)();
    const totalCount = await WeeklyTracker_1.WeeklyTracker.countDocuments({ is_deleted: false });
    console.log(`📊 Total WeeklyTracker active records in DB: ${totalCount}`);
    const byCollege = await WeeklyTracker_1.WeeklyTracker.aggregate([
        { $match: { is_deleted: false } },
        { $group: { _id: '$college_id', count: { $sum: 1 } } },
    ]);
    for (const item of byCollege) {
        const col = await College_1.College.findById(item._id);
        console.log(`  • College: [${col?.college_code}] ${col?.college_name} -> ${item.count} rows`);
    }
    await (0, database_1.disconnectDatabase)();
}
main().catch(console.error);
