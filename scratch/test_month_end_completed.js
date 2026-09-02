const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms');
    const WeeklyTracker = mongoose.model('WeeklyTracker', new mongoose.Schema({}, { strict: false }));
    const completed = await WeeklyTracker.find({ pipeline_section: 'completed', is_deleted: { $ne: true } }).limit(5);
    console.log('Sample completed drives count:', completed.length);
    console.log('Sample data:', completed.map(c => ({
      company: c.company_name,
      role: c.job_role,
      ctc: c.ctc_lpa,
      selected: c.selected_count,
      status: c.current_status_text
    })));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
