"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
async function main() {
    await (0, database_1.connectDatabase)();
    const total = await ActiveLead_1.ActiveLead.countDocuments({ is_deleted: false });
    console.log('Total active leads before update:', total);
    // Update leads with status 'Hiring' from seed to '' so they display "Select Status" placeholder
    const res = await ActiveLead_1.ActiveLead.updateMany({ is_deleted: false }, { $set: { status: '' } });
    console.log('Updated leads to empty status:', res.modifiedCount);
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
