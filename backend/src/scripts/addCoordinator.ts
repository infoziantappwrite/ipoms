import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { College } from '../models/College';

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDatabase();

    const fullName = 'Megala Devi P S';
    const username = 'megaladevi';
    const email = 'megaladevi_ps@infoziant.com';
    const mobile = '9976214361';
    const password = 'iPOMS@123';

    // 1. Fetch Coordinator Roles
    const roles = await Role.find({
      role_code: { $in: ['PLACEMENT_COORDINATOR', 'COORDINATOR', 'CAMPUS_COORDINATOR'] },
    });
    let roleIds = roles.map((r) => r._id);
    let roleCodes = roles.map((r) => r.role_code);

    if (roleCodes.length === 0) {
      // Fallback if role names differ
      const allRoles = await Role.find();
      const coordRole = allRoles.find((r) =>
        r.role_code.toLowerCase().includes('coord') || r.role_name.toLowerCase().includes('coord')
      );
      if (coordRole) {
        roleIds = [coordRole._id as any];
        roleCodes = [coordRole.role_code];
      }
    }

    console.log('Assigned Roles:', roleCodes);

    // 2. Fetch all active colleges for complete coordinator access
    const allColleges = await College.find({ is_deleted: { $ne: true } });
    const collegeIds = allColleges.map((c) => c._id);
    console.log(`Found ${allColleges.length} colleges to link.`);

    // 3. Hash Password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Upsert User
    let user = await User.findOne({
      $or: [{ username }, { official_email: email }],
    });

    if (user) {
      console.log(`User already exists (${user.username}). Updating details and resetting password...`);
      user.full_name = fullName;
      user.username = username;
      user.official_email = email;
      user.primary_mobile = mobile;
      user.password_hash = passwordHash;
      user.role_ids = roleIds as any;
      user.role_codes = roleCodes.length > 0 ? roleCodes : ['PLACEMENT_COORDINATOR'];
      user.assigned_college_ids = collegeIds as any;
      user.account_status = 'active';
      user.is_email_verified = true;
      user.must_change_password = false;
      user.failed_login_attempts = 0;
      user.is_deleted = false;
      user.is_password_locked = false;
      user.is_profile_locked = false;
      await user.save();
      console.log(`User ${user.username} successfully updated.`);
    } else {
      user = await User.create({
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
    await College.updateMany(
      { _id: { $in: collegeIds } },
      { $addToSet: { assigned_coordinator_ids: user._id } }
    );
    console.log('Coordinator linked to colleges successfully.');

    // 6. Verify password check
    const isMatch = await bcrypt.compare(password, user.password_hash);
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

    await disconnectDatabase();
  } catch (err) {
    console.error('Error in addCoordinator script:', err);
    process.exit(1);
  }
}

main();
