const mongoose = require('mongoose');

async function testQuery() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const db = mongoose.connection.db;

  const targetDate1 = new Date('2026-08-25T00:00:00.000Z');
  const nextDate1 = new Date(targetDate1.getTime() + 24 * 60 * 60 * 1000);

  const res = await db.collection('dailyleads').find({
    lead_type: 'positive',
    lead_date: { $gte: targetDate1, $lt: nextDate1 },
    is_deleted: false
  }).toArray();

  console.log(`Matching for 2026-08-25 UTC (is_deleted: false): ${res.length}`);

  const allOn25 = await db.collection('dailyleads').find({
    lead_date: { $gte: targetDate1, $lt: nextDate1 }
  }).toArray();
  console.log(`All on 25th in DB: ${allOn25.length}`);
  allOn25.forEach(x => {
    console.log(`- ${x.lead_type} | ${x.company_name} | is_deleted: ${x.is_deleted} | lead_date: ${x.lead_date.toISOString()}`);
  });

  process.exit(0);
}

testQuery();
