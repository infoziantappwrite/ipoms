"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const User_1 = require("../models/User");
const College_1 = require("../models/College");
const Role_1 = require("../models/Role");
async function syncCoordinatorWorkflows() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is missing');
        process.exit(1);
    }
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose_1.default.connect(uri);
    console.log('✅ Connected.');
    try {
        // 1. Find Seshmitha
        const seshmitha = await User_1.User.findOne({
            $or: [
                { official_email: 'seshmitha_tamil@icl.today' },
                { username: 'seshmitha' },
            ],
        });
        if (!seshmitha) {
            console.error('❌ User Seshmitha Tamilselvi R not found');
            process.exit(1);
        }
        console.log(`👤 Found user: ${seshmitha.full_name} (${seshmitha._id})`);
        // 2. Fetch Placement Coordinator Role
        const roleDoc = await Role_1.Role.findOne({ role_code: 'PLACEMENT_COORDINATOR' });
        if (roleDoc) {
            seshmitha.role_ids = [roleDoc._id];
            seshmitha.role_codes = ['PLACEMENT_COORDINATOR'];
        }
        // 3. Fetch All Active Colleges
        const allColleges = await College_1.College.find({ is_deleted: { $ne: true } });
        const collegeIds = allColleges.map((c) => c._id);
        console.log(`🏫 Total active colleges found: ${collegeIds.length}`);
        // 4. Assign all colleges to Seshmitha
        seshmitha.assigned_college_ids = collegeIds;
        seshmitha.account_status = 'active';
        seshmitha.presence_status = 'available';
        seshmitha.is_email_verified = true;
        seshmitha.must_change_password = false;
        seshmitha.failed_login_attempts = 0;
        seshmitha.is_deleted = false;
        await seshmitha.save();
        console.log(`✅ Assigned ${collegeIds.length} colleges to Seshmitha.`);
        // 5. Add Seshmitha to all Colleges' assigned_coordinator_ids
        let updatedCollegesCount = 0;
        for (const col of allColleges) {
            const existing = (col.assigned_coordinator_ids || []).map((id) => id.toString());
            if (!existing.includes(seshmitha._id.toString())) {
                col.assigned_coordinator_ids.push(seshmitha._id);
                await col.save();
                updatedCollegesCount++;
            }
        }
        console.log(`✅ Added Seshmitha to ${updatedCollegesCount} colleges' coordinator lists.`);
        console.log('\n===============================================================');
        console.log('🎉 ALL COORDINATOR WORKFLOW MODULES & ALLOCATIONS SYNCED');
        console.log(`User:                 ${seshmitha.full_name}`);
        console.log(`Email:                ${seshmitha.official_email}`);
        console.log(`Role:                 Placement Coordinator`);
        console.log(`Colleges Assigned:    ${seshmitha.assigned_college_ids.length}`);
        console.log(`Permissions:          Daily Tracker, Daily Leads, Weekly Tracker,`);
        console.log(`                      Active Leads, Pending Tasks, Reports, Metadata`);
        console.log('===============================================================\n');
    }
    catch (err) {
        console.error('❌ Sync failed:', err);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
syncCoordinatorWorkflows();
