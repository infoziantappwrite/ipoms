const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const College = mongoose.model('College', new mongoose.Schema({}, { strict: false }));
  const DailyTracker = mongoose.model('DailyTracker', new mongoose.Schema({}, { strict: false }));

  // Find Mohanaradha
  const mohana = await User.findOne({
    $or: [
      { official_email: /mohanaradha/i },
      { username: /mohana/i },
      { full_name: /mohana/i }
    ],
    is_deleted: false
  });

  console.log('Mohanaradha user:', mohana ? { _id: mohana._id, full_name: mohana.full_name, email: mohana.official_email, username: mohana.username } : 'NOT FOUND');

  // Find Admin
  const admin = await User.findOne({
    $or: [
      { official_email: /admin/i },
      { username: /admin/i }
    ]
  });
  console.log('Admin user:', admin ? { _id: admin._id, full_name: admin.full_name, email: admin.official_email } : 'NOT FOUND');

  // Find Target Colleges: ACET, AIHT, KARPAGAM, KPR
  const targetCodes = ['ACET', 'AIHT', 'KARPAGAM', 'KPR'];
  const colleges = await College.find({
    college_code: { $in: targetCodes }
  });
  console.log('Found Colleges:', colleges.map(c => ({ _id: c._id, code: c.college_code, name: c.college_name })));

  if (mohana && colleges.length > 0) {
    const collegeIds = colleges.map(c => c._id);
    
    // Assign colleges to Mohanaradha
    await User.updateOne(
      { _id: mohana._id },
      {
        $set: {
          assigned_college_ids: collegeIds,
          weekly_focus_locked: true,
          weekly_focus_week_key: new Date().toISOString().split('T')[0]
        }
      }
    );
    console.log(`✅ Assigned ${colleges.length} colleges (${targetCodes.join(', ')}) to Mohanaradha.`);

    // Reassign DailyTracker calls for ACET, AIHT, KARPAGAM, KPR that were attributed to Administrator -> Mohanaradha
    const acetCol = colleges.find(c => c.college_code === 'ACET');
    if (acetCol) {
      const acetUpdated = await DailyTracker.updateMany(
        { college_id: acetCol._id },
        { $set: { coordinator_id: mohana._id } }
      );
      console.log(`✅ Updated ${acetUpdated.modifiedCount} ACET tracker rows to coordinator Mohanaradha.`);
    }

    // Also for AIHT, KARPAGAM, KPR if they were assigned to admin
    for (const col of colleges) {
      if (admin) {
        const res = await DailyTracker.updateMany(
          { college_id: col._id, coordinator_id: admin._id },
          { $set: { coordinator_id: mohana._id } }
        );
        if (res.modifiedCount > 0) {
          console.log(`✅ Updated ${res.modifiedCount} rows for ${col.college_code} from Admin to Mohanaradha.`);
        }
      }
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
