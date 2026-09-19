import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();
  const count = await ActiveLead.countDocuments({});
  const activeCount = await ActiveLead.countDocuments({ is_deleted: { $ne: true } });
  const sample = await ActiveLead.find({}).limit(5).lean();
  console.log(`=== ACTIVE LEADS STATS ===`);
  console.log(`Total ActiveLead docs in DB: ${count}`);
  console.log(`Non-deleted ActiveLead docs: ${activeCount}`);
  console.log(`Sample:`, JSON.stringify(sample, null, 2));
  await disconnectDatabase();
}

main().catch(console.error);
