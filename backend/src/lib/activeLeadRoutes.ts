import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import ExcelJS from 'exceljs';
import { ActiveLead, IActiveLead, ACTIVE_LEAD_STATUSES, ACADEMIC_YEARS, FOLLOWUP_MONTHS, ActiveLeadStatus } from '../models/ActiveLead';
import { DailyTracker } from '../models/DailyTracker';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { authenticateJWT } from './authMiddleware';
import { seedActiveLeadsFromMasterPositives } from './seedActiveLeadsFromMasterPositives';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Automatically create or update an Active Lead when a call is logged in Daily Tracker.
 */
export async function syncLeadFromDailyTracker(data: {
  company_name: string;
  call_outcome: string;
  remarks?: string;
  coordinator_id?: any;
  college_id?: any;
  daily_tracker_id?: any;
  academic_year?: string;
}) {
  try {
    if (!data.company_name) return null;
    const normalizedCompany = data.company_name.trim();
    if (!normalizedCompany) return null;

    const outcome = (data.call_outcome || '').toLowerCase();
    let status: ActiveLeadStatus | null = null;
    let followupMonth = '';

    if (
      outcome.includes('invite') ||
      outcome.includes('mail') ||
      outcome.includes('email') ||
      outcome === 'in_connect'
    ) {
      status = 'Invite Email';
    } else if (
      outcome.includes('hiring') ||
      outcome.includes('jd') ||
      outcome.includes('positive') ||
      outcome.includes('interested') ||
      outcome.includes('drive_completed')
    ) {
      status = 'Hiring';
    } else if (
      outcome.includes('follow') ||
      outcome.includes('call back') ||
      outcome.includes('reschedule') ||
      outcome.includes('later')
    ) {
      status = 'Follow Up';
      followupMonth = '';
    }

    if (!status) return null;

    const year = (data.academic_year as any) || '2027';

    // Find existing lead or upsert (with safe regex escaping)
    const existing = await ActiveLead.findOne({
      company_name: { $regex: new RegExp(`^${escapeRegex(normalizedCompany)}$`, 'i') },
      academic_year: year,
      is_deleted: false,
    });

    if (existing) {
      existing.status = status;
      if (status === 'Follow Up' && followupMonth && !existing.followup_month) {
        existing.followup_month = followupMonth as any;
      }
      if (data.daily_tracker_id) existing.daily_tracker_id = data.daily_tracker_id;
      if (data.coordinator_id && !existing.coordinator_id) existing.coordinator_id = data.coordinator_id;
      if (data.college_id && !existing.college_id) existing.college_id = data.college_id;
      await existing.save();
      return existing;
    }

    const newLead = await ActiveLead.create({
      company_name: normalizedCompany,
      role: 'Graduate Trainee',
      ctc: '',
      status,
      followup_month: followupMonth || '',
      academic_year: year,
      coordinator_id: data.coordinator_id || null,
      college_id: data.college_id || null,
      daily_tracker_id: data.daily_tracker_id || null,
    });

    return newLead;
  } catch (err) {
    console.error('syncLeadFromDailyTracker error:', err);
    return null;
  }
}

