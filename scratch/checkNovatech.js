const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin_ipoms:iPOMS_2026_Secure%23@ipoms-prod.7e8ft3k.mongodb.net/ipoms_db?retryWrites=true&w=majority';

async function checkNovatech() {
  await mongoose.connect(MONGODB_URI);
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
