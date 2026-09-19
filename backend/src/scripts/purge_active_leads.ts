import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();
  const countBefore = await ActiveLead.countDocuments({});
  console.log(`ℹ️ [Purge] Found ${countBefore} ActiveLead entries in database.`);
  
  const result = await ActiveLead.deleteMany({});
  console.log(`🗑️ [Purge] Successfully deleted ${result.deletedCount} ActiveLead records.`);
  
  const countAfter = await ActiveLead.countDocuments({});
  console.log(`✅ [Purge] Remaining ActiveLead entries: ${countAfter}`);
  await disconnectDatabase();
}

main().catch(console.error);
