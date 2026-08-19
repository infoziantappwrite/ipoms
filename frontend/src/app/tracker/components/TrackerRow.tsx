'use client';

import { useRef, useCallback } from 'react';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';

const OUTCOMES: { value: CallOutcome; label: string; color: string }[] = [
  { value: 'no_response', label: 'No Response', color: 'text-destructive' },
  { value: 'invalid', label: 'Invalid', color: 'text-fg-subtle' },
  { value: 'not_hiring', label: 'Not Hiring', color: 'text-fg-subtle' },
  { value: 'already_connected', label: 'Already Connected', color: 'text-fg-subtle' },
  { value: 'follow_up', label: 'Follow Up', color: 'text-warning' },
  { value: 'invite_mail', label: 'Invite Mail', color: 'text-primary' },
  { value: 'drive_scheduled', label: 'Drive Scheduled', color: 'text-primary' },
  { value: 'drive_in_progress', label: 'Drive In Progress', color: 'text-primary' },
  { value: 'drive_completed', label: 'Drive Completed', color: 'text-success' },
];

const OUTCOME_ROW_COLORS: Record<CallOutcome | 'none', string> = {
  none: '',
  no_response: 'bg-destructive/20',
  invalid: 'bg-surface/40',
  not_hiring: 'bg-surface/40',
  already_connected: 'bg-surface/40',
  follow_up: 'bg-warning/20',
  invite_mail: 'bg-primary/20',
  drive_scheduled: 'bg-primary/30',
  drive_in_progress: 'bg-primary/30',
  drive_completed: 'bg-success/20',
};

interface Props {
  row: TrackerRowType;
  isReadOnly: boolean;
  onUpdate: (patch: Partial<TrackerRowType>) => void;
  onSkip: () => void;
}

// Format a Date (or ISO string) as HH:MM:SS AM/PM per spec 10.1
function formatTime(d: string | Date | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

// Get current time as ISO string for submission to API
function nowISO(): string {
  return new Date().toISOString();
}

export function TrackerRow({ row, isReadOnly, onUpdate, onSkip }: Props) {
  const startTimeRef = useRef<HTMLInputElement>(null);
  const commentsRef = useRef<HTMLInputElement>(null);

  const rowBg = row.is_skipped
    ? 'bg-background/20 opacity-50'
    : OUTCOME_ROW_COLORS[row.outcome_status ?? 'none'];

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

  // ── Start Time blur: persist to server
  const handleStartTimeBlur = useCallback(() => {
    const val = startTimeRef.current?.value?.trim();
    if (!val) return;
    // Parse the typed time (HH:MM:SS AM/PM) — build a Date for today
    const today = new Date();
    const [timePart, period] = val.split(' ');
    if (!timePart) return;
    const parts = timePart.split(':').map(Number);
    let h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    if (period?.toUpperCase() === 'PM' && h < 12) h += 12;
    if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
    today.setHours(h, m, s, 0);
    onUpdate({ call_start_time: today.toISOString() });
  }, [onUpdate]);

  // ── Call Outcome selection: captures End Time automatically (Spec 10.3)
  const handleOutcomeChange = useCallback((value: string) => {
    if (!value) return;
    onUpdate({ outcome_status: value as CallOutcome });
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
        <div className="w-12 px-1 text-fg-muted shrink-0">{row.serial_no}</div>
        <div className="flex-1 text-fg-muted line-through px-1">{row.company_name} — {row.hr_name}</div>
        <span className="text-fg-muted bg-surface px-2 py-0.5 rounded-full text-xs">Skipped</span>
      </div>
    );
  }

  return (
    <div
      data-row-id={row._id}
      className={`flex items-center gap-1 px-2 py-1 text-xs ${rowBg} hover:bg-surface/30 transition-colors group`}
    >
      {/* S.No */}
      <div className="w-12 px-1 text-fg-subtle shrink-0 tabular-nums">{row.serial_no}</div>

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
            placeholder="HH:MM:SS AM"
            onKeyDown={(e) => { handleStartTimeKeyDown(e); handleKeyDownEnter(e); }}
            onBlur={handleStartTimeBlur}
            title="Press Spacebar to insert current time"
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

      {/* Company Name — pre-filled, read-only */}
      <div className="min-w-[160px] flex-1 px-1 text-fg font-medium truncate" title={row.company_name}>
        {row.company_name}
      </div>

      {/* HR Name — pre-filled */}
      <div className="w-36 shrink-0 px-1 text-fg-muted truncate" title={row.hr_name}>
        {row.hr_name}
      </div>

      {/* Mobile */}
      <div className="w-32 shrink-0 px-1 text-fg-muted font-mono tabular-nums">
        {row.mobile_number}
      </div>

      {/* Email — optional */}
      <div className="w-44 shrink-0 px-1 truncate" title={row.email_id || ''}>
        {row.email_id ? (
          <span className="text-fg-subtle">{row.email_id}</span>
        ) : (
          <span className="text-fg-muted italic">—</span>
        )}
      </div>

      {/* Call Outcome — mandatory before row complete (Spec 12) */}
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

      {/* Comments — always optional (Spec) */}
      <div className="flex-1 min-w-[140px] shrink-0">
        {isReadOnly ? (
          <span className="px-1 text-fg-subtle italic text-xs">{row.comments || '—'}</span>
        ) : (
          <input
            ref={commentsRef}
            type="text"
            defaultValue={row.comments ?? ''}
            placeholder="Optional notes…"
            onKeyDown={handleKeyDownEnter}
            onBlur={handleCommentsBlur}
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:bg-surface px-1.5 py-1 rounded text-fg-muted placeholder-fg-subtle
                       transition-colors"
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
    no_response: 'text-destructive',
    invalid: 'text-fg-subtle',
    not_hiring: 'text-fg-subtle',
    already_connected: 'text-fg-subtle',
    follow_up: 'text-warning',
    invite_mail: 'text-primary',
    drive_scheduled: 'text-primary',
    drive_in_progress: 'text-primary',
    drive_completed: 'text-success',
  };
  return map[outcome] ?? 'text-fg-muted';
}
