import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import { WeeklyTracker } from '../models/WeeklyTracker';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

function isValidCtc(ctc?: string | null): boolean {
  if (!ctc) return false;
  const t = ctc.trim().toLowerCase();
  if (!t || t === '-' || t === 'null' || t === 'undefined' || t === 'tbd' || t === 'na' || t === 'n/a' || t === '—') {
    return false;
  }
  return true;
}

async function testSyncLogic() {
  await connectDatabase();

  console.log('=== 1. CURRENT ACTIVE LEADS IN DB ===');
  const currentLeads = await ActiveLead.find({ is_deleted: { $ne: true } }).lean();
  const currentPipeline = currentLeads.filter(l => l.lead_type === 'pipeline');
  const currentJd = currentLeads.filter(l => l.lead_type === 'jd_received');

  const pipelineWithCtc = currentPipeline.filter(l => isValidCtc(l.ctc));
  const pipelineWithoutCtc = currentPipeline.filter(l => !isValidCtc(l.ctc));

  console.log(`Total Active Leads: ${currentLeads.length}`);
  console.log(`Current Pipeline: ${currentPipeline.length}`);
  console.log(`  ├─ With CTC: ${pipelineWithCtc.length}`);
  console.log(`  └─ Without CTC (To be removed): ${pipelineWithoutCtc.length}`);
  console.log(`Current JD Received: ${currentJd.length}`);

  // 2. Weekly Tracker analysis
  console.log('\n=== 2. WEEKLY TRACKER ROWS ===');
  const allWeekly = await WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();
  const weeklyPipeline = allWeekly.filter(w => (w.pipeline_section || '').toLowerCase() === 'pipeline');
  const weeklyJd = allWeekly.filter(w =>
    ['in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed'].includes(
      (w.pipeline_section || '').toLowerCase()
    )
  );

  const weeklyPipelineWithCtc = weeklyPipeline.filter(w => isValidCtc(w.ctc_lpa));
  const weeklyPipelineWithoutCtc = weeklyPipeline.filter(w => !isValidCtc(w.ctc_lpa));

  console.log(`Weekly Pipeline Total: ${weeklyPipeline.length}`);
  console.log(`  ├─ With CTC: ${weeklyPipelineWithCtc.length} (${new Set(weeklyPipelineWithCtc.map(w => w.company_name.trim().toLowerCase())).size} unique)`);
  console.log(`  └─ Without CTC: ${weeklyPipelineWithoutCtc.length}`);
  console.log(`Weekly JD Received Total: ${weeklyJd.length} (${new Set(weeklyJd.map(w => w.company_name.trim().toLowerCase())).size} unique)`);

  await disconnectDatabase();
}

testSyncLogic().catch(console.error);
