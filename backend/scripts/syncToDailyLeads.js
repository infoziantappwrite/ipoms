const mongoose = require('mongoose');

async function syncDailyLeads() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const db = mongoose.connection.db;

  const sourceCollection = db.collection('dailyleads');
  const targetCollection = db.collection('daily_leads');

  const sourceRecords = await sourceCollection.find().toArray();
  console.log(`Found ${sourceRecords.length} records in 'dailyleads'. Syncing to 'daily_leads'...`);

  let inserted = 0;
  let skipped = 0;

  for (const doc of sourceRecords) {
    const targetDate = new Date(doc.lead_date);
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const escapedName = doc.company_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const query = {
      lead_type: doc.lead_type,
      company_name: { $regex: `^${escapedName}$`, $options: 'i' },
      lead_date: { $gte: targetDate, $lt: nextDate },
      is_deleted: { $ne: true },
    };
    if (doc.college_id) {
      query.college_id = doc.college_id;
    }

    const existing = await targetCollection.findOne(query);
    if (existing) {
      skipped++;
    } else {
      const cleanDoc = { ...doc };
      delete cleanDoc._id; // create new ObjectId in target
      await targetCollection.insertOne({
        ...cleanDoc,
        is_deleted: false,
        created_at: doc.created_at || new Date(),
        updated_at: doc.updated_at || new Date(),
      });
      inserted++;
    }
  }

  console.log(`Sync completed:`);
  console.log(`- Inserted new into daily_leads: ${inserted}`);
  console.log(`- Already existing in daily_leads: ${skipped}`);

  const finalTotal = await targetCollection.countDocuments({ is_deleted: false });
  console.log(`Total active records in daily_leads: ${finalTotal}`);

  // Breakdown for August 25th in daily_leads
  const target25 = new Date('2026-08-25T00:00:00.000Z');
  const next25 = new Date('2026-08-26T00:00:00.000Z');
  const count25Positives = await targetCollection.countDocuments({
    lead_type: 'positive',
    lead_date: { $gte: target25, $lt: next25 },
    is_deleted: false,
  });
  const count25Jd = await targetCollection.countDocuments({
    lead_type: 'jd_received',
    lead_date: { $gte: target25, $lt: next25 },
    is_deleted: false,
  });

  console.log(`\nAugust 25th in daily_leads:`);
  console.log(`- Positives: ${count25Positives}`);
  console.log(`- JD Received: ${count25Jd}`);

  process.exit(0);
}

syncDailyLeads();
