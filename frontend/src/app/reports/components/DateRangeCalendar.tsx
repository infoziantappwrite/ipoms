'use client';

import React from 'react';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { CalendarRange } from 'lucide-react';

interface Props {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChangeRange: (start: string, end: string, calculatedLabel: string) => void;
  isOptional?: boolean;
}

export function formatPeriodFromDates(startStr: string, endStr: string): string {
  if (!startStr && !endStr) return '';
  if (!startStr && endStr) {
    const e = new Date(endStr + 'T00:00:00');
    return `Up to ${e.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (!endStr) {
    const s = new Date(startStr + 'T00:00:00');
    return `From ${s.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');

  const optShort: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const sStr = start.toLocaleDateString('en-IN', optShort);
  const eStr = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (start.getFullYear() === end.getFullYear()) {
    return `${sStr} – ${eStr}`;
  } else {
    const sStrFull = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${sStrFull} – ${eStr}`;
  }
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateRangeCalendar({ startDate, endDate, onChangeRange, isOptional = false }: Props) {
  const handleStartDateChange = (newStart: string) => {
    if (!newStart) {
      onChangeRange('', endDate, formatPeriodFromDates('', endDate));
      return;
    }
    if (endDate && newStart > endDate) {
      onChangeRange(newStart, newStart, formatPeriodFromDates(newStart, newStart));
    } else {
      onChangeRange(newStart, endDate, formatPeriodFromDates(newStart, endDate));
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    if (!newEnd) {
      onChangeRange(startDate, '', formatPeriodFromDates(startDate, ''));
      return;
    }
    if (startDate && newEnd < startDate) {
      onChangeRange(newEnd, startDate, formatPeriodFromDates(newEnd, startDate));
    } else {
      onChangeRange(startDate, newEnd, formatPeriodFromDates(startDate, newEnd));
    }
  };

  const periodLabel = formatPeriodFromDates(startDate, endDate);

  // Calculate day count
  const dayCount = React.useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  }, [startDate, endDate]);

  // Quick preset handlers
  const handlePresetLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    const sStr = toISODate(start);
    const eStr = toISODate(end);
    onChangeRange(sStr, eStr, formatPeriodFromDates(sStr, eStr));
  };

  const handlePresetPreviousWeek = () => {
    const end = new Date();
    end.setDate(end.getDate() - 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const sStr = toISODate(start);
    const eStr = toISODate(end);
    onChangeRange(sStr, eStr, formatPeriodFromDates(sStr, eStr));
  };

  const handlePresetLast14Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 13);
    const sStr = toISODate(start);
    const eStr = toISODate(end);
    onChangeRange(sStr, eStr, formatPeriodFromDates(sStr, eStr));
  };

  return (
    <div className="space-y-3">
      {/* ── Start Date & End Date Solid Smooth Pickers ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-xs font-semibold text-fg mb-1.5 flex items-center gap-1">
            <span>Start Date (From)</span>
            {isOptional ? (
              <span className="text-[10px] text-fg-subtle font-normal font-mono bg-surface border border-border px-1.5 py-0.2 rounded">Optional</span>
            ) : (
              <span className="text-rose-500 font-bold">*</span>
            )}
          </label>
          <SmoothDatePicker
            value={startDate}
            onChange={handleStartDateChange}
            placeholder={isOptional ? 'Start Date (Optional)' : 'Select Start Date'}
            variant="input"
            fullWidth={true}
            usePortal={true}
            clearable={isOptional}
            maxDate={endDate || undefined}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-semibold text-fg mb-1.5 flex items-center gap-1">
            <span>End Date (To)</span>
            {isOptional ? (
              <span className="text-[10px] text-fg-subtle font-normal font-mono bg-surface border border-border px-1.5 py-0.2 rounded">Optional</span>
            ) : (
              <span className="text-rose-500 font-bold">*</span>
            )}
          </label>
          <SmoothDatePicker
            value={endDate}
            onChange={handleEndDateChange}
            placeholder={isOptional ? 'End Date (Optional)' : 'Select End Date'}
            variant="input"
            fullWidth={true}
            usePortal={true}
            clearable={isOptional}
            minDate={startDate || undefined}
          />
        </div>
      </div>

      {/* ── Duration & Quick Presets Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface-sunken border border-border rounded-xl px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarRange size={14} className="text-primary shrink-0" />
          <span className="font-medium text-fg-subtle">Reporting Duration:</span>
          <strong className="text-primary font-semibold">
            {periodLabel || (isOptional ? 'All Dates (Cumulative)' : 'Select dates above')}
          </strong>
          {dayCount !== null ? (
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface border border-primary/20 text-primary shrink-0">
              {dayCount} {dayCount === 1 ? 'Day' : 'Days'}
            </span>
          ) : isOptional && !startDate && !endDate ? (
            <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
              Full History (All Dates)
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-fg-subtle mr-1">Presets:</span>
          <button
            type="button"
            onClick={handlePresetLast7Days}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg border border-border bg-surface hover:bg-surface-raised text-fg hover:text-primary transition-all cursor-pointer shadow-2xs"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={handlePresetPreviousWeek}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg border border-border bg-surface hover:bg-surface-raised text-fg hover:text-primary transition-all cursor-pointer shadow-2xs"
          >
            Previous Week
          </button>
          <button
            type="button"
            onClick={handlePresetLast14Days}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg border border-border bg-surface hover:bg-surface-raised text-fg hover:text-primary transition-all cursor-pointer shadow-2xs"
          >
            14 Days
          </button>
          {isOptional && (startDate || endDate) && (
            <button
              type="button"
              onClick={() => onChangeRange('', '', '')}
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs font-semibold"
            >
              Clear Dates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
