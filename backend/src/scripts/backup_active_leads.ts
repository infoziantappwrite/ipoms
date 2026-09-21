import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();
  const allLeads = await ActiveLead.find({}).lean();
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, `active_leads_backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(allLeads, null, 2), 'utf-8');
  console.log(`✅ [Backup] Backed up ${allLeads.length} active leads to ${backupPath}`);
  await disconnectDatabase();
}

main().catch(console.error);
