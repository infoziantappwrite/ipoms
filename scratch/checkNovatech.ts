import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Projects/iPOMS/backend/.env' });

async function checkNovatech() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    console.log('No DB connection');
    process.exit(1);
  }

  const weeklyRows = await db.collection('weekly_trackers').find({ company_name: /Novatech/i }).toArray();
  console.log('--- Weekly Tracker Rows for Novatech ---');
  console.log(JSON.stringify(weeklyRows, null, 2));

  const metadata = await db.collection('company_metadatas').find({ company_name: /Novatech/i }).toArray();
  console.log('--- Company Metadata for Novatech ---');
  console.log(JSON.stringify(metadata, null, 2));

  await mongoose.disconnect();
}

checkNovatech().catch(console.error);
