"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const College_1 = require("../models/College");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    const allColleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const collegeMap = new Map();
    allColleges.forEach((c) => {
        collegeMap.set(String(c._id), c);
    });
    const users = await User_1.User.find({ is_deleted: { $ne: true } })
        .select('_id full_name username official_email role_codes account_status assigned_college_ids')
        .lean();
    console.log('=== TOTAL USERS IN IPOMS ===:', users.length);
    for (const u of users) {
        const assignedColleges = (u.assigned_college_ids || [])
            .map((id) => {
            const c = collegeMap.get(String(id));
            return c ? `${c.college_name} (${c.college_code})` : String(id);
        });
        console.log(`\nUser: ${u.full_name} (@${u.username})`);
        console.log(`Email: ${u.official_email}`);
        console.log(`Role: ${u.role_codes?.join(', ') || 'N/A'}`);
        console.log(`Status: ${u.account_status}`);
        console.log(`Assigned Colleges (${assignedColleges.length}):`);
        if (assignedColleges.length === 0) {
            console.log(`  - [All Institutions / None Specified]`);
        }
        else {
            assignedColleges.forEach((col) => console.log(`  - ${col}`));
        }
    }
    await (0, database_1.disconnectDatabase)();
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
