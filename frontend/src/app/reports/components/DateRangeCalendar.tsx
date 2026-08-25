'use client';

import React from 'react';
import { SmoothCalendar } from '@/components/ui/SmoothCalendar';
import { CalendarRange, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChangeRange: (start: string, end: string, calculatedLabel: string) => void;
}

export function formatPeriodFromDates(startStr: string, endStr: string): string {
  if (!startStr) return '';
  if (!endStr) {
    const s = new Date(startStr + 'T00:00:00');
    return `Starting ${s.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (Select End Date)`;
  }
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');

  const optShort: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const sStr = start.toLocaleDateString('en-IN', optShort);
  const eStr = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthName = start.toLocaleDateString('en-IN', { month: 'long' });
  const year = start.getFullYear();

  // Find Friday week index
  let fridayCount = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= start) {
    if (cur.getDay() === 5) fridayCount++;
    cur.setDate(cur.getDate() + 1);
  }
  const weekNum = fridayCount > 0 ? fridayCount : 1;
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays === 7 && start.getDay() === 5) {
    return `${monthName} ${year} • Week ${weekNum}: ${sStr} – ${eStr}`;
  } else if (diffDays === 14) {
    return `${monthName} ${year} • Weeks ${weekNum} & ${weekNum + 1}: ${sStr} – ${eStr}`;
  } else if (diffDays >= 28 && start.getDate() === 1) {
    return `${monthName} ${year} Consolidated (01 ${monthName.slice(0, 3)} – ${eStr})`;
  } else {
    return `${sStr} ${start.getFullYear()} – ${eStr}`;
  }
}

export function DateRangeCalendar({ startDate, endDate, onChangeRange }: Props) {
  const handleStartDateDirectChange = (newStart: string) => {
    if (endDate && newStart > endDate) {
      onChangeRange(newStart, newStart, formatPeriodFromDates(newStart, newStart));
    } else {
      onChangeRange(newStart, endDate, formatPeriodFromDates(newStart, endDate));
    }
  };

  const handleEndDateDirectChange = (newEnd: string) => {
    if (startDate && newEnd < startDate) {
      onChangeRange(newEnd, startDate, formatPeriodFromDates(newEnd, startDate));
    } else {
      onChangeRange(startDate, newEnd, formatPeriodFromDates(startDate, newEnd));
    }
  };

  const periodLabel = formatPeriodFromDates(startDate, endDate);
  const isAwaitingSecondClick = Boolean(startDate && !endDate);

  return (
    <div className="bg-surface-sunken border border-border rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row gap-5 items-center md:items-start text-fg">
      {/* ── Visual Smooth Calendar Component ── */}
      <div className="shrink-0 mx-auto md:mx-0 flex flex-col items-center gap-2">
        <SmoothCalendar
          mode="range"
          startDate={startDate}
          endDate={endDate}
          theme="navy"
          onChangeRange={(s, e) => {
            onChangeRange(s, e, formatPeriodFromDates(s, e));
          }}
          className="shadow-md"
        />
        <p className="text-[11px] text-fg-subtle text-center font-medium">
          {isAwaitingSecondClick ? (
            <span className="text-amber-600 dark:text-amber-400 font-bold animate-pulse inline-flex items-center gap-1">
              <ArrowRight size={12} aria-hidden /> Click 2nd date to set End Date
            </span>
          ) : (
            <span>Click any date for <strong>Start Date</strong>, then 2nd date for <strong>End Date</strong></span>
          )}
        </p>
      </div>

      {/* ── Selection Overview & Direct Input Fields ── */}
      <div className="flex-1 flex flex-col justify-center self-stretch py-1 gap-4">
        {/* Header Banner */}
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
            <CalendarRange size={16} strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-fg uppercase tracking-wider">
              Selected Period
            </h3>
            <p className="text-sm font-bold text-primary dark:text-sky-300">
              {periodLabel || 'Click two dates on the calendar or pick below'}
            </p>
          </div>
        </div>

        {/* Start Date & End Date Direct Input Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Start Date Field */}
          <div
            className={`bg-surface rounded-2xl p-3 border transition-all shadow-2xs ${
              !startDate
                ? 'border-primary/50 ring-1 ring-primary/20'
                : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-primary text-white font-mono text-[9px] flex items-center justify-center font-bold">1</span>
                Start Date
              </span>
              {startDate && <CheckCircle2 size={13} className="text-emerald-500" />}
            </div>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateDirectChange(e.target.value)}
                className="w-full bg-surface-sunken border border-border text-fg text-xs font-semibold px-3 py-1.5 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* 2. End Date Field */}
          <div
            className={`bg-surface rounded-2xl p-3 border transition-all shadow-2xs ${
              isAwaitingSecondClick
                ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/5'
                : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-primary text-white font-mono text-[9px] flex items-center justify-center font-bold">2</span>
                End Date
              </span>
              {endDate && <CheckCircle2 size={13} className="text-emerald-500" />}
            </div>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateDirectChange(e.target.value)}
                className="w-full bg-surface-sunken border border-border text-fg text-xs font-semibold px-3 py-1.5 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
