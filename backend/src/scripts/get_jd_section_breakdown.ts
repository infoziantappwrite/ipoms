import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function getJdSectionBreakdown() {
  await connectDatabase();

  const jdLeads = await ActiveLead.find({ lead_type: 'jd_received', is_deleted: false }).lean();

  const inProgress = jdLeads.filter(l => l.pipeline_section === 'in_progress' || l.pipeline_section === 'companies_in_progress');
  const upcomingDrive = jdLeads.filter(l => ['companies_in_drive', 'in_drive', 'upcoming_drive', 'upcoming_drives'].includes(l.pipeline_section || ''));
  const driveInProgress = jdLeads.filter(l => l.pipeline_section === 'drive_in_progress');
  const completed = jdLeads.filter(l => l.pipeline_section === 'completed' || l.pipeline_section === 'companies_completed');

  console.log('=======================================================');
  console.log('📊 ACTIVE LEADS MANAGEMENT: JD RECEIVED BREAKDOWN');
  console.log('=======================================================');
  console.log(`Total JD this year: ${jdLeads.length}\n`);
  console.log(`1. Companies In Progress:      ${inProgress.length}`);
  console.log(`2. Upcoming Drives / In Drive: ${upcomingDrive.length}`);
  console.log(`3. Drive In Progress:          ${driveInProgress.length}`);
  console.log(`4. Companies Completed:        ${completed.length}`);
  console.log('=======================================================\n');

  console.log('🏢 Companies Completed List (11):');
  completed.forEach((c, idx) => console.log(`  ${idx + 1}. ${c.company_name} | Role: ${c.role} | CTC: ${c.ctc}`));

  console.log('\n🏢 Drive in Progress List (0):');
  driveInProgress.forEach((c, idx) => console.log(`  ${idx + 1}. ${c.company_name} | Role: ${c.role} | CTC: ${c.ctc}`));

  console.log('\n🏢 Upcoming Drives List (0):');
  upcomingDrive.forEach((c, idx) => console.log(`  ${idx + 1}. ${c.company_name} | Role: ${c.role} | CTC: ${c.ctc}`));

  console.log(`\n🏢 Sample Companies In Progress (${inProgress.length}):`);
  inProgress.slice(0, 15).forEach((c, idx) => console.log(`  ${idx + 1}. ${c.company_name} | Role: ${c.role} | CTC: ${c.ctc}`));

  await disconnectDatabase();
}

getJdSectionBreakdown().catch(console.error);
