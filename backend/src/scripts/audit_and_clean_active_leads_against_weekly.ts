import { connectDatabase, disconnectDatabase } from '../config/database';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { ActiveLead } from '../models/ActiveLead';
import { College } from '../models/College';
import dns from 'dns';
import fs from 'fs';
import path from 'path';

dns.setServers(['8.8.8.8', '1.1.1.1']);

function normalizeName(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function main() {
  await connectDatabase();

  console.log('\n======================================================');
  console.log('🔍 AUDIT: ACTIVE LEADS VS WEEKLY TRACKER SYNC');
  console.log('======================================================\n');

  // 1. Load All Colleges
  const colleges = await College.find({ is_deleted: { $ne: true } }).lean();
  const collegeMap = new Map<string, string>();
  for (const c of colleges) {
    collegeMap.set(String(c._id), c.college_name || c.college_code);
  }

  // 2. Load All Weekly Tracker Records
  const allWeekly = await WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();
  console.log(`📌 Total Active Rows in Weekly Tracker: ${allWeekly.length}`);

  // Create Maps/Sets of Weekly Tracker Companies
  const weeklyPipelineCompanies = new Set<string>();
  const weeklyJdCompanies = new Set<string>();
  const weeklyAllCompanies = new Set<string>();

  const weeklyPipelineDetails: Record<string, any[]> = {};
  const weeklyJdDetails: Record<string, any[]> = {};

  for (const w of allWeekly) {
    const rawName = (w.company_name || '').trim();
    if (!rawName) continue;
    const norm = normalizeName(rawName);
    const sec = (w.pipeline_section || '').toLowerCase().trim();

    weeklyAllCompanies.add(norm);

    if (sec === 'pipeline') {
      weeklyPipelineCompanies.add(norm);
      if (!weeklyPipelineDetails[norm]) weeklyPipelineDetails[norm] = [];
      weeklyPipelineDetails[norm].push(w);
    } else if (
      sec === 'in_progress' ||
      sec === 'in progress' ||
      sec === 'companies_in_progress' ||
      sec === 'upcoming_drives' ||
      sec === 'upcoming_drive' ||
      sec === 'companies_in_drive' ||
      sec === 'in_drive' ||
      sec === 'drive_in_progress' ||
      sec === 'completed' ||
      sec === 'companies_completed'
    ) {
      weeklyJdCompanies.add(norm);
      if (!weeklyJdDetails[norm]) weeklyJdDetails[norm] = [];
      weeklyJdDetails[norm].push(w);
    }
  }

  console.log(`  ├─ Unique Companies in Weekly Pipeline:    ${weeklyPipelineCompanies.size}`);
  console.log(`  ├─ Unique Companies in Weekly JD Sections: ${weeklyJdCompanies.size}`);
  console.log(`  └─ Total Unique Companies in Weekly:       ${weeklyAllCompanies.size}\n`);

  // 3. Load All Current Active Leads
  const allActiveLeads = await ActiveLead.find({ is_deleted: { $ne: true } }).lean();
  console.log(`📌 Total Active Leads Currently in Directory: ${allActiveLeads.length}`);

  const activePipelineLeads = allActiveLeads.filter(
    (l) => !l.lead_type || (l.lead_type as string) === 'pipeline' || (l.lead_type as string) === 'positive'
  );
  const activeJdLeads = allActiveLeads.filter(
    (l) => (l.lead_type as string) === 'jd_received' || (l.lead_type as string) === 'jd'
  );

  console.log(`  ├─ Active Leads in 'Pipeline' Tab:    ${activePipelineLeads.length}`);
  console.log(`  └─ Active Leads in 'JD Received' Tab: ${activeJdLeads.length}\n`);

  // 4. Identify Extraneous / Non-Weekly Companies in Active Leads
  const missingFromWeeklyEntirely: any[] = [];
  const pipelineLeadsNotInWeeklyPipeline: any[] = [];
  const jdLeadsNotInWeeklyJd: any[] = [];

  for (const lead of allActiveLeads) {
    const rawName = (lead.company_name || '').trim();
    const norm = normalizeName(rawName);
    const isJd = (lead.lead_type as string) === 'jd_received' || (lead.lead_type as string) === 'jd';

    const inWeekly = weeklyAllCompanies.has(norm);
    const inWeeklyPipeline = weeklyPipelineCompanies.has(norm);
    const inWeeklyJd = weeklyJdCompanies.has(norm);

    if (!inWeekly) {
      missingFromWeeklyEntirely.push({
        _id: lead._id,
        company_name: lead.company_name,
        role: lead.role || '—',
        ctc: lead.ctc || '—',
        status: lead.status || '—',
        followup_month: lead.followup_month || '—',
        tab: isJd ? 'JD Received' : 'Pipeline',
        academic_year: lead.academic_year || '2027',
      });
    } else {
      if (!isJd && !inWeeklyPipeline) {
        pipelineLeadsNotInWeeklyPipeline.push({
          _id: lead._id,
          company_name: lead.company_name,
          role: lead.role || '—',
          ctc: lead.ctc || '—',
          status: lead.status || '—',
          followup_month: lead.followup_month || '—',
          tab: 'Pipeline',
          reason: 'Present in Weekly Tracker under JD section, not Pipeline',
        });
      } else if (isJd && !inWeeklyJd) {
        jdLeadsNotInWeeklyJd.push({
          _id: lead._id,
          company_name: lead.company_name,
          role: lead.role || '—',
          ctc: lead.ctc || '—',
          status: lead.status || '—',
          pipeline_section: lead.pipeline_section || '—',
          tab: 'JD Received',
          reason: 'Present in Weekly Tracker under Pipeline section, not JD',
        });
      }
    }
  }

  console.log('======================================================');
  console.log('🚨 AUDIT FINDINGS:');
  console.log('======================================================');
  console.log(`❌ 1. Companies in Active Leads NOT in Weekly Tracker AT ALL: ${missingFromWeeklyEntirely.length}`);
  console.log(`⚠️ 2. Pipeline Leads that belong to JD section in Weekly:     ${pipelineLeadsNotInWeeklyPipeline.length}`);
  console.log(`⚠️ 3. JD Received Leads that belong to Pipeline in Weekly:   ${jdLeadsNotInWeeklyJd.length}\n`);

  // 5. Save the list of removed companies to a JSON file for backup and exact tracking
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFilePath = path.join(backupDir, `active_leads_not_in_weekly_${Date.now()}.json`);
  fs.writeFileSync(
    backupFilePath,
    JSON.stringify(
      {
        total_missing: missingFromWeeklyEntirely.length,
        missing_companies: missingFromWeeklyEntirely,
        pipeline_in_jd: pipelineLeadsNotInWeeklyPipeline,
        jd_in_pipeline: jdLeadsNotInWeeklyJd,
      },
      null,
      2
    )
  );
  console.log(`💾 Full backup of removed leads saved to: ${backupFilePath}\n`);

  // 6. Perform Soft-Deletion / Removal from Active Leads for the non-weekly companies
  if (missingFromWeeklyEntirely.length > 0) {
    const idsToRemove = missingFromWeeklyEntirely.map((l) => l._id);
    const updateRes = await ActiveLead.updateMany(
      { _id: { $in: idsToRemove } },
      { $set: { is_deleted: true, deleted_reason: 'not_in_weekly_tracker_audit' } }
    );
    console.log(`🧹 Successfully removed ${updateRes.modifiedCount} extraneous companies from Active Leads!`);
  }

  // 7. Summary of remaining Active Leads
  const remainingActiveCount = await ActiveLead.countDocuments({ is_deleted: { $ne: true } });
  const remainingPipeline = await ActiveLead.countDocuments({
    is_deleted: { $ne: true },
    $or: [
      { lead_type: { $in: ['pipeline', 'positive', 'positives'] } },
      { lead_type: { $exists: false } },
      { lead_type: null },
      { lead_type: '' },
    ],
  });
  const remainingJd = await ActiveLead.countDocuments({
    is_deleted: { $ne: true },
    lead_type: { $in: ['jd_received', 'jd'] },
  });

  console.log(`\n✅ RECONCILED ACTIVE LEADS COUNT:`);
  console.log(`🔹 Total Active Leads Remaining: ${remainingActiveCount}`);
  console.log(`   ├─ Pipeline (Positives):      ${remainingPipeline}`);
  console.log(`   └─ JD Received:               ${remainingJd}`);

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
