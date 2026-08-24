import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from '../config/database';
import { seedHistoricalCallPositives } from '../lib/seedHistoricalPositives';

async function main() {
  console.log('🚀 Connecting to database to seed historical positives...');
  await connectDatabase();
  console.log('🌱 Starting historical call positives seed...');
  await seedHistoricalCallPositives();
  console.log('✅ Completed historical call positives seed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to seed historical positives:', err);
  process.exit(1);
});
