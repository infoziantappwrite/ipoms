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
    console.log('Colleges:', colleges.map(c => ({ id: c._id.toString(), name: c.college_name })));
    const count = await WeeklyTracker_1.WeeklyTracker.countDocuments({ is_deleted: { $ne: true } });
    console.log('Total active WeeklyTracker documents:', count);
    const samples = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: { $ne: true } }).limit(10);
    console.log('Sample documents:', samples.map(s => ({
        id: s._id,
        college_id: s.college_id,
        academic_year: s.academic_year,
        pipeline_section: s.pipeline_section,
        company_name: s.company_name,
        is_pinned_top: s.is_pinned_top
    })));
    const byYear = await WeeklyTracker_1.WeeklyTracker.aggregate([
        { $match: { is_deleted: { $ne: true } } },
        { $group: { _id: { year: '$academic_year', section: '$pipeline_section', college: '$college_id' }, count: { $sum: 1 } } }
    ]);
    console.log('Aggregated by year, section, college:', byYear);
    await mongoose_1.default.disconnect();
}
run();
