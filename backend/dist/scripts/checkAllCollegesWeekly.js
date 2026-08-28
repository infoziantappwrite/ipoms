"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const College_1 = require("../models/College");
async function run() {
    await mongoose_1.default.connect('mongodb://127.0.0.1:27017/ipoms_db');
    const colleges = await College_1.College.find();
    for (const c of colleges) {
        const list = await WeeklyTracker_1.WeeklyTracker.find({
            college_id: { $in: [c._id, c._id.toString()] },
            is_deleted: { $ne: true }
        });
        if (list.length > 0) {
            const secMap = {};
            list.forEach(item => {
                const sec = item.pipeline_section || 'unknown';
                secMap[sec] = (secMap[sec] || 0) + 1;
            });
            console.log(`[${c.college_code}] ${c.college_name}: Total ${list.length} rows ->`, secMap);
        }
    }
    await mongoose_1.default.disconnect();
}
run();
