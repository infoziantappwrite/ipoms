"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const SystemSettings_1 = require("../models/SystemSettings");
const College_1 = require("../models/College");
const database_1 = require("../config/database");
async function inspectSettingsDatabase() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "users", "roles" & "system_settings"');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const _ = College_1.College.modelName;
    // 1. Users Inspection
    const userCount = await User_1.User.countDocuments({ is_deleted: false });
    console.log(`📊 Active Users in 'users' collection: ${userCount}\n`);
    const users = await User_1.User.find({})
        .sort({ created_at: -1 })
        .limit(5)
        .populate('assigned_college_ids', 'college_name college_code')
        .populate('role_ids', 'role_name role_code');
    users.forEach((u, idx) => {
        console.log(`[User Account #${idx + 1}]`);
        console.log(`  ID             : ${u._id}`);
        console.log(`  Full Name      : "${u.full_name}" (@${u.username})`);
        console.log(`  Email          : "${u.official_email}"`);
        console.log(`  Role           : ${u.role_codes.join(', ')}`);
        console.log(`  Colleges       : ${u.assigned_college_ids.map((c) => `[${c.college_code}] ${c.college_name}`).join(', ') || 'All'}`);
        console.log(`  Status         : ${u.account_status} (is_deleted: ${u.is_deleted})`);
        console.log('---------------------------------------------------------------');
    });
    // 2. Roles Inspection
    const roles = await Role_1.Role.find({});
    console.log(`\n🛡️ Total Roles in 'roles' collection: ${roles.length}`);
    roles.forEach((r) => {
        console.log(`  - [${r.role_code}] ${r.role_name} (${r.permissions.length} permissions)`);
    });
    // 3. System Settings Inspection
    console.log('\n⚙️ Global Settings in "system_settings":');
    const settings = await SystemSettings_1.SystemSettings.findOne({});
    if (settings) {
        console.log(`  Academic Year  : "${settings.academic_year}"`);
        console.log(`  Season Name    : "${settings.season_name}"`);
        console.log(`  Daily Target   : ${settings.daily_calling_target} calls/day`);
        console.log(`  Org Name       : "${settings.org_name}"`);
        console.log(`  Support Email  : "${settings.org_support_email}"`);
    }
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ User Management & Settings database inspection verified successfully!\n');
}
inspectSettingsDatabase().catch(console.error);
