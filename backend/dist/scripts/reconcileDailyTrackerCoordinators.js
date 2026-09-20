"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const DailyTracker_1 = require("../models/DailyTracker");
const User_1 = require("../models/User");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    void User_1.User;
    const users = await User_1.User.find({ is_active: { $ne: false }, role_codes: { $ne: 'ADMINISTRATOR' } }).lean();
    const collegeCoordinators = new Map();
    users.forEach((u) => {
        (u.assigned_college_ids || []).forEach((cId) => {
            collegeCoordinators.set(String(cId), u);
        });
    });
    const admin = await User_1.User.findOne({ official_email: 'placement_management@infoziant.com' }).lean();
    const allTrackers = await DailyTracker_1.DailyTracker.find({ coordinator_id: admin?._id }).lean();
    console.log(`Found ${allTrackers.length} DailyTracker records assigned to Administrator.`);
    let updatedCount = 0;
    for (const t of allTrackers) {
        const assignedUser = collegeCoordinators.get(String(t.college_id));
        if (assignedUser) {
            await DailyTracker_1.DailyTracker.updateOne({ _id: t._id }, { $set: { coordinator_id: assignedUser._id } });
            updatedCount++;
        }
    }
    console.log(`Updated ${updatedCount} records to their assigned coordinators.`);
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
