const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../../.env') });

function normalizeCtcString(val) {
  if (!val) return '';
  let s = val.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.toLowerCase() === 'not mentioned' || s === '-' || s.toLowerCase() === 'competitive') return '';

  s = s.replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2');
  s = s.replace(/(\d+)\s*LPA/gi, '$1 LPA');
  s = s.replace(/\/month\s*stipend/gi, ' / Month');
  s = s.replace(/stipend\s*\/month/gi, ' / Month');
  s = s.replace(/\/month/gi, ' / Month');
  s = s.replace(/\/m\b/gi, ' / Month');
  s = s.replace(/per\s*month/gi, '/ Month');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

async function cleanAllCtc() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const rows = await mongoose.connection.collection('weekly_tracker').find({
    ctc_lpa: { $exists: true, $ne: '' }
  }).toArray();

  console.log(`Checking ${rows.length} records for CTC cleanup...`);
  let updatedCount = 0;

  for (const r of rows) {
    if (!r.ctc_lpa) continue;
    let oldVal = r.ctc_lpa;
    let cleaned = normalizeCtcString(oldVal);

    if (cleaned !== oldVal) {
      await mongoose.connection.collection('weekly_tracker').updateOne(
        { _id: r._id },
        { $set: { ctc_lpa: cleaned } }
      );
      updatedCount++;
    }
  }

  console.log(`✅ Standardized CTC formatting for ${updatedCount} records in database.`);
  await mongoose.disconnect();
}

cleanAllCtc().catch(console.error);
