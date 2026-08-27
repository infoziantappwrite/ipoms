const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const db = mongoose.connection.db;
  const aggr = await db.collection('dailyleads').aggregate([
    { $match: { lead_type: 'positive', is_deleted: { $ne: true } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lead_date' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('Positives count per date:');
  console.table(aggr);
  process.exit(0);
}

check();
