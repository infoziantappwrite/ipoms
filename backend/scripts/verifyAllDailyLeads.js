const mongoose = require('mongoose');

async function checkAll() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const db = mongoose.connection.db;
  const col = db.collection('dailyleads');

  const positives = await col.aggregate([
    { $match: { lead_type: 'positive', is_deleted: { $ne: true } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lead_date' } }, count: { $sum: 1 } } }
  ]).toArray();

  const jds = await col.aggregate([
    { $match: { lead_type: 'jd_received', is_deleted: { $ne: true } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lead_date' } }, count: { $sum: 1 } } }
  ]).toArray();

  const dateMap = new Map();
  for (const p of positives) {
    if (!dateMap.has(p._id)) dateMap.set(p._id, { date: p._id, positives: 0, jd_received: 0 });
    dateMap.get(p._id).positives = p.count;
  }
  for (const j of jds) {
    if (!dateMap.has(j._id)) dateMap.set(j._id, { date: j._id, positives: 0, jd_received: 0 });
    dateMap.get(j._id).jd_received = j.count;
  }

  const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  console.log('\n=== COMPLETE DAILY LEADS SUMMARY ===');
  console.table(sorted);

  const totalPositives = sorted.reduce((acc, r) => acc + r.positives, 0);
  const totalJds = sorted.reduce((acc, r) => acc + r.jd_received, 0);
  console.log(`\nGrand Totals:`);
  console.log(`- Total Positives: ${totalPositives}`);
  console.log(`- Total JD Received: ${totalJds}`);
  console.log(`- Grand Total Records: ${totalPositives + totalJds}`);

  process.exit(0);
}

checkAll();
