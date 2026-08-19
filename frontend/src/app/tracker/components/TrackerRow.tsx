'use client';

import { useRef, useCallback } from 'react';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';

const OUTCOMES: { value: CallOutcome; label: string; color: string }[] = [
  { value: 'no_response', label: 'No Response', color: 'text-red-400' },
  { value: 'invalid', label: 'Invalid', color: 'text-slate-400' },
  { value: 'not_hiring', label: 'Not Hiring', color: 'text-slate-400' },
  { value: 'already_connected', label: 'Already Connected', color: 'text-slate-400' },
  { value: 'follow_up', label: 'Follow Up', color: 'text-orange-400' },
  { value: 'invite_mail', label: 'Invite Mail', color: 'text-blue-400' },
  { value: 'drive_scheduled', label: 'Drive Scheduled', color: 'text-blue-400' },
  { value: 'drive_in_progress', label: 'Drive In Progress', color: 'text-blue-400' },
  { value: 'drive_completed', label: 'Drive Completed', color: 'text-emerald-400' },
];

const OUTCOME_ROW_COLORS: Record<CallOutcome | 'none', string> = {
  none: '',
  no_response: 'bg-red-950/20',
  invalid: 'bg-slate-800/40',
  not_hiring: 'bg-slate-800/40',
  already_connected: 'bg-slate-800/40',
  follow_up: 'bg-orange-950/20',
  invite_mail: 'bg-blue-950/20',
  drive_scheduled: 'bg-blue-950/30',
  drive_in_progress: 'bg-blue-950/30',
  drive_completed: 'bg-emerald-950/20',
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
    ? 'bg-slate-900/20 opacity-50'
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
        className={`flex items-center gap-1 px-2 py-1.5 text-xs ${rowBg} border-b border-slate-800/30`}
      >
        <div className="w-12 px-1 text-slate-600 shrink-0">{row.serial_no}</div>
        <div className="flex-1 text-slate-600 line-through px-1">{row.company_name} — {row.hr_name}</div>
        <span className="text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full text-xs">Skipped</span>
      </div>
    );
  }

  return (
    <div
      data-row-id={row._id}
      className={`flex items-center gap-1 px-2 py-1 text-xs ${rowBg} hover:bg-slate-800/30 transition-colors group`}
    >
      {/* S.No */}
      <div className="w-12 px-1 text-slate-500 shrink-0 tabular-nums">{row.serial_no}</div>

      {/* Start Time — manual, spacebar inserts now (Spec 10.2) */}
      <div className="w-28 shrink-0">
        {isReadOnly ? (
          <span className="px-1 text-slate-300">{formatTime(row.call_start_time)}</span>
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
            className="w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500
                       focus:bg-slate-800 px-1.5 py-1 rounded text-slate-200 placeholder-slate-600
                       outline-none transition-colors cursor-text"
          />
        )}
      </div>

      {/* End Time — auto-locked (Spec 10.3) */}
      <div className="w-28 shrink-0 px-1 text-slate-400 tabular-nums">
        {formatTime(row.call_end_time) || (
          <span className="text-slate-700 italic">auto</span>
        )}
      </div>

      {/* Duration — auto-computed (Spec 10.4) */}
      <div className="w-20 shrink-0 px-1 text-slate-400 tabular-nums">
        {row.duration_formatted || (
          <span className="text-slate-700">—</span>
        )}
      </div>

      {/* Company Name — pre-filled, read-only */}
      <div className="min-w-[160px] flex-1 px-1 text-slate-200 font-medium truncate" title={row.company_name}>
        {row.company_name}
      </div>

      {/* HR Name — pre-filled */}
      <div className="w-36 shrink-0 px-1 text-slate-300 truncate" title={row.hr_name}>
        {row.hr_name}
      </div>

      {/* Mobile */}
      <div className="w-32 shrink-0 px-1 text-slate-300 font-mono tabular-nums">
        {row.mobile_number}
      </div>

      {/* Email — optional */}
      <div className="w-44 shrink-0 px-1 truncate" title={row.email_id || ''}>
        {row.email_id ? (
          <span className="text-slate-400">{row.email_id}</span>
        ) : (
          <span className="text-slate-700 italic">—</span>
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
            className={`w-full bg-slate-800/80 border border-slate-700 rounded px-1.5 py-1 text-xs
                        focus:outline-none focus:border-blue-500 cursor-pointer
                        ${row.outcome_status ? getOutcomeColor(row.outcome_status) : 'text-slate-500'}`}
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
          <span className="px-1 text-slate-400 italic text-xs">{row.comments || '—'}</span>
        ) : (
          <input
            ref={commentsRef}
            type="text"
            defaultValue={row.comments ?? ''}
            placeholder="Optional notes…"
            onKeyDown={handleKeyDownEnter}
            onBlur={handleCommentsBlur}
            className="w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500
                       focus:bg-slate-800 px-1.5 py-1 rounded text-slate-300 placeholder-slate-600
                       outline-none transition-colors"
          />
        )}
      </div>

      {/* Actions — Skip button (Spec Section 8) */}
      <div className="w-16 shrink-0 flex justify-center">
        {!isReadOnly && !row.is_skipped && (
          <button
            onClick={onSkip}
            title="Skip this contact for today (will NOT delete from Master Database)"
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400
                       transition-all text-xs px-1.5 py-1 rounded hover:bg-red-900/20"
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
  if (!outcome) return <span className="text-slate-700 italic text-xs px-1">—</span>;
  const o = OUTCOMES.find((o) => o.value === outcome);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-800 ${o?.color ?? 'text-slate-400'}`}>
      {o?.label ?? outcome}
    </span>
  );
}

function getOutcomeColor(outcome: CallOutcome): string {
  const map: Record<CallOutcome, string> = {
    no_response: 'text-red-400',
    invalid: 'text-slate-400',
    not_hiring: 'text-slate-400',
    already_connected: 'text-slate-400',
    follow_up: 'text-orange-400',
    invite_mail: 'text-blue-400',
    drive_scheduled: 'text-blue-400',
    drive_in_progress: 'text-blue-400',
    drive_completed: 'text-emerald-400',
  };
  return map[outcome] ?? 'text-slate-300';
}
