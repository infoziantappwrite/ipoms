"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../models/User");
dotenv_1.default.config();
async function run() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    const allUsers = await User_1.User.find({}).lean();
    console.log('Total users in DB:', allUsers.length);
    for (const u of allUsers) {
        console.log({
            _id: String(u._id),
            full_name: u.full_name,
            official_email: u.official_email,
            username: u.username,
            is_deleted: u.is_deleted,
            account_status: u.account_status,
            assigned_college_ids: u.assigned_college_ids,
            weekly_focus_locked: u.weekly_focus_locked,
            weekly_focus_week_key: u.weekly_focus_week_key
        });
    }
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
