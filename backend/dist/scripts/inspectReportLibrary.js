"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ReportLibrary_1 = require("../models/ReportLibrary");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const database_1 = require("../config/database");
async function inspectReportLibrary() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "report_library" Collection');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const _ = [College_1.College.modelName, User_1.User.modelName];
    const count = await ReportLibrary_1.ReportLibrary.countDocuments({});
    console.log(`📊 Total Documents in 'report_library' collection: ${count}\n`);
    const rows = await ReportLibrary_1.ReportLibrary.find({})
        .sort({ created_at: -1 })
        .limit(5)
        .populate('college_id', 'college_name college_code')
        .populate('coordinator_id', 'full_name official_email');
    rows.forEach((r, idx) => {
        console.log(`[Report Preset #${idx + 1}]`);
        console.log(`  ID             : ${r._id}`);
        console.log(`  Preset Name    : "${r.preset_name}"`);
        console.log(`  Template Type  : ${r.template_type}`);
        console.log(`  Target College : [${r.college_id?.college_code || 'ALL'}] ${r.college_id?.college_name || 'All Colleges'}`);
        console.log(`  Coordinator    : ${r.coordinator_id?.full_name}`);
        console.log(`  Theme          : ${r.theme}`);
        console.log(`  Is Deleted     : ${r.is_deleted}`);
        console.log(`  Created At     : ${r.created_at.toISOString()}`);
        console.log('---------------------------------------------------------------');
    });
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ Report Library database inspection verified successfully!\n');
}
inspectReportLibrary().catch(console.error);
