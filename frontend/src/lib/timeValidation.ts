/**
 * Time and Duration Validation Utilities for Daily Tracker
 * Strictly parses, validates, auto-forecasts AM/PM, and formats minutes-level durations.
 */

export interface ParsedTimeResult {
  valid: boolean;
  iso: string;
  formatted: string; // e.g. "09:30 AM" or "02:45 PM"
  hours: number;
  minutes: number;
  seconds: number;
  period: 'AM' | 'PM';
  error?: string;
}

/**
 * Format a Date (or ISO string) as HH:MM AM/PM in Indian Standard Locale
 */
export function formatTime(d: string | Date | undefined | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Get current system time as ISO string for submission to API
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Formats duration from total seconds to minutes level: "02m 45s", "00m 30s", "45m 12s"
 * Strictly follows the rule: Maximum in a minutes level not in an hour level.
 */
export function formatDurationMinutesLevel(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) return '—';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

// ── Calling Window Rules (7:00 AM to 8:00 PM IST) ──────────────────────────
export const CALLING_WINDOW = {
  START_HOUR: 7, // 07:00 AM
  END_HOUR: 20,  // 08:00 PM (20:00)
  MIN_MINUTES: 7 * 60,   // 420 (07:00 AM)
  MAX_MINUTES: 20 * 60,  // 1200 (08:00 PM)
};

/**
 * Smart parse user time input into a strictly validated time.
 * Rules:
 * 1. Calling Window: Calls and Daily Tracker entries are strictly allowed ONLY from 7:00 AM to 8:00 PM.
 *    Any time before 7:00 AM or after 8:00 PM is rejected.
 * 2. Intelligent AM/PM Forecast:
 *    - Hours 8, 9, 10, 11 -> Automatically forecast to AM (08:00 AM - 11:59 AM) because 9-11 PM is outside calling hours.
 *    - Hours 1, 2, 3, 4, 5, 6 -> Automatically forecast to PM (01:00 PM - 06:59 PM) because 1-6 AM is outside calling hours.
 *    - Hour 12 -> 12:00 PM (Noon).
 *    - Hour 7 -> Forecasts to 07:00 AM in morning, 07:00 PM in evening.
 *    - Hour 8 -> Forecasts to 08:00 AM in morning, 08:00 PM (closing) in evening.
 * 3. Rejects invalid strings (e.g. "83454", "abc", numbers > 4 digits, out-of-bounds times).
 */
export function smartParseTime(input: string | undefined | null, baseDate?: Date): ParsedTimeResult | null {
  if (!input || !input.trim()) return null;
  const raw = input.trim();

  // 1. Detect explicit AM / PM or A / P
  let explicitPeriod: 'AM' | 'PM' | null = null;
  if (/\b(am|a)\b/i.test(raw) || raw.toUpperCase().endsWith('AM') || raw.toUpperCase().endsWith('A')) {
    explicitPeriod = 'AM';
  } else if (/\b(pm|p)\b/i.test(raw) || raw.toUpperCase().endsWith('PM') || raw.toUpperCase().endsWith('P')) {
    explicitPeriod = 'PM';
  }

  // 2. Extract digits only for hour & minute
  const clean = raw.replace(/[a-zA-Z]/g, '').trim();

  // Strictly reject non-time characters (must only contain digits, colons, dots, spaces)
  if (!/^[\d:.\s]+$/.test(clean)) {
    return null;
  }

  let parts = clean.split(/[:.\s]+/).filter(Boolean).map(Number);

  // If entered as a contiguous digit string (e.g. "9", "09", "938", "1030", "1430")
  if (parts.length === 1 && !isNaN(parts[0])) {
    const numStr = parts[0].toString();
    if (numStr.length === 1 || numStr.length === 2) {
      parts = [parseInt(numStr, 10), 0];
    } else if (numStr.length === 3) {
      parts = [parseInt(numStr[0], 10), parseInt(numStr.slice(1), 10)];
    } else if (numStr.length === 4) {
      parts = [parseInt(numStr.slice(0, 2), 10), parseInt(numStr.slice(2), 10)];
    } else {
      // 5 or more contiguous digits like "83454" is strictly INVALID!
      return null;
    }
  }

  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return null;
  }

  let h = parts[0];
  const m = parts[1];
  const s = parts[2] != null && !isNaN(parts[2]) ? parts[2] : 0;

  // Validation bounds:
  // Minutes must be 0-59, Seconds must be 0-59
  if (m < 0 || m > 59 || s < 0 || s > 59) {
    return null;
  }

  // Hours bounds check:
  if (explicitPeriod) {
    // 12-hour clock validation: 1-12 (or 0 -> 12)
    if (h < 0 || h > 12) return null;
    if (h === 0) h = 12;
  } else {
    // 24-hour clock validation: 0-23
    if (h < 0 || h > 23) return null;
  }

  // 3. Handle 24-hour inputs (e.g. 14:30 -> 2:30 PM, 20:00 -> 8:00 PM)
  if (h >= 13 && h <= 23) {
    explicitPeriod = 'PM';
    h = h - 12;
  } else if (h === 0) {
    explicitPeriod = 'AM';
    h = 12;
  }

  // 4. Auto-forecast AM/PM within the 7:00 AM - 8:00 PM calling window
  const now = baseDate ? new Date(baseDate) : new Date();
  let period: 'AM' | 'PM';

  if (explicitPeriod) {
    period = explicitPeriod;
  } else {
    // Calling hours context:
    // Hours 8, 9, 10, 11 are morning calling hours (8:00 AM - 11:59 AM)
    // Hours 1, 2, 3, 4, 5, 6 are afternoon/evening calling hours (1:00 PM - 6:59 PM)
    // Hour 12 is Noon (12:00 PM)
    // Hour 7 & 8: if live time is after 12 PM, default to PM; otherwise AM
    if (h >= 8 && h <= 11) {
      period = 'AM';
    } else if (h === 12 || (h >= 1 && h <= 6)) {
      period = 'PM';
    } else if (h === 7 || h === 8) {
      period = now.getHours() >= 12 ? 'PM' : 'AM';
    } else {
      period = now.getHours() >= 12 ? 'PM' : 'AM';
    }
  }

  // 5. Convert to 24-hour clock for Date object and window checking
  let hour24 = h;
  if (period === 'PM' && h < 12) hour24 = h + 12;
  if (period === 'AM' && h === 12) hour24 = 0;

  // 6. Enforce strict calling window: 7:00 AM (420 mins) to 8:00 PM (1200 mins)
  const totalMinutes = hour24 * 60 + m;
  if (totalMinutes < CALLING_WINDOW.MIN_MINUTES || totalMinutes > CALLING_WINDOW.MAX_MINUTES) {
    // Outside calling hours (7:00 AM - 8:00 PM)
    return null;
  }

  const targetDate = baseDate ? new Date(baseDate) : new Date();
  targetDate.setHours(hour24, m, s, 0);

  const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;

  return {
    valid: true,
    iso: targetDate.toISOString(),
    formatted,
    hours: h,
    minutes: m,
    seconds: s,
    period,
  };
}
