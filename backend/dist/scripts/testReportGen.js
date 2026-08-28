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
    const acet = await College_1.College.findOne({ college_code: 'ACET' });
    const kgisl = await College_1.College.findOne({ college_code: 'KGISL' });
    for (const col of [acet, kgisl].filter(Boolean)) {
        console.log(`\n=== Testing for ${col.college_name} (${col.college_code}) ===`);
        const cId = col._id;
        const academic_year = '2026';
        const yearQueries = [academic_year, Number(academic_year), String(academic_year)];
        const wtFilter = {
            is_deleted: { $ne: true },
            college_id: { $in: [cId, cId.toString()] }
        };
        if (academic_year && academic_year !== 'all') {
            wtFilter.academic_year = { $in: yearQueries };
        }
        const [completed, inProgress, pipeline, topCompanies] = await Promise.all([
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'completed' }),
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'in_progress' }),
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'pipeline' }),
            WeeklyTracker_1.WeeklyTracker.find({
                ...wtFilter,
                $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }]
            })
        ]);
        console.log(`- Completed: ${completed.length}`);
        console.log(`- In Progress: ${inProgress.length}`);
        console.log(`- Pipeline: ${pipeline.length}`);
        console.log(`- Top Companies: ${topCompanies.length}`);
    }
    await mongoose_1.default.disconnect();
}
run();
