import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { College } from '../models/College';
import { DailyTracker, PIPELINE_SYNC_OUTCOME } from '../models/DailyTracker';
import { EmailCheck } from '../models/EmailCheck';

/**
 * "Have you sent all the emails for your focus colleges?" reminder.
 *
 * Who: Placement Coordinators and a normal Team Leader (Sujitha). NOT the Administrator and NOT a
 * full-oversight Team Leader (`has_all_colleges_access`, i.e. Malvika Kumar).
 * When there is something to ask about: the coordinator logged at least one Invite Mail (the "positive"
 * outcome) today, in any one of their focus colleges. One Invite Mail is enough.
 *
 * Evening: a prompt may appear in a 10-minute window starting at 17:00, 17:30, 18:00 or 18:30 IST, only
 * to someone who is active right now and has had the app open for a minute. At most TWO prompts a day;
 * each window prompts at most once. Closing or answering "No" simply leaves it unanswered, so the next
 * window asks again; "Yes" ends it for the day.
 * Next day: the first time they open the Daily Tracker on a later day, if a recent day (up to 3 days back)
 * had positives and no "Yes", they are asked once (per day) in past tense.
 *
 * All times come from the SERVER clock (IST), never the browser's. The decision function is exported and
 * takes the time as an argument so it can be tested without waiting for 5 PM.
 */

const IST_MS = 5.5 * 60 * 60 * 1000;
const MOMENTS_MIN = [17 * 60, 17 * 60 + 30, 18 * 60, 18 * 60 + 30]; // minutes after IST midnight
const WINDOW_MIN = 10;
const MAX_EVENING_PROMPTS = 2;
const LOOKBACK_DAYS = 3;
// The feature starts on this IST day: days before it are never asked about (nobody could have answered them),
// so the first morning after launch does not quiz everyone about last week. Override with EMAIL_CHECK_START_DATE.
const START_DATE = process.env.EMAIL_CHECK_START_DATE || '2026-09-24';

