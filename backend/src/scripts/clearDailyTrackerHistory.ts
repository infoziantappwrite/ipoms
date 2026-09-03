import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { DailyTracker } from '../models/DailyTracker';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';

async function clearDailyTracker() {
  try {
    console.log(`🔌 Connecting to MongoDB Atlas...`);
    await mongoose.connect(MONGODB_URI);
    
    const countBefore = await DailyTracker.countDocuments({});
    console.log(`📊 Found ${countBefore} total daily tracker records across all colleges.`);

    const result = await DailyTracker.deleteMany({});
    console.log(`✅ Successfully cleared ${result.deletedCount} daily tracker records.`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  } catch (err) {
    console.error('❌ Error clearing daily tracker:', err);
    process.exit(1);
  }
}

clearDailyTracker();
