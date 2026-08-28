import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { seedMasterDailyLeads } from '../lib/seedMasterDailyLeads';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms';

async function main() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const res = await seedMasterDailyLeads();
    console.log('🎉 Done! Result:', res);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding master daily leads:', err);
    process.exit(1);
  }
}

main();
