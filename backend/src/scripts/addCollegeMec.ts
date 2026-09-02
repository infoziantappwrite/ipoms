import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { College } from '../models/College';
import { User } from '../models/User';

async function addMecCollege() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('✅ Connected.');

  try {
    // 1. Fetch all active users (Coordinators + Admins)
    const allUsers = await User.find({ is_deleted: { $ne: true } });
    const userIds = allUsers.map((u) => u._id);
    console.log(`👥 Found ${userIds.length} users to associate.`);

    // 2. MEC details
    const collegeName = 'Muthayammal Engineering College';
    const collegeCode = 'MEC';
    const location = 'Singlandhapuram, Tamil Nadu';
    const logoUrl = '/college-logos/MEC.png';
    const tpoName = 'Dr.Arul Selvan Asirvatham';
    const tpoEmail = 'talent@mec.edu.in';

    let college = await College.findOne({
      $or: [
        { college_code: collegeCode },
        { college_name: new RegExp('Muthayammal', 'i') },
      ],
    });

    if (college) {
      console.log(`📝 Existing college found (${college.college_code}), updating...`);
      college.college_name = collegeName;
      college.college_code = collegeCode;
      college.location = location;
      college.logo_url = logoUrl;
      college.tpo_name = tpoName;
      college.tpo_email = tpoEmail;
      college.status = 'active';
      college.assigned_coordinator_ids = userIds as any;
      await college.save();
      console.log(`✅ College updated: ${college.college_name} [${college.college_code}] (${college._id})`);
    } else {
      college = await College.create({
        college_name: collegeName,
        college_code: collegeCode,
        location: location,
        logo_url: logoUrl,
        tpo_name: tpoName,
        tpo_email: tpoEmail,
        status: 'active',
        assigned_coordinator_ids: userIds,
      });
      console.log(`✅ College created: ${college.college_name} [${college.college_code}] (${college._id})`);
    }

    // 3. Update all users' assigned_college_ids to include MEC
    let usersUpdated = 0;
    for (const u of allUsers) {
      const assigned = (u.assigned_college_ids || []).map((id) => id.toString());
      if (!assigned.includes(college._id.toString())) {
        u.assigned_college_ids.push(college._id as any);
        await u.save();
        usersUpdated++;
      }
    }
    console.log(`✅ Added MEC to assigned_college_ids for ${usersUpdated} users.`);

    // 4. Verify total count
    const totalActive = await College.countDocuments({ is_deleted: { $ne: true } });
    console.log(`\n🏫 Total active colleges in database now: ${totalActive}`);

    console.log('\n===============================================================');
    console.log('🎉 MEC COLLEGE SUCCESSFULLY PROVISIONED & LINKED');
    console.log(`College Name:   ${college.college_name}`);
    console.log(`Acronym/Code:   ${college.college_code}`);
    console.log(`TPO Name:       ${college.tpo_name}`);
    console.log(`TPO Email:      ${college.tpo_email}`);
    console.log(`Location:       ${college.location}`);
    console.log(`Logo URL:       ${college.logo_url}`);
    console.log(`Status:         ${college.status}`);
    console.log(`Assigned Users: ${college.assigned_coordinator_ids.length}`);
    console.log('===============================================================\n');
  } catch (err: any) {
    console.error('❌ Error adding MEC:', err);
  } finally {
    await mongoose.disconnect();
  }
}

addMecCollege();