export function istDay(ms: number): string {
  return new Date(ms + IST_MS).toISOString().slice(0, 10);
}
function istMinutes(ms: number): number {
  const d = new Date(ms + IST_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
function dayBounds(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`); // session_date is stored as midnight UTC of the IST day
}
function weekdayName(dateStr: string): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayBounds(dateStr).getUTCDay()];
}

interface Eligible {
  id: Types.ObjectId;
  collegeIds: Types.ObjectId[];
}

async function eligibleUser(userId: string | undefined): Promise<Eligible | null> {
  if (!userId || !Types.ObjectId.isValid(userId)) return null;
  const u: any = await User.findById(userId).select('role_codes is_deleted account_status has_all_colleges_access assigned_college_ids').lean();
  if (!u || u.is_deleted || (u.account_status && u.account_status !== 'active')) return null;
  if (u.has_all_colleges_access) return null; // Malvika Kumar
  const codes: string[] = u.role_codes || [];
  if (!codes.includes('PLACEMENT_COORDINATOR') && !codes.includes('TEAM_LEADER')) return null; // not the Administrator
  const collegeIds: Types.ObjectId[] = (u.assigned_college_ids || []).map((c: any) => new Types.ObjectId(String(c)));
  if (collegeIds.length === 0) return null;
  return { id: new Types.ObjectId(String(userId)), collegeIds };
}

async function positivesFor(el: Eligible, dateStr: string): Promise<{ count: number; colleges: { code: string; count: number }[] }> {
  const groups: { _id: Types.ObjectId; n: number }[] = await DailyTracker.aggregate([
    {
      $match: {
        coordinator_id: el.id,
        outcome_status: PIPELINE_SYNC_OUTCOME,
        session_date: dayBounds(dateStr),
        college_id: { $in: el.collegeIds },
        is_deleted: { $ne: true },
      },
    },
    { $group: { _id: '$college_id', n: { $sum: 1 } } },
  ]);
  if (groups.length === 0) return { count: 0, colleges: [] };
  const cols: any[] = await College.find({ _id: { $in: groups.map((g) => g._id) } }).select('college_code').lean();
  const code = new Map(cols.map((c) => [String(c._id), c.college_code as string]));
  const colleges = groups.map((g) => ({ code: code.get(String(g._id)) || '', count: g.n })).filter((c) => c.code).sort((a, b) => b.count - a.count);
  return { count: groups.reduce((s, g) => s + g.n, 0), colleges };
}

export interface EmailCheckDecision {
  show: boolean;
  kind?: 'evening' | 'next_day';
  check_date?: string;
  when_label?: string; // 'today' | 'yesterday' | 'Friday'
  prompt_no?: number;
  positives?: { count: number; colleges: { code: string; count: number }[] };
}

/** `ready` = the browser says the tab is visible and the person has had the app open for a minute. */
export async function decideEmailCheck(userId: string | undefined, kind: 'evening' | 'next_day', ready: boolean, nowMs: number = Date.now()): Promise<EmailCheckDecision> {
  const NO: EmailCheckDecision = { show: false };
  if (!ready) return NO;
  const el = await eligibleUser(userId);
  if (!el) return NO;
  const today = istDay(nowMs);

  // ───────────────────────── evening ─────────────────────────
  if (kind === 'evening') {
    const mins = istMinutes(nowMs);
    const moment = MOMENTS_MIN.findIndex((m) => mins >= m && mins < m + WINDOW_MIN);
    if (moment < 0) return NO;

    const rec: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: today }).lean();
    if (rec) {
      if (rec.status === 'yes') return NO;
      if ((rec.prompts || 0) >= MAX_EVENING_PROMPTS) return NO;
      if ((rec.last_moment ?? -1) >= moment) return NO; // this window was already used
    }

    const positives = await positivesFor(el, today);
    if (positives.count < 1) return NO;

    // claim this window atomically so a second tab / a reload cannot prompt twice
    let promptNo = 0;
    if (!rec) {
      try {
        await EmailCheck.create({ coordinator_id: el.id, check_date: today, status: 'pending', prompts: 1, last_moment: moment, last_prompt_at: new Date(nowMs) });
        promptNo = 1;
      } catch {
        return NO; // someone else created it in the same instant
      }
    } else {
      const upd: any = await EmailCheck.findOneAndUpdate(
        { coordinator_id: el.id, check_date: today, status: { $ne: 'yes' }, prompts: { $lt: MAX_EVENING_PROMPTS }, last_moment: { $lt: moment } },
        { $inc: { prompts: 1 }, $set: { last_moment: moment, last_prompt_at: new Date(nowMs) } },
        { new: true }
      ).lean();
      if (!upd) return NO;
      promptNo = upd.prompts;
    }
    return { show: true, kind: 'evening', check_date: today, when_label: 'today', prompt_no: promptNo, positives };
  }

  // ───────────────────────── next day (Daily Tracker opened) ─────────────────────────
  if (await EmailCheck.exists({ coordinator_id: el.id, next_day_prompted_on: today })) return NO; // once per day

  for (let back = 1; back <= LOOKBACK_DAYS; back++) {
    const d = istDay(nowMs - back * 24 * 3600 * 1000);
    if (d < START_DATE) break; // older days predate the feature
    const rec: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: d }).lean();
    if (rec?.status === 'yes') continue; // that day was confirmed
    const positives = await positivesFor(el, d);
    if (positives.count < 1) continue;
    await EmailCheck.updateOne(
      { coordinator_id: el.id, check_date: d },
      { $set: { next_day_prompted_on: today }, $setOnInsert: { status: 'pending', prompts: 0, last_moment: -1 } },
      { upsert: true }
    );
    return { show: true, kind: 'next_day', check_date: d, when_label: back === 1 ? 'yesterday' : weekdayName(d), positives };
  }
  return NO;
}

export async function recordEmailCheckAnswer(userId: string | undefined, checkDate: string, answer: 'yes' | 'no', kind: 'evening' | 'next_day', nowMs: number = Date.now()): Promise<boolean> {
  const el = await eligibleUser(userId);
  if (!el) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkDate)) return false;
  const today = istDay(nowMs);
  const oldest = istDay(nowMs - (LOOKBACK_DAYS + 1) * 24 * 3600 * 1000);
  if (checkDate > today || checkDate < oldest) return false;
  const existing: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: checkDate }).lean();
  if (existing?.status === 'yes') return true; // never downgrade a confirmation
  await EmailCheck.updateOne(
    { coordinator_id: el.id, check_date: checkDate },
    { $set: { status: answer, answered_at: new Date(nowMs), answered_kind: kind }, $setOnInsert: { prompts: 0, last_moment: -1 } },
    { upsert: true }
  );
  return true;
}

export function registerEmailCheckRoutes(app: Express) {
  app.get('/api/v1/email-check/status', async (req: Request, res: Response) => {
    try {
      const kind = req.query.kind === 'next_day' ? 'next_day' : 'evening';
      const ready = req.query.ready === '1' || req.query.ready === 'true';
      const decision = await decideEmailCheck((req as any).user?.userId, kind, ready);
      return res.json({ success: true, data: decision });
    } catch (err: any) {
      // never let this feature get in anyone's way
      console.error('GET /email-check/status error:', err?.message);
      return res.json({ success: true, data: { show: false } });
    }
  });

  app.post('/api/v1/email-check/answer', async (req: Request, res: Response) => {
    try {
      const { check_date, answer, kind } = req.body || {};
      if (answer !== 'yes' && answer !== 'no') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Answer must be yes or no.' } });
      }
      const ok = await recordEmailCheckAnswer((req as any).user?.userId, String(check_date || ''), answer, kind === 'next_day' ? 'next_day' : 'evening');
      return res.json({ success: ok });
    } catch (err: any) {
      console.error('POST /email-check/answer error:', err?.message);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not save your answer.' } });
    }
  });
}
