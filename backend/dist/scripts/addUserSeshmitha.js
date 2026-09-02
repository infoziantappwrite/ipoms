"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const College_1 = require("../models/College");
async function provisionUser() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not set in backend/.env');
        process.exit(1);
    }
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose_1.default.connect(uri);
    console.log('✅ Connected.');
    try {
        // 1. Resolve Role
        const roleDoc = await Role_1.Role.findOne({ role_code: 'PLACEMENT_COORDINATOR' });
        if (!roleDoc) {
            console.error('❌ PLACEMENT_COORDINATOR role not found in database.');
            process.exit(1);
        }
        // 2. Resolve Colleges
        const allColleges = await College_1.College.find({ is_deleted: { $ne: true } });
        const collegeIds = allColleges.map((c) => c._id);
        console.log(`📍 Found ${collegeIds.length} active colleges to assign.`);
        // 3. User data
        const email = 'seshmitha_tamil@icl.today'.toLowerCase().trim();
        const username = 'seshmitha';
        const fullName = 'Seshmitha Tamilselvi R';
        const contact = '9500270419';
        const password = 'iPOMS@123';
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        let user = await User_1.User.findOne({
            $or: [{ official_email: email }, { username: username }],
        });
        if (user) {
            console.log(`📝 Existing user found (${user.official_email}), updating credentials...`);
            user.full_name = fullName;
            user.username = username;
            user.official_email = email;
            user.primary_mobile = contact;
            user.role_codes = ['PLACEMENT_COORDINATOR'];
            user.role_ids = [roleDoc._id];
            user.assigned_college_ids = collegeIds;
            user.password_hash = passwordHash;
            user.account_status = 'active';
            user.presence_status = 'available';
            user.is_email_verified = true;
            user.must_change_password = false;
            user.failed_login_attempts = 0;
            user.is_deleted = false;
            user.is_password_locked = false;
            user.is_profile_locked = false;
            await user.save();
            console.log(`✅ User updated: ${user.full_name} (${user.official_email})`);
        }
        else {
            user = await User_1.User.create({
                full_name: fullName,
                username: username,
                official_email: email,
                primary_mobile: contact,
                role_codes: ['PLACEMENT_COORDINATOR'],
                role_ids: [roleDoc._id],
                assigned_college_ids: collegeIds,
                password_hash: passwordHash,
                account_status: 'active',
                presence_status: 'available',
                is_email_verified: true,
                must_change_password: false,
                failed_login_attempts: 0,
                is_deleted: false,
                is_password_locked: false,
                is_profile_locked: false,
            });
            console.log(`✅ User created: ${user.full_name} (${user.official_email}) with ID: ${user._id}`);
        }
        // 4. Verify password compare
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        console.log(`🔑 Password verification: ${isMatch ? 'MATCHED (iPOMS@123)' : 'FAILED'}`);
        console.log('\n===============================================================');
        console.log('🎉 USER PROVISIONING COMPLETED');
        console.log(`Name:        ${user.full_name}`);
        console.log(`Email:       ${user.official_email}`);
        console.log(`Username:    ${user.username}`);
        console.log(`Role:        Placement Coordinator`);
        console.log(`Contact:     ${user.primary_mobile}`);
        console.log(`Password:    ${password}`);
        console.log(`Colleges:    ${user.assigned_college_ids.length} assigned`);
        console.log('===============================================================\n');
    }
    catch (err) {
        console.error('❌ Error during provisioning:', err);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
provisionUser();
