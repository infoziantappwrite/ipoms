'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Phone, Trash2 } from 'lucide-react';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';
import { triggerHaptic } from '@/lib/haptics';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { RowOutcomeDropdown } from './RowOutcomeDropdown';
import { RowMonthDropdown } from './RowMonthDropdown';

const OUTCOMES: { value: CallOutcome; label: string; color: string }[] = [
  { value: 'jd_received', label: 'JD Received', color: 'text-primary' },
  { value: 'hiring_freezed', label: 'Hiring Freezed', color: 'text-warning' },
  { value: 'hiring_completed', label: 'Hiring Completed', color: 'text-info' },
  { value: 'call_back', label: 'Call Back', color: 'text-warning' },
  { value: 'hiring', label: 'Hiring', color: 'text-success' },
  { value: 'invite_mail', label: 'Invite Mail', color: 'text-primary' },
  { value: 'not_hiring', label: 'Not Hiring', color: 'text-destructive font-semibold' },
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
  index?: number;
  isReadOnly: boolean;
  onUpdate: (patch: Partial<TrackerRowType>) => void;
  onDelete: () => void;
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

export function TrackerRow({ row, index, isReadOnly, onUpdate, onDelete, onCall }: Props) {
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

  // ── Spacebar handler for Start Time (Spacebar fills Start Time)
  const handleStartTimeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      const now = nowISO();
      if (startTimeRef.current) {
        startTimeRef.current.value = formatTime(now);
      }
      onUpdate({ call_start_time: now });
    }
    // Delete key clears the field
    if (e.key === 'Delete') {
      e.preventDefault();
      if (startTimeRef.current) startTimeRef.current.value = '';
      onUpdate({ call_start_time: undefined });
    }
  }, [onUpdate]);

  // ── Enter key: save row and move focus
  const handleKeyDownEnter = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Trigger blur update explicitly
      handleStartTimeBlur();
      // Focus next row's Start Time cell
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

  // ── Call Outcome selection: captures End Time automatically
  const handleOutcomeChange = useCallback((value: string) => {
    if (!value) return;
    triggerHaptic('selection');
    const outcome = value as CallOutcome;
    const now = nowISO();
    const startTimePatch = !row.call_start_time ? { call_start_time: now } : {};
    if (startTimeRef.current && !startTimeRef.current.value) {
      startTimeRef.current.value = formatTime(now);
    }
    if (outcome !== 'follow_up') {
      onUpdate({ ...startTimePatch, outcome_status: outcome, follow_up_month: null });
    } else {
      onUpdate({ ...startTimePatch, outcome_status: outcome });
    }
  }, [onUpdate, row.call_start_time]);

  // ── Follow Up Month selection (Only enabled when outcome === follow_up)
  const handleMonthChange = useCallback((month: string) => {
    triggerHaptic('selection');
    onUpdate({ follow_up_month: month || null });
  }, [onUpdate]);

  // ── Comments blur: persist to server (max 200 chars)
  const handleCommentsBlur = useCallback(() => {
    const text = (commentsRef.current?.value ?? '').slice(0, 200);
    onUpdate({ comments: text });
  }, [onUpdate]);

  return (
    <div
      data-row-id={row._id}
      className={`grid grid-cols-[48px_110px_95px_95px_240px_140px_150px_180px_180px_150px_minmax(260px,1fr)_64px] divide-x divide-border/60 min-h-[44px] text-xs ${rowBg} hover:bg-primary/5 focus-within:bg-primary/5 transition-colors group border-b border-border`}
    >
      {/* S.No / # */}
      <div className="px-2 py-2 text-center text-fg-subtle tabular-nums flex items-center justify-center font-medium">
        {index ?? row.serial_no}
      </div>

      {/* Start Time */}
      <div className="px-2 py-1.5 flex items-center">
        {isReadOnly ? (
          <span className="text-fg-muted text-xs tabular-nums">{formatTime(row.call_start_time)}</span>
        ) : (
          <input
            ref={startTimeRef}
            data-field="start_time"
            type="text"
            defaultValue={formatTime(row.call_start_time)}
            placeholder="Time"
            onKeyDown={(e) => { handleStartTimeKeyDown(e); handleKeyDownEnter(e); }}
            onBlur={handleStartTimeBlur}
            title="Type 8:52, 08:52, or 8:52 AM • Spacebar fills current time"
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:bg-surface px-1.5 py-1 rounded text-fg placeholder-fg-subtle transition-colors cursor-text text-xs tabular-nums"
          />
        )}
      </div>

      {/* End Time */}
      <div className="px-2.5 py-2 text-fg-subtle tabular-nums text-xs flex items-center truncate">
        {formatTime(row.call_end_time) || (
          <span className="text-fg-muted italic">auto</span>
        )}
      </div>

      {/* Duration */}
      <div className="px-2.5 py-2 text-fg-subtle tabular-nums text-xs flex items-center truncate">
        {row.duration_formatted || (
          <span className="text-fg-muted">—</span>
        )}
      </div>

      {/* Company Name */}
      <div className="px-2.5 py-2 text-fg font-semibold break-words leading-tight flex items-center" title={row.company_name}>
        {row.company_name}
      </div>

      {/* HR Name */}
      <div className="px-2.5 py-2 text-fg-muted overflow-hidden min-w-0 flex items-center" title={row.hr_name}>
        <span className="truncate block">{row.hr_name || '—'}</span>
      </div>

      {/* Contact */}
      <div className="px-2.5 py-2 text-fg-muted font-mono tabular-nums flex items-center gap-1.5 group/contact min-w-0">
        {row.mobile_number && (
          <div className="flex items-center gap-1 shrink-0">
            {!isReadOnly ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onCall?.(row);
                }}
                title={`Click to call ${row.hr_name || row.company_name} (${row.mobile_number})`}
                className="w-5 h-5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 dark:border-blue-400/60 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all hover:scale-110 active:scale-90 cursor-pointer shrink-0 shadow-2xs"
              >
                <Phone size={11} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />
              </button>
            ) : (
              <div className="w-5 h-5 rounded-md bg-blue-500/15 border border-blue-500/40 dark:border-blue-400/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Phone size={11} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />
              </div>
            )}

            <WhatsAppButton
              mobileNumber={row.mobile_number}
              contactName={row.hr_name}
              companyName={row.company_name}
            />
          </div>
        )}
        <span className="truncate min-w-0">{row.mobile_number}</span>
      </div>

      {/* Email ID */}
      <div className="px-2.5 py-2 overflow-hidden min-w-0 flex items-center" title={row.email_id || ''}>
        {row.email_id ? (
          <span className="text-fg-subtle truncate block text-xs w-full">{row.email_id}</span>
        ) : (
          <span className="text-fg-muted italic text-xs">—</span>
        )}
      </div>

      {/* Call Status */}
      <div className="px-2 py-1.5 min-w-0 flex items-center">
        {isReadOnly ? (
          <OutcomeBadge outcome={row.outcome_status} />
        ) : (
          <RowOutcomeDropdown
            value={row.outcome_status}
            onChange={(val) => handleOutcomeChange(val as CallOutcome)}
          />
        )}
      </div>

      {/* Follow Up */}
      <div className="px-2 py-1.5 min-w-0 flex items-center">
        {isReadOnly ? (
          <span className="text-xs text-fg-subtle px-1">
            {row.outcome_status === 'follow_up' && row.follow_up_month ? row.follow_up_month : '—'}
          </span>
        ) : (
          <RowMonthDropdown
            value={row.outcome_status === 'follow_up' ? row.follow_up_month : null}
            disabled={row.outcome_status !== 'follow_up'}
            onChange={(month) => handleMonthChange(month)}
          />
        )}
      </div>

      {/* Comments */}
      <div className="px-2.5 py-1.5 min-w-0 flex items-center">
        {isReadOnly ? (
          <p className="text-fg-subtle italic text-xs break-words leading-relaxed whitespace-pre-wrap">
            {row.comments || '—'}
          </p>
        ) : (
          <textarea
            ref={commentsRef as any}
            defaultValue={row.comments ?? ''}
            maxLength={200}
            placeholder="Optional notes (max 200 chars)…"
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
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:bg-surface px-1.5 py-1 rounded text-fg placeholder-fg-subtle transition-colors resize-none break-words leading-relaxed text-xs outline-none focus:ring-1 focus:ring-primary/30"
          />
        )}
      </div>

      {/* Actions */}
      <div className="px-2 py-2 flex items-center justify-center">
        {!isReadOnly && (
          <button
            onClick={() => {
              triggerHaptic('medium');
              onDelete();
            }}
            title="Delete this contact row from today's tracker"
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-all active:scale-90 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome?: CallOutcome }) {
  if (!outcome) return <span className="text-fg-muted italic text-xs px-1">—</span>;
  const o = OUTCOMES.find((o) => o.value === outcome);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full bg-surface ${o?.color ?? 'text-fg-subtle'}`}>
      {o?.label ?? outcome}
    </span>
  );
}
