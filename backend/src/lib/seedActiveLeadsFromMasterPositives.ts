import { Types } from 'mongoose';
import { ActiveLead } from '../models/ActiveLead';
import { College } from '../models/College';
import { User } from '../models/User';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { MASTER_POSITIVES_DATA, COLLEGE_META_MAP } from './seedMasterDailyLeads';
import { MASTER_JD_RECEIVED_DATA } from './seedAugustAllCollegesJdReceived';

export function isValidCtc(ctc?: string | null): boolean {
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

export function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Seeds unique companies from Weekly Tracker and Master Positives into Active Leads Management:
 * 1. Pipeline leads MUST have verified CTC (companies without CTC are omitted).
 * 2. Cross-tab deduplication: no duplicate companies across Pipeline and JD Received tabs.
 * 3. Processing order: Pipeline companies first, then JD Received companies.
 */
export async function seedActiveLeadsFromMasterPositives() {
  try {
    console.log('🌱 [Seed Active Leads] Seeding Pipeline (with CTC) & JD Received Active Leads...');

    // 1. Resolve default coordinator
    const defaultCoordinator =
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
      (await User.findOne({ is_deleted: { $ne: true } })) ||
      (await User.findOne({}));

    const coordinatorId = defaultCoordinator ? defaultCoordinator._id : new Types.ObjectId();

    // 2. Resolve / Cache Colleges
    const collegeIdMap = new Map<string, Types.ObjectId>();
    for (const [code, meta] of Object.entries(COLLEGE_META_MAP)) {
      const college = await College.findOne({
        $or: [
          { college_code: code },
          { college_code: { $in: meta.aliases } },
          { college_name: meta.name },
        ],
      });
      if (college) {
        collegeIdMap.set(code, college._id as Types.ObjectId);
        for (const alias of meta.aliases) {
          collegeIdMap.set(alias, college._id as Types.ObjectId);
        }
      }
    }

    // 3. Clear ALL older active leads
    await ActiveLead.deleteMany({});
    console.log('🗑️  Cleared all old Active Leads.');

    // 4. Map for Pipeline Active Companies (MUST HAVE CTC)
    const pipelineMap = new Map<string, {
      company_name: string;
      role: string;
      ctc: string;
      collegeCode: string;
      batch: string;
      pipeline_section: string;
      collegeId?: any;
      coordinatorId?: any;
    }>();

    // Pull from Weekly Tracker Pipeline first (as Weekly Tracker contains verified CTC data)
    const weeklyEntries = await WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();

    for (const w of weeklyEntries) {
      if (!w.company_name || !w.company_name.trim()) continue;
      const rawName = w.company_name.trim();
      const normKey = normalizeKey(rawName);
      const sec = (w.pipeline_section || '').toLowerCase();

      if (sec === 'pipeline') {
        if (!isValidCtc(w.ctc_lpa)) continue; // Strictly skip companies without CTC in pipeline

        if (!pipelineMap.has(normKey)) {
          pipelineMap.set(normKey, {
            company_name: rawName,
            role: w.job_role?.trim() || 'Graduate Trainee',
            ctc: w.ctc_lpa?.trim() || '',
            collegeCode: '',
            batch: w.eligible_batch?.trim() || '2027',
            pipeline_section: 'pipeline',
            collegeId: w.college_id || null,
            coordinatorId: w.coordinator_id || coordinatorId,
          });
        } else {
          const existing = pipelineMap.get(normKey)!;
          if (w.ctc_lpa && w.ctc_lpa.length > existing.ctc.length) existing.ctc = w.ctc_lpa.trim();
          if (w.job_role && w.job_role.length > existing.role.length) existing.role = w.job_role.trim();
        }
      }
    }

    // Complement with Master Positives if valid CTC exists
    for (const item of MASTER_POSITIVES_DATA) {
      const rawName = item.company?.trim();
      if (!rawName) continue;
      if (!isValidCtc(item.ctc)) continue; // Strictly skip if no CTC

      const normKey = normalizeKey(rawName);
      if (!pipelineMap.has(normKey)) {
        pipelineMap.set(normKey, {
          company_name: rawName,
          role: item.role?.trim() || 'Graduate Trainee',
          ctc: item.ctc?.trim() || '',
          collegeCode: (item.collegeCode || '').trim(),
          batch: item.batch?.trim() || '2027',
          pipeline_section: 'pipeline',
          coordinatorId,
        });
      } else {
        const existing = pipelineMap.get(normKey)!;
        if (item.ctc && item.ctc.length > existing.ctc.length) existing.ctc = item.ctc.trim();
        if (item.role && item.role.length > existing.role.length) existing.role = item.role.trim();
      }
    }

    // 5. Map for JD Received Active Companies (Skipping any company already in Pipeline)
    const jdReceivedMap = new Map<string, {
      company_name: string;
      role: string;
      ctc: string;
      collegeCode: string;
      batch: string;
      pipeline_section: string;
      collegeId?: any;
      coordinatorId?: any;
    }>();

    // From Weekly Tracker JD sections
    for (const w of weeklyEntries) {
      if (!w.company_name || !w.company_name.trim()) continue;
      const rawName = w.company_name.trim();
      const normKey = normalizeKey(rawName);
      const sec = (w.pipeline_section || '').toLowerCase();

      const isJdSec = ['in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed'].includes(sec);
      if (!isJdSec) continue;

      // Avoid duplicating any company that already exists in Pipeline
      if (pipelineMap.has(normKey)) continue;

      let mappedSec = 'in_progress';
      if (sec === 'completed' || sec === 'companies_completed') mappedSec = 'completed';
      else if (sec === 'drive_in_progress') mappedSec = 'drive_in_progress';
      else if (sec.includes('drive') || sec.includes('upcoming')) mappedSec = 'upcoming_drive';
      else mappedSec = 'in_progress';

      if (!jdReceivedMap.has(normKey)) {
        jdReceivedMap.set(normKey, {
          company_name: rawName,
          role: w.job_role?.trim() || 'Graduate Engineer Trainee',
          ctc: w.ctc_lpa?.trim() || '',
          collegeCode: '',
          batch: w.eligible_batch?.trim() || '2027',
          pipeline_section: mappedSec,
          collegeId: w.college_id || null,
          coordinatorId: w.coordinator_id || coordinatorId,
        });
      } else {
        const existing = jdReceivedMap.get(normKey)!;
        existing.pipeline_section = mappedSec;
        if (w.ctc_lpa && w.ctc_lpa.length > existing.ctc.length) existing.ctc = w.ctc_lpa.trim();
        if (w.job_role && w.job_role.length > existing.role.length) existing.role = w.job_role.trim();
      }
    }

    // Complement with Master JD Received dataset if not already in Pipeline or JD
    for (const item of MASTER_JD_RECEIVED_DATA) {
      const rawName = item.company?.trim();
      if (!rawName) continue;
      const normKey = normalizeKey(rawName);

      if (pipelineMap.has(normKey)) continue;

      if (!jdReceivedMap.has(normKey)) {
        jdReceivedMap.set(normKey, {
          company_name: rawName,
          role: item.role?.trim() || 'Graduate Engineer Trainee',
          ctc: item.ctc?.trim() || '',
          collegeCode: (item.collegeCode || '').trim(),
          batch: item.batch?.trim() || '2027',
          pipeline_section: 'in_progress',
          coordinatorId,
        });
      } else {
        const existing = jdReceivedMap.get(normKey)!;
        if (item.ctc && item.ctc.length > existing.ctc.length) existing.ctc = item.ctc.trim();
        if (item.role && item.role.length > existing.role.length) existing.role = item.role.trim();
      }
    }

    // 6. Build bulk insertion documents
    const activeLeadsToInsert: any[] = [];

    // Add Pipeline Active Leads (All with verified CTC)
    for (const [, entry] of pipelineMap.entries()) {
      const collegeId = entry.collegeId || (entry.collegeCode ? collegeIdMap.get(entry.collegeCode.toUpperCase()) : null) || null;
      activeLeadsToInsert.push({
        company_name: entry.company_name,
        role: entry.role,
        ctc: entry.ctc,
        lead_type: 'pipeline',
        pipeline_section: 'pipeline',
        status: '',
        followup_month: '',
        academic_year: entry.batch || '2027',
        coordinator_id: entry.coordinatorId || coordinatorId,
        college_id: collegeId,
        is_deleted: false,
      });
    }

    // Add JD Received Active Leads
    for (const [, entry] of jdReceivedMap.entries()) {
      const collegeId = entry.collegeId || (entry.collegeCode ? collegeIdMap.get(entry.collegeCode.toUpperCase()) : null) || null;
      activeLeadsToInsert.push({
        company_name: entry.company_name,
        role: entry.role,
        ctc: entry.ctc,
        lead_type: 'jd_received',
        pipeline_section: entry.pipeline_section || 'in_progress',
        status: '',
        followup_month: '',
        academic_year: entry.batch || '2027',
        coordinator_id: entry.coordinatorId || coordinatorId,
        college_id: collegeId,
        is_deleted: false,
      });
    }

    if (activeLeadsToInsert.length > 0) {
      await ActiveLead.insertMany(activeLeadsToInsert);
      console.log(`✅ [Seed Active Leads] Successfully loaded ${activeLeadsToInsert.length} active leads (${pipelineMap.size} in Pipeline, ${jdReceivedMap.size} in JD Received)!`);
    }

    return {
      success: true,
      total_count: activeLeadsToInsert.length,
      pipeline_count: pipelineMap.size,
      jd_received_count: jdReceivedMap.size,
    };
  } catch (error) {
    console.error('❌ [Seed Active Leads] Error:', error);
    throw error;
  }
}

if (require.main === module) {
  const { connectDatabase } = require('../config/database');
  connectDatabase().then(async () => {
    await seedActiveLeadsFromMasterPositives();
    process.exit(0);
  });
}
