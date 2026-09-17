import '../models/College';
import '../models/User';
import '../models/DailyTracker';
import '../models/DailyLead';
import { DailyLead } from '../models/DailyLead';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function updateRoles() {
  await connectDatabase();

  const targetDate = new Date(Date.UTC(2026, 8, 17, 0, 0, 0, 0)); // 17 Sept 2026
  const nextDate = new Date(Date.UTC(2026, 8, 18, 0, 0, 0, 0));

  console.log(`\nChecking DailyLead documents for ${targetDate.toISOString().split('T')[0]}...`);

  const todayLeads = await DailyLead.find({
    lead_date: { $gte: targetDate, $lt: nextDate },
  });

  console.log(`Found ${todayLeads.length} leads for today.`);
  for (const lead of todayLeads) {
    console.log(`- [${lead.lead_type}] ${lead.company_name}: job_role="${lead.job_role}", ctc="${lead.ctc}"`);
    if (lead.job_role === 'Graduate Trainee') {
      lead.job_role = '';
      await lead.save();
      console.log(`  -> Updated job_role to "" (empty) for ${lead.company_name}`);
    }
  }

  // Also check if any other DailyLead in DB has 'Graduate Trainee' that was defaulted
  const defaultedLeads = await DailyLead.find({ job_role: 'Graduate Trainee' });
  console.log(`\nFound ${defaultedLeads.length} other DailyLead records with job_role="Graduate Trainee".`);
  for (const dl of defaultedLeads) {
    dl.job_role = '';
    await dl.save();
    console.log(`  -> Cleared job_role for ${dl.company_name} (${dl.lead_date?.toISOString().split('T')[0]})`);
  }

  console.log('\nDone updating DailyLead job_role defaults.');
  await disconnectDatabase();
}

updateRoles().catch(console.error);
