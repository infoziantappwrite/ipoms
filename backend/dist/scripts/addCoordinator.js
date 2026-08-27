"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const College_1 = require("../models/College");
async function main() {
    try {
        console.log('Connecting to MongoDB...');
        await (0, database_1.connectDatabase)();
        const fullName = 'Megala Devi P S';
        const username = 'megaladevi';
        const email = 'megaladevi_ps@infoziant.com';
        const mobile = '9976214361';
        const password = 'iPOMS@123';
        // 1. Fetch Coordinator Roles
        const roles = await Role_1.Role.find({
            role_code: { $in: ['PLACEMENT_COORDINATOR', 'COORDINATOR', 'CAMPUS_COORDINATOR'] },
        });
        let roleIds = roles.map((r) => r._id);
        let roleCodes = roles.map((r) => r.role_code);
        if (roleCodes.length === 0) {
            // Fallback if role names differ
            const allRoles = await Role_1.Role.find();
            const coordRole = allRoles.find((r) => r.role_code.toLowerCase().includes('coord') || r.role_name.toLowerCase().includes('coord'));
            if (coordRole) {
                roleIds = [coordRole._id];
                roleCodes = [coordRole.role_code];
            }
        }
        console.log('Assigned Roles:', roleCodes);
        // 2. Fetch all active colleges for complete coordinator access
        const allColleges = await College_1.College.find({ is_deleted: { $ne: true } });
        const collegeIds = allColleges.map((c) => c._id);
        console.log(`Found ${allColleges.length} colleges to link.`);
        // 3. Hash Password
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // 4. Upsert User
        let user = await User_1.User.findOne({
            $or: [{ username }, { official_email: email }],
        });
        if (user) {
            console.log(`User already exists (${user.username}). Updating details and resetting password...`);
            user.full_name = fullName;
            user.username = username;
            user.official_email = email;
            user.primary_mobile = mobile;
            user.password_hash = passwordHash;
            user.role_ids = roleIds;
            user.role_codes = roleCodes.length > 0 ? roleCodes : ['PLACEMENT_COORDINATOR'];
            user.assigned_college_ids = collegeIds;
            user.account_status = 'active';
            user.is_email_verified = true;
            user.must_change_password = false;
            user.failed_login_attempts = 0;
            user.is_deleted = false;
            user.is_password_locked = false;
            user.is_profile_locked = false;
            await user.save();
            console.log(`User ${user.username} successfully updated.`);
        }
        else {
            user = await User_1.User.create({
                full_name: fullName,
                username: username,
                official_email: email,
                primary_mobile: mobile,
                password_hash: passwordHash,
                role_ids: roleIds,
                role_codes: roleCodes.length > 0 ? roleCodes : ['PLACEMENT_COORDINATOR'],
                assigned_college_ids: collegeIds,
                account_status: 'active',
                presence_status: 'available',
                is_email_verified: true,
                must_change_password: false,
                failed_login_attempts: 0,
                is_deleted: false,
            });
            console.log(`New user ${user.username} created with ID: ${user._id}`);
        }
        // 5. Also add coordinator ID to assigned_coordinator_ids in colleges
        await College_1.College.updateMany({ _id: { $in: collegeIds } }, { $addToSet: { assigned_coordinator_ids: user._id } });
        console.log('Coordinator linked to colleges successfully.');
        // 6. Verify password check
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        console.log(`Password verification test: ${isMatch ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('\n=============================================');
        console.log('PLACEMENT COORDINATOR REGISTERED SUCCESSFULLY');
        console.log('=============================================');
        console.log(`Full Name:      ${user.full_name}`);
        console.log(`Username:       ${user.username}`);
        console.log(`Official Email: ${user.official_email}`);
        console.log(`Mobile:         ${user.primary_mobile}`);
        console.log(`Account Status: ${user.account_status}`);
        console.log(`Role Codes:     ${user.role_codes.join(', ')}`);
        console.log(`Colleges Linked:${user.assigned_college_ids.length}`);
        console.log('=============================================\n');
        await (0, database_1.disconnectDatabase)();
    }
    catch (err) {
        console.error('Error in addCoordinator script:', err);
        process.exit(1);
    }
}
main();
