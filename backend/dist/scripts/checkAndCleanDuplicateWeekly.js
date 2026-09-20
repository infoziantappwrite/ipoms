"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const database_1 = require("../config/database");
async function checkAndCleanDuplicates() {
    await (0, database_1.connectDatabase)();
    const allRows = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: false }).sort({ created_at: 1 });
    console.log(`Total non-deleted weekly tracker rows: ${allRows.length}`);
    const seen = new Map();
    const duplicateIds = [];
    for (const row of allRows) {
        const key = `${row.college_id}_${row.academic_year}_${row.company_name.trim().toLowerCase()}`;
        if (seen.has(key)) {
            console.log(`Found duplicate for key [${key}] - ID: ${row._id}, created: ${row.created_at}`);
            duplicateIds.push(row._id.toString());
        }
        else {
            seen.set(key, row);
        }
    }
    console.log(`Total duplicate IDs identified: ${duplicateIds.length}`);
    if (duplicateIds.length > 0) {
        const res = await WeeklyTracker_1.WeeklyTracker.deleteMany({ _id: { $in: duplicateIds } });
        console.log(`Cleaned up ${res.deletedCount} duplicate rows.`);
    }
    await (0, database_1.disconnectDatabase)();
}
checkAndCleanDuplicates().catch(console.error);
