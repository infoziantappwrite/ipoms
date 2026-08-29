"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const Role_1 = require("../models/Role");
const User_1 = require("../models/User");
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
];
// TPO removed 29 Aug 2026 — no frontend experience was ever built for it. See
// the RoleCode comment in routePolicy.ts for the full reasoning.
async function seedRolesAndAdmin() {
    console.log('\n=============================================================');
    console.log('👤 INFOZIANT iPOMS — ROLES & MASTER ADMIN SEEDING ENGINE');
    console.log('=============================================================\n');
    try {
        await (0, database_1.connectDatabase)();
        // 1. Seed Roles
        console.log('🛡️ [Roles] Synchronizing system roles in MongoDB...');
        const roleIdMap = {};
        for (const roleDef of SYSTEM_ROLES) {
            let roleDoc = await Role_1.Role.findOne({ role_code: roleDef.role_code });
            if (!roleDoc) {
                roleDoc = await Role_1.Role.create(roleDef);
                console.log(`   ➔ Created Role: ${roleDef.role_name} (${roleDef.role_code})`);
            }
            else {
                roleDoc.permissions = roleDef.permissions;
                roleDoc.description = roleDef.description;
                await roleDoc.save();
                console.log(`   ➔ Verified Role: ${roleDef.role_name} (${roleDef.role_code})`);
            }
            roleIdMap[roleDef.role_code] = roleDoc._id;
        }
        // 2. Seed Master Admin User
        const adminEmail = 'Placement_Management@infoziant.com';
        const rawPassword = 'iPOMS@123';
        const adminRoleDoc = await Role_1.Role.findOne({ role_code: 'ADMINISTRATOR' });
        console.log(`\n👑 [Admin] Seeding Master Administrator account (${adminEmail})...`);
        // Salt and hash the password
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(rawPassword, saltRounds);
        let adminUser = await User_1.User.findOne({ official_email: adminEmail.toLowerCase() });
        if (!adminUser) {
            adminUser = await User_1.User.create({
                full_name: 'Administrator',
                username: adminEmail.toLowerCase(),
                official_email: adminEmail.toLowerCase(),
                password_hash: passwordHash,
                account_status: 'active',
                presence_status: 'available',
                role_ids: [adminRoleDoc._id],
                role_codes: ['ADMINISTRATOR'],
                assigned_college_ids: [],
                is_email_verified: true,
                must_change_password: false,
                is_deleted: false,
            });
            console.log('✅ [Admin] Successfully created Master Administrator account in MongoDB!');
        }
        else {
            adminUser.full_name = 'Administrator';
            adminUser.username = adminEmail.toLowerCase();
            adminUser.password_hash = passwordHash;
            adminUser.account_status = 'active';
            adminUser.role_ids = [adminRoleDoc._id];
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
    }
    catch (error) {
        console.error('❌ [ERROR] Failed to seed roles and admin account:', error);
    }
    finally {
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
}
seedRolesAndAdmin();
