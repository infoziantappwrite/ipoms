import mongoose from 'mongoose';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { SystemSettings } from '../models/SystemSettings';
import { College } from '../models/College';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function inspectSettingsDatabase() {
  console.log('\n===============================================================');
  console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "users", "roles" & "system_settings"');
  console.log('===============================================================\n');

  await connectDatabase();
  const _ = College.modelName;

  // 1. Users Inspection
  const userCount = await User.countDocuments({ is_deleted: false });
  console.log(`📊 Active Users in 'users' collection: ${userCount}\n`);

  const users = await User.find({})
    .sort({ created_at: -1 })
    .limit(5)
    .populate('assigned_college_ids', 'college_name college_code')
    .populate('role_ids', 'role_name role_code');

  users.forEach((u: any, idx) => {
    console.log(`[User Account #${idx + 1}]`);
    console.log(`  ID             : ${u._id}`);
    console.log(`  Full Name      : "${u.full_name}" (@${u.username})`);
    console.log(`  Email          : "${u.official_email}"`);
    console.log(`  Role           : ${u.role_codes.join(', ')}`);
    console.log(`  Colleges       : ${u.assigned_college_ids.map((c: any) => `[${c.college_code}] ${c.college_name}`).join(', ') || 'All'}`);
    console.log(`  Status         : ${u.account_status} (is_deleted: ${u.is_deleted})`);
    console.log('---------------------------------------------------------------');
  });

  // 2. Roles Inspection
  const roles = await Role.find({});
  console.log(`\n🛡️ Total Roles in 'roles' collection: ${roles.length}`);
  roles.forEach((r) => {
    console.log(`  - [${r.role_code}] ${r.role_name} (${r.permissions.length} permissions)`);
  });

  // 3. System Settings Inspection
  console.log('\n⚙️ Global Settings in "system_settings":');
  const settings = await SystemSettings.findOne({});
  if (settings) {
    console.log(`  Academic Year  : "${settings.academic_year}"`);
    console.log(`  Season Name    : "${settings.season_name}"`);
    console.log(`  Daily Target   : ${settings.daily_calling_target} calls/day`);
    console.log(`  Org Name       : "${settings.org_name}"`);
    console.log(`  Support Email  : "${settings.org_support_email}"`);
    console.log(`  Theme Style    : "${settings.theme_default}"`);
    console.log(`  Landing Page   : "${settings.default_landing_page}"`);
  }

  await disconnectDatabase();
  console.log('\n✅ User Management & Settings database inspection verified successfully!\n');
}

inspectSettingsDatabase().catch(console.error);
