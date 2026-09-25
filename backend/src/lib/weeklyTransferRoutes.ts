import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { getCurrentAcademicYear, getCurrentGraduatingBatchYear } from './academicYear';

/**
 * POST /api/v1/weekly-tracker/transfer
 *
 * COPY companies from one college's Weekly Tracker to another college's (user-requested, 25 Sep 2026;
 * it was Move + Copy at first, changed to copy-only the same day). The sender's rows are never changed.
 *
 * The RECEIVER gets a fresh row with ONLY Company name, Role, CTC, Contact and Email. Status, dates,
 * notes and counts start empty so the receiving coordinator fills them in for their own college. The row
 * lands in the same section it was copied from, and in the order the sender listed it. A company the
 * target college already has (same name, any section) is skipped. The receiving coordinator(s) get an
 * in-app notification ("One data received from ACET College") that the client shows as a toast.
 */

const MAX_IDS = 200;
export const WEEKLY_COPY_NOTIFICATION_TITLE = 'Weekly Tracker copy received';

interface Deps {
  notifyForeignCollegeOwners: (actorUserId: string | undefined, collegeId: any, companyName: string, action: 'created' | 'updated' | 'deleted') => Promise<void>;
  getFridayWeekBounds: () => { startFriday: Date; endThursday: Date; weekNumber: number };
}

