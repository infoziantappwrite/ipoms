const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * Daily Tracker's follow_up_month is just a bare month name with no year
 * ("November"), so on its own it can't say which November. This resolves it
 * to a real date: the 1st of the next occurrence of that month at or after
 * `referenceDate` — same month/year if referenceDate hasn't passed it yet
 * this cycle, otherwise the same month next year. `referenceDate` should be
 * the date the follow-up was actually logged (session_date), not "now" —
 * that's what lets a backfill over old rows land on the year the coordinator
 * really meant, not always "the next one from today".
 */
export function computeFollowUpDueDate(monthName: string | null | undefined, referenceDate: Date = new Date()): Date | null {
  if (!monthName) return null;
  const idx = MONTH_NAMES.indexOf(monthName.trim().toLowerCase());
  if (idx === -1) return null;

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth(); // 0-11
  const year = idx >= refMonth ? refYear : refYear + 1;
  return new Date(Date.UTC(year, idx, 1));
}

/**
 * A coordinator picking a follow-up date is always looking forward — a past
 * date can't be what they meant. Returns an error message if `dateStr` is a
 * real date earlier than today, else null (also null for an unparsable
 * value, since callers separately require the field to be present).
 * Mirrors the same rule already enforced for Weekly Tracker's follow_up_date.
 */
export function followUpDatePastError(dateStr: string | Date): string | null {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const followUpDayEnd = new Date(parsed);
  followUpDayEnd.setHours(23, 59, 59, 999);
  if (followUpDayEnd < startOfToday) {
    return 'Follow-up date cannot be in the past. Please select today or an upcoming date.';
  }
  return null;
}
