const mongoose = require('mongoose');

const mongoUri = 'mongodb+srv://ipoms_admin:1106%40Deva@ipoms-prod.7e8ft3k.mongodb.net/ipoms_db?retryWrites=true&w=majority&appName=ipoms-prod';

async function main() {
  await mongoose.connect(mongoUri);
  const College = mongoose.model('College', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const colleges = await College.find({}, 'college_name college_code');
  console.log('--- ALL COLLEGES IN DB ---');
  colleges.forEach(c => console.log(c.college_code.padEnd(12), '->', c.college_name, `(${c._id})`));
  
  const users = await User.find({
    role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR'] }
  }, 'full_name official_email username assigned_college_ids');
  
  console.log('\n--- COORDINATORS IN DB ---');
  users.forEach(u => console.log(u.full_name.padEnd(25), `[${u.username}]`.padEnd(15), u.official_email, `(${u._id})`));
  
  await mongoose.disconnect();
}

main().catch(console.error);
