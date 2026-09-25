import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { College } from '../models/College';
import { DailyTracker, PIPELINE_SYNC_OUTCOME } from '../models/DailyTracker';
import { EmailCheck } from '../models/EmailCheck';

/**
 * "Have you sent the email?" reminder, driven by the calls themselves.
 *
 * Who: Placement Coordinators and a normal Team Leader (Sujitha). NOT the Administrator and NOT a
 * full-oversight Team Leader (`has_all_colleges_access`, i.e. Malvika Kumar).
 *
 * When: every Daily Tracker call whose outcome is Invite Mail starts its own 15-minute timer, counted
 * from the end of that call (falling back to its start time, then to when the row was created). Whatever
 * is due at that moment is asked about together in one prompt, so a busy day is not a stream of popups.
 *
 * The three answers:
 *   - "Yes, sent"       - those calls are confirmed and never asked about again.
 *   - "Remind me at ..." - the coordinator picks the time themselves; nothing is shown until then.
 *   - closed / not yet   - asked once more 30 minutes later, then left alone for the day.
 * Anything still unconfirmed at the end of the day is asked about, in past tense, the next time that
 * person opens the Daily Tracker (up to 3 days back).
 *
 * All times come from the SERVER clock (IST), never the browser's. The decision function is exported and
 * takes the time as an argument so every rule can be tested without waiting for the real clock.
 */

const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** How long after a call ends before the reminder is due. */
const DUE_AFTER_MIN = 15;
/** A prompt that was closed without an answer or a chosen time comes back once, this much later. */
const RETRY_AFTER_MIN = 30;
const MAX_DISMISSALS = 2;
/** Two tabs polling at the same instant must not both pop the same reminder. */
const PROMPT_GAP_MS = 60 * 1000;
const LOOKBACK_DAYS = 3;
// The feature starts on this IST day: days before it are never asked about (nobody could have answered
// them), so the first morning after launch does not quiz everyone about calls made before it existed.
// Set EMAIL_CHECK_START_DATE to the real go-live day if that is not this one.
const START_DATE = process.env.EMAIL_CHECK_START_DATE || '2026-09-26';

