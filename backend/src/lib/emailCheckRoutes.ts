import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { College } from '../models/College';
import { DailyTracker, PIPELINE_SYNC_OUTCOME } from '../models/DailyTracker';
import { EmailCheck } from '../models/EmailCheck';

/**
 * "Did you send the emails for today's positives?" - asked at a few deliberate moments only, never
 * as a stream of popups during the working day.
 *
 * Who: Placement Coordinators and a normal Team Leader (Sujitha). NOT the Administrator and NOT a
 * full-oversight Team Leader (`has_all_colleges_access`, i.e. Malvika Kumar).
 * What it is about: Invite Mail calls (the "positive" outcome) logged today in their focus colleges.
 * When: Monday-Friday only, on the SERVER clock (IST).
 *
 *   1. They click Sign out at or after 5:00 PM        ("signout")
 *   2. They log in again later the same day, after 5 PM ("login") - e.g. signed out at 5:10, back at 6:45,
 *      or signed out before 5 and came back at 9 PM
 *   3. The time they picked themselves has arrived     ("timed")
 *   4. Tomorrow, the moment they open the Daily Tracker ("next_day"), for any day in the last 3 working
 *      days that was never confirmed.
 *
 * At most TWO evening questions per day, whichever moments they come from. "Yes" ends the day for good
 * (calls stop at 6 PM, so there is nothing to wait for). Closing / Esc / "No" leaves the day unconfirmed,
 * so the next morning's Daily Tracker asks. Signing out before 5 PM asks nothing: tomorrow covers it.
 *
 * The decision function is exported and takes the time as an argument so every rule can be tested
 * without waiting for the real clock.
 */

const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Evening questions start here (minutes after IST midnight). */
const EVENING_FROM_MIN = 17 * 60;
const MAX_EVENING_ASKS = 2;
/** Two tabs polling in the same instant must not both pop the same question. */
const PROMPT_GAP_MS = 60 * 1000;
const LOOKBACK_WORKING_DAYS = 3;
// The feature starts on this IST day: earlier days are never asked about (nobody could have answered
// them), so the first morning after launch does not quiz everyone about calls made before it existed.
// Set EMAIL_CHECK_START_DATE to the real go-live day if that is not this one.
const START_DATE = process.env.EMAIL_CHECK_START_DATE || '2026-09-26';

export function istDay(ms: number): string {
  return new Date(ms + IST_MS).toISOString().slice(0, 10);
}
function istMinutes(ms: number): number {
  const d = new Date(ms + IST_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
/** session_date is stored as midnight UTC of the IST day. */
function dayBounds(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
/** Real UTC instant of IST midnight on that day - the base for "HH:MM IST on this date". */
function istMidnightMs(dateStr: string): number {
  return dayBounds(dateStr).getTime() - IST_MS;
}
function addDays(dateStr: string, n: number): string {
  return new Date(dayBounds(dateStr).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}
function isWeekday(dateStr: string): boolean {
  const d = dayBounds(dateStr).getUTCDay();
  return d >= 1 && d <= 5;
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
      return { id: String(r._id), company: r.company_name || 'this company', college: code.get(String(r.college_id)) || '', at, time_label: istClockLabel(at) };
    })
    .sort((a, b) => a.at - b.at)
    .map(({ at: _at, ...c }) => c);
}

export type EmailCheckKind = 'signout' | 'login' | 'timed' | 'next_day';

export interface EmailCheckDecision {
  show: boolean;
  kind?: EmailCheckKind;
  check_date?: string;
  when_label?: string;          // 'today' | 'yesterday' | 'Friday'
  ask_no?: number;              // which evening question of the day this is (1 or 2)
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

export async function decideEmailCheck(
  userId: string | undefined,
  kind: EmailCheckKind,
  nowMs: number = Date.now()
): Promise<EmailCheckDecision> {
  const NO: EmailCheckDecision = { show: false };
  const el = await eligibleUser(userId);
  if (!el) return NO;
  const today = istDay(nowMs);
  if (!isWeekday(today)) return NO; // Monday-Friday only

  // ───────────────────────── tomorrow, on the Daily Tracker ─────────────────────────
  if (kind === 'next_day') {
    if (await EmailCheck.exists({ coordinator_id: el.id, next_day_prompted_on: today })) return NO; // once per day

    let d = today;
    let seen = 0;
    while (seen < LOOKBACK_WORKING_DAYS) {
      d = addDays(d, -1);
      if (d < START_DATE) break; // older days predate the feature
      if (!isWeekday(d)) continue; // weekends and holidays do not use up the lookback
      seen++;
      const rec: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: d }).lean();
      if (rec?.status === 'yes') continue; // that whole day was confirmed
      const calls = await inviteMailCalls(el, d);
      if (calls.length === 0) continue;

      await EmailCheck.updateOne(
        { coordinator_id: el.id, check_date: d },
        { $set: { next_day_prompted_on: today }, $setOnInsert: { status: 'pending', prompts: 0, last_moment: -1, dismissals: 0 } },
        { upsert: true }
      );
      return {
        show: true,
        kind: 'next_day',
        check_date: d,
        when_label: d === addDays(today, -1) ? 'yesterday' : weekdayName(d),
        calls,
        colleges: groupByCollege(calls),
      };
    }
    return NO;
  }

  // ───────────────────────── this evening ─────────────────────────
  if (istMinutes(nowMs) < EVENING_FROM_MIN) return NO; // before 5 PM nothing is asked, tomorrow covers it

  const rec: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: today }).lean();
  if (rec?.status === 'yes') return NO; // already confirmed - that is all for the day
  if ((rec?.prompts || 0) >= MAX_EVENING_ASKS) return NO; // two questions a day is the limit

  const snoozeAt = rec?.snooze_until ? new Date(rec.snooze_until).getTime() : null;
  if (snoozeAt !== null && nowMs < snoozeAt) return NO; // they chose a time - wait for it
  if (kind === 'timed' && snoozeAt === null) return NO; // "timed" only ever fires for a chosen time

  const calls = await inviteMailCalls(el, today);
  if (calls.length === 0) return NO;

  // Claim this question atomically. If a second tab claims in the same instant the upsert collides
  // with the unique index and throws, so exactly one of them shows it.
  let askNo = 1;
  try {
    const claimed: any = await EmailCheck.findOneAndUpdate(
      {
        coordinator_id: el.id,
        check_date: today,
        prompts: { $lt: MAX_EVENING_ASKS },
        $or: [{ last_prompt_at: { $exists: false } }, { last_prompt_at: null }, { last_prompt_at: { $lt: new Date(nowMs - PROMPT_GAP_MS) } }],
      },
      {
        $inc: { prompts: 1 },
        $set: { last_prompt_at: new Date(nowMs) },
        $unset: { snooze_until: '' },
        $setOnInsert: { status: 'pending', last_moment: -1, dismissals: 0 },
      },
      { new: true, upsert: true }
    ).lean();
    askNo = claimed?.prompts || 1;
  } catch {
    return NO;
  }

  return { show: true, kind, check_date: today, when_label: 'today', ask_no: askNo, calls, colleges: groupByCollege(calls) };
}

