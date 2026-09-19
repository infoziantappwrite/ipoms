const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyKLU() {
  await mongoose.connect(process.env.MONGODB_URI);
  const college = await mongoose.connection.collection('colleges').findOne({ college_code: 'KLU' });
  const rows = await mongoose.connection.collection('weekly_tracker').find({
    college_id: college._id,
    academic_year: 2027
  }).toArray();

  console.log(`\n======================================================`);
  console.log(`🏛️ College: ${college.college_name} (${college.college_code})`);
  console.log(`📊 Total 2027 Records: ${rows.length}`);
  console.log(`======================================================\n`);

  const breakdown = {};
  rows.forEach(r => {
    breakdown[r.pipeline_section] = (breakdown[r.pipeline_section] || 0) + 1;
  });
  console.log('Breakdown by Pipeline Section:');
  console.table(breakdown);

  console.log('\nPinned Top Companies:');
  const pinned = rows.filter(r => r.is_pinned_top);
  pinned.forEach((r, i) => console.log(`  ${i + 1}. [PINNED] ${r.company_name} | Role: ${r.job_role} | CTC: ${r.ctc_lpa || '-'} | Status: ${r.current_status_text}`));

  console.log('\nFirst 5 Pipeline Companies:');
  const pipeline = rows.filter(r => r.pipeline_section === 'pipeline').slice(0, 5);
  pipeline.forEach((r, i) => console.log(`  ${i + 1}. ${r.company_name} | Role: ${r.job_role} | CTC: ${r.ctc_lpa || '-'} | Status: ${r.current_status_text}`));

  console.log('\nRejected Companies:');
  const rejected = rows.filter(r => r.pipeline_section === 'rejected_companies');
  rejected.forEach((r, i) => console.log(`  ${i + 1}. ${r.company_name} | Role: ${r.job_role} | CTC: ${r.ctc_lpa || '-'} | Status: ${r.current_status_text}`));

  await mongoose.disconnect();
}

verifyKLU().catch(console.error);
