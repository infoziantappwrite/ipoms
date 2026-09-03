import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function listUsers() {
  await connectDatabase();

  const users = await User.find({ is_deleted: false }).select('full_name username official_email role_codes account_status password_hash');

  console.log('\n========================================================================================');
  console.log('👥 iPOMS — ACTIVE USER ROSTER & LOGIN CREDENTIALS');
  console.log('========================================================================================\n');

  for (const u of users) {
    const isDefaultIpoms = await bcrypt.compare('Ipoms@123', u.password_hash);
    const isDefaultLower = await bcrypt.compare('iPOMS@123', u.password_hash);
    const passwordMatch = isDefaultIpoms ? 'Ipoms@123' : (isDefaultLower ? 'iPOMS@123' : 'Custom / Reset');

    console.log(`Name    : ${u.full_name}`);
    console.log(`Email   : ${u.official_email}`);
    console.log(`Roles   : ${u.role_codes.join(', ')}`);
    console.log(`Status  : ${u.account_status}`);
    console.log(`Password: ${passwordMatch}`);
    console.log('----------------------------------------------------------------------------------------');
  }

  await disconnectDatabase();
  process.exit(0);
}

listUsers();
