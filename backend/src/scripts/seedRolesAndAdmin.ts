import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Role } from '../models/Role';
import { User } from '../models/User';

const SYSTEM_ROLES = [
  {
    role_code: 'ADMINISTRATOR',
    role_name: 'Administrator',
    description: 'Full system administration, user management, and security governance',
    status: 'active',
    is_system_role: true,
    permissions: [
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'roles:manage',
      'colleges:all',
      'companies:all',
      'assignments:all',
      'daily_tracker:all',
      'weekly_tracker:all',
      'daily_leads:all',
      'reports:all',
      'settings:all',
      'audit_logs:read',
      'recycle_bin:all',
    ],
  },
  {
    role_code: 'TEAM_LEADER',
    role_name: 'Team Leader',
    description: 'Placement supervision, team lead allocation, and performance oversight',
    status: 'active',
    is_system_role: true,
    permissions: [
      'users:read',
      'colleges:read',
      'companies:read',
      'companies:write',
      'assignments:manage',
      'daily_tracker:read_team',
      'weekly_tracker:manage',
      'daily_leads:manage',
      'reports:generate',
      'recycle_bin:restore',
    ],
  },
  {
    role_code: 'PLACEMENT_COORDINATOR',
    role_name: 'Placement Coordinator',
    description: 'Operational caller, lead generator, and company relationship manager',
    status: 'active',
    is_system_role: true,
    permissions: [
      'colleges:read_assigned',
      'companies:read',
      'companies:write_assigned',
      'assignments:read_own',
      'daily_tracker:log_own',
      'weekly_tracker:edit_assigned',
      'daily_leads:create',
      'reports:generate_assigned',
    ],
  },
  {
    role_code: 'TPO',
    role_name: 'Training & Placement Officer',
    description: 'External institutional placement officer with read-only report access',
    status: 'active',
    is_system_role: true,
    permissions: [
      'colleges:read_own',
      'reports:read_weekly_placement_own',
    ],
  },
];

async function seedRolesAndAdmin() {
  console.log('\n=============================================================');
  console.log('👤 INFOZIANT iPOMS — ROLES & MASTER ADMIN SEEDING ENGINE');
  console.log('=============================================================\n');

  try {
    await connectDatabase();

    // 1. Seed Roles
    console.log('🛡️ [Roles] Synchronizing system roles in MongoDB...');
    const roleIdMap: Record<string, any> = {};

    for (const roleDef of SYSTEM_ROLES) {
      let roleDoc = await Role.findOne({ role_code: roleDef.role_code });
      if (!roleDoc) {
        roleDoc = await Role.create(roleDef);
        console.log(`   ➔ Created Role: ${roleDef.role_name} (${roleDef.role_code})`);
      } else {
        roleDoc.permissions = roleDef.permissions;
        roleDoc.description = roleDef.description;
        await roleDoc.save();
        console.log(`   ➔ Verified Role: ${roleDef.role_name} (${roleDef.role_code})`);
      }
      roleIdMap[roleDef.role_code] = roleDoc._id;
    }

    // 2. Seed Master Admin User
    const adminEmail = 'Placement_Management@infoziant.com';
    const rawPassword = 'Ipoms@123';
    const adminRoleDoc = await Role.findOne({ role_code: 'ADMINISTRATOR' });

    console.log(`\n👑 [Admin] Seeding Master Administrator account (${adminEmail})...`);

    // Salt and hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

    let adminUser = await User.findOne({ official_email: adminEmail.toLowerCase() });

    if (!adminUser) {
      adminUser = await User.create({
        full_name: 'Administrator',
        username: adminEmail.toLowerCase(),
        official_email: adminEmail.toLowerCase(),
        password_hash: passwordHash,
        account_status: 'active',
        presence_status: 'available',
        role_ids: [adminRoleDoc!._id],
        role_codes: ['ADMINISTRATOR'],
        assigned_college_ids: [],
        is_email_verified: true,
        must_change_password: false,
        is_deleted: false,
      });
      console.log('✅ [Admin] Successfully created Master Administrator account in MongoDB!');
    } else {
      adminUser.full_name = 'Administrator';
      adminUser.username = adminEmail.toLowerCase();
      adminUser.password_hash = passwordHash;
      adminUser.account_status = 'active';
      adminUser.role_ids = [adminRoleDoc!._id];
      adminUser.role_codes = ['ADMINISTRATOR'];
      adminUser.must_change_password = false;
      await adminUser.save();
      console.log('✅ [Admin] Successfully updated Master Administrator credentials in MongoDB!');
    }

    console.log('\n=============================================================');
    console.log('🎉 [CREDENTIALS CONFIRMED IN MONGODB]');
    console.log('=============================================================');
    console.log(`   Display Name : Administrator`);
    console.log(`   Username     : ${adminEmail}`);
    console.log(`   Email        : ${adminEmail}`);
    console.log(`   Password     : ${rawPassword}`);
    console.log(`   Role         : ADMINISTRATOR`);
    console.log(`   Status       : ACTIVE`);
    console.log('=============================================================\n');
  } catch (error) {
    console.error('❌ [ERROR] Failed to seed roles and admin account:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

seedRolesAndAdmin();
