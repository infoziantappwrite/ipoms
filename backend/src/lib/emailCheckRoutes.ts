import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { College } from '../models/College';
import { DailyTracker, PIPELINE_SYNC_OUTCOME } from '../models/DailyTracker';
import { EmailCheck } from '../models/EmailCheck';

/**
 * "Did you send all the emails for today's positives?" - asked at a few deliberate moments only, never
 * as a stream of popups during the working day.
 *
 * Who: Placement Coordinators and a normal Team Leader (Sujitha). NOT the Administrator and NOT a
 * full-oversight Team Leader (`has_all_colleges_access`, i.e. Malvika Kumar).
 * What it is about: Invite Mail calls (the "positive" outcome) in the person's focus colleges.
 * When: Monday-Friday only, on the SERVER clock (IST).
 *
 * TODAY's positives (closable, "Pick time" available):
 *   1. They click Sign out at or after 5:00 PM          ("signout")
 *   2. They log in again later the same day, after 5 PM  ("login")
 *   3. The time they picked for TODAY arrives            ("timed")
 *   At most TWO of these per day. Yes ends the day. Close / Esc leaves it for tomorrow.
 *   Pick time can choose TODAY or the NEXT WORKING DAY, and a date+time. Choosing the next working day
 *   means nothing at all is asked for the rest of today.
 *
 * YESTERDAY's positives - the previous working day only - are STRICT: Yes is the only way through. No
 * "Pick time", no close, and the Daily Tracker stays locked until they say Yes (the client offers a
 * "Leave the Daily Tracker" link so nobody is trapped). They appear:
 *   4. The moment the Daily Tracker is opened            ("next_day")
 *   5. At the date+time the person picked                 ("timed", historical) - on ANY page
 * Older days are never asked about, so a day's positives are settled today or tomorrow and never dragged on.
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
export function prevWorkingDay(dateStr: string): string {
  let d = addDays(dateStr, -1);
  while (!isWeekday(d)) d = addDays(d, -1);
  return d;
}
export function nextWorkingDay(dateStr: string): string {
  let d = addDays(dateStr, 1);
  while (!isWeekday(d)) d = addDays(d, 1);
  return d;
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
  /** Strict = about a PAST day: Yes only, no Pick time, cannot be closed. */
  strict?: boolean;
  check_date?: string;
  when_label?: string;          // 'today' | 'yesterday' | 'Friday'
  ask_no?: number;              // which evening question of the day this is (1 or 2)
  calls?: InviteCall[];         // the calls being asked about
  colleges?: { code: string; count: number }[];
  /** When nothing is due now but the person picked a time: when to check again (epoch ms). */
  remind_at?: number;
  /** The label of the next working day, so the client can offer it in Pick time. */
  next_working_day?: string;
}

