"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const database_1 = require("../config/database");
async function main() {
    await (0, database_1.connectDatabase)();
    const colleges = await College_1.College.find({ is_deleted: { $ne: true } }).select('_id college_name college_code is_active');
    const users = await User_1.User.find({ is_active: true }).select('_id full_name official_email role');
    console.log('COLLEGES:', JSON.stringify(colleges, null, 2));
    console.log('USERS:', JSON.stringify(users, null, 2));
    await (0, database_1.disconnectDatabase)();
}
main().catch(console.error);
