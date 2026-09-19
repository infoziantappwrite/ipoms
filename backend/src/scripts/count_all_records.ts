import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { DailyLead } from '../models/DailyLead';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { ActiveLead } from '../models/ActiveLead';
import { PendingTask } from '../models/PendingTask';
import { AssignedWork } from '../models/AssignedWork';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { College } from '../models/College';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { AuditLog } from '../models/AuditLog';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDatabase();

  const [
    dailyTrackerCount,
    dailyLeadTotal,
    dailyLeadPositives,
    dailyLeadJdReceived,
    weeklyTrackerCount,
    activeLeadCount,
    pendingTaskCount,
    assignedWorkCount,
    companyMetaCount,
    collegeCount,
    userCount,
    roleCount,
    auditLogCount
  ] = await Promise.all([
    DailyTracker.countDocuments({}),
    DailyLead.countDocuments({}),
    DailyLead.countDocuments({ lead_type: 'positive' }),
    DailyLead.countDocuments({ lead_type: 'jd_received' }),
    WeeklyTracker.countDocuments({}),
    ActiveLead.countDocuments({}),
    PendingTask.countDocuments({}),
    AssignedWork.countDocuments({}),
    CompanyMetadata.countDocuments({}),
    College.countDocuments({}),
    User.countDocuments({}),
    Role.countDocuments({}),
    AuditLog.countDocuments({})
  ]);

  console.log('========================================');
  console.log(' DATABASE RECORD COUNTS IN IPOMS');
  console.log('========================================');
  console.log(`1. Daily Tracker (Calls/Logs):      ${dailyTrackerCount}`);
  console.log(`2. Daily Leads (Total):             ${dailyLeadTotal}`);
  console.log(`   - Positives:                     ${dailyLeadPositives}`);
  console.log(`   - JD Received:                   ${dailyLeadJdReceived}`);
  console.log(`3. Weekly Tracker (Pipeline/Drives):${weeklyTrackerCount}`);
  console.log(`4. Active Leads:                    ${activeLeadCount}`);
  console.log(`5. Pending Tasks:                   ${pendingTaskCount}`);
  console.log(`6. Assigned Work:                   ${assignedWorkCount}`);
  console.log(`7. Company Metadata:                ${companyMetaCount}`);
  console.log('----------------------------------------');
  console.log(`System / Master Collections (PRESERVED):`);
  console.log(`- Colleges:                         ${collegeCount}`);
  console.log(`- Users:                            ${userCount}`);
  console.log(`- Roles:                            ${roleCount}`);
  console.log(`- Audit Logs:                       ${auditLogCount}`);
  console.log('========================================');

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
