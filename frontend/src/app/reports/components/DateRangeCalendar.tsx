'use client';

import React from 'react';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';

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

  return (
    <div className="space-y-3">
      {/* ── Start Date & End Date Solid Smooth Pickers ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-xs font-semibold text-fg mb-1.5">
            Start Date (From)
          </label>
          <SmoothDatePicker
            value={startDate}
            onChange={handleStartDateChange}
            placeholder="Select Start Date"
            variant="input"
            fullWidth={true}
            usePortal={true}
            clearable={true}
            maxDate={endDate || undefined}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-semibold text-fg mb-1.5">
            End Date (To)
          </label>
          <SmoothDatePicker
            value={endDate}
            onChange={handleEndDateChange}
            placeholder="Select End Date"
            variant="input"
            fullWidth={true}
            usePortal={true}
            clearable={true}
            minDate={startDate || undefined}
          />
        </div>
      </div>
    </div>
  );
}

