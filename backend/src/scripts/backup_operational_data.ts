import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { DailyLead } from '../models/DailyLead';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { ActiveLead } from '../models/ActiveLead';
import { PendingTask } from '../models/PendingTask';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../../backups', `pre_clean_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`📦 Exporting backup to: ${backupDir}`);

  const [dailyTrackers, dailyLeads, weeklyTrackers, activeLeads, pendingTasks] = await Promise.all([
    DailyTracker.find({}).lean(),
    DailyLead.find({}).lean(),
    WeeklyTracker.find({}).lean(),
    ActiveLead.find({}).lean(),
    PendingTask.find({}).lean(),
  ]);

  fs.writeFileSync(path.join(backupDir, 'DailyTracker.json'), JSON.stringify(dailyTrackers, null, 2));
  fs.writeFileSync(path.join(backupDir, 'DailyLead.json'), JSON.stringify(dailyLeads, null, 2));
  fs.writeFileSync(path.join(backupDir, 'WeeklyTracker.json'), JSON.stringify(weeklyTrackers, null, 2));
  fs.writeFileSync(path.join(backupDir, 'ActiveLead.json'), JSON.stringify(activeLeads, null, 2));
  fs.writeFileSync(path.join(backupDir, 'PendingTask.json'), JSON.stringify(pendingTasks, null, 2));

  console.log(`✅ Backup successfully created:`);
  console.log(` - DailyTracker:  ${dailyTrackers.length} rows`);
  console.log(` - DailyLead:     ${dailyLeads.length} rows`);
  console.log(` - WeeklyTracker: ${weeklyTrackers.length} rows`);
  console.log(` - ActiveLead:    ${activeLeads.length} rows`);
  console.log(` - PendingTask:   ${pendingTasks.length} rows`);

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
