import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { College } from '../models/College';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const allUsers = await User.find({}).lean();
  console.log('Total users in DB:', allUsers.length);
  for (const u of allUsers) {
    console.log({
      _id: String(u._id),
      full_name: u.full_name,
      official_email: u.official_email,
      username: u.username,
      is_deleted: u.is_deleted,
      account_status: u.account_status,
      assigned_college_ids: u.assigned_college_ids,
      weekly_focus_locked: u.weekly_focus_locked,
      weekly_focus_week_key: u.weekly_focus_week_key
    });
  }
  await mongoose.disconnect();
}

run().catch(console.error);
