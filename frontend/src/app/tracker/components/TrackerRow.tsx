'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Phone, Check } from 'lucide-react';
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
 * Solid, 100% opaque row backgrounds per outcome.
 * CRITICAL: Must be fully opaque so sticky frozen columns completely block scrolling data underneath.
 */
const OUTCOME_ROW_COLORS: Record<CallOutcome | 'none', string> = {
  none: 'bg-white dark:bg-[#161D2E]',
  jd_received: 'bg-[#EFF6FF] dark:bg-[#1E293B]',
  hiring_freezed: 'bg-[#FFFBEB] dark:bg-[#292218]',
  hiring_completed: 'bg-[#F0F9FF] dark:bg-[#162B3D]',
  call_back: 'bg-[#FFFBEB] dark:bg-[#292218]',
  hiring: 'bg-[#ECFDF5] dark:bg-[#132E27]',
  invite_mail: 'bg-[#EFF6FF] dark:bg-[#1E293B]',
  not_hiring: 'bg-[#F1F5F9] dark:bg-[#1E293B]',
  no_response: 'bg-[#FEF2F2] dark:bg-[#2E1818]',
  follow_up: 'bg-[#EEF2FF] dark:bg-[#1E2238]',
  in_connect: 'bg-[#EFF6FF] dark:bg-[#1E293B]',
  invalid: 'bg-[#F1F5F9] dark:bg-[#1E293B]',
  drive_completed: 'bg-[#ECFDF5] dark:bg-[#132E27]',
};

interface Props {
  row: TrackerRowType;
  index?: number;
  isSelected?: boolean;
  isSelectMode?: boolean;
  isDeleteMode?: boolean;
  selectionTheme?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'pink' | 'orange';
  isReadOnly: boolean;
  onUpdate: (patch: Partial<TrackerRowType>) => void;
  onEdit?: (row: TrackerRowType) => void;
  onDelete: () => void;
  onCall?: (row: TrackerRowType) => void;
  onToggleSelect?: (rowId: string, index: number, shiftKey: boolean) => void;
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

export function TrackerRow({ row, index, isSelected, isSelectMode, isDeleteMode, selectionTheme = 'blue', isReadOnly, onUpdate, onEdit, onDelete, onCall, onToggleSelect }: Props) {
  const startTimeRef = useRef<HTMLInputElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);
  const hrNameRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const commentsRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const effectiveTheme = isDeleteMode ? 'rose' : selectionTheme;

  const rowBgTheme: Record<string, string> = {
    blue: 'bg-[#EFF6FF] dark:bg-[#1E293B] ring-1 ring-inset ring-blue-500/40',
    emerald: 'bg-[#ECFDF5] dark:bg-[#132E27] ring-1 ring-inset ring-emerald-500/40',
    purple: 'bg-[#FAF5FF] dark:bg-[#2D1B4E] ring-1 ring-inset ring-purple-500/40',
    amber: 'bg-[#FFFBEB] dark:bg-[#2E2310] ring-1 ring-inset ring-amber-500/40',
    rose: 'bg-[#FEF2F2] dark:bg-[#34141A] ring-1 ring-inset ring-rose-500/40',
    pink: 'bg-[#FDF2F8] dark:bg-[#381224] ring-1 ring-inset ring-pink-500/40',
    orange: 'bg-[#FFF7ED] dark:bg-[#331B0E] ring-1 ring-inset ring-orange-500/40',
  };

  const rowBg = row.is_skipped
    ? 'bg-[#F8FAFC] dark:bg-[#0D111C]'
    : isSelected
    ? (rowBgTheme[effectiveTheme] || rowBgTheme.blue)
    : OUTCOME_ROW_COLORS[row.outcome_status ?? 'none'];

