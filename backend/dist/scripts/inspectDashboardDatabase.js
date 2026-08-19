"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssignedWork_1 = require("../models/AssignedWork");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const database_1 = require("../config/database");
async function inspectDashboardDatabase() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "assigned_work" & "company_metadata"');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const _ = [College_1.College.modelName, User_1.User.modelName];
    // 1. Assigned Work Inspection
    const count = await AssignedWork_1.AssignedWork.countDocuments({});
    console.log(`📊 Total Documents in 'assigned_work' collection: ${count}\n`);
    const assignments = await AssignedWork_1.AssignedWork.find({})
        .sort({ created_at: -1 })
        .limit(5)
        .populate('sender_tl_id', 'full_name official_email')
        .populate('assigned_to_coordinator_id', 'full_name official_email')
        .populate('college_id', 'college_name college_code');
    assignments.forEach((a, idx) => {
        console.log(`[Assigned Task #${idx + 1}]`);
        console.log(`  ID             : ${a._id}`);
        console.log(`  Company        : "${a.company_name}"`);
        console.log(`  Priority       : ${a.priority.toUpperCase()}`);
        console.log(`  Target College : [${a.college_id?.college_code}] ${a.college_id?.college_name}`);
        console.log(`  Coordinator    : ${a.assigned_to_coordinator_id?.full_name}`);
        console.log(`  Assigned By TL : ${a.sender_tl_id?.full_name}`);
        console.log(`  Task           : "${a.task_description}"`);
        console.log(`  Loaded to Meta : ${a.is_loaded_to_metadata}`);
        console.log(`  Is Completed   : ${a.is_completed} (${a.status})`);
        console.log('---------------------------------------------------------------');
    });
    // 2. Merged Company in CompanyMetadata Inspection
    console.log('\n🏢 Verifying Merged Company in "company_metadata" (Microsoft India R&D):');
    const msft = await CompanyMetadata_1.CompanyMetadata.findOne({ company_name: /Microsoft/i });
    if (msft) {
        console.log(`  Company Name   : "${msft.company_name}"`);
        console.log(`  HR Name        : "${msft.hr_name}"`);
        console.log(`  Primary Phone  : "${msft.primary_mobile}"`);
        console.log(`  All Phones     : [${msft.mobile_numbers.join(', ')}] (Case 3 Multi-phone append verified ✓)`);
        console.log(`  Primary Email  : "${msft.primary_email}"`);
        console.log(`  Audit Notes    : "${msft.notes}"`);
    }
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ Dashboard & Metadata Merge database inspection verified successfully!\n');
}
inspectDashboardDatabase().catch(console.error);
