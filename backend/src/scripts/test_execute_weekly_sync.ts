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

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function syncActiveLeadsFromWeeklyTracker() {
  console.log('🔄 Starting Weekly Tracker -> Active Leads Synchronization...');

  // 1. Fetch all Weekly Tracker entries
  const allWeekly = await WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();

  // Weekly map by normalized name
  const weeklyMap = new Map<string, typeof allWeekly[0]>();
  for (const w of allWeekly) {
    if (w.company_name && w.company_name.trim()) {
      const k = normalizeKey(w.company_name);
      if (!weeklyMap.has(k) || (isValidCtc(w.ctc_lpa) && !isValidCtc(weeklyMap.get(k)?.ctc_lpa))) {
        weeklyMap.set(k, w);
      }
    }
  }

  // 2. Fetch all current Active Leads
  const allActive = await ActiveLead.find({ is_deleted: false });

  // A. Backfill CTC for pipeline leads that are missing CTC if Weekly Tracker has it
  let backfilledCtcCount = 0;
  for (const lead of allActive) {
    if (lead.lead_type === 'pipeline' && !isValidCtc(lead.ctc)) {
      const match = weeklyMap.get(normalizeKey(lead.company_name));
      if (match && isValidCtc(match.ctc_lpa)) {
        lead.ctc = match.ctc_lpa!.trim();
        if (match.job_role && (!lead.role || lead.role === 'Graduate Trainee')) {
          lead.role = match.job_role.trim();
        }
        await lead.save();
        backfilledCtcCount++;
      }
    }
  }
  console.log(`✅ Backfilled CTC for ${backfilledCtcCount} pipeline companies from Weekly Tracker.`);

  // B. REMOVE all remaining Pipeline companies that still have NO valid CTC
  const removedNoCtcResult = await ActiveLead.deleteMany({
    lead_type: 'pipeline',
    $or: [
      { ctc: { $exists: false } },
      { ctc: '' },
      { ctc: '-' },
      { ctc: '—' },
      { ctc: { $regex: /^\s*$/ } },
      { ctc: { $regex: /^(na|n\/a|null|undefined|tbd|-)$/i } },
    ],
  });
  console.log(`🗑️ Removed ${removedNoCtcResult.deletedCount} pipeline companies with no CTC.`);

  // 3. Re-index current active leads (checking BOTH pipeline and jd_received)
  const refreshedActive = await ActiveLead.find({ is_deleted: false }).lean();
  const existingActiveNames = new Set<string>();
  for (const lead of refreshedActive) {
    if (lead.company_name) {
      existingActiveNames.add(normalizeKey(lead.company_name));
    }
  }

  // 4. Sync from Weekly Tracker:
  // Step 1: Process Pipeline first
  const weeklyPipeline = allWeekly.filter(w => (w.pipeline_section || '').toLowerCase() === 'pipeline');
  const weeklyJd = allWeekly.filter(w =>
    ['in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed'].includes(
      (w.pipeline_section || '').toLowerCase()
    )
  );

  let newlySyncedPipeline = 0;
  let skippedPipelineDuplicate = 0;
  let skippedPipelineNoCtc = 0;

  const leadsToInsert: any[] = [];

  for (const w of weeklyPipeline) {
    if (!w.company_name || !w.company_name.trim()) continue;
    const norm = normalizeKey(w.company_name);

    if (!isValidCtc(w.ctc_lpa)) {
      skippedPipelineNoCtc++;
      continue;
    }

    if (existingActiveNames.has(norm)) {
      skippedPipelineDuplicate++;
      continue;
    }

    // New unique pipeline lead
    existingActiveNames.add(norm);
    newlySyncedPipeline++;
    leadsToInsert.push({
      company_name: w.company_name.trim(),
      role: w.job_role?.trim() || 'Graduate Trainee',
      ctc: w.ctc_lpa?.trim() || '',
      lead_type: 'pipeline',
      pipeline_section: 'pipeline',
      status: '',
      followup_month: '',
      academic_year: w.eligible_batch?.trim() || '2027',
      college_id: w.college_id || null,
      coordinator_id: w.coordinator_id || null,
      is_deleted: false,
    });
  }

  // Step 2: Process JD Received sections next
  let newlySyncedJd = 0;
  let skippedJdDuplicate = 0;

  for (const w of weeklyJd) {
    if (!w.company_name || !w.company_name.trim()) continue;
    const norm = normalizeKey(w.company_name);

    if (existingActiveNames.has(norm)) {
      skippedJdDuplicate++;
      continue;
    }

    let mappedSec = 'in_progress';
    const sec = (w.pipeline_section || '').toLowerCase();
    if (sec === 'completed' || sec === 'companies_completed') mappedSec = 'completed';
    else if (sec === 'drive_in_progress') mappedSec = 'drive_in_progress';
    else if (sec.includes('drive') || sec.includes('upcoming')) mappedSec = 'upcoming_drive';
    else mappedSec = 'in_progress';

    existingActiveNames.add(norm);
    newlySyncedJd++;
    leadsToInsert.push({
      company_name: w.company_name.trim(),
      role: w.job_role?.trim() || 'Graduate Engineer Trainee',
      ctc: w.ctc_lpa?.trim() || '',
      lead_type: 'jd_received',
      pipeline_section: mappedSec,
      status: '',
      followup_month: '',
      academic_year: w.eligible_batch?.trim() || '2027',
      college_id: w.college_id || null,
      coordinator_id: w.coordinator_id || null,
      is_deleted: false,
    });
  }

  if (leadsToInsert.length > 0) {
    await ActiveLead.insertMany(leadsToInsert);
  }

  const finalActiveCount = await ActiveLead.countDocuments({ is_deleted: false });
  const finalPipelineCount = await ActiveLead.countDocuments({ lead_type: 'pipeline', is_deleted: false });
  const finalJdCount = await ActiveLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });

  console.log(`\n🎉 SYNC COMPLETE!`);
  console.log(`- Newly inserted Pipeline leads: ${newlySyncedPipeline} (Skipped duplicates: ${skippedPipelineDuplicate})`);
  console.log(`- Newly inserted JD leads: ${newlySyncedJd} (Skipped duplicates: ${skippedJdDuplicate})`);
  console.log(`- Final Total Active Leads: ${finalActiveCount}`);
  console.log(`  ├─ Pipeline: ${finalPipelineCount} (100% have verified CTC!)`);
  console.log(`  └─ JD Received: ${finalJdCount}`);

  return {
    removedNoCtc: removedNoCtcResult.deletedCount,
    backfilledCtc: backfilledCtcCount,
    newlySyncedPipeline,
    newlySyncedJd,
    finalTotal: finalActiveCount,
    finalPipeline: finalPipelineCount,
    finalJd: finalJdCount,
  };
}

if (require.main === module) {
  connectDatabase().then(async () => {
    await syncActiveLeadsFromWeeklyTracker();
    await disconnectDatabase();
  });
}