function groupByCollege(calls: InviteCall[]): { code: string; count: number }[] {
  const m = new Map<string, number>();
  calls.forEach((c) => m.set(c.college, (m.get(c.college) || 0) + 1));
  return Array.from(m.entries())
    .filter(([code]) => code)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

function whenLabel(day: string, today: string): string {
  return day === addDays(today, -1) ? 'yesterday' : weekdayName(day);
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

  // The previous working day is the only past day that is ever asked about.
  const prev = prevWorkingDay(today);
  const prevInScope = prev >= START_DATE;
  const prevRec: any = prevInScope ? await EmailCheck.findOne({ coordinator_id: el.id, check_date: prev }).lean() : null;
  const prevOpen = prevInScope && prevRec?.status !== 'yes';
  const prevSnoozeAt = prevOpen && prevRec?.snooze_until ? new Date(prevRec.snooze_until).getTime() : null;

  const strictFor = async (): Promise<EmailCheckDecision> => {
    const calls = await inviteMailCalls(el, prev);
    if (calls.length === 0) return NO;
    return { show: true, kind, strict: true, check_date: prev, when_label: whenLabel(prev, today), calls, colleges: groupByCollege(calls) };
  };

  // ───────────────────────── yesterday, on the Daily Tracker ─────────────────────────
  if (kind === 'next_day') {
    if (!prevOpen) return NO;
    if (prevSnoozeAt !== null && nowMs < prevSnoozeAt) return NO; // they chose a time - wait for it
    return strictFor(); // asked every time the Daily Tracker is opened, until they say Yes
  }

  // ───────────────────────── a time the person picked ─────────────────────────
  if (kind === 'timed') {
    // (a) a date+time picked for yesterday's positives has arrived - strict, on any page
    if (prevOpen && prevSnoozeAt !== null) {
      if (nowMs >= prevSnoozeAt) {
        // claim by clearing the picked time, so two tabs cannot both show it
        const claimed = await EmailCheck.findOneAndUpdate(
          { coordinator_id: el.id, check_date: prev, snooze_until: prevRec.snooze_until },
          { $unset: { snooze_until: '' } },
          { new: false }
        ).lean();
        if (!claimed) return NO;
        return strictFor();
      }
    }
  }

  // ───────────────────────── this evening (today's positives) ─────────────────────────
  const rec: any = await EmailCheck.findOne({ coordinator_id: el.id, check_date: today }).lean();
  const snoozeAt = rec?.snooze_until ? new Date(rec.snooze_until).getTime() : null;

  // When nothing is due, tell the client the next moment worth asking again.
  const hint = (): EmailCheckDecision => {
    const at = [prevSnoozeAt, snoozeAt].filter((t): t is number => t !== null && t > nowMs);
    return at.length ? { show: false, remind_at: Math.min(...at) } : NO;
  };

  if (istMinutes(nowMs) < EVENING_FROM_MIN) return kind === 'timed' ? hint() : NO; // before 5 PM: tomorrow covers it
  if (rec?.status === 'yes') return NO; // already confirmed - that is all for the day
  if ((rec?.prompts || 0) >= MAX_EVENING_ASKS) return NO; // two questions a day is the limit
  if (snoozeAt !== null && nowMs < snoozeAt) return kind === 'timed' ? hint() : NO; // they chose a time - wait for it
  if (kind === 'timed' && snoozeAt === null) return hint(); // "timed" only ever fires for a chosen time

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

  return {
    show: true,
    kind,
    check_date: today,
    when_label: 'today',
    ask_no: askNo,
    calls,
    colleges: groupByCollege(calls),
    next_working_day: nextWorkingDay(today),
  };
}

export interface AnswerInput {
  answer: 'yes' | 'no' | 'snooze';
  kind: EmailCheckKind;
  call_ids?: string[];
  /** 'HH:MM' in IST, for answer === 'snooze'. */
  remind_at?: string;
  /** 'YYYY-MM-DD' in IST: today, or the next working day. Defaults to today. */
  remind_date?: string;
}

export interface AnswerResult {
  ok: boolean;
  error?: string;
  remind_at_label?: string;
  remind_at_ms?: number;
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
  if (checkDate > today || checkDate < addDays(today, -7)) return { ok: false, error: 'BAD_DATE' };

  const ids = (input.call_ids || []).filter((i) => Types.ObjectId.isValid(i)).map((i) => new Types.ObjectId(i));
  const base = { coordinator_id: el.id, check_date: checkDate };
  // `dismissals` is deliberately left out of $setOnInsert - the "no" branch $inc's it, and Mongo refuses to
  // have both $inc and $setOnInsert touch one field.
  const onInsert = { $setOnInsert: { prompts: 0, last_moment: -1 } };
  const existing: any = await EmailCheck.findOne(base).lean();
  if (existing?.status === 'yes') return { ok: true }; // never downgrade a confirmation

  if (input.answer === 'snooze') {
    // A chosen time is only offered for TODAY's positives, never for a past day.
    if (checkDate !== today) return { ok: false, error: 'BAD_DATE' };
    const remindDate = input.remind_date || today;
    if (remindDate !== today && remindDate !== nextWorkingDay(today)) return { ok: false, error: 'BAD_DATE' };
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(input.remind_at || ''));
    if (!m) return { ok: false, error: 'BAD_TIME' };
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return { ok: false, error: 'BAD_TIME' };
    const at = istMidnightMs(remindDate) + (h * 60 + min) * 60 * 1000;
    if (at <= nowMs) return { ok: false, error: 'TIME_IN_PAST' };
    await EmailCheck.updateOne(
      base,
      { $set: { snooze_until: new Date(at), snooze_set_at: new Date(nowMs), status: 'pending' }, ...onInsert },
      { upsert: true }
    );
    return { ok: true, remind_at_label: istClockLabel(at), remind_at_ms: at };
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
      // never let this feature get in anyone's way - least of all sign-out, login or the Daily Tracker
      console.error('GET /email-check/status error:', err?.message);
      return res.json({ success: true, data: { show: false } });
    }
  });

  app.post('/api/v1/email-check/answer', async (req: Request, res: Response) => {
    try {
      const { check_date, answer, kind, call_ids, remind_at, remind_date } = req.body || {};
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
          remind_date: typeof remind_date === 'string' ? remind_date : undefined,
        }
      );
      if (!result.ok) {
        const message =
          result.error === 'TIME_IN_PAST'
            ? 'Please choose a time later than now.'
            : result.error === 'BAD_TIME'
            ? 'Please choose a valid time.'
            : result.error === 'BAD_DATE'
            ? 'Please choose today or the next working day.'
            : 'Could not save your answer.';
        return res.status(400).json({ success: false, error: { code: result.error || 'VALIDATION_ERROR', message } });
      }
      return res.json({ success: true, data: { remind_at_label: result.remind_at_label, remind_at_ms: result.remind_at_ms } });
    } catch (err: any) {
      console.error('POST /email-check/answer error:', err?.message);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not save your answer.' } });
    }
  });
}