export function registerActiveLeadRoutes(app: Express) {
  // One-time auto-reset: Convert any previously defaulted seed leads to '' so they show 'Select Status' placeholder
  ActiveLead.updateMany(
    { status: 'Hiring', daily_tracker_id: { $exists: false } },
    { $set: { status: '' } }
  ).catch(() => {});

  // Migrate existing 2026 leads to 2027 batch (2026 graduation completed, 2027 is active batch till Dec 2026)
  ActiveLead.updateMany(
    { $or: [{ academic_year: '2026' }, { academic_year: { $exists: false } }, { academic_year: '' }, { academic_year: null }] },
    { $set: { academic_year: '2027' } }
  ).catch(() => {});

  // ── 1. GET /api/v1/active-leads (List with stats & search) ─────────────────
  app.get('/api/v1/active-leads', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const jdCount = await ActiveLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });
      const totalCount = await ActiveLead.countDocuments({ is_deleted: false });
      if (totalCount === 0 || jdCount === 0) {
        await seedActiveLeadsFromMasterPositives();
      }

      const {
        academic_year,
        lead_type,
        pipeline_section,
        status,
        followup_month,
        search,
        college_id,
        sort = 'desc',
      } = req.query;

      const filter: Record<string, any> = { is_deleted: { $ne: true } };

      if (lead_type && lead_type !== 'all') {
        const lt = String(lead_type).toLowerCase().trim();
        if (lt === 'pipeline' || lt === 'positive' || lt === 'positives') {
          filter.$or = [
            { lead_type: { $in: ['pipeline', 'positive', 'positives', 'Pipeline', 'Positive', 'Positives'] } },
            { lead_type: { $exists: false } },
            { lead_type: null },
            { lead_type: '' },
          ];
        } else if (lt === 'jd_received' || lt === 'jd' || lt === 'jd_Received' || lt === 'jd received') {
          filter.lead_type = { $in: ['jd_received', 'jd', 'JD_RECEIVED', 'JD', 'jd_Received', 'JD Received', 'jd received'] };
        } else {
          filter.lead_type = String(lead_type);
        }
      }
      if (pipeline_section && pipeline_section !== 'all') {
        if (pipeline_section === 'in_drive' || pipeline_section === 'upcoming_drive') {
          filter.pipeline_section = { $in: ['companies_in_drive', 'in_drive', 'upcoming_drive'] };
        } else if (pipeline_section === 'in_progress') {
          filter.pipeline_section = { $in: ['in_progress', 'companies_in_progress'] };
        } else if (pipeline_section === 'completed') {
          filter.pipeline_section = { $in: ['completed', 'companies_completed'] };
        } else if (pipeline_section === 'drive_in_progress') {
          filter.pipeline_section = 'drive_in_progress';
        } else {
          filter.pipeline_section = String(pipeline_section);
        }
      }
      if (academic_year && academic_year !== 'all') {
        filter.academic_year = { $regex: escapeRegex(String(academic_year)), $options: 'i' };
      }
      if (status && status !== 'all') {
        filter.status = String(status);
      }
      if (followup_month && followup_month !== 'all') {
        filter.followup_month = String(followup_month);
      }
      if (college_id && college_id !== 'all') {
        filter.college_id = new Types.ObjectId(String(college_id));
      }
      if (search && typeof search === 'string' && search.trim()) {
        const q = escapeRegex(search.trim());
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { company_name: { $regex: q, $options: 'i' } },
            { role: { $regex: q, $options: 'i' } },
            { ctc: { $regex: q, $options: 'i' } },
          ],
        });
      }

      const leads = await ActiveLead.find(filter)
        .sort({ created_at: sort === 'asc' ? 1 : -1 })
        .populate('coordinator_id', 'full_name email')
        .populate('college_id', 'college_name college_code')
        .lean();

      // Compute statistics across the entire dataset (scoped by academic_year if selected)
      const baseFilter: Record<string, any> = { is_deleted: { $ne: true } };
      if (academic_year && academic_year !== 'all') {
        baseFilter.academic_year = { $regex: escapeRegex(String(academic_year)), $options: 'i' };
      }

      const [pipelineTotal, jdReceivedTotal, overallTotal] = await Promise.all([
        ActiveLead.countDocuments({
          ...baseFilter,
          $or: [
            { lead_type: { $in: ['pipeline', 'positive', 'positives', 'Pipeline', 'Positive', 'Positives'] } },
            { lead_type: { $exists: false } },
            { lead_type: null },
            { lead_type: '' },
          ],
        }),
        ActiveLead.countDocuments({
          ...baseFilter,
          lead_type: { $in: ['jd_received', 'jd', 'JD_RECEIVED', 'JD', 'jd_Received', 'JD Received', 'jd received'] },
        }),
        ActiveLead.countDocuments(baseFilter),
      ]);

      const allStats = await ActiveLead.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: { lead_type: '$lead_type', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]);

      // Calculate 4 JD Received stage counts
      const jdSectionAgg = await ActiveLead.aggregate([
        {
          $match: {
            ...baseFilter,
            lead_type: { $in: ['jd_received', 'jd', 'JD_RECEIVED', 'JD', 'jd_Received', 'JD Received', 'jd received'] },
          },
        },
        {
          $group: {
            _id: '$pipeline_section',
            count: { $sum: 1 },
          },
        },
      ]);

      const jd_section_counts = {
        all: 0,
        in_progress: 0,
        upcoming_drive: 0,
        drive_in_progress: 0,
        completed: 0,
      };

      jdSectionAgg.forEach((item) => {
        const sec = item._id || 'in_progress';
        const count = item.count;
        jd_section_counts.all += count;
        if (sec === 'in_progress' || sec === 'companies_in_progress') {
          jd_section_counts.in_progress += count;
        } else if (sec === 'companies_in_drive' || sec === 'in_drive' || sec === 'upcoming_drive') {
          jd_section_counts.upcoming_drive += count;
        } else if (sec === 'drive_in_progress') {
          jd_section_counts.drive_in_progress += count;
        } else if (sec === 'completed' || sec === 'companies_completed') {
          jd_section_counts.completed += count;
        } else {
          jd_section_counts.in_progress += count;
        }
      });

      const pipeline_stats = { total: pipelineTotal, hiring: 0, invite_email: 0, follow_up: 0 };
      const jd_received_stats = { total: jdReceivedTotal, hiring: 0, invite_email: 0, follow_up: 0 };
      const overall_stats = { total: overallTotal, hiring: 0, invite_email: 0, follow_up: 0 };

      allStats.forEach((item) => {
        const rawType = String(item._id?.lead_type || '').toLowerCase().trim();
        const type = (rawType === 'jd_received' || rawType === 'jd') ? 'jd_received' : 'pipeline';
        const st = String(item._id?.status || '').trim();
        const count = item.count;

        if (st.toLowerCase() === 'hiring') overall_stats.hiring += count;
        if (st.toLowerCase().includes('invite') || st.toLowerCase() === 'not hiring') overall_stats.invite_email += count;
        if (st.toLowerCase().includes('follow')) overall_stats.follow_up += count;

        if (type === 'pipeline') {
          if (st.toLowerCase() === 'hiring') pipeline_stats.hiring += count;
          if (st.toLowerCase().includes('invite') || st.toLowerCase() === 'not hiring') pipeline_stats.invite_email += count;
          if (st.toLowerCase().includes('follow')) pipeline_stats.follow_up += count;
        } else if (type === 'jd_received') {
          if (st.toLowerCase() === 'hiring') jd_received_stats.hiring += count;
          if (st.toLowerCase().includes('invite') || st.toLowerCase() === 'not hiring') jd_received_stats.invite_email += count;
          if (st.toLowerCase().includes('follow')) jd_received_stats.follow_up += count;
        }
      });

      // Active stats to return depending on current tab
      const currentStats =
        lead_type === 'pipeline'
          ? pipeline_stats
          : lead_type === 'jd_received'
          ? jd_received_stats
          : overall_stats;

      return res.json({
        success: true,
        data: {
          leads,
          stats: currentStats,
          pipeline_stats,
          jd_received_stats,
          jd_section_counts,
          overall_stats,
          tab_counts: {
            pipeline: pipelineTotal,
            jd_received: jdReceivedTotal,
            all: overallTotal,
          },
          total_count: leads.length,
        },
      });
    } catch (err: any) {
      console.error('GET /active-leads error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to fetch active leads' } });
    }
  });

  // ── Reseed Active Leads from Master Positives & Tracker ────────────
  app.post('/api/v1/active-leads/reseed', authenticateJWT, async (_req: Request, res: Response) => {
    try {
      await seedActiveLeadsFromMasterPositives();
      return res.json({ success: true, message: 'Active Leads reseeded successfully with pipeline sections!' });
    } catch (err: any) {
      console.error('POST /active-leads/reseed error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to reseed active leads' } });
    }
  });

  // ── Sync from Weekly Tracker (Pipeline with CTC & JD Received Sections) ──
  app.post('/api/v1/active-leads/sync', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { check_only = false, resolutions } = req.body || {};

      // 1. Fetch all non-deleted Weekly Tracker rows
      const allWeekly = await WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();

      // 2. Fetch current Active Leads
      const allActive = await ActiveLead.find({ is_deleted: false });
      const activeMap = new Map<string, typeof allActive[0]>();
      for (const a of allActive) {
        if (a.company_name) {
          activeMap.set(normalizeKey(a.company_name), a);
        }
      }

      // Group weekly records by normalized company name
      const weeklyByCompany = new Map<string, typeof allWeekly>();
      for (const w of allWeekly) {
        if (!w.company_name || !w.company_name.trim()) continue;
        const norm = normalizeKey(w.company_name);
        if (!weeklyByCompany.has(norm)) weeklyByCompany.set(norm, []);
        weeklyByCompany.get(norm)!.push(w);
      }

      // Detect Conflicts (multiple distinct roles for the same company)
      const conflicts: any[] = [];
      for (const [normKey, rows] of weeklyByCompany.entries()) {
        const rawName = rows[0].company_name.trim();
        const existingLead = activeMap.get(normKey);

        // A company only needs the user's attention when the Weekly Tracker has a role that the Active
        // Lead row does not already contain. Once roles are merged into the row they stay merged, so
        // asking again on every sync (the old behaviour: "more than one role" = conflict) was noise.
        const normRole = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
        const rolesSet = new Set<string>();
        const existingRoleKeys = new Set<string>();
        const weeklyRoleKeys = new Set<string>();
        if (existingLead?.role && existingLead.role !== 'Graduate Trainee') {
          existingLead.role.split(/[,;/]+/).map((r) => r.trim()).filter(Boolean).forEach((r) => {
            rolesSet.add(r);
            existingRoleKeys.add(normRole(r));
          });
        }

        let hasValidCtcRow = false;
        let bestCtc = existingLead?.ctc || '';
        let leadType: 'pipeline' | 'jd_received' = 'pipeline';
        let section = 'pipeline';

        for (const r of rows) {
          const sec = (r.pipeline_section || '').toLowerCase();
          const isJd = ['in_progress', 'companies_in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed', 'companies_completed'].includes(sec);
          if (isJd) {
            leadType = 'jd_received';
            if (sec === 'completed' || sec === 'companies_completed') section = 'completed';
            else if (sec === 'drive_in_progress') section = 'drive_in_progress';
            else if (sec.includes('drive') || sec.includes('upcoming')) section = 'upcoming_drive';
            else section = 'in_progress';
          }

          if (isValidCtc(r.ctc_lpa) && r.ctc_lpa) {
            hasValidCtcRow = true;
            if (!bestCtc || isValidCtc(r.ctc_lpa)) bestCtc = r.ctc_lpa.trim();
          }

          if (r.job_role && r.job_role.trim()) {
            r.job_role.split(/[,;/]+/).map((str) => str.trim()).filter(Boolean).forEach((str) => {
              rolesSet.add(str);
              weeklyRoleKeys.add(normRole(str));
            });
          }
        }

        // Only consider if eligible (Pipeline must have CTC or JD Received)
        if (leadType === 'pipeline' && !hasValidCtcRow && !isValidCtc(existingLead?.ctc)) {
          continue;
        }

        const hasNewRole = !existingLead || Array.from(weeklyRoleKeys).some((k) => !existingRoleKeys.has(k));
        if (rolesSet.size > 1 && hasNewRole) {
          const distinctRoles = Array.from(rolesSet);
          conflicts.push({
            company_name: rawName,
            lead_id: existingLead?._id,
            existing_role: existingLead?.role || '',
            existing_ctc: existingLead?.ctc || '',
            weekly_roles: distinctRoles,
            suggested_merged_role: distinctRoles.join(', '),
            lead_type: leadType,
            pipeline_section: section,
            ctc: bestCtc,
          });
        }
      }

      // If check_only is requested OR we have conflicts and no user resolutions provided yet
      if (check_only || (conflicts.length > 0 && (!resolutions || Object.keys(resolutions).length === 0))) {
        return res.json({
          success: true,
          has_conflicts: conflicts.length > 0,
          conflicts,
          count: conflicts.length,
          data: {
            has_conflicts: conflicts.length > 0,
            conflicts,
            count: conflicts.length,
          },
          message: conflicts.length > 0
            ? `Found ${conflicts.length} company records with multiple roles. Review and resolve in the modal.`
            : 'No duplicate role conflicts detected. Ready to sync.',
        });
      }

      // Apply Resolutions and Synchronize cleanly
      const appliedResolutions = resolutions || {};
      let updatedConflictCount = 0;
      let newlyAddedCount = 0;

      for (const [normKey, rows] of weeklyByCompany.entries()) {
        const rawName = rows[0].company_name.trim();
        let existingLead = activeMap.get(normKey);

        let leadType: 'pipeline' | 'jd_received' = 'pipeline';
        let section = 'pipeline';
        let bestCtc = existingLead?.ctc || '';

        for (const r of rows) {
          const sec = (r.pipeline_section || '').toLowerCase();
          const isJd = ['in_progress', 'companies_in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed', 'companies_completed'].includes(sec);
          if (isJd) {
            leadType = 'jd_received';
            if (sec === 'completed' || sec === 'companies_completed') section = 'completed';
            else if (sec === 'drive_in_progress') section = 'drive_in_progress';
            else if (sec.includes('drive') || sec.includes('upcoming')) section = 'upcoming_drive';
            else section = 'in_progress';
          }
          if (isValidCtc(r.ctc_lpa) && r.ctc_lpa) bestCtc = r.ctc_lpa.trim();
        }

        // Pipeline leads MUST have verified CTC
        if (leadType === 'pipeline' && !isValidCtc(bestCtc)) {
          continue;
        }

        // Determine final role
        let finalRole = rows[0].job_role?.trim() || 'Graduate Trainee';
        const resolution = appliedResolutions[rawName] || appliedResolutions[normKey];

        if (resolution && resolution.chosen_role) {
          finalRole = resolution.chosen_role.trim();
          if (resolution.chosen_ctc) bestCtc = resolution.chosen_ctc.trim();
        } else if (existingLead?.role && existingLead.role !== 'Graduate Trainee') {
          finalRole = existingLead.role;
        }

        if (existingLead) {
          existingLead.role = finalRole;
          if (isValidCtc(bestCtc)) existingLead.ctc = bestCtc;
          existingLead.lead_type = leadType;
          existingLead.pipeline_section = section;
          existingLead.is_deleted = false;
          await existingLead.save();
          updatedConflictCount++;
        } else {
          const newLead = await ActiveLead.create({
            company_name: rawName,
            role: finalRole,
            ctc: bestCtc,
            lead_type: leadType,
            pipeline_section: section,
            status: '',
            followup_month: '',
            academic_year: rows[0].eligible_batch?.trim() || '2027',
            college_id: rows[0].college_id || null,
            coordinator_id: rows[0].coordinator_id || null,
            is_deleted: false,
          });
          activeMap.set(normKey, newLead);
          newlyAddedCount++;
        }
      }

      const totalActiveLeads = await ActiveLead.countDocuments({ is_deleted: false });

      return res.json({
        success: true,
        has_conflicts: false,
        data: {
          total_active_leads: totalActiveLeads,
          updated_records: updatedConflictCount,
          newly_added: newlyAddedCount,
        },
        message: `Active Leads successfully synchronized from Weekly Tracker (${newlyAddedCount} added, ${updatedConflictCount} updated).`,
      });
    } catch (err: any) {
      console.error('POST /active-leads/sync error:', err);
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to sync leads from Weekly Tracker' },
      });
    }
  });

  // ── Reseed & Classify All Sections (Pipeline & JD Received) ──────────────
  app.post('/api/v1/active-leads/reseed', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const result = await seedActiveLeadsFromMasterPositives();
      return res.json({
        success: true,
        data: result,
        message: 'Successfully reseeded and classified all Active Leads into Pipeline and JD Received sections',
      });
    } catch (err: any) {
      console.error('POST /active-leads/reseed error:', err);
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to reseed active leads' },
      });
    }
  });

  // ── 2. POST /api/v1/active-leads (Create Lead) ───────────────────────────
  app.post('/api/v1/active-leads', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const {
        company_name,
        role = 'Graduate Trainee',
        ctc = '',
        lead_type = 'pipeline',
        pipeline_section = 'pipeline',
        status = 'Hiring',
        followup_month = '',
        academic_year = '2027',
        college_id,
      } = req.body;

      if (!company_name || !company_name.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Company Name is required' } });
      }
      if (status && !ACTIVE_LEAD_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
      }

      const authUser = (req as any).user;
      const coordinatorId = authUser?.userId ? new Types.ObjectId(authUser.userId) : null;

      const lead = await ActiveLead.create({
        company_name: company_name.trim(),
        role: role.trim() || 'Graduate Trainee',
        ctc: ctc ? ctc.trim() : '',
        lead_type: lead_type === 'jd_received' ? 'jd_received' : 'pipeline',
        pipeline_section: pipeline_section || (lead_type === 'jd_received' ? 'in_progress' : 'pipeline'),
        status: status || '',
        followup_month: followup_month || '',
        academic_year: (req.body.academic_year as any) || '2027',
        coordinator_id: coordinatorId,
        college_id: college_id ? new Types.ObjectId(college_id) : null,
      });

      return res.status(201).json({
        success: true,
        data: { lead },
        message: 'Active lead added successfully',
      });
    } catch (err: any) {
      console.error('POST /active-leads error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to create active lead' } });
    }
  });

  // ── 3. POST /api/v1/active-leads/bulk (Bulk Paste & Create) ──────────────
  app.post('/api/v1/active-leads/bulk', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { lines, academic_year = '2027', default_status = 'Hiring', lead_type = 'pipeline' } = req.body;

      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'No lines provided for bulk import' } });
      }

      const authUser = (req as any).user;
      const coordinatorId = authUser?.userId ? new Types.ObjectId(authUser.userId) : null;

      const createdLeads: IActiveLead[] = [];

      for (const line of lines) {
        const trimmed = typeof line === 'string' ? line.trim() : '';
        if (!trimmed) continue;

        // Parse format: Company Name, Role, CTC, Status, Followup Month
        // or tab-separated / comma-separated / plain company name
        const parts = trimmed.includes('\t')
          ? trimmed.split('\t').map((p) => p.trim())
          : trimmed.split(',').map((p) => p.trim());

        const companyName = parts[0] || '';
        if (!companyName) continue;

        const role = parts[1] || 'Graduate Trainee';
        const ctc = parts[2] || '';
        let status = parts[3] || default_status;
        if (!ACTIVE_LEAD_STATUSES.includes(status as any)) {
          status = default_status;
        }
        const followupMonth = parts[4] ? parts[4].trim() : '';

        const lead = await ActiveLead.create({
          company_name: companyName,
          role,
          ctc,
          lead_type: lead_type === 'jd_received' ? 'jd_received' : 'pipeline',
          pipeline_section: lead_type === 'jd_received' ? 'in_progress' : 'pipeline',
          status,
          followup_month: followupMonth,
          academic_year,
          coordinator_id: coordinatorId,
        });

        createdLeads.push(lead);
      }

      return res.status(201).json({
        success: true,
        data: { created_count: createdLeads.length, leads: createdLeads },
        message: `Successfully imported ${createdLeads.length} active leads`,
      });
    } catch (err: any) {
      console.error('POST /active-leads/bulk error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to bulk import leads' } });
    }
  });

  // ── 4. PUT /api/v1/active-leads/:id (Update & Auto-save) ──────────────────
  app.put('/api/v1/active-leads/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid lead ID' } });
      }

      const { company_name, role, ctc, lead_type, pipeline_section, status, followup_month, academic_year } = req.body;

      const lead = await ActiveLead.findById(id);
      if (!lead || lead.is_deleted) {
        return res.status(404).json({ success: false, error: { message: 'Active lead not found' } });
      }

      if (company_name !== undefined) lead.company_name = company_name.trim();
      if (role !== undefined) lead.role = role.trim();
      if (ctc !== undefined) lead.ctc = ctc.trim();
      if (lead_type !== undefined) lead.lead_type = lead_type;
      if (pipeline_section !== undefined) lead.pipeline_section = pipeline_section;
      if (status !== undefined) {
        if (status && !ACTIVE_LEAD_STATUSES.includes(status)) {
          return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
        }
        lead.status = status || '';
      }
      if (followup_month !== undefined) {
        lead.followup_month = followup_month || '';
      }
      if (academic_year !== undefined) {
        lead.academic_year = academic_year || '2027';
      }

      await lead.save();

      return res.json({
        success: true,
        data: { lead },
        message: 'Active lead updated successfully',
      });
    } catch (err: any) {
      console.error('PUT /active-leads/:id error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to update active lead' } });
    }
  });

  // ── 5. DELETE /api/v1/active-leads/:id (Single Soft Delete) ──────────────
  app.delete('/api/v1/active-leads/:id', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid lead ID' } });
      }

      const lead = await ActiveLead.findById(id);
      if (!lead) {
        return res.status(404).json({ success: false, error: { message: 'Active lead not found' } });
      }

      lead.is_deleted = true;
      lead.deleted_at = new Date();
      await lead.save();

      return res.json({
        success: true,
        data: { id: lead._id },
        message: 'Active lead removed successfully',
      });
    } catch (err: any) {
      console.error('DELETE /active-leads/:id error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to delete active lead' } });
    }
  });

  // ── 5.1 POST /api/v1/active-leads/bulk-delete (Bulk Soft Delete) ──────────
  app.post('/api/v1/active-leads/bulk-delete', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'IDs array is required' } });
      }

      const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'No valid lead IDs provided' } });
      }

      const result = await ActiveLead.updateMany(
        { _id: { $in: validIds }, is_deleted: false },
        { $set: { is_deleted: true, deleted_at: new Date() } }
      );

      return res.json({
        success: true,
        data: { deletedCount: result.modifiedCount },
        message: `${result.modifiedCount} active lead(s) removed successfully`,
      });
    } catch (err: any) {
      console.error('POST /active-leads/bulk-delete error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to bulk delete active leads' } });
    }
  });

  // ── 6. GET /api/v1/active-leads/export (ExcelJS Spreadsheet Download) ────
  app.get('/api/v1/active-leads/export', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { academic_year, status, followup_month, search } = req.query;

      const filter: Record<string, any> = { is_deleted: false };
      if (academic_year && academic_year !== 'all') filter.academic_year = String(academic_year);
      if (status && status !== 'all') filter.status = String(status);
      if (followup_month && followup_month !== 'all') filter.followup_month = String(followup_month);
      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim();
        filter.$or = [
          { company_name: { $regex: q, $options: 'i' } },
          { role: { $regex: q, $options: 'i' } },
          { ctc: { $regex: q, $options: 'i' } },
        ];
      }

      const leads = await ActiveLead.find(filter)
        .sort({ created_at: -1 })
        .populate('coordinator_id', 'full_name')
        .lean();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'iPOMS Placement Operations';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Active Leads', {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      // Define columns
      worksheet.columns = [
        { header: 'S.No', key: 'sno', width: 8 },
        { header: 'Company Name', key: 'company_name', width: 32 },
        { header: 'Role', key: 'role', width: 26 },
        { header: 'CTC', key: 'ctc', width: 18 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Followup Month', key: 'followup_month', width: 18 },
        { header: 'Graduating Year', key: 'academic_year', width: 18 },
        { header: 'Logged Coordinator', key: 'coordinator', width: 22 },
        { header: 'Created Date', key: 'created_at', width: 16 },
      ];

      // Style Header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }, // iPOMS Deep Navy
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      // Add Rows
      leads.forEach((l, idx) => {
        const row = worksheet.addRow({
          sno: idx + 1,
          company_name: l.company_name || '—',
          role: l.role || '—',
          ctc: l.ctc || '—',
          status: l.status || '—',
          followup_month: l.followup_month || '—',
          academic_year: l.academic_year || '2027',
          coordinator: (l.coordinator_id as any)?.full_name || 'System',
          created_at: l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '—',
        });

        row.height = 22;
        row.alignment = { vertical: 'middle' };

        // Status pill styling
        const statusCell = row.getCell('status');
        if (l.status === 'Hiring') {
          statusCell.font = { bold: true, color: { argb: 'FF059669' } };
        } else if (l.status === 'Follow Up') {
          statusCell.font = { bold: true, color: { argb: 'FFD97706' } };
        } else if (l.status === 'Invite Email' || l.status === 'Not Hiring') {
          statusCell.font = { bold: true, color: { argb: 'FF0284C7' } }; // Sky Blue
        }
      });

      // Borders on all cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=iPOMS_Active_Leads_${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
      return;
    } catch (err: any) {
      console.error('GET /active-leads/export error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Export failed' } });
    }
  });

  // ── 7. GET /api/v1/active-leads/duplicate-audit (Audit all duplicate & near-duplicate company names) ──
  app.get('/api/v1/active-leads/duplicate-audit', async (req: Request, res: Response) => {
    try {
      const filter: Record<string, any> = { is_deleted: false };
      if (req.query.lead_type && req.query.lead_type !== 'all') {
        filter.lead_type = String(req.query.lead_type);
      }
      const leads = await ActiveLead.find(filter).lean();
      
      const cleanName = (s: string) => {
        return (s || '')
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const stripCorporateSuffixes = (s: string) => {
        let n = cleanName(s);
        const suffixes = [
          'private limited', 'pvt ltd', 'pvt limited', 'private ltd', 'pvtltd',
          'limited', 'ltd', 'inc', 'corporation', 'corp', 'llc', 'llp',
          'technologies', 'technology', 'tech', 'solutions', 'solution',
          'infotech', 'services', 'service', 'systems', 'system',
          'enterprises', 'enterprise', 'studios', 'studio', 'group',
          'consultancy', 'consulting', 'consultants', 'software', 'soft',
          'digital', 'global', 'international', 'india', 'labs', 'lab'
        ];
        // Iteratively strip suffix words from the end
        let changed = true;
        while (changed) {
          changed = false;
          for (const suf of suffixes) {
            const regex = new RegExp(`\\b${suf}\\b`, 'gi');
            const before = n;
            n = n.replace(regex, ' ').replace(/\s+/g, ' ').trim();
            if (n !== before) changed = true;
          }
        }
        return n || cleanName(s);
      };

      const levenshtein = (a: string, b: string): number => {
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        return matrix[b.length][a.length];
      };

      // 1. Group by exact normalized string
      const exactGroups = new Map<string, any[]>();
      for (const lead of leads) {
        const key = cleanName(lead.company_name);
        if (!exactGroups.has(key)) exactGroups.set(key, []);
        exactGroups.get(key)!.push(lead);
      }

      const exactDuplicates: any[] = [];
      for (const [key, items] of exactGroups.entries()) {
        if (items.length > 1) {
          exactDuplicates.push({
            normalized_key: key,
            count: items.length,
            names: Array.from(new Set(items.map(i => i.company_name))),
            roles: Array.from(new Set(items.map(i => i.role || '—'))),
            ctcs: Array.from(new Set(items.map(i => i.ctc || '—'))),
            batches: Array.from(new Set(items.map(i => i.academic_year || '—'))),
            statuses: Array.from(new Set(items.map(i => i.status || '—'))),
            leads: items.map(i => ({ _id: i._id, name: i.company_name, role: i.role, ctc: i.ctc, batch: i.academic_year })),
          });
        }
      }

      // 2. Group by stripped corporate suffixes
      const strippedGroups = new Map<string, any[]>();
      for (const lead of leads) {
        const key = stripCorporateSuffixes(lead.company_name);
        if (!strippedGroups.has(key)) strippedGroups.set(key, []);
        strippedGroups.get(key)!.push(lead);
      }

      const corporateSuffixDuplicates: any[] = [];
      for (const [key, items] of strippedGroups.entries()) {
        const distinctCleanNames = new Set(items.map(i => cleanName(i.company_name)));
        if (distinctCleanNames.size > 1) {
          corporateSuffixDuplicates.push({
            stripped_core_name: key,
            count: items.length,
            distinct_variants: Array.from(new Set(items.map(i => i.company_name))),
            leads: items.map(i => ({ _id: i._id, name: i.company_name, role: i.role, ctc: i.ctc })),
          });
        }
      }

      // 3. Fuzzy match across all distinct clean names
      const allDistinctEntries = Array.from(exactGroups.entries()).map(([cleanKey, items]) => ({
        cleanKey,
        coreKey: stripCorporateSuffixes(cleanKey),
        sampleName: items[0].company_name,
        count: items.length,
        items,
      }));

      const fuzzyMatches: any[] = [];
      const pairedKeys = new Set<string>();

      for (let i = 0; i < allDistinctEntries.length; i++) {
        for (let j = i + 1; j < allDistinctEntries.length; j++) {
          const e1 = allDistinctEntries[i];
          const e2 = allDistinctEntries[j];

          // Skip if already captured in corporateSuffixDuplicates
          if (e1.coreKey === e2.coreKey) continue;

          // Check token subset (e.g. "unistring uts" vs "uts unistring")
          const tokens1 = new Set(e1.cleanKey.split(' ').filter(Boolean));
          const tokens2 = new Set(e2.cleanKey.split(' ').filter(Boolean));
          const isSubset = Array.from(tokens1).every(t => tokens2.has(t)) || Array.from(tokens2).every(t => tokens1.has(t));

          // Check Levenshtein distance on cleanKey or coreKey
          const distClean = levenshtein(e1.cleanKey, e2.cleanKey);
          const distCore = levenshtein(e1.coreKey, e2.coreKey);
          const minLen = Math.min(e1.cleanKey.length, e2.cleanKey.length);
          const minCoreLen = Math.min(e1.coreKey.length, e2.coreKey.length);

          const isTypoMatch = (minLen > 4 && distClean <= 2) || (minCoreLen > 3 && distCore <= 1);

          if (isSubset || isTypoMatch) {
            const pairKey = [e1.cleanKey, e2.cleanKey].sort().join(' <--> ');
            if (!pairedKeys.has(pairKey)) {
              pairedKeys.add(pairKey);
              fuzzyMatches.push({
                type: isSubset ? 'Token Permutation / Subset' : 'Spelling / Typo Variation (Edit Distance ' + Math.min(distClean, distCore) + ')',
                company_a: e1.sampleName,
                company_b: e2.sampleName,
                count_a: e1.count,
                count_b: e2.count,
                leads_a: e1.items.map(l => ({ _id: l._id, name: l.company_name, role: l.role, ctc: l.ctc })),
                leads_b: e2.items.map(l => ({ _id: l._id, name: l.company_name, role: l.role, ctc: l.ctc })),
              });
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          total_records: leads.length,
          total_unique_clean_names: exactGroups.size,
          exact_case_and_whitespace_duplicate_groups: exactDuplicates,
          corporate_suffix_variation_groups: corporateSuffixDuplicates,
          fuzzy_and_spelling_variation_pairs: fuzzyMatches,
        },
      });
    } catch (err: any) {
      console.error('GET /duplicate-audit error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Duplicate audit failed' } });
    }
  });

  /**
   * POST/GET /api/v1/active-leads/deduplicate-pipeline
   * Merge and deduplicate exact, suffix, and spelling variations in Pipeline leads,
   * keeping 1 standard clean record per company while preserving multi-role tracks.
   */
  app.all('/api/v1/active-leads/deduplicate-pipeline', async (req: Request, res: Response) => {
    try {
      const allPipeline = await ActiveLead.find({ lead_type: 'pipeline', is_deleted: false }).lean();
      const initialCount = allPipeline.length;

      // 1. Create timestamped backup file
      try {
        const fs = require('fs');
        const path = require('path');
        const backupDir = path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, `pipeline_leads_backup_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(allPipeline, null, 2));
      } catch (backupErr) {
        console.warn('Backup write warning:', backupErr);
      }

      function cleanStr(s: string): string {
        return (s || '')
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function stripCorporateSuffixes(s: string): string {
        let n = cleanStr(s);
        // Handle common prefix/acronym patterns
        if (n.startsWith('uts ') && n.includes('unistring')) {
          n = n.replace(/^uts\s+/, '');
        }
        if (n.includes('movate') && n.includes('css corp')) {
          n = 'movate';
        }
        if (n.includes('alstorm')) {
          n = n.replace(/alstorm/g, 'alstom');
        }

        const suffixes = [
          'private limited', 'pvt ltd', 'pvt limited', 'private ltd', 'pvtltd', 'pvt lmt', 'lmt',
          'limited', 'ltd', 'inc', 'corporation', 'corp', 'llc', 'llp',
          'technologies', 'technology', 'tech', 'solutions', 'solution',
          'infotech', 'services', 'service', 'systems', 'system',
          'enterprises', 'enterprise', 'studios', 'studio', 'group of companies', 'groups', 'group',
          'consultancy', 'consulting', 'consultants', 'software solutions', 'software', 'soft',
          'digital', 'global service', 'global solution centre', 'global',
          'international llc', 'international', 'india pvt ltd', 'india private limited',
          'india ltd', 'india', 'labs', 'lab', 'talent solutions', 'design systems',
          'product and services', 'products and services', 'technical and services centre',
          'technology business centre', 'life sciences', 'solutions and networks',
          'careers', 'automations', 'automation', 'innovation labs', 'innovations', 'innovation'
        ];
        let changed = true;
        while (changed) {
          changed = false;
          for (const suf of suffixes) {
            const regex = new RegExp(`\\b${suf}\\b`, 'gi');
            const before = n;
            n = n.replace(regex, ' ').replace(/\s+/g, ' ').trim();
            if (n !== before) changed = true;
          }
        }
        return n || cleanStr(s);
      }

      function toSlug(s: string): string {
        let stripped = stripCorporateSuffixes(s);
        let slug = stripped.replace(/[^a-z0-9]/g, '');

        // Normalize plural 's' at end of words for matching
        if (slug.endsWith('s') && slug.length > 5 && !['siemens', 'tcs', 'cts', 'ciscoc', 'infosys'].includes(slug)) {
          slug = slug.replace(/s$/, '');
        }

        const aliases: Record<string, string> = {
          zenai: 'zeai',
          nemekart: 'namekart',
          stlumax: 'sllumax',
          '247': '247ai',
          nxtwave: 'nextwave',
          novatec: 'novatech',
          ltts: 'lttechnology',
          lttechnologyservice: 'lttechnology',
          lttechnologyserviceslimitedlt: 'lttechnology',
          evobiautomation: 'evobi',
          sheenlacpaint: 'sheenlac',
          eleationcaeservice: 'eleation',
        };

        return aliases[slug] || slug;
      }

      function normalizeRole(r: string): string {
        return (r || '')
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function areRolesEquivalent(r1: string, r2: string): boolean {
        const n1 = normalizeRole(r1);
        const n2 = normalizeRole(r2);
        if (n1 === n2) return true;
        if (!n1 || !n2) return true;
        
        const genericTrainee = ['graduate trainee', 'get', 'trainee', 'engineer trainee', 'intern', 'graduate engineer trainee', 'entry level'];
        const isTrainee1 = genericTrainee.includes(n1) || genericTrainee.some(t => n1.includes(t));
        const isTrainee2 = genericTrainee.includes(n2) || genericTrainee.some(t => n2.includes(t));
        if (isTrainee1 && isTrainee2) return true;

        const genericDev = ['sde', 'software engineer', 'software developer', 'associate software engineer', 'ase', 'developer', 'programmer', 'software dev'];
        const isDev1 = genericDev.includes(n1) || genericDev.some(d => n1.includes(d));
        const isDev2 = genericDev.includes(n2) || genericDev.some(d => n2.includes(d));
        if (isDev1 && isDev2) return true;

        if (n1.includes(n2) || n2.includes(n1)) return true;
        return false;
      }

      function pickBestName(names: string[]): string {
        return names.sort((a, b) => {
          // Prefer TitleCase over ALL-CAPS or all-lowercase
          const isUpperA = a === a.toUpperCase() && a.length > 5;
          const isUpperB = b === b.toUpperCase() && b.length > 5;
          if (isUpperA && !isUpperB) return 1;
          if (!isUpperA && isUpperB) return -1;
          return b.length - a.length;
        })[0];
      }

      // Group leads by slug key
      const groups = new Map<string, typeof allPipeline>();
      for (const lead of allPipeline) {
        const slug = toSlug(lead.company_name);
        if (!groups.has(slug)) groups.set(slug, []);
        groups.get(slug)!.push(lead);
      }

      let deletedCount = 0;
      let updatedCount = 0;
      let multiRoleTracksPreserved = 0;
      const preservedMultiRoleDetails: Array<{ company: string; roles: string[] }> = [];

      for (const [slug, group] of groups.entries()) {
        if (group.length <= 1) continue;

        const canonicalName = pickBestName(group.map(g => g.company_name));

        // Group into distinct role buckets
        const roleBuckets: Array<{ primary: typeof group[0]; duplicates: typeof group[0][] }> = [];

        for (const item of group) {
          let matchedBucket = false;
          for (const bucket of roleBuckets) {
            if (areRolesEquivalent(bucket.primary.role, item.role)) {
              bucket.duplicates.push(item);
              matchedBucket = true;
              break;
            }
          }
          if (!matchedBucket) {
            roleBuckets.push({ primary: item, duplicates: [] });
          }
        }

        if (roleBuckets.length > 1) {
          multiRoleTracksPreserved += (roleBuckets.length - 1);
          preservedMultiRoleDetails.push({
            company: canonicalName,
            roles: roleBuckets.map(b => b.primary.role || 'Graduate Trainee'),
          });
        }

        // For each bucket, keep the best lead and merge data
        for (const bucket of roleBuckets) {
          const allInBucket = [bucket.primary, ...bucket.duplicates];

          allInBucket.sort((a, b) => {
            const aHasStatus = a.status ? 1 : 0;
            const bHasStatus = b.status ? 1 : 0;
            if (aHasStatus !== bHasStatus) return bHasStatus - aHasStatus;

            const aIs2027 = (a.academic_year === '2027') ? 1 : 0;
            const bIs2027 = (b.academic_year === '2027') ? 1 : 0;
            if (aIs2027 !== bIs2027) return bIs2027 - aIs2027;

            return (b.role?.length || 0) - (a.role?.length || 0);
          });

          const leadToKeep = allInBucket[0];
          const leadsToDelete = allInBucket.slice(1);

          let needsUpdate = false;
          const updates: any = {};

          if (leadToKeep.company_name !== canonicalName) {
            updates.company_name = canonicalName;
            needsUpdate = true;
          }

          // Inherit status if representative lead is blank
          if (!leadToKeep.status) {
            const withStatus = allInBucket.find(l => l.status);
            if (withStatus) {
              updates.status = withStatus.status;
              if (withStatus.followup_month) updates.followup_month = withStatus.followup_month;
              needsUpdate = true;
            }
          }

          // Inherit role if representative lead is generic placeholder
          if ((!leadToKeep.role || leadToKeep.role === 'Graduate Trainee') && allInBucket.some(l => l.role && l.role !== 'Graduate Trainee')) {
            const withRole = allInBucket.find(l => l.role && l.role !== 'Graduate Trainee');
            if (withRole) {
              updates.role = withRole.role;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            await ActiveLead.findByIdAndUpdate(leadToKeep._id, { $set: updates });
            updatedCount++;
          }

          for (const del of leadsToDelete) {
            await ActiveLead.findByIdAndUpdate(del._id, {
              $set: { is_deleted: true, deleted_at: new Date() },
            });
            deletedCount++;
          }
        }
      }

      const finalPipelineCount = await ActiveLead.countDocuments({ lead_type: 'pipeline', is_deleted: false });
      const finalJdCount = await ActiveLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });
      const finalTotalActive = await ActiveLead.countDocuments({ is_deleted: false });

      return res.status(200).json({
        success: true,
        data: {
          initial_pipeline_count: initialCount,
          duplicates_removed: deletedCount,
          records_updated_with_canonical_info: updatedCount,
          multi_role_tracks_preserved: multiRoleTracksPreserved,
          preserved_multi_role_details: preservedMultiRoleDetails,
          final_pipeline_count: finalPipelineCount,
          final_jd_count: finalJdCount,
          final_total_active_leads: finalTotalActive,
        },
      });
    } catch (err: any) {
      console.error('POST /deduplicate-pipeline error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Deduplication failed' } });
    }
  });
}

