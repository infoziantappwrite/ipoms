import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import ExcelJS from 'exceljs';
import { ActiveLead, IActiveLead, ACTIVE_LEAD_STATUSES, ACADEMIC_YEARS, FOLLOWUP_MONTHS, ActiveLeadStatus } from '../models/ActiveLead';
import { DailyTracker } from '../models/DailyTracker';
import { authenticateJWT } from './authMiddleware';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      const currentMonthIndex = new Date().getMonth();
      followupMonth = FOLLOWUP_MONTHS[currentMonthIndex] || 'August';
    }

    if (!status) return null;

    const year = (data.academic_year as any) || '2026';

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
      followup_month: status === 'Follow Up' ? followupMonth : '',
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
  // ── 1. GET /api/v1/active-leads (List with stats & search) ─────────────────
  app.get('/api/v1/active-leads', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const {
        academic_year,
        status,
        followup_month,
        search,
        college_id,
        sort = 'desc',
      } = req.query;

      const filter: Record<string, any> = { is_deleted: false };

      if (academic_year && academic_year !== 'all') {
        filter.academic_year = String(academic_year);
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
        filter.$or = [
          { company_name: { $regex: q, $options: 'i' } },
          { role: { $regex: q, $options: 'i' } },
          { ctc: { $regex: q, $options: 'i' } },
        ];
      }

      const leads = await ActiveLead.find(filter)
        .sort({ created_at: sort === 'asc' ? 1 : -1 })
        .populate('coordinator_id', 'full_name email')
        .populate('college_id', 'college_name college_code')
        .lean();

      // Compute statistics across the entire unfiltered dataset (or year-scoped)
      const baseFilter: Record<string, any> = { is_deleted: false };
      if (academic_year && academic_year !== 'all') {
        baseFilter.academic_year = String(academic_year);
      }

      const allStats = await ActiveLead.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        total: 0,
        hiring: 0,
        invite_email: 0,
        follow_up: 0,
      };

      allStats.forEach((item) => {
        stats.total += item.count;
        if (item._id === 'Hiring') stats.hiring = item.count;
        if (item._id === 'Invite Email') stats.invite_email = item.count;
        if (item._id === 'Not Hiring') stats.invite_email += item.count;
        if (item._id === 'Follow Up') stats.follow_up = item.count;
      });

      return res.json({
        success: true,
        data: {
          leads,
          stats,
          total_count: leads.length,
        },
      });
    } catch (err: any) {
      console.error('GET /active-leads error:', err);
      return res.status(500).json({ success: false, error: { message: err.message || 'Failed to fetch active leads' } });
    }
  });

  // ── Sync from Daily Tracker (Hiring, Follow Up, Invite Email) ────────────
  app.post('/api/v1/active-leads/sync', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const { academic_year } = req.body || {};
      const targetYear = academic_year || '2026';

      // Find all Daily Tracker rows with outcomes matching Hiring, Follow Up, or Invite Email
      const SYNCABLE_OUTCOMES = [
        'hiring',
        'jd_received',
        'drive_completed',
        'hiring_completed',
        'invite_mail',
        'in_connect',
        'follow_up',
        'call_back',
      ];

      const trackerRows = await DailyTracker.find({
        is_skipped: false,
        outcome_status: { $in: SYNCABLE_OUTCOMES },
        company_name: { $exists: true, $ne: '' },
      }).lean();

      let syncedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      for (const row of trackerRows) {
        if (!row.company_name || !row.company_name.trim()) continue;
        const normalizedCompany = row.company_name.trim();
        const outcome = (row.outcome_status || '').toLowerCase();

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
          followupMonth = row.follow_up_month || FOLLOWUP_MONTHS[new Date().getMonth()] || 'August';
        }

        if (!status) continue;

        const rowYear = (row.year ? String(row.year) : targetYear) as any;

        const existing = await ActiveLead.findOne({
          company_name: { $regex: new RegExp(`^${escapeRegex(normalizedCompany)}$`, 'i') },
          academic_year: rowYear,
          is_deleted: false,
        });

        if (existing) {
          existing.status = status;
          if (status === 'Follow Up' && followupMonth) {
            existing.followup_month = followupMonth as any;
          }
          if (row.coordinator_id && !existing.coordinator_id) {
            existing.coordinator_id = row.coordinator_id as any;
          }
          if (row.college_id && !existing.college_id) {
            existing.college_id = row.college_id as any;
          }
          existing.daily_tracker_id = row._id as any;
          await existing.save();
          updatedCount++;
        } else {
          await ActiveLead.create({
            company_name: normalizedCompany,
            role: 'Graduate Trainee',
            ctc: '',
            status,
            followup_month: status === 'Follow Up' ? followupMonth : '',
            academic_year: rowYear,
            coordinator_id: row.coordinator_id || null,
            college_id: row.college_id || null,
            daily_tracker_id: row._id,
          });
          createdCount++;
        }
        syncedCount++;
      }

      return res.json({
        success: true,
        data: {
          synced_count: syncedCount,
          created_count: createdCount,
          updated_count: updatedCount,
        },
        message: `Successfully synced ${syncedCount} leads from Daily Tracker (${createdCount} added, ${updatedCount} updated)`,
      });
    } catch (err: any) {
      console.error('POST /active-leads/sync error:', err);
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to sync leads from Daily Tracker' },
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
        status = 'Hiring',
        followup_month = '',
        academic_year = '2026',
        college_id,
      } = req.body;

      if (!company_name || !company_name.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Company name is required' } });
      }

      if (!ACTIVE_LEAD_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
      }

      const authUser = (req as any).user;
      const coordinatorId = authUser?.userId ? new Types.ObjectId(authUser.userId) : null;

      const lead = await ActiveLead.create({
        company_name: company_name.trim(),
        role: role.trim() || 'Graduate Trainee',
        ctc: ctc.trim(),
        status,
        followup_month: status === 'Follow Up' ? followup_month : '',
        academic_year: academic_year || '2026',
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
      const { lines, academic_year = '2026', default_status = 'Hiring' } = req.body;

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
        const followupMonth = status === 'Follow Up' ? (parts[4] || 'August') : '';

        const lead = await ActiveLead.create({
          company_name: companyName,
          role,
          ctc,
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

      const { company_name, role, ctc, status, followup_month, academic_year } = req.body;

      const lead = await ActiveLead.findById(id);
      if (!lead || lead.is_deleted) {
        return res.status(404).json({ success: false, error: { message: 'Active lead not found' } });
      }

      if (company_name !== undefined) lead.company_name = company_name.trim();
      if (role !== undefined) lead.role = role.trim();
      if (ctc !== undefined) lead.ctc = ctc.trim();
      if (status !== undefined) {
        if (!ACTIVE_LEAD_STATUSES.includes(status)) {
          return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
        }
        lead.status = status;
        // If status is not Follow Up, clear followup_month
        if (status !== 'Follow Up') {
          lead.followup_month = '';
        }
      }
      if (followup_month !== undefined && lead.status === 'Follow Up') {
        lead.followup_month = followup_month;
      }
      if (academic_year !== undefined) {
        lead.academic_year = academic_year;
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
          followup_month: l.status === 'Follow Up' ? (l.followup_month || '—') : 'N/A',
          academic_year: l.academic_year || '2026',
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
}
