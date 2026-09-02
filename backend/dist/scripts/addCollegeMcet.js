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
const College_1 = require("../models/College");
const User_1 = require("../models/User");
async function addMcetCollege() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not set in backend/.env');
        process.exit(1);
    }
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose_1.default.connect(uri);
    console.log('✅ Connected.');
    try {
        // 1. Fetch all active users (Coordinators + Admins)
        const allUsers = await User_1.User.find({ is_deleted: { $ne: true } });
        const userIds = allUsers.map((u) => u._id);
        console.log(`👥 Found ${userIds.length} users to associate.`);
        // 2. MCET details
        const collegeName = 'Dr. Mahalingam College of Engineering and Technology';
        const collegeCode = 'MCET';
        const location = 'Pollachi, Tamil Nadu';
        const logoUrl = '/college-logos/MCET.png';
        let college = await College_1.College.findOne({
            $or: [
                { college_code: collegeCode },
                { college_name: new RegExp('Mahalingam', 'i') },
            ],
        });
        if (college) {
            console.log(`📝 Existing college found (${college.college_code}), updating...`);
            college.college_name = collegeName;
            college.college_code = collegeCode;
            college.location = location;
            college.logo_url = logoUrl;
            college.status = 'active';
            college.assigned_coordinator_ids = userIds;
            await college.save();
            console.log(`✅ College updated: ${college.college_name} [${college.college_code}] (${college._id})`);
        }
        else {
            college = await College_1.College.create({
                college_name: collegeName,
                college_code: collegeCode,
                location: location,
                logo_url: logoUrl,
                status: 'active',
                assigned_coordinator_ids: userIds,
            });
            console.log(`✅ College created: ${college.college_name} [${college.college_code}] (${college._id})`);
        }
        // 3. Update all users' assigned_college_ids to include MCET
        let usersUpdated = 0;
        for (const u of allUsers) {
            const assigned = (u.assigned_college_ids || []).map((id) => id.toString());
            if (!assigned.includes(college._id.toString())) {
                u.assigned_college_ids.push(college._id);
                await u.save();
                usersUpdated++;
            }
        }
        console.log(`✅ Added MCET to assigned_college_ids for ${usersUpdated} users.`);
        // 4. Verify total count
        const totalActive = await College_1.College.countDocuments({ is_deleted: { $ne: true } });
        console.log(`\n🏫 Total active colleges in database now: ${totalActive}`);
        console.log('\n===============================================================');
        console.log('🎉 MCET COLLEGE SUCCESSFULLY PROVISIONED & LINKED');
        console.log(`College Name:   ${college.college_name}`);
        console.log(`Acronym/Code:   ${college.college_code}`);
        console.log(`Location:       ${college.location}`);
        console.log(`Logo URL:       ${college.logo_url}`);
        console.log(`Status:         ${college.status}`);
        console.log(`Assigned Users: ${college.assigned_coordinator_ids.length}`);
        console.log('===============================================================\n');
    }
    catch (err) {
        console.error('❌ Error adding MCET:', err);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
addMcetCollege();
