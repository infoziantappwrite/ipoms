'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Phone, Check, Clock, CopyPlus } from 'lucide-react';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';
import { triggerHaptic } from '@/lib/haptics';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { RowOutcomeDropdown } from './RowOutcomeDropdown';
import { getDynamicFollowUpMonths, formatFollowUpMonthDisplay } from './RowMonthDropdown';
import { RowFollowUpDateDropdown, formatFollowUpDateDisplay } from './RowFollowUpDateDropdown';
import {
  smartParseTime,
  formatTime,
  formatTimeAutoMask,
  formatDurationMinutesLevel,
  nowISO,
} from '@/lib/timeValidation';
import {
  validateAndNormalizeIndianContact,
  validateAndNormalizeEmail,
  validateAndNormalizeMultiMobile,
  validateAndNormalizeMultiEmail,
} from '@/lib/contactValidation';

export const OUTCOMES: { value: CallOutcome; label: string; color: string }[] = [
  { value: 'no_response', label: 'No Response', color: 'text-rose-600 dark:text-rose-400 font-medium' },
  { value: 'not_hiring', label: 'Not Hiring', color: 'text-rose-700 dark:text-rose-400 font-bold' },
  { value: 'invite_mail', label: 'Invite Mail', color: 'text-primary' },
  { value: 'follow_up', label: 'Follow Up', color: 'text-orange-600 dark:text-orange-400 font-semibold' },
  { value: 'call_back', label: 'Call Back', color: 'text-amber-600 dark:text-amber-400 font-medium' },
  { value: 'new_poc', label: 'New POC', color: 'text-[#FF0A80] dark:text-[#FF389B] font-semibold' },
  { value: 'invalid', label: 'Invalid', color: 'text-[#7D838C] dark:text-[#9AA0A9]' },
  { value: 'jd_received', label: 'JD Received', color: 'text-primary' },
  { value: 'hiring', label: 'Hiring', color: 'text-success' },
  { value: 'in_connect', label: 'In Connect', color: 'text-[#7D838C] dark:text-[#9AA0A9]' },
  { value: 'drive_completed', label: 'Drive Completed', color: 'text-success' },
  { value: 'hiring_completed', label: 'Hiring Completed', color: 'text-cyan-600 dark:text-cyan-400 font-semibold' },
  { value: 'hiring_freezed', label: 'Hiring Freezed', color: 'text-purple-600 dark:text-purple-400 font-semibold' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export { getDynamicFollowUpMonths, formatFollowUpMonthDisplay, formatFollowUpDateDisplay };

/**
 * Solid, 100% opaque row backgrounds per outcome.
 * CRITICAL: Must be fully opaque so sticky frozen columns completely block scrolling data underneath.
 */
const OUTCOME_ROW_COLORS: Record<CallOutcome | 'none', string> = {
  none: 'bg-white dark:bg-[#161D2E]',
  jd_received: 'bg-[#EFF6FF] dark:bg-[#1E293B]',
  hiring_freezed: 'bg-[#F3E8FF] dark:bg-[#25143A]', // Light lilac / soft lavender for Hiring Freezed
  hiring_completed: 'bg-[#E0F2FE] dark:bg-[#0E2F4A]', // Matching cyan/sky-blue shade for Hiring Completed
  call_back: 'bg-[#FFFBEB] dark:bg-[#292218]',
  new_poc: 'bg-[#FFF0F7] dark:bg-[#2B0E1E]', // Soft pink tint for New POC (#FF0A80)
  hiring: 'bg-[#ECFDF5] dark:bg-[#132E27]',
  invite_mail: 'bg-[#EFF6FF] dark:bg-[#1E293B]',
  not_hiring: 'bg-white dark:bg-[#161D2E]', // White row background for Not Hiring (text is red with mild bold)
  no_response: 'bg-[#FEF2F2] dark:bg-[#2E1818]', // Pale light red for No Response
  follow_up: 'bg-[#FFF4E6] dark:bg-[#2D1B10]', // Warm orange shade for Follow Up (distinct from yellow Call Back)
  in_connect: 'bg-[#F4F5F7] dark:bg-[#1C2028]', // Soft neutral slate tint for In Connect (#7D838C)
  invalid: 'bg-[#F4F5F7] dark:bg-[#1C2028]', // Soft neutral slate tint for Invalid (#7D838C)
  drive_completed: 'bg-[#ECFDF5] dark:bg-[#132E27]',
};

interface Props {
  row: TrackerRowType;
  index?: number;
  isSelected?: boolean;
  isActive?: boolean;
  onRowClick?: () => void;
  isSelectMode?: boolean;
  isDeleteMode?: boolean;
  selectionTheme?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'pink' | 'orange';
  isReadOnly: boolean;
  isAdvanceLocked?: boolean;
  onUpdate: (patch: Partial<TrackerRowType>) => void;
  onEdit?: (row: TrackerRowType) => void;
  onDelete: () => void;
  onCall?: (row: TrackerRowType) => void;
  onToggleSelect?: (rowId: string, index: number, shiftKey: boolean) => void;
  onCopySingle?: (row: TrackerRowType) => void;
  isCellSelected?: (field: string) => boolean;
  onCellMouseDown?: (field: string, e: React.MouseEvent) => void;
  onCellMouseEnter?: (field: string) => void;
}

export function TrackerRow({
  row,
  index,
  isSelected,
  isActive,
  onRowClick,
  isSelectMode,
  isDeleteMode,
  selectionTheme = 'blue',
  isReadOnly,
  isAdvanceLocked = false,
  onUpdate,
  onEdit,
  onDelete,
  onCall,
  onToggleSelect,
  onCopySingle,
  isCellSelected,
  onCellMouseDown,
  onCellMouseEnter,
}: Props) {
  const isEffectivelyReadOnly = isReadOnly || isAdvanceLocked;
  const isNotHiring = row.outcome_status === 'not_hiring';
  const startTimeRef = useRef<HTMLInputElement>(null);
  const prevStartTimeRef = useRef<string>(formatTime(row.call_start_time));
  const companyNameRef = useRef<HTMLInputElement>(null);
  const hrNameRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const commentsRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const effectiveTheme = isDeleteMode ? 'rose' : selectionTheme;

  const rowBgTheme: Record<string, string> = {
    blue: 'bg-[#EFF6FF] dark:bg-[#1E293B]',
    emerald: 'bg-[#ECFDF5] dark:bg-[#132E27]',
    purple: 'bg-[#FAF5FF] dark:bg-[#2D1B4E]',
    amber: 'bg-[#FFFBEB] dark:bg-[#2E2310]',
    rose: 'bg-[#FEF2F2] dark:bg-[#34141A]',
    pink: 'bg-[#FDF2F8] dark:bg-[#381224]',
    orange: 'bg-[#FFF7ED] dark:bg-[#331B0E]',
  };

  const rowBg = row.is_skipped
    ? 'bg-[#F8FAFC] dark:bg-[#0D111C]'
    : isSelected
    ? (rowBgTheme[effectiveTheme] || rowBgTheme.blue)
    : OUTCOME_ROW_COLORS[row.outcome_status ?? 'none'];

  const getCellSelectionClass = (field: string) => {
    if (isCellSelected?.(field)) {
      return 'ring-2 ring-inset ring-blue-600 dark:ring-sky-400 bg-[#DBEAFE] dark:bg-[#1E3A8A] text-slate-950 dark:text-white font-medium !opacity-100 shadow-2xs';
    }
    return '';
  };

  const adjustCommentsHeight = useCallback(() => {
    if (commentsRef.current && 'scrollHeight' in commentsRef.current) {
      const el = commentsRef.current as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = `${Math.max(28, el.scrollHeight)}px`;
    }
  }, []);

  useEffect(() => {
    if (companyNameRef.current && document.activeElement !== companyNameRef.current && companyNameRef.current.value !== (row.company_name ?? '')) {
      companyNameRef.current.value = row.company_name ?? '';
    }
    if (hrNameRef.current && document.activeElement !== hrNameRef.current && hrNameRef.current.value !== (row.hr_name ?? '')) {
      hrNameRef.current.value = row.hr_name ?? '';
    }
    if (mobileRef.current && document.activeElement !== mobileRef.current && mobileRef.current.value !== (row.mobile_number ?? '')) {
      mobileRef.current.value = row.mobile_number ?? '';
    }
    if (emailRef.current && document.activeElement !== emailRef.current && emailRef.current.value !== (row.email_id ?? '')) {
      emailRef.current.value = row.email_id ?? '';
    }
    if (startTimeRef.current && document.activeElement !== startTimeRef.current && startTimeRef.current.value !== formatTime(row.call_start_time)) {
      startTimeRef.current.value = formatTime(row.call_start_time);
    }
    if (commentsRef.current && document.activeElement !== commentsRef.current && commentsRef.current.value !== (row.comments ?? '')) {
      commentsRef.current.value = row.comments ?? '';
    }
    adjustCommentsHeight();
  }, [row.company_name, row.hr_name, row.mobile_number, row.email_id, row.call_start_time, row.comments, adjustCommentsHeight]);

  useEffect(() => {
    window.addEventListener('resize', adjustCommentsHeight);
    return () => window.removeEventListener('resize', adjustCommentsHeight);
  }, [adjustCommentsHeight]);

  // ── Start Time blur: strictly smart-parse time, auto-predict AM/PM, format input, revert if invalid
  const handleStartTimeBlur = useCallback(() => {
    const val = startTimeRef.current?.value?.trim();
    if (!val) {
      if (row.call_start_time) {
        onUpdate({ call_start_time: undefined, duration_seconds: undefined, duration_formatted: undefined });
      }
      return;
    }

    const parsed = smartParseTime(val);
    if (parsed) {
      if (startTimeRef.current) {
        startTimeRef.current.value = parsed.formatted;
      }
      const patch: Partial<TrackerRowType> = { call_start_time: parsed.iso };

      // If row already has call_end_time, recompute duration in minutes level
      if (row.call_end_time) {
        const start = new Date(parsed.iso).getTime();
        const end = new Date(row.call_end_time).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          const durSec = Math.round((end - start) / 1000);
          patch.duration_seconds = durSec;
          patch.duration_formatted = formatDurationMinutesLevel(durSec);
        }
      }

      onUpdate(patch);
    } else {
      // Revert back to the previous valid time so corrupt text (e.g. "83454") never stays in the cell!
      if (startTimeRef.current) {
        startTimeRef.current.value = formatTime(row.call_start_time);
      }
    }
  }, [onUpdate, row.call_start_time, row.call_end_time]);

  // ── Quick clock button handler to stamp current time with 1 click
  const handleSetCurrentStartTime = useCallback(() => {
    triggerHaptic('selection');
    const now = nowISO();
    if (startTimeRef.current) {
      startTimeRef.current.value = formatTime(now);
    }
    const patch: Partial<TrackerRowType> = { call_start_time: now };

    // If row already has call_end_time, recompute duration in minutes level
    if (row.call_end_time) {
      const start = new Date(now).getTime();
      const end = new Date(row.call_end_time).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const durSec = Math.round((end - start) / 1000);
        patch.duration_seconds = durSec;
        patch.duration_formatted = formatDurationMinutesLevel(durSec);
      }
    }

    onUpdate(patch);
  }, [handleStartTimeBlur, nowISO, onUpdate, row.call_end_time]);

  // ── Auto-mask time input as user types: automatically adds colon after 2 digits, auto-deduces AM/PM on 4 digits
  const handleStartTimeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = formatTimeAutoMask(raw, prevStartTimeRef.current);
    prevStartTimeRef.current = masked;
    e.target.value = masked;
  }, []);

  // ── Spacebar / 'a' / 'p' / Delete key handlers for Start Time
  const handleStartTimeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const val = startTimeRef.current?.value || '';

    // Quick toggle period with 'a' or 'p'
    if ((e.key === 'a' || e.key === 'A') && val.length >= 4) {
      e.preventDefault();
      const updated = val.replace(/\s*[APMamp]*$/i, '').trim() + ' AM';
      prevStartTimeRef.current = updated;
      if (startTimeRef.current) startTimeRef.current.value = updated;
      return;
    }
    if ((e.key === 'p' || e.key === 'P') && val.length >= 4) {
      e.preventDefault();
      const updated = val.replace(/\s*[APMamp]*$/i, '').trim() + ' PM';
      prevStartTimeRef.current = updated;
      if (startTimeRef.current) startTimeRef.current.value = updated;
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      handleSetCurrentStartTime();
    }
    // Delete key clears the field
    if (e.key === 'Delete') {
      e.preventDefault();
      if (startTimeRef.current) startTimeRef.current.value = '';
      onUpdate({ call_start_time: undefined, duration_seconds: undefined, duration_formatted: undefined });
    }
  }, [handleSetCurrentStartTime, onUpdate]);

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

  // ── Mobile Number blur: validates 10 digits Indian mobile & landline (allows comma-separated multiple numbers)
  const handleMobileBlur = useCallback(() => {
    const val = mobileRef.current?.value?.trim() ?? '';
    if (!val) {
      if (row.mobile_number) {
        onUpdate({ mobile_number: '' });
      }
      return;
    }

    const validation = validateAndNormalizeMultiMobile(val);
    if (validation.valid) {
      if (mobileRef.current) {
        mobileRef.current.value = validation.normalized;
      }
      if (validation.normalized !== (row.mobile_number ?? '')) {
        onUpdate({ mobile_number: validation.normalized });
      }
    } else {
      // Revert to last valid number if invalid format
      if (mobileRef.current) {
        mobileRef.current.value = row.mobile_number ?? '';
      }
    }
  }, [onUpdate, row.mobile_number]);

  // ── Email blur: enforces valid official domain extensions (allows comma-separated multiple emails)
  const handleEmailBlur = useCallback(() => {
    const val = emailRef.current?.value?.trim() ?? '';
    if (!val) {
      if (row.email_id) {
        onUpdate({ email_id: '' });
      }
      return;
    }

    const validation = validateAndNormalizeMultiEmail(val);
    if (validation.valid) {
      if (emailRef.current) {
        emailRef.current.value = validation.normalized;
      }
      if (validation.normalized !== (row.email_id ?? '')) {
        onUpdate({ email_id: validation.normalized });
      }
    } else {
      // Revert to last valid email if invalid
      if (emailRef.current) {
        emailRef.current.value = row.email_id ?? '';
      }
    }
  }, [onUpdate, row.email_id]);

  // ── Call Outcome selection: captures End Time automatically & computes Duration at minutes level
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

    // Automatically calculate duration between Start Time and End Time in minutes level
    let durSec = row.duration_seconds;
    let durFmt = row.duration_formatted;
    const start = new Date(effectiveStart).getTime();
    const end = new Date(now).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      durSec = Math.round((end - start) / 1000);
      durFmt = formatDurationMinutesLevel(durSec);
    }

    if (outcome !== 'follow_up') {
      onUpdate({
        ...startTimePatch,
        call_end_time: now,
        duration_seconds: durSec,
        duration_formatted: durFmt,
        outcome_status: outcome,
        follow_up_month: null,
        follow_up_date: null,
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

  // ── Follow Up Date selection (Only enabled when outcome === follow_up)
  const handleFollowUpDateChange = useCallback((dateIso: string) => {
    triggerHaptic('selection');
    onUpdate({ follow_up_date: dateIso || null });
  }, [onUpdate]);

  // ── Comments save on blur & Enter press (max 200 chars)
  const handleCommentsBlur = useCallback(() => {
    const text = (commentsRef.current?.value ?? '').slice(0, 200);
    if (text !== (row.comments ?? '')) {
      onUpdate({ comments: text });
    }
  }, [onUpdate, row.comments]);

  const handleCommentsKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commentsRef.current?.blur();
      const text = (commentsRef.current?.value ?? '').slice(0, 200);
      if (text !== (row.comments ?? '')) {
        onUpdate({ comments: text });
      }
      // Advance focus to next row's start time without triggering call timer
      const currentRow = (e.currentTarget as HTMLElement).closest('[data-row-id]');
      if (currentRow) {
        const nextRow = currentRow.nextElementSibling as HTMLElement;
        if (nextRow) {
          const nextStart = nextRow.querySelector<HTMLElement>('[data-field="start_time"]');
          if (nextStart) nextStart.focus();
        }
      }
    }
  }, [onUpdate, row.comments]);

  const gridTemplate = isReadOnly
    ? 'grid-cols-[56px_100px_90px_90px_260px_200px_240px_270px_150px_180px_190px_minmax(260px,1fr)]'
    : 'grid-cols-[56px_100px_90px_90px_260px_200px_240px_270px_180px_190px_minmax(260px,1fr)]';

  return (
    <div
      data-row-id={row._id}
      className={`grid ${gridTemplate} divide-x divide-border/60 min-h-[44px] h-auto text-xs ${rowBg} transition-colors group ${
        isSelected
          ? 'border-b border-primary/30'
          : 'border-b border-border/80'
      }`}
    >
      {/* S.No / Selection Checkbox (Frozen Col 1) */}
      <div className={`sticky left-0 z-10 ${rowBg} px-1.5 py-1.5 self-stretch flex items-center justify-center gap-1.5 select-none transition-colors`}>
        {(isSelectMode || isDeleteMode || isSelected) ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(row._id, (index ?? 1) - 1, e.shiftKey);
            }}
            title={isSelected ? 'Deselect this row' : isDeleteMode ? 'Select row to delete' : 'Select this row'}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 my-auto ${
              effectiveTheme === 'rose'
                ? isSelected
                  ? 'bg-rose-600 border-rose-600 text-white scale-105 ring-2 ring-rose-500/30'
                  : 'border-rose-400 dark:border-rose-500 hover:border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 text-transparent hover:text-rose-500 ring-1 ring-rose-400/25'
                : effectiveTheme === 'pink'
                ? isSelected
                  ? 'bg-pink-600 border-pink-600 text-white scale-105 ring-2 ring-pink-500/30'
                  : 'border-pink-400 hover:border-pink-600 bg-surface'
                : effectiveTheme === 'orange'
                ? isSelected
                  ? 'bg-orange-600 border-orange-600 text-white scale-105 ring-2 ring-orange-500/30'
                  : 'border-orange-400 hover:border-orange-600 bg-surface'
                : effectiveTheme === 'emerald'
                ? isSelected
                  ? 'bg-emerald-600 border-emerald-600 text-white scale-105 ring-2 ring-emerald-500/30'
                  : 'border-emerald-400 hover:border-emerald-600 bg-surface'
                : effectiveTheme === 'purple'
                ? isSelected
                  ? 'bg-purple-600 border-purple-600 text-white scale-105 ring-2 ring-purple-500/30'
                  : 'border-purple-400 hover:border-purple-600 bg-surface'
                : effectiveTheme === 'amber'
                ? isSelected
                  ? 'bg-amber-600 border-amber-600 text-white scale-105 ring-2 ring-amber-500/30'
                  : 'border-amber-400 hover:border-amber-600 bg-surface'
                : isSelected
                ? 'bg-blue-600 border-blue-600 text-white scale-105 ring-2 ring-blue-500/30'
                : 'border-blue-400 hover:border-blue-600 bg-surface'
            }`}
          >
            {isSelected && <Check size={11} strokeWidth={3} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(row._id, (index ?? 1) - 1, e.shiftKey);
            }}
            title="Click to select this row"
            className="w-4 h-4 rounded border border-transparent group-hover:border-border-strong hover:!border-primary/80 bg-transparent group-hover:bg-surface text-transparent flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 my-auto"
          >
            <Check size={11} strokeWidth={2.5} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-primary" />
          </button>
        )}
        <span className={`tabular-nums text-[11px] my-auto ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle font-medium'}`}>
          {index ?? row.serial_no}
        </span>
      </div>

      {/* Start Time (Frozen Col 2 - 1-Click Clock Stamp & Editable) */}
      <div
        className={`sticky left-[56px] z-10 ${rowBg} px-1.5 py-1 self-stretch flex items-center transition-colors ${getCellSelectionClass('start_time')}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('start_time', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('start_time'); }}
      >
        {isEffectivelyReadOnly ? (
          <div
            title={isAdvanceLocked ? "Calling operations & time logging will unlock automatically at 12:00 AM midnight" : "Read-only call record"}
            className={`flex items-center gap-1 text-xs tabular-nums px-1 my-auto italic select-none ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-muted'}`}
          >
            <Clock size={11} className={`opacity-40 shrink-0 ${isNotHiring ? 'text-red-600 dark:text-red-400' : ''}`} />
            <span>{formatTime(row.call_start_time) || (isAdvanceLocked ? 'Locked' : '—')}</span>
          </div>
        ) : !row.call_start_time ? (
          <button
            type="button"
            data-field="start_time_btn"
            onClick={handleSetCurrentStartTime}
            title="Click clock to set current start time (or press Spacebar)"
            className="flex items-center justify-center gap-1.5 w-full h-7 px-2 bg-gradient-to-b from-[#E2EDF8] via-[#C9DCF0] to-[#B4CDE7] dark:from-[#253850] dark:to-[#1A293D] text-[#103B70] dark:text-[#D8E6F5] border border-[#A4C2E0] dark:border-[#3A5374] hover:brightness-95 dark:hover:brightness-110 rounded-md text-[11px] font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] group/clock my-auto"
          >
            <Clock size={12} className="shrink-0 text-[#103B70] dark:text-[#D8E6F5] group-hover/clock:scale-110 transition-transform" />
            <span className="truncate">Set Time</span>
          </button>
        ) : (
          <div className="flex items-center gap-0.5 w-full group/time my-auto">
            <input
              ref={startTimeRef}
              data-field="start_time"
              type="text"
              defaultValue={formatTime(row.call_start_time)}
              placeholder="Time"
              onChange={handleStartTimeInput}
              onKeyDown={(e) => { handleStartTimeKeyDown(e); handleKeyDownEnter(e); }}
              onBlur={handleStartTimeBlur}
              title="Start time set • Click to edit or click clock icon to re-stamp current time"
              className={`w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1 py-0.5 rounded transition-colors cursor-text text-xs tabular-nums outline-none min-w-0 ${isNotHiring ? '!text-red-600 dark:!text-red-400 font-semibold' : 'text-fg font-medium'}`}
            />
            <button
              type="button"
              onClick={handleSetCurrentStartTime}
              title="Re-stamp current time now"
              className="p-1 rounded hover:bg-surface-raised text-fg-subtle hover:text-primary transition-colors cursor-pointer shrink-0 opacity-40 hover:opacity-100 group-hover/time:opacity-80 my-auto"
            >
              <Clock size={11} />
            </button>
          </div>
        )}
      </div>

      {/* End Time (Frozen Col 3 - Auto Display) */}
      <div
        className={`sticky left-[156px] z-10 ${rowBg} px-2.5 py-1.5 self-stretch tabular-nums text-xs flex items-center whitespace-nowrap transition-colors ${getCellSelectionClass('end_time')} ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle'}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('end_time', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('end_time'); }}
        title={formatTime(row.call_end_time) || 'Auto-captured on status selection'}
      >
        <span className="my-auto">
          {formatTime(row.call_end_time) || (
            <span className={isNotHiring ? 'text-red-600/70 dark:text-red-400/70 italic' : 'text-fg-muted italic'}>auto</span>
          )}
        </span>
      </div>

      {/* Duration (Frozen Col 4 - Auto Display) */}
      <div
        className={`sticky left-[246px] z-10 ${rowBg} px-2.5 py-1.5 self-stretch tabular-nums text-xs flex items-center whitespace-nowrap transition-colors ${getCellSelectionClass('duration')} ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle'}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('duration', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('duration'); }}
        title={row.duration_formatted || 'Auto-calculated on status selection'}
      >
        <span className="my-auto">
          {row.duration_formatted || (
            <span className={isNotHiring ? 'text-red-600/70 dark:text-red-400/70' : 'text-fg-muted'}>—</span>
          )}
        </span>
      </div>

      {/* Company Name (Frozen Col 5 - Editable & Solid Right Divider) */}
      <div
        className={`sticky left-[336px] z-10 ${rowBg} px-2 py-1 self-stretch flex items-center border-r-2 border-border-strong shadow-[6px_0_12px_-3px_rgba(0,0,0,0.12)] dark:shadow-[6px_0_12px_-3px_rgba(0,0,0,0.6)] transition-colors ${getCellSelectionClass('company_name')}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('company_name', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('company_name'); }}
        title={row.company_name}
      >
        {isEffectivelyReadOnly ? (
          <div className="flex items-center justify-between w-full min-w-0 gap-1.5 my-auto">
            <span className={`break-words leading-snug select-text truncate ${isNotHiring ? 'text-red-600 dark:text-red-400 font-bold' : 'text-fg font-semibold'}`}>{row.company_name}</span>
            {onCopySingle && isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopySingle(row);
                }}
                title={`Copy "${row.company_name}" to today's daily tracker workspace`}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 text-[10.5px] font-semibold active:scale-95"
              >
                <CopyPlus size={11} strokeWidth={2.4} />
                <span className="hidden sm:inline">Copy to Today</span>
              </button>
            )}
          </div>
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
            className={`w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded transition-colors cursor-text text-xs outline-none my-auto ${isNotHiring ? '!text-red-600 dark:!text-red-400 font-bold' : 'text-fg font-semibold'}`}
          />
        )}
        {row.original_college_code && (
          <span
            title={`Received from ${row.original_college_name || row.original_college_code}${row.original_coordinator_name ? ` (${row.original_coordinator_name})` : ''}`}
            className="ml-1 px-1.5 py-0.5 text-[9.5px] font-bold rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 my-auto"
          >
            Shared ({row.original_college_code})
          </span>
        )}
      </div>

      {/* HR Name (Editable) */}
      <div
        className={`px-2 py-1 self-stretch flex items-center min-w-0 ${getCellSelectionClass('hr_name')}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('hr_name', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('hr_name'); }}
        title={row.hr_name || ''}
      >
        {isEffectivelyReadOnly ? (
          <span className={`text-xs leading-snug break-words select-text my-auto ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg font-medium'}`}>
            {row.hr_name || <span className={isNotHiring ? 'text-red-600/70 dark:text-red-400/70 italic' : 'text-fg-muted italic'}>—</span>}
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
            className={`w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded transition-colors cursor-text text-xs outline-none placeholder:text-fg-disabled min-w-0 my-auto ${isNotHiring ? '!text-red-600 dark:!text-red-400 font-semibold' : 'text-fg font-medium'}`}
          />
        )}
      </div>

      {/* Contact (Call / WhatsApp + Editable Mobile) */}
      <div
        className={`px-2 py-1.5 font-mono tabular-nums text-xs self-stretch flex items-center gap-1.5 group/contact min-w-0 ${getCellSelectionClass('mobile_number')} ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg'}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('mobile_number', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('mobile_number'); }}
      >
        {row.mobile_number && (
          <div className="flex items-center gap-1 shrink-0 my-auto">
            {!isEffectivelyReadOnly ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onCall?.(row);
                }}
                title={`Click to call ${row.hr_name || row.company_name} (${(row.mobile_number || '').split(/[,;/]+/)[0]?.trim() || row.mobile_number})`}
                className="w-5 h-5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 dark:border-blue-400/60 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all hover:scale-105 active:scale-[0.992] cursor-pointer shrink-0 shadow-2xs"
              >
                <Phone size={11} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />
              </button>
            ) : isAdvanceLocked ? (
              <div
                title="Calling is locked for tomorrow's advance entry. Unlocks automatically at 12:00 AM midnight"
                className="w-5 h-5 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 text-fg-disabled flex items-center justify-center shrink-0 cursor-not-allowed shadow-2xs opacity-60"
              >
                <Phone size={11} strokeWidth={2} className="text-fg-disabled" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-md bg-blue-500/15 border border-blue-500/40 dark:border-blue-400/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Phone size={11} strokeWidth={2.5} className="text-blue-600 dark:text-blue-400" />
              </div>
            )}

            {!isAdvanceLocked && (
              <WhatsAppButton
                mobileNumber={(row.mobile_number || '').split(/[,;/]+/)[0]?.trim() || row.mobile_number}
                contactName={row.hr_name}
                companyName={row.company_name}
              />
            )}
          </div>
        )}

        {isEffectivelyReadOnly ? (
          <div className="flex flex-col justify-center gap-0.5 min-w-0 leading-snug py-0.5 my-auto">
            {(() => {
              const numbers = (row.mobile_number || '')
                .split(/[,;/]+/)
                .map((s) => s.trim())
                .filter(Boolean);
              if (numbers.length === 0) {
                return <span className={isNotHiring ? 'text-red-600/70 dark:text-red-400/70 italic' : 'text-fg-muted italic'}>—</span>;
              }
              return numbers.map((num, nIdx) => (
                <span
                  key={nIdx}
                  className={`select-all hover:text-fg transition-colors ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle'}`}
                  title={num}
                >
                  {num}
                </span>
              ));
            })()}
          </div>
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
            className={`w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded font-mono font-medium transition-colors cursor-text text-xs outline-none placeholder:text-fg-disabled min-w-0 my-auto ${isNotHiring ? '!text-red-600 dark:!text-red-400 font-semibold' : 'text-fg'}`}
          />
        )}
      </div>

      {/* Email ID (Editable) */}
      <div
        className={`px-2 py-1.5 self-stretch flex items-center min-w-0 text-xs ${getCellSelectionClass('email_id')}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('email_id', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('email_id'); }}
        title={row.email_id || ''}
      >
        {isEffectivelyReadOnly ? (
          <div className="flex flex-col justify-center gap-0.5 min-w-0 leading-snug py-0.5 my-auto">
            {(() => {
              const emails = (row.email_id || '')
                .split(/[,;/]+/)
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
              if (emails.length === 0) {
                return <span className={isNotHiring ? 'text-red-600/70 dark:text-red-400/70 italic' : 'text-fg-muted italic'}>—</span>;
              }
              return emails.map((em, eIdx) => (
                <span
                  key={eIdx}
                  className={`select-all hover:text-fg transition-colors break-all text-[11.5px] ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle'}`}
                  title={em}
                >
                  {em}
                </span>
              ));
            })()}
          </div>
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
            className={`w-full bg-transparent border border-transparent hover:border-border-strong focus:border-primary focus:bg-surface px-1.5 py-1 rounded transition-colors cursor-text text-xs outline-none placeholder:text-fg-disabled min-w-0 my-auto ${isNotHiring ? '!text-red-600 dark:!text-red-400 font-semibold' : 'text-fg'}`}
          />
        )}
      </div>

      {/* Coordinator & College — shown in read-only history, which spans coordinators and colleges */}
      {isReadOnly && (
        <div
          className="px-2.5 py-1.5 self-stretch flex items-center gap-1.5 whitespace-nowrap text-xs"
          title={`${row.college_name || row.college_code || ''} ${
            row.coordinator_name ? `• ${row.coordinator_name}` : ''
          }`.trim()}
        >
          {row.college_code && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 my-auto">
              {row.college_code}
            </span>
          )}
          <span className={`select-text truncate max-w-[130px] my-auto ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle'}`}>
            {(() => {
              const code = (row.college_code || '').toUpperCase();
              if (['ACET', 'AIHT', 'KARPAGAM', 'KPR'].includes(code)) {
                if (!row.coordinator_name || row.coordinator_name === 'Administrator') {
                  return 'A.Mohanaradha';
                }
              }
              return row.coordinator_name || '—';
            })()}
          </span>
        </div>
      )}

      {/* Call Status (Dropdown directly in cell) */}
      <div
        className={`px-2 py-1.5 min-w-0 self-stretch flex items-center ${getCellSelectionClass('outcome_status')}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('outcome_status', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('outcome_status'); }}
      >
        {isEffectivelyReadOnly ? (
          <div className="my-auto">
            <OutcomeBadge outcome={row.outcome_status} />
          </div>
        ) : (
          <div className="w-full my-auto">
            <RowOutcomeDropdown
              value={row.outcome_status}
              onChange={(val) => handleOutcomeChange(val as CallOutcome)}
            />
          </div>
        )}
      </div>

      {/* Follow Up (Date picker directly in cell — real day/month/year, not just a month) */}
      <div
        className={`px-2 py-1.5 min-w-0 self-stretch flex items-center ${getCellSelectionClass('follow_up_month')}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('follow_up_month', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('follow_up_month'); }}
      >
        {isEffectivelyReadOnly ? (
          <span className={`text-xs px-1 my-auto ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle'}`}>
            {row.outcome_status === 'follow_up'
              ? (row.follow_up_date ? formatFollowUpDateDisplay(row.follow_up_date) : (row.follow_up_month ? formatFollowUpMonthDisplay(row.follow_up_month) : '—'))
              : '—'}
          </span>
        ) : (
          <div className="w-full my-auto">
            <RowFollowUpDateDropdown
              value={row.outcome_status === 'follow_up' ? (row.follow_up_date ?? null) : null}
              disabled={row.outcome_status !== 'follow_up'}
              onChange={(dateIso) => handleFollowUpDateChange(dateIso)}
            />
          </div>
        )}
      </div>

      {/* Comments (Textarea directly in cell) */}
      <div
        className={`px-2.5 py-1.5 min-w-0 self-stretch flex items-center ${getCellSelectionClass('comments')}`}
        onMouseDown={(e) => { if (!isEffectivelyReadOnly && e.button === 0) onCellMouseDown?.('comments', e); }}
        onMouseEnter={() => { if (!isEffectivelyReadOnly) onCellMouseEnter?.('comments'); }}
      >
        {isEffectivelyReadOnly ? (
          <p className={`italic text-xs break-words leading-relaxed whitespace-pre-wrap my-auto w-full ${isNotHiring ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-fg-subtle'}`}>
            {row.comments || '—'}
          </p>
        ) : (
          <textarea
            ref={commentsRef as any}
            defaultValue={row.comments ?? ''}
            maxLength={200}
            placeholder="Optional notes (max 200 chars)…"
            rows={1}
            onKeyDown={handleCommentsKeyDown}
            onBlur={handleCommentsBlur}
            onFocus={(e) => {
              const target = e.currentTarget;
              target.style.height = 'auto';
              target.style.height = `${Math.max(28, target.scrollHeight)}px`;
            }}
            onInput={(e) => {
              const target = e.currentTarget;
              target.style.height = 'auto';
              target.style.height = `${Math.max(28, target.scrollHeight)}px`;
            }}
            className={`w-full bg-transparent border border-transparent hover:border-border-strong focus:bg-surface px-1.5 py-1 rounded transition-colors resize-none break-words leading-relaxed text-xs outline-none focus:ring-1 focus:ring-primary/30 my-auto overflow-hidden ${isNotHiring ? '!text-red-600 dark:!text-red-400 font-semibold placeholder:!text-red-300' : 'text-fg placeholder-fg-subtle'}`}
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
