const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGODB_URI = 'mongodb+srv://admin_ipoms:iPOMS_2026_Secure%23@ipoms-prod.7e8ft3k.mongodb.net/ipoms_db?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  const colleges = await mongoose.connection.collection('colleges').find({}).toArray();
  console.log(`Found ${colleges.length} colleges in DB:`);
  colleges.forEach(c => {
    console.log(`- Code: [${c.college_code}] Name: "${c.college_name}" Status: "${c.status}" ID: ${c._id}`);
  });
  await mongoose.disconnect();
}

main().catch(console.error);
