import { College } from '../models/College';
import { User } from '../models/User';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function main() {
  await connectDatabase();
  const colleges = await College.find({ is_deleted: { $ne: true } }).select('_id college_name college_code is_active');
  const users = await User.find({ is_active: true }).select('_id full_name official_email role');
  console.log('COLLEGES:', JSON.stringify(colleges, null, 2));
  console.log('USERS:', JSON.stringify(users, null, 2));
  await disconnectDatabase();
}

main().catch(console.error);
