'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Phone } from 'lucide-react';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';

const OUTCOMES: { value: CallOutcome; label: string; color: string }[] = [
  { value: 'jd_received', label: 'JD Received', color: 'text-primary' },
  { value: 'hiring_freezed', label: 'Hiring Freezed', color: 'text-warning' },
  { value: 'hiring_completed', label: 'Hiring Completed', color: 'text-info' },
  { value: 'call_back', label: 'Call Back', color: 'text-warning' },
  { value: 'hiring', label: 'Hiring', color: 'text-success' },
  { value: 'invite_mail', label: 'Invite Mail', color: 'text-primary' },
  { value: 'not_hiring', label: 'Not Hiring', color: 'text-fg-subtle' },
  { value: 'no_response', label: 'No Response', color: 'text-destructive' },
  { value: 'follow_up', label: 'Follow Up', color: 'text-warning font-semibold' },
  { value: 'in_connect', label: 'In Connect', color: 'text-primary' },
  { value: 'invalid', label: 'Invalid', color: 'text-fg-subtle' },
  { value: 'drive_completed', label: 'Drive Completed', color: 'text-success' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Row tint per outcome using subtle tokens.
 */
const OUTCOME_ROW_COLORS: Record<CallOutcome | 'none', string> = {
  none: '',
  jd_received: 'bg-primary-subtle',
  hiring_freezed: 'bg-warning-subtle',
  hiring_completed: 'bg-info-subtle',
  call_back: 'bg-warning-subtle',
  hiring: 'bg-success-subtle',
  invite_mail: 'bg-primary-subtle',
  not_hiring: 'bg-surface-sunken',
  no_response: 'bg-destructive-subtle',
  follow_up: 'bg-warning-subtle',
  in_connect: 'bg-primary-subtle',
  invalid: 'bg-surface-sunken',
  drive_completed: 'bg-success-subtle',
};

interface Props {
  row: TrackerRowType;
  isReadOnly: boolean;
  onUpdate: (patch: Partial<TrackerRowType>) => void;
  onSkip: () => void;
  onCall?: (row: TrackerRowType) => void;
}

// Format a Date (or ISO string) as HH:MM AM/PM per user preference
function formatTime(d: string | Date | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Get current time as ISO string for submission to API
function nowISO(): string {
  return new Date().toISOString();
}

// Smart time parser: predicts AM/PM from system time if omitted, accepts 852, 08:52, 8.52, etc.
function smartParseTime(input: string): { iso: string; formatted: string } | null {
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
  let parts = clean.split(/[:.]/).map(Number);

  if (parts.length === 1 && !isNaN(parts[0])) {
    const numStr = parts[0].toString();
    if (numStr.length === 3) {
      parts = [parseInt(numStr[0], 10), parseInt(numStr.slice(1), 10)];
    } else if (numStr.length === 4) {
      parts = [parseInt(numStr.slice(0, 2), 10), parseInt(numStr.slice(2), 10)];
    }
  }

  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return null;
  }

  let h = parts[0];
  const m = Math.min(59, Math.max(0, parts[1]));
  const s = parts[2] ? Math.min(59, Math.max(0, parts[2])) : 0;

  // 3. Handle 24-hour inputs (e.g. 14:30 -> 2:30 PM)
  if (h >= 13 && h <= 23) {
    explicitPeriod = 'PM';
    h = h - 12;
  } else if (h === 0) {
    explicitPeriod = 'AM';
    h = 12;
  }

  // 4. If period was not explicitly typed, predict from system time
  const now = new Date();
  const systemPeriod: 'AM' | 'PM' = now.getHours() >= 12 ? 'PM' : 'AM';
  const period = explicitPeriod || systemPeriod;

  // 5. Convert to 24-hour hour for Date object
  let hour24 = h;
  if (period === 'PM' && h < 12) hour24 = h + 12;
  if (period === 'AM' && h === 12) hour24 = 0;

  const targetDate = new Date();
  targetDate.setHours(hour24, m, s, 0);

  const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  return {
    iso: targetDate.toISOString(),
    formatted,
  };
}

export function TrackerRow({ row, isReadOnly, onUpdate, onSkip, onCall }: Props) {
  const startTimeRef = useRef<HTMLInputElement>(null);
  const commentsRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const rowBg = row.is_skipped
    ? 'bg-background/20 opacity-50'
    : OUTCOME_ROW_COLORS[row.outcome_status ?? 'none'];

  useEffect(() => {
    if (commentsRef.current && commentsRef.current.value !== (row.comments ?? '')) {
      commentsRef.current.value = row.comments ?? '';
    }
  }, [row.comments]);

  // ── Spacebar handler for Start Time (Spec 11 — Spacebar fills Start Time)
  const handleStartTimeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      const now = nowISO();
      if (startTimeRef.current) {
        startTimeRef.current.value = formatTime(now);
      }
      onUpdate({ call_start_time: now });
    }
    // Delete key clears the field (spec)
    if (e.key === 'Delete') {
      e.preventDefault();
      if (startTimeRef.current) startTimeRef.current.value = '';
      onUpdate({ call_start_time: undefined });
    }
  }, [onUpdate]);

  // ── Enter key: save row and move focus (Spec 11 — Enter saves & advances)
  const handleKeyDownEnter = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Trigger blur update explicitly
      handleStartTimeBlur();
      // Focus next row's Start Time cell — traverse the DOM
      const currentRow = (e.currentTarget as HTMLElement).closest('[data-row-id]');
      if (currentRow) {
        const nextRow = currentRow.nextElementSibling as HTMLElement;
        if (nextRow) {
          const nextStart = nextRow.querySelector<HTMLElement>('[data-field="start_time"]');
          if (nextStart) nextStart.focus();
        }
      }
    }
  }, []);

  // ── Start Time blur: smart-parse time, auto-predict AM/PM, format input, persist
  const handleStartTimeBlur = useCallback(() => {
    const val = startTimeRef.current?.value?.trim();
    if (!val) return;

    const parsed = smartParseTime(val);
    if (parsed) {
      if (startTimeRef.current) {
        startTimeRef.current.value = parsed.formatted;
      }
      onUpdate({ call_start_time: parsed.iso });
    }
  }, [onUpdate]);

  // ── Call Outcome selection: captures End Time automatically (Spec 10.3)
  const handleOutcomeChange = useCallback((value: string) => {
    if (!value) return;
    const outcome = value as CallOutcome;
    if (outcome !== 'follow_up') {
      onUpdate({ outcome_status: outcome, follow_up_month: null });
    } else {
      onUpdate({ outcome_status: outcome });
    }
  }, [onUpdate]);

  // ── Follow Up Month selection (Only enabled when outcome === follow_up)
  const handleMonthChange = useCallback((month: string) => {
    onUpdate({ follow_up_month: month || null });
  }, [onUpdate]);

  // ── Comments blur: persist to server
  const handleCommentsBlur = useCallback(() => {
    onUpdate({ comments: commentsRef.current?.value ?? '' });
  }, [onUpdate]);

  if (row.is_skipped && !isReadOnly) {
    // Skipped rows: show dimmed with skip badge
    return (
      <div
        data-row-id={row._id}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs ${rowBg} border-b border-border/30`}
      >
        <div className="w-12 px-1 text-center text-fg-muted shrink-0">{row.serial_no}</div>
        <div className="flex-1 text-fg-muted line-through px-1">{row.company_name} — {row.hr_name}</div>
        <span className="text-fg-muted bg-surface px-2 py-0.5 rounded-full text-xs">Skipped</span>
      </div>
    );
  }

  return (
    <div
      data-row-id={row._id}
      className={`flex items-start gap-1 px-2 py-2 min-h-[42px] text-xs ${rowBg} hover:bg-surface/30 transition-colors group`}
    >
      {/* S.No / # */}
      <div className="w-12 px-1 text-center text-fg-subtle shrink-0 tabular-nums">{row.serial_no}</div>

      {/* Start Time — manual, spacebar inserts now (Spec 10.2) */}
      <div className="w-28 shrink-0">
        {isReadOnly ? (
          <span className="px-1 text-fg-muted">{formatTime(row.call_start_time)}</span>
        ) : (
          <input
            ref={startTimeRef}
            data-field="start_time"
            type="text"
            defaultValue={formatTime(row.call_start_time)}
            placeholder="HH:MM AM"
            onKeyDown={(e) => { handleStartTimeKeyDown(e); handleKeyDownEnter(e); }}
            onBlur={handleStartTimeBlur}
            title="Type 8:52, 08:52, or 8:52 AM • Spacebar fills current time"
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:bg-surface px-1.5 py-1 rounded text-fg placeholder-fg-subtle
                       transition-colors cursor-text"
          />
        )}
      </div>

      {/* End Time — auto-locked (Spec 10.3) */}
      <div className="w-28 shrink-0 px-1 text-fg-subtle tabular-nums">
        {formatTime(row.call_end_time) || (
          <span className="text-fg-muted italic">auto</span>
        )}
      </div>

      {/* Duration — auto-computed (Spec 10.4) */}
      <div className="w-20 shrink-0 px-1 text-fg-subtle tabular-nums">
        {row.duration_formatted || (
          <span className="text-fg-muted">—</span>
        )}
      </div>

      {/* Company Name — wraps gracefully beyond 35 chars without overlapping */}
      <div className="w-[250px] shrink-0 px-1 text-fg font-semibold break-words leading-tight" title={row.company_name}>
        {row.company_name}
      </div>

      {/* HR Name — pre-filled */}
      <div className="w-36 shrink-0 px-1 text-fg-muted truncate" title={row.hr_name}>
        {row.hr_name}
      </div>

      {/* Contact (Mobile Number) with 1-Click Call Icon */}
      <div className="w-32 shrink-0 px-1 text-fg-muted font-mono tabular-nums flex items-center gap-1.5 group/contact">
        {!isReadOnly && row.mobile_number && (
          <button
            type="button"
            onClick={() => onCall?.(row)}
            title={`Click to call ${row.hr_name || row.company_name} (${row.mobile_number})`}
            className="w-5 h-5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200
                       text-emerald-700 flex items-center justify-center transition-all opacity-70 hover:opacity-100 hover:scale-110 cursor-pointer shrink-0 shadow-2xs"
          >
            <Phone size={10} strokeWidth={2.5} />
          </button>
        )}
        <span className="truncate">{row.mobile_number}</span>
      </div>

      {/* Email ID — optional */}
      <div className="w-40 shrink-0 px-1 truncate" title={row.email_id || ''}>
        {row.email_id ? (
          <span className="text-fg-subtle">{row.email_id}</span>
        ) : (
          <span className="text-fg-muted italic">—</span>
        )}
      </div>

      {/* Call Outcome / Status — mandatory before row complete (Spec 12) */}
      <div className="w-44 shrink-0">
        {isReadOnly ? (
          <OutcomeBadge outcome={row.outcome_status} />
        ) : (
          <select
            value={row.outcome_status ?? ''}
            onChange={(e) => handleOutcomeChange(e.target.value)}
            onKeyDown={handleKeyDownEnter}
            className={`w-full bg-surface/80 border border-border-strong rounded px-1.5 py-1 text-xs
                        cursor-pointer
                        ${row.outcome_status ? getOutcomeColor(row.outcome_status) : 'text-fg-subtle'}`}
          >
            <option value="">— Select Outcome —</option>
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value} className={o.color}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Follow Up — 12 Months Dropdown (Enabled ONLY when Outcome is Follow Up) */}
      <div className="w-36 shrink-0">
        {isReadOnly ? (
          <span className="text-xs text-fg-subtle px-1">
            {row.outcome_status === 'follow_up' && row.follow_up_month ? row.follow_up_month : '—'}
          </span>
        ) : row.outcome_status === 'follow_up' ? (
          <select
            value={row.follow_up_month ?? ''}
            onChange={(e) => handleMonthChange(e.target.value)}
            onKeyDown={handleKeyDownEnter}
            className="w-full bg-warning-subtle/50 border border-warning/70 text-warning-strong font-medium rounded px-1.5 py-1 text-xs cursor-pointer focus:ring-1 focus:ring-warning"
          >
            <option value="">— Pick Month —</option>
            {MONTHS.map((m) => (
              <option key={m} value={m} className="text-fg bg-surface">
                {m}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full text-center text-fg-muted/40 text-xs py-1 select-none font-mono">
            —
          </div>
        )}
      </div>

      {/* Comments — wraps at ~35 chars, expands height, shows full text */}
      <div className="flex-1 min-w-[180px] shrink-0">
        {isReadOnly ? (
          <p className="px-1 text-fg-subtle italic text-xs break-words leading-relaxed whitespace-pre-wrap">
            {row.comments || '—'}
          </p>
        ) : (
          <textarea
            ref={commentsRef as any}
            defaultValue={row.comments ?? ''}
            placeholder="Optional notes…"
            rows={row.comments && row.comments.length > 35 ? Math.min(4, Math.ceil(row.comments.length / 35)) : 1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommentsBlur();
                handleKeyDownEnter(e);
              }
            }}
            onBlur={handleCommentsBlur}
            onInput={(e) => {
              const target = e.currentTarget;
              target.style.height = 'auto';
              target.style.height = `${Math.max(28, target.scrollHeight)}px`;
            }}
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:bg-surface px-1.5 py-1 rounded text-fg placeholder-fg-subtle
                       transition-colors resize-none break-words leading-relaxed text-xs outline-none focus:ring-1 focus:ring-primary/30"
          />
        )}
      </div>

      {/* Actions — Skip button (Spec Section 8) */}
      <div className="w-16 shrink-0 flex justify-center">
        {!isReadOnly && !row.is_skipped && (
          <button
            onClick={onSkip}
            title="Skip this contact for today (will NOT delete from Master Database)"
            className="opacity-0 group-hover:opacity-100 text-fg-subtle hover:text-destructive
                       transition-all text-xs px-1.5 py-1 rounded hover:bg-destructive/20"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

// ── Helper: outcome badge for read-only mode
function OutcomeBadge({ outcome }: { outcome?: CallOutcome }) {
  if (!outcome) return <span className="text-fg-muted italic text-xs px-1">—</span>;
  const o = OUTCOMES.find((o) => o.value === outcome);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full bg-surface ${o?.color ?? 'text-fg-subtle'}`}>
      {o?.label ?? outcome}
    </span>
  );
}

function getOutcomeColor(outcome: CallOutcome): string {
  const map: Record<CallOutcome, string> = {
    jd_received: 'text-primary font-bold',
    hiring_freezed: 'text-warning font-semibold',
    hiring_completed: 'text-info font-semibold',
    call_back: 'text-warning font-semibold',
    hiring: 'text-success font-bold',
    invite_mail: 'text-primary font-bold',
    not_hiring: 'text-fg-subtle',
    no_response: 'text-destructive',
    follow_up: 'text-warning font-bold',
    in_connect: 'text-primary font-semibold',
    invalid: 'text-fg-subtle',
    drive_completed: 'text-success font-bold',
  };
  return map[outcome] ?? 'text-fg-muted';
}
