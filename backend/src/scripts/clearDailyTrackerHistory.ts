import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DailyTracker } from '../models/DailyTracker';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';

async function clearDailyTracker() {
  try {
    console.log(`🔌 Connecting to MongoDB: ${MONGODB_URI}`);
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
