import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

function isValidCtc(ctc?: string | null): boolean {
  if (!ctc) return false;
  const t = ctc.trim().toLowerCase();
  if (
    !t ||
    t === '-' ||
    t === '—' ||
    t === 'null' ||
    t === 'undefined' ||
    t === 'tbd' ||
    t === 'na' ||
    t === 'n/a'
  ) {
    return false;
  }
  return true;
}

function isValidRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  if (!r || r === '—' || r === '-' || r === 'null' || r === 'undefined') return false;
  return true;
}

async function main() {
  await connectDatabase();

  console.log('\n======================================================');
  console.log('🔄 RESTORING QUALIFIED EXCEPTIONAL ACTIVE LEADS');
  console.log('======================================================\n');

  // Load the backup file
  const backupDir = path.join(__dirname, 'backups');
  const backupFiles = fs.readdirSync(backupDir).filter((f) => f.startsWith('active_leads_not_in_weekly_'));
  if (backupFiles.length === 0) {
    console.error('No backup file found!');
    process.exit(1);
  }

  // Sort by latest timestamp
  backupFiles.sort().reverse();
  const latestBackupFile = path.join(backupDir, backupFiles[0]);
  console.log(`📂 Reading backup from: ${latestBackupFile}`);

  const backupData = JSON.parse(fs.readFileSync(latestBackupFile, 'utf8'));
  const missingCompanies: any[] = backupData.missing_companies || [];

  const pipelineCandidates = missingCompanies.filter((c) => c.tab === 'Pipeline');
  const jdCandidates = missingCompanies.filter((c) => c.tab === 'JD Received');

  console.log(`Found in backup: ${pipelineCandidates.length} Pipeline leads, ${jdCandidates.length} JD Received leads.\n`);

  const pipelineRestored: any[] = [];
  const pipelineSkippedNoCtcOrRole: any[] = [];
  const jdRestored: any[] = [];

  // 1. Process Pipeline Candidates: ONLY ADD IF ROLE + CTC ARE BOTH VALID
  for (const lead of pipelineCandidates) {
    const hasCtc = isValidCtc(lead.ctc);
    const hasRole = isValidRole(lead.role);

    if (hasCtc && hasRole) {
      await ActiveLead.updateOne(
        { _id: lead._id },
        {
          $set: {
            is_deleted: false,
            lead_type: 'pipeline',
            deleted_reason: undefined,
          },
        }
      );
      pipelineRestored.push(lead);
    } else {
      pipelineSkippedNoCtcOrRole.push(lead);
    }
  }

  // 2. Process JD Received Candidates: RESTORE ALL 6
  for (const lead of jdCandidates) {
    await ActiveLead.updateOne(
      { _id: lead._id },
      {
        $set: {
          is_deleted: false,
          lead_type: 'jd_received',
          pipeline_section: lead.pipeline_section || 'in_progress',
          deleted_reason: undefined,
        },
      }
    );
    jdRestored.push(lead);
  }

  console.log('======================================================');
  console.log('📊 RESTORATION RESULTS:');
  console.log('======================================================');
  console.log(`✅ 1. Pipeline Companies RESTORED (Valid Role + CTC): ${pipelineRestored.length}`);
  pipelineRestored.forEach((c, idx) => {
    console.log(`   ${idx + 1}. ${c.company_name} | Role: ${c.role} | CTC: ${c.ctc}`);
  });

  console.log(`\n❌ 2. Pipeline Companies SKIPPED (No CTC): ${pipelineSkippedNoCtcOrRole.length}`);
  pipelineSkippedNoCtcOrRole.forEach((c, idx) => {
    console.log(`   ${idx + 1}. ${c.company_name} | Role: ${c.role || '—'} | CTC: ${c.ctc || '—'}`);
  });

  console.log(`\n✅ 3. JD Received Companies RESTORED (All 6): ${jdRestored.length}`);
  jdRestored.forEach((c, idx) => {
    console.log(`   ${idx + 1}. ${c.company_name} | Role: ${c.role} | CTC: ${c.ctc}`);
  });

  // 3. Final Reconciled Count
  const finalTotalActive = await ActiveLead.countDocuments({ is_deleted: { $ne: true } });
  const finalPipeline = await ActiveLead.countDocuments({
    is_deleted: { $ne: true },
    $or: [
      { lead_type: { $in: ['pipeline', 'positive', 'positives'] } },
      { lead_type: { $exists: false } },
      { lead_type: null },
      { lead_type: '' },
    ],
  });
  const finalJd = await ActiveLead.countDocuments({
    is_deleted: { $ne: true },
    lead_type: { $in: ['jd_received', 'jd'] },
  });

  console.log('\n======================================================');
  console.log('🏁 FINAL RECONCILED ACTIVE LEADS TOTALS:');
  console.log('======================================================');
  console.log(`🔹 Total Active Leads in Directory: ${finalTotalActive}`);
  console.log(`   ├─ Pipeline (Positives) Tab:     ${finalPipeline}`);
  console.log(`   └─ JD Received Tab:              ${finalJd}`);
  console.log('======================================================\n');

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Restoration failed:', err);
  process.exit(1);
});