export interface AnswerInput {
  answer: 'yes' | 'no' | 'snooze';
  kind: EmailCheckKind;
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
  const oldest = addDays(today, -7);
  if (checkDate > today || checkDate < oldest) return { ok: false, error: 'BAD_DATE' };

  const ids = (input.call_ids || []).filter((i) => Types.ObjectId.isValid(i)).map((i) => new Types.ObjectId(i));
  const base = { coordinator_id: el.id, check_date: checkDate };
  // `dismissals` is deliberately left out of $setOnInsert - the "no" branch $inc's it, and Mongo refuses to
  // have both $inc and $setOnInsert touch one field.
  const onInsert = { $setOnInsert: { prompts: 0, last_moment: -1 } };
  const existing: any = await EmailCheck.findOne(base).lean();
  if (existing?.status === 'yes') return { ok: true }; // never downgrade a confirmation

  if (input.answer === 'snooze') {
    // A chosen time only makes sense for today's evening question.
    if (checkDate !== today) return { ok: false, error: 'BAD_DATE' };
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(input.remind_at || ''));
    if (!m) return { ok: false, error: 'BAD_TIME' };
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return { ok: false, error: 'BAD_TIME' };
    const at = istMidnightMs(today) + (h * 60 + min) * 60 * 1000;
    if (at <= nowMs) return { ok: false, error: 'TIME_IN_PAST' };
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

  // yes - the whole day is confirmed
  await EmailCheck.updateOne(
    base,
    {
      $set: { status: 'yes', answered_at: new Date(nowMs), answered_kind: input.kind === 'next_day' ? 'next_day' : 'due' },
      $addToSet: { confirmed_call_ids: { $each: ids } },
      $unset: { snooze_until: '' },
      ...onInsert,
    },
    { upsert: true }
  );
  return { ok: true };
}

const KINDS: EmailCheckKind[] = ['signout', 'login', 'timed', 'next_day'];

export function registerEmailCheckRoutes(app: Express) {
  app.get('/api/v1/email-check/status', async (req: Request, res: Response) => {
    try {
      const kind = KINDS.includes(req.query.kind as EmailCheckKind) ? (req.query.kind as EmailCheckKind) : 'login';
      const decision = await decideEmailCheck((req as any).user?.userId, kind);
      return res.json({ success: true, data: decision });
    } catch (err: any) {
      // never let this feature get in anyone's way - least of all sign-out or login
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
          kind: KINDS.includes(kind) ? kind : 'signout',
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
