import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';

async function setAllPasswords() {
  await connectDatabase();

  const newPassword = 'iPOMS@123';
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  const result = await User.updateMany(
    { is_deleted: false },
    {
      $set: {
        password_hash: passwordHash,
        failed_login_attempts: 0,
        account_status: 'active',
        locked_until: null,
      },
    }
  );

  console.log(`\n✅ Successfully updated passwords to "${newPassword}" for ${result.modifiedCount} users!`);

  // Verify all
  const users = await User.find({ is_deleted: false }).select('full_name official_email role_codes account_status password_hash');
  console.log('\n========================================================================================');
  console.log('👥 VERIFICATION OF UPDATED PASSWORDS IN MONGODB');
  console.log('========================================================================================\n');

  for (const u of users) {
    const isMatch = await bcrypt.compare(newPassword, u.password_hash);
    console.log(`Name    : ${u.full_name}`);
    console.log(`Email   : ${u.official_email}`);
    console.log(`Roles   : ${u.role_codes.join(', ')}`);
    console.log(`Password: ${isMatch ? newPassword : 'FAIL'}`);
    console.log(`Status  : ${u.account_status}`);
    console.log('----------------------------------------------------------------------------------------');
  }

  await disconnectDatabase();
  process.exit(0);
}

setAllPasswords();