const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export function registerWeeklyTransferRoutes(app: Express, deps: Deps) {
  app.post('/api/v1/weekly-tracker/transfer', async (req: Request, res: Response) => {
    try {
      const { ids, target_college_id, mode, section } = req.body || {};
      const userId = req.user?.userId;

      if (mode !== 'copy') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Only copying to another college is supported.' } });
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Select at least one company.' } });
      }
      if (ids.length > MAX_IDS) {
        return res.status(400).json({ success: false, error: { code: 'TOO_MANY_ROWS', message: `Please send at most ${MAX_IDS} companies at a time.` } });
      }
      if (!target_college_id || !Types.ObjectId.isValid(String(target_college_id))) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose the college to send them to.' } });
      }
      const validIds = ids.filter((i: any) => Types.ObjectId.isValid(String(i))).map((i: any) => String(i));
      if (validIds.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Select at least one company.' } });
      }

      const targetCollege: any = await College.findById(target_college_id).select('_id college_name college_code status').lean();
      if (!targetCollege) {
        return res.status(404).json({ success: false, error: { code: 'COLLEGE_NOT_FOUND', message: 'That college was not found.' } });
      }
      const targetObjId = new Types.ObjectId(String(target_college_id));

      const found: any[] = await WeeklyTracker.find({ _id: { $in: validIds }, is_deleted: { $ne: true } });
      if (found.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Those companies are no longer on the tracker.' } });
      }
      const sourceIds = new Set(found.map((r) => String(r.college_id)));
      if (sourceIds.size > 1) {
        return res.status(400).json({ success: false, error: { code: 'MIXED_COLLEGES', message: 'Select companies from one college at a time.' } });
      }
      const sourceCollegeId = String(found[0].college_id);
      if (sourceCollegeId === String(target_college_id)) {
        return res.status(400).json({ success: false, error: { code: 'SAME_COLLEGE', message: 'Choose a different college. To change a section inside the same college, use the section move.' } });
      }

      // Keep the sender's order (the order the client listed the ids in).
      const byId = new Map(found.map((r) => [String(r._id), r]));
      const ordered = validIds.map((i) => byId.get(i)).filter(Boolean) as any[];

      // Who handles the target college? Placement Coordinator preferred over Team Leader; all-colleges
      // oversight accounts are ignored. If nobody does, the row is attributed to the sender.
      const ownerCandidates: any[] = await User.find({
        assigned_college_ids: targetObjId,
        is_deleted: { $ne: true },
        account_status: 'active',
        has_all_colleges_access: { $ne: true },
        role_codes: { $in: ['PLACEMENT_COORDINATOR', 'TEAM_LEADER'] },
      }).select('_id role_codes').sort({ full_name: 1 }).lean();
      const sourceCollege: any = await College.findById(found[0].college_id).select('college_code college_name').lean();
      const coordOwners = ownerCandidates.filter((u) => (u.role_codes || []).includes('PLACEMENT_COORDINATOR'));
      const receiver = (coordOwners[0] || ownerCandidates[0])?._id || new Types.ObjectId(String(userId));

      const existing: any[] = await WeeklyTracker.find({ college_id: targetObjId, is_deleted: { $ne: true } }).select('company_name').lean();
      const inTarget = new Set(existing.map((r) => norm(r.company_name)));

      const resolvedYear = await getCurrentAcademicYear();
      const batchYear = await getCurrentGraduatingBatchYear();
      const { startFriday, endThursday, weekNumber } = deps.getFridayWeekBounds();

      // Next free order slot per section in the target, so the sender's order is kept.
      const nextOrder = new Map<string, number>();
      const orderFor = async (sec: string) => {
        if (!nextOrder.has(sec)) {
          const last: any = await WeeklyTracker.findOne({ college_id: targetObjId, pipeline_section: sec, is_deleted: { $ne: true } })
            .sort({ order_index: -1 })
            .select('order_index')
            .lean();
          nextOrder.set(sec, typeof last?.order_index === 'number' ? last.order_index + 1 : 0);
        }
        const v = nextOrder.get(sec)!;
        nextOrder.set(sec, v + 1);
        return v;
      };

      const fromTop = section === 'top_companies';
      const sentIds: string[] = [];
      const skipped: { company_name: string; reason: string }[] = [];
      const sentNames: string[] = [];

      for (const src of ordered) {
        const key = norm(src.company_name);
        if (inTarget.has(key)) {
          skipped.push({ company_name: src.company_name, reason: `already in ${targetCollege.college_code || targetCollege.college_name}` });
          continue;
        }
        const sec = src.pipeline_section;
        await WeeklyTracker.create({
          academic_year: resolvedYear,
          college_id: targetObjId,
          coordinator_id: receiver,
          company_id: src.company_id,
          company_name: src.company_name,
          job_role: src.job_role || '',
          contact_number: src.contact_number || '',
          mobile_numbers: Array.isArray(src.mobile_numbers) ? [...src.mobile_numbers] : [],
          email_id: src.email_id || '',
          email_ids: Array.isArray(src.email_ids) ? [...src.email_ids] : [],
          ctc_lpa: src.ctc_lpa || '',
          eligible_batch: `${batchYear} Batch`,
          pipeline_section: sec,
          is_pinned_top: fromTop || sec === 'top_companies',
          current_status_text: '',
          order_index: await orderFor(sec),
          week_number: weekNumber,
          week_start_date: startFriday,
          week_end_date: endThursday,
        });
        inTarget.add(key);
        sentIds.push(String(src._id));
        sentNames.push(src.company_name);
      }

      if (sentNames.length > 0) {
        const label = sentNames.length === 1 ? sentNames[0] : `${sentNames[0]} and ${sentNames.length - 1} more`;
        deps.notifyForeignCollegeOwners(userId, targetObjId, label, 'created');

        // Tell the receiving coordinator(s) in the app: "One data received from ACET College".
        try {
          const recipients = (coordOwners.length ? coordOwners : ownerCandidates)
            .map((u) => u._id)
            .filter((id: any) => String(id) !== String(userId));
          if (recipients.length > 0) {
            const from = sourceCollege?.college_code || sourceCollege?.college_name || 'another college';
            const n = sentNames.length;
            await Notification.create({
              notification_type: 'system_update',
              sender_id: new Types.ObjectId(String(userId)),
              sender_role: 'system',
              audience_type: 'individual',
              target_user_ids: recipients,
              target_college_id: targetObjId,
              title: WEEKLY_COPY_NOTIFICATION_TITLE,
              message: `${n === 1 ? 'One' : n} data received from ${from} College`,
              icon_type: 'announcement',
              priority: 'medium',
              action_url: '/weekly-tracker',
              requires_acknowledgment: false,
            });
          }
        } catch (e: any) {
          console.error('[weekly-transfer] notify receiver failed:', e?.message || e);
        }
      }

      return res.status(200).json({
        success: true,
        message:
          sentNames.length === 0
            ? 'Nothing was sent.'
            : `${sentNames.length === 1 ? 'One company' : `${sentNames.length} companies`} copied to ${targetCollege.college_code || targetCollege.college_name}.`,
        sent: sentNames.length,
        skipped,
        target: { _id: String(targetCollege._id), college_name: targetCollege.college_name, college_code: targetCollege.college_code },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed to transfer companies' },
      });
    }
  });
}