  useEffect(() => {
    if (companyNameRef.current && companyNameRef.current.value !== (row.company_name ?? '')) {
      companyNameRef.current.value = row.company_name ?? '';
    }
    if (hrNameRef.current && hrNameRef.current.value !== (row.hr_name ?? '')) {
      hrNameRef.current.value = row.hr_name ?? '';
    }
    if (mobileRef.current && mobileRef.current.value !== (row.mobile_number ?? '')) {
      mobileRef.current.value = row.mobile_number ?? '';
    }
    if (emailRef.current && emailRef.current.value !== (row.email_id ?? '')) {
      emailRef.current.value = row.email_id ?? '';
    }
    if (startTimeRef.current && startTimeRef.current.value !== formatTime(row.call_start_time)) {
      startTimeRef.current.value = formatTime(row.call_start_time);
    }
    if (commentsRef.current && commentsRef.current.value !== (row.comments ?? '')) {
      commentsRef.current.value = row.comments ?? '';
    }
  }, [row.company_name, row.hr_name, row.mobile_number, row.email_id, row.call_start_time, row.comments]);

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
      handleStartTimeBlur();
      const currentRow = (e.currentTarget as HTMLElement).closest('[data-row-id]');
      if (currentRow) {
        const nextRow = currentRow.nextElementSibling as HTMLElement;
        if (nextRow) {
          const nextStart = nextRow.querySelector<HTMLElement>('[data-field="start_time"]');
          if (nextStart) nextStart.focus();
        }
      }
    }
  }, [handleStartTimeBlur]);

  // ── Company Name blur
  const handleCompanyNameBlur = useCallback(() => {
    const val = companyNameRef.current?.value?.trim();
    if (val && val !== row.company_name) {
      onUpdate({ company_name: val });
    }
  }, [onUpdate, row.company_name]);

  // ── HR Name blur
  const handleHrNameBlur = useCallback(() => {
    const val = hrNameRef.current?.value?.trim() ?? '';
    if (val !== (row.hr_name ?? '')) {
      onUpdate({ hr_name: val });
    }
  }, [onUpdate, row.hr_name]);

  // ── Mobile Number blur
  const handleMobileBlur = useCallback(() => {
    const val = mobileRef.current?.value?.trim() ?? '';
    if (val !== (row.mobile_number ?? '')) {
      onUpdate({ mobile_number: val });
    }
  }, [onUpdate, row.mobile_number]);

  // ── Email blur
  const handleEmailBlur = useCallback(() => {
    const val = emailRef.current?.value?.trim() ?? '';
    if (val !== (row.email_id ?? '')) {
      onUpdate({ email_id: val });
    }
  }, [onUpdate, row.email_id]);

  // ── Call Outcome selection: captures End Time automatically & computes Duration
  const handleOutcomeChange = useCallback((value: string) => {
    if (!value) return;
    triggerHaptic('selection');
    const outcome = value as CallOutcome;
    const now = nowISO();
    const effectiveStart = row.call_start_time || now;
    const startTimePatch = !row.call_start_time ? { call_start_time: now } : {};
    if (startTimeRef.current && !startTimeRef.current.value) {
      startTimeRef.current.value = formatTime(now);
    }

    // Automatically calculate duration between Start Time and End Time
    let durSec = row.duration_seconds;
    let durFmt = row.duration_formatted;
    const start = new Date(effectiveStart).getTime();
    const end = new Date(now).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      durSec = Math.round((end - start) / 1000);
      const mins = Math.floor(durSec / 60);
      const secs = durSec % 60;
      durFmt = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    if (outcome !== 'follow_up') {
      onUpdate({
        ...startTimePatch,
        call_end_time: now,
        duration_seconds: durSec,
        duration_formatted: durFmt,
        outcome_status: outcome,
        follow_up_month: null,
      });
    } else {
      onUpdate({
        ...startTimePatch,
        call_end_time: now,
        duration_seconds: durSec,
        duration_formatted: durFmt,
        outcome_status: outcome,
      });
    }
  }, [onUpdate, row.call_start_time, row.duration_seconds, row.duration_formatted]);

  // ── Follow Up Month selection (Only enabled when outcome === follow_up)
  const handleMonthChange = useCallback((month: string) => {
    triggerHaptic('selection');
    onUpdate({ follow_up_month: month || null });
  }, [onUpdate]);

  // ── Comments debounced auto-save + blur persist (max 200 chars)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCommentsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.slice(0, 200);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onUpdate({ comments: text });
    }, 600);
  }, [onUpdate]);

  const handleCommentsBlur = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const text = (commentsRef.current?.value ?? '').slice(0, 200);
    onUpdate({ comments: text });
  }, [onUpdate]);

  const gridTemplate = isReadOnly
    ? 'grid-cols-[56px_100px_90px_90px_260px_200px_220px_250px_150px_180px_150px_minmax(260px,1fr)]'
    : 'grid-cols-[56px_100px_90px_90px_260px_200px_220px_250px_180px_150px_minmax(260px,1fr)]';

  return (
    <div
      data-row-id={row._id}
      className={`grid ${gridTemplate} divide-x divide-border/60 min-h-[44px] text-xs ${rowBg} hover:brightness-[0.98] dark:hover:brightness-110 focus-within:brightness-[0.98] dark:focus-within:brightness-110 transition-all group border-b border-border`}
    >
      {/* S.No / Selection Checkbox (Frozen Col 1) */}
      <div className={`sticky left-0 z-10 ${rowBg} px-1.5 py-2 flex items-center justify-center gap-1.5 select-none transition-colors`}>
        {(isSelectMode || isDeleteMode || isSelected) ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(row._id, (index ?? 1) - 1, e.shiftKey);
            }}
            title={isSelected ? 'Deselect this row' : isDeleteMode ? 'Select row to delete' : 'Select this row'}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 ${
              effectiveTheme === 'rose'
                ? isSelected
                  ? 'bg-rose-600 border-rose-600 text-white scale-105 ring-2 ring-rose-500/30'
                  : 'border-rose-400 dark:border-rose-500 hover:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-transparent hover:text-rose-500 ring-1 ring-rose-400/25'
                : effectiveTheme === 'pink'
                ? isSelected
                  ? 'bg-pink-600 border-pink-600 text-white scale-105 ring-2 ring-pink-500/30'
                  : 'border-pink-400 dark:border-pink-500 hover:border-pink-600 bg-pink-50/40 dark:bg-pink-950/20 text-transparent hover:text-pink-500 ring-1 ring-pink-400/25'
                : effectiveTheme === 'orange'
                ? isSelected
                  ? 'bg-orange-600 border-orange-600 text-white scale-105 ring-2 ring-orange-500/30'
                  : 'border-orange-400 dark:border-orange-500 hover:border-orange-600 bg-orange-50/40 dark:bg-orange-950/20 text-transparent hover:text-orange-500 ring-1 ring-orange-400/25'
                : effectiveTheme === 'emerald'
                ? isSelected
                  ? 'bg-emerald-600 border-emerald-600 text-white scale-105 ring-2 ring-emerald-500/30'
                  : 'border-emerald-400 dark:border-emerald-500 hover:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-transparent hover:text-emerald-500 ring-1 ring-emerald-400/25'
                : effectiveTheme === 'purple'
                ? isSelected
                  ? 'bg-purple-600 border-purple-600 text-white scale-105 ring-2 ring-purple-500/30'
                  : 'border-purple-400 dark:border-purple-500 hover:border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 text-transparent hover:text-purple-500 ring-1 ring-purple-400/25'
                : effectiveTheme === 'amber'
                ? isSelected
                  ? 'bg-amber-600 border-amber-600 text-white scale-105 ring-2 ring-amber-500/30'
                  : 'border-amber-400 dark:border-amber-500 hover:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 text-transparent hover:text-amber-500 ring-1 ring-amber-400/25'
                : isSelected
                ? 'bg-blue-600 border-blue-600 text-white scale-105 ring-2 ring-blue-500/30'
                : 'border-blue-400 dark:border-blue-500 hover:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 text-transparent hover:text-blue-500 ring-1 ring-blue-400/25'
            }`}
          >
            <Check size={11} strokeWidth={3} className={isSelected ? 'block text-white' : 'opacity-0 hover:opacity-100'} />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(row._id, (index ?? 1) - 1, e.shiftKey);
            }}
            title="Click to select this row"
            className="w-4 h-4 rounded border border-transparent group-hover:border-border-strong hover:!border-primary/80 bg-transparent group-hover:bg-surface text-transparent flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <Check size={11} strokeWidth={2.5} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-primary" />
          </button>
        )}
        <span className="text-fg-subtle tabular-nums font-medium text-[11px]">
          {index ?? row.serial_no}
        </span>
      </div>

      {/* Start Time (Frozen Col 2 - Editable) */}
      <div className={`sticky left-[56px] z-10 ${rowBg} px-2 py-1 flex items-center transition-colors`}>
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
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded text-fg placeholder-fg-subtle transition-colors cursor-text text-xs tabular-nums outline-none"
          />
        )}
      </div>

      {/* End Time (Frozen Col 3 - Auto Display) */}
      <div className={`sticky left-[156px] z-10 ${rowBg} px-2.5 py-2 text-fg-subtle tabular-nums text-xs flex items-center whitespace-nowrap transition-colors`} title={formatTime(row.call_end_time) || 'Auto-captured on status selection'}>
        {formatTime(row.call_end_time) || (
          <span className="text-fg-muted italic">auto</span>
        )}
      </div>

      {/* Duration (Frozen Col 4 - Auto Display) */}
      <div className={`sticky left-[246px] z-10 ${rowBg} px-2.5 py-2 text-fg-subtle tabular-nums text-xs flex items-center whitespace-nowrap transition-colors`} title={row.duration_formatted || 'Auto-calculated on status selection'}>
        {row.duration_formatted || (
          <span className="text-fg-muted">—</span>
        )}
      </div>

      {/* Company Name (Frozen Col 5 - Editable & Solid Right Divider) */}
      <div className={`sticky left-[336px] z-10 ${rowBg} px-2 py-1 flex items-center border-r-2 border-border-strong shadow-[6px_0_12px_-3px_rgba(0,0,0,0.12)] dark:shadow-[6px_0_12px_-3px_rgba(0,0,0,0.6)] transition-colors`} title={row.company_name}>
        {isReadOnly ? (
          <span className="text-fg font-semibold break-words leading-snug select-text truncate">{row.company_name}</span>
        ) : (
          <input
            ref={companyNameRef}
            data-field="company_name"
            type="text"
            defaultValue={row.company_name}
            placeholder="Company Name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCompanyNameBlur();
              }
            }}
            onBlur={handleCompanyNameBlur}
            title="Click to edit Company Name"
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded text-fg font-semibold transition-colors cursor-text text-xs outline-none"
          />
        )}
      </div>

      {/* HR Name (Editable) */}
      <div className="px-2 py-1 flex items-center" title={row.hr_name || ''}>
        {isReadOnly ? (
          <span className="text-fg font-medium text-xs leading-snug break-words select-text">
            {row.hr_name || <span className="text-fg-muted italic">—</span>}
          </span>
        ) : (
          <input
            ref={hrNameRef}
            data-field="hr_name"
            type="text"
            defaultValue={row.hr_name || ''}
            placeholder="HR / Contact Name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleHrNameBlur();
              }
            }}
            onBlur={handleHrNameBlur}
            title="Click to edit HR Contact Name"
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded text-fg font-medium transition-colors cursor-text text-xs outline-none placeholder:text-fg-disabled"
          />
        )}
      </div>

      {/* Contact (Call / WhatsApp + Editable Mobile) */}
      <div className="px-2 py-1 text-fg font-mono tabular-nums text-xs flex items-center gap-1.5 group/contact whitespace-nowrap">
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
                className="w-5 h-5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 dark:border-blue-400/60 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all hover:scale-105 active:scale-[0.992] cursor-pointer shrink-0 shadow-2xs"
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

        {isReadOnly ? (
          <span className="whitespace-nowrap select-all font-medium text-fg">
            {row.mobile_number || <span className="text-fg-muted italic">—</span>}
          </span>
        ) : (
          <input
            ref={mobileRef}
            data-field="mobile_number"
            type="text"
            defaultValue={row.mobile_number || ''}
            placeholder="Mobile Number"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleMobileBlur();
              }
            }}
            onBlur={handleMobileBlur}
            title="Click to edit Mobile Number"
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded text-fg font-mono font-medium transition-colors cursor-text text-xs outline-none placeholder:text-fg-disabled"
          />
        )}
      </div>

      {/* Email ID (Editable) */}
      <div className="px-2 py-1 flex items-center whitespace-nowrap text-xs" title={row.email_id || ''}>
        {isReadOnly ? (
          row.email_id ? (
            <span className="text-fg-subtle whitespace-nowrap select-all hover:text-fg transition-colors">
              {row.email_id}
            </span>
          ) : (
            <span className="text-fg-muted italic">—</span>
          )
        ) : (
          <input
            ref={emailRef}
            data-field="email_id"
            type="email"
            defaultValue={row.email_id || ''}
            placeholder="Email ID"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEmailBlur();
              }
            }}
            onBlur={handleEmailBlur}
            title="Click to edit Email Address"
            className="w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded text-fg transition-colors cursor-text text-xs outline-none placeholder:text-fg-disabled"
          />
        )}
      </div>

      {/* Coordinator — only shown in read-only history, which now spans every coordinator */}
      {isReadOnly && (
        <div className="px-2.5 py-2 flex items-center whitespace-nowrap text-xs" title={row.coordinator_name || ''}>
          <span className="text-fg-subtle select-text">{row.coordinator_name || '—'}</span>
        </div>
      )}

      {/* Call Status (Dropdown directly in cell) */}
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

      {/* Follow Up (Month Dropdown directly in cell) */}
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

      {/* Comments (Textarea directly in cell) */}
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
            onChange={handleCommentsChange}
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