export function istDay(ms: number): string {
  return new Date(ms + IST_MS).toISOString().slice(0, 10);
}
/** session_date is stored as midnight UTC of the IST day. */
function dayBounds(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
/** Real UTC instant of IST midnight on that day - the base for "HH:MM IST on this date". */
function istMidnightMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getTime() - IST_MS;
}
function weekdayName(dateStr: string): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayBounds(dateStr).getUTCDay()];
}
/** 14:05 IST -> "2:05 pm". */
function istClockLabel(ms: number): string {
  const d = new Date(ms + IST_MS);
  const h24 = d.getUTCHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
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

export interface InviteCall {
  id: string;
  company: string;
  college: string;
  /** When the call happened (ms). */
  at: number;
  /** When this call's reminder falls due (ms). */
  due_at: number;
  time_label: string;
}

/** Every Invite Mail call this person logged on that IST day, in their focus colleges. */
async function inviteMailCalls(el: Eligible, dateStr: string): Promise<InviteCall[]> {
  const rows: any[] = await DailyTracker.find({
    coordinator_id: el.id,
    outcome_status: PIPELINE_SYNC_OUTCOME,
    session_date: dayBounds(dateStr),
    college_id: { $in: el.collegeIds },
    is_deleted: { $ne: true },
  })
    .select('company_name college_id call_start_time call_end_time created_at')
    .lean();
  if (rows.length === 0) return [];

  const collegeIds = Array.from(new Set(rows.map((r) => String(r.college_id))));
  const cols: any[] = await College.find({ _id: { $in: collegeIds } }).select('college_code').lean();
  const code = new Map(cols.map((c) => [String(c._id), c.college_code as string]));

  return rows
    .map((r) => {
      const at = new Date(r.call_end_time || r.call_start_time || r.created_at).getTime();
      return {
        id: String(r._id),
        company: r.company_name || 'this company',
        college: code.get(String(r.college_id)) || '',
        at,
        due_at: at + DUE_AFTER_MIN * 60 * 1000,
        time_label: istClockLabel(at),
      };
    })
    .sort((a, b) => a.at - b.at);
}

export interface EmailCheckDecision {
  show: boolean;
  kind?: 'due' | 'next_day';
  check_date?: string;
  when_label?: string;          // 'today' | 'yesterday' | 'Friday'
  prompt_no?: number;
  calls?: InviteCall[];         // the calls being asked about
  colleges?: { code: string; count: number }[];
}

function groupByCollege(calls: InviteCall[]): { code: string; count: number }[] {
  const m = new Map<string, number>();
  calls.forEach((c) => m.set(c.college, (m.get(c.college) || 0) + 1));
  return Array.from(m.entries())
    .filter(([code]) => code)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

/** `ready` = the browser says the tab is visible and the person has had the app open for a minute. */
export async function decideEmailCheck(
  userId: string | undefined,
  kind: 'due' | 'evening' | 'next_day',
  ready: boolean,
  nowMs: number = Date.now()
): Promise<EmailCheckDecision> {
  const NO: EmailCheckDecision = { show: false };
  if (!ready) return NO;
  const el = await eligibleUser(userId);
  if (!el) return NO;
  const today = istDay(nowMs);

  // ───────────────────────── due now (15 minutes after the call) ─────────────────────────
  if (kind !== 'next_day') {
    const calls = await inviteMailCalls(el, today);
    if (calls.length === 0) return NO;

    const rec: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: today }).lean();
    const confirmed = new Set((rec?.confirmed_call_ids || []).map(String));
    const due = calls.filter((c) => c.due_at <= nowMs && !confirmed.has(c.id));
    if (due.length === 0) return NO;

    // A time the coordinator chose for themselves wins over everything else.
    if (rec?.snooze_until && nowMs < new Date(rec.snooze_until).getTime()) return NO;

    const dismissed = new Set((rec?.dismissed_call_ids || []).map(String));
    const fresh = due.filter((c) => !dismissed.has(c.id));
    if (fresh.length === 0) {
      // Nothing new - this is the one retry after a close / "not yet".
      if ((rec?.dismissals || 0) >= MAX_DISMISSALS) return NO;
      const since = rec?.dismissed_at ? nowMs - new Date(rec.dismissed_at).getTime() : Number.POSITIVE_INFINITY;
      if (since < RETRY_AFTER_MIN * 60 * 1000) return NO;
    }

    // Claim the prompt: an existing row whose last prompt is recent fails the filter, the upsert then
    // collides with the unique index and throws - so a second tab in the same instant stays quiet.
    let promptNo = 1;
    try {
      const claimed: any = await EmailCheck.findOneAndUpdate(
        {
          coordinator_id: el.id,
          check_date: today,
          $or: [{ last_prompt_at: { $exists: false } }, { last_prompt_at: null }, { last_prompt_at: { $lt: new Date(nowMs - PROMPT_GAP_MS) } }],
        },
        { $inc: { prompts: 1 }, $set: { last_prompt_at: new Date(nowMs) }, $setOnInsert: { status: 'pending', last_moment: -1, dismissals: 0 } },
        { new: true, upsert: true }
      ).lean();
      promptNo = claimed?.prompts || 1;
    } catch {
      return NO;
    }

    return { show: true, kind: 'due', check_date: today, when_label: 'today', prompt_no: promptNo, calls: due, colleges: groupByCollege(due) };
  }

  // ───────────────────────── next day (Daily Tracker opened) ─────────────────────────
  if (await EmailCheck.exists({ coordinator_id: el.id, next_day_prompted_on: today })) return NO; // once per day

  for (let back = 1; back <= LOOKBACK_DAYS; back++) {
    const d = istDay(nowMs - back * DAY_MS);
    if (d < START_DATE) break; // older days predate the feature
    const rec: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: d }).lean();
    if (rec?.status === 'yes') continue; // that whole day was confirmed
    const calls = await inviteMailCalls(el, d);
    if (calls.length === 0) continue;
    const confirmed = new Set((rec?.confirmed_call_ids || []).map(String));
    const pending = calls.filter((c) => !confirmed.has(c.id));
    if (pending.length === 0) continue;

    await EmailCheck.updateOne(
      { coordinator_id: el.id, check_date: d },
      { $set: { next_day_prompted_on: today }, $setOnInsert: { status: 'pending', prompts: 0, last_moment: -1, dismissals: 0 } },
      { upsert: true }
    );
    return {
      show: true,
      kind: 'next_day',
      check_date: d,
      when_label: back === 1 ? 'yesterday' : weekdayName(d),
      calls: pending,
      colleges: groupByCollege(pending),
    };
  }
  return NO;
}

export interface AnswerInput {
  answer: 'yes' | 'no' | 'snooze';
  kind: 'due' | 'next_day';
  call_ids?: string[];
  /** 'HH:MM' in IST, for answer === 'snooze'. Must be later today. */
  remind_at?: string;
}

export interface AnswerResult {
  ok: boolean;
  error?: string;
  remind_at_label?: string;
}

