const mongoose = require('mongoose');

async function checkCollections() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  console.log('Collections in ipoms_db:', cols.map(c => c.name));

  const countDailyLeads = await db.collection('daily_leads').countDocuments();
  const countDailyleads = await db.collection('dailyleads').countDocuments();
  console.log('Count in daily_leads (with underscore):', countDailyLeads);
  console.log('Count in dailyleads (no underscore):', countDailyleads);

  process.exit(0);
}

checkCollections();