export async function recordEmailCheckAnswer(
  userId: string | undefined,
  checkDate: string,
  input: AnswerInput,
  nowMs: number = Date.now()
): Promise<AnswerResult> {
  const el = await eligibleUser(userId);
  if (!el) return { ok: false, error: 'NOT_ELIGIBLE' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkDate)) return { ok: false, error: 'BAD_DATE' };
  const today = istDay(nowMs);
  const oldest = istDay(nowMs - (LOOKBACK_DAYS + 1) * DAY_MS);
  if (checkDate > today || checkDate < oldest) return { ok: false, error: 'BAD_DATE' };

  const ids = (input.call_ids || []).filter((i) => Types.ObjectId.isValid(i)).map((i) => new Types.ObjectId(i));
  const base = { coordinator_id: el.id, check_date: checkDate };
  // `dismissals` is deliberately left out - the "no" branch $inc's it, and Mongo refuses to have
  // both $inc and $setOnInsert touch one field.
  const onInsert = { $setOnInsert: { prompts: 0, last_moment: -1 } };

  if (input.answer === 'snooze') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(input.remind_at || ''));
    if (!m) return { ok: false, error: 'BAD_TIME' };
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return { ok: false, error: 'BAD_TIME' };
    // Always a time later on the day the reminder belongs to.
    const at = istMidnightMs(today) + (h * 60 + min) * 60 * 1000;
    if (at <= nowMs) return { ok: false, error: 'TIME_IN_PAST' };
    if (at - nowMs > DAY_MS) return { ok: false, error: 'BAD_TIME' };
    await EmailCheck.updateOne(
      base,
      { $set: { snooze_until: new Date(at), snooze_set_at: new Date(nowMs), status: 'pending' }, ...onInsert },
      { upsert: true }
    );
    return { ok: true, remind_at_label: istClockLabel(at) };
  }

  if (input.answer === 'no') {
    await EmailCheck.updateOne(
      base,
      {
        $set: { status: 'no', dismissed_at: new Date(nowMs), answered_kind: input.kind === 'next_day' ? 'next_day' : 'due' },
        $inc: { dismissals: 1 },
        $addToSet: { dismissed_call_ids: { $each: ids } },
        ...onInsert,
      },
      { upsert: true }
    );
    return { ok: true };
  }

  // yes - confirm these calls; the day counts as done once nothing is left over.
  await EmailCheck.updateOne(
    base,
    {
      $set: { answered_at: new Date(nowMs), answered_kind: input.kind === 'next_day' ? 'next_day' : 'due' },
      $addToSet: { confirmed_call_ids: { $each: ids } },
      $unset: { snooze_until: '' },
      ...onInsert,
    },
    { upsert: true }
  );
  const rec: any = await EmailCheck.findOne(base).lean();
  const confirmed = new Set((rec?.confirmed_call_ids || []).map(String));
  const calls = await inviteMailCalls(el, checkDate);
  const allDone = calls.length > 0 && calls.every((c) => confirmed.has(c.id));
  await EmailCheck.updateOne(base, { $set: { status: allDone ? 'yes' : 'pending' } });
  return { ok: true };
}

export function registerEmailCheckRoutes(app: Express) {
  app.get('/api/v1/email-check/status', async (req: Request, res: Response) => {
    try {
      const kind = req.query.kind === 'next_day' ? 'next_day' : 'due';
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
      const { check_date, answer, kind, call_ids, remind_at } = req.body || {};
      if (answer !== 'yes' && answer !== 'no' && answer !== 'snooze') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Answer must be yes, no or snooze.' } });
      }
      const result = await recordEmailCheckAnswer(
        (req as any).user?.userId,
        String(check_date || ''),
        {
          answer,
          kind: kind === 'next_day' ? 'next_day' : 'due',
          call_ids: Array.isArray(call_ids) ? call_ids.map(String) : [],
          remind_at: typeof remind_at === 'string' ? remind_at : undefined,
        }
      );
      if (!result.ok) {
        const message =
          result.error === 'TIME_IN_PAST'
            ? 'Please choose a time later than now.'
            : result.error === 'BAD_TIME'
            ? 'Please choose a valid time later today.'
            : 'Could not save your answer.';
        return res.status(400).json({ success: false, error: { code: result.error || 'VALIDATION_ERROR', message } });
      }
      return res.json({ success: true, data: { remind_at_label: result.remind_at_label } });
    } catch (err: any) {
      console.error('POST /email-check/answer error:', err?.message);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not save your answer.' } });
    }
  });
}
