'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export type CalendarTheme = 'navy' | 'blue' | 'emerald' | 'amber';

export interface SmoothCalendarProps {
  mode?: 'single' | 'range';
  value?: string; // YYYY-MM-DD for single mode
  startDate?: string; // YYYY-MM-DD for range mode
  endDate?: string; // YYYY-MM-DD for range mode
  onChangeSingle?: (date: string) => void;
  onChangeRange?: (start: string, end: string) => void;
  theme?: CalendarTheme;
  minDate?: string;
  maxDate?: string;
  highlightedDates?: string[]; // array of YYYY-MM-DD to show a micro dot
  className?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function SmoothCalendar({
  mode = 'single',
  value,
  startDate,
  endDate,
  onChangeSingle,
  onChangeRange,
  theme = 'navy',
  minDate,
  maxDate,
  highlightedDates = [],
  className = '',
}: SmoothCalendarProps) {
  // Determine initial display month based on provided value or start date
  const initialDate = useMemo(() => {
    if (mode === 'single' && value && value !== 'all') {
      const [y, m] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) return new Date(y, m - 1, 1);
    }
    if (mode === 'range' && startDate) {
      const [y, m] = startDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) return new Date(y, m - 1, 1);
    }
    return new Date();
  }, [mode, value, startDate]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);

  // Sync currentMonth if value/startDate changes externally
  useEffect(() => {
    if (mode === 'single' && value && value !== 'all') {
      const [y, m] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentMonth(new Date(y, m - 1, 1));
      }
    } else if (mode === 'range' && startDate) {
      const [y, m] = startDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentMonth(new Date(y, m - 1, 1));
      }
    }
  }, [value, startDate, mode]);

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();

  // Internal state for range in-progress selection
  const [rangeHoverDate, setRangeHoverDate] = useState<string | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, monthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, monthIndex + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    if (mode === 'single' && onChangeSingle) {
      onChangeSingle(todayStr);
    }
  };

  // Compute days in month
  const { days, blankPrefixDays } = useMemo(() => {
    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();

    const dList: Array<{ day: number; dateStr: string }> = [];
    for (let i = 1; i <= totalDays; i++) {
      dList.push({
        day: i,
        dateStr: formatDateKey(year, monthIndex, i),
      });
    }

    return {
      days: dList,
      blankPrefixDays: firstDayOfWeek,
    };
  }, [year, monthIndex]);

  // Handle Day Click
  const handleDayClick = (dateStr: string) => {
    if (mode === 'single') {
      if (onChangeSingle) onChangeSingle(dateStr);
    } else if (mode === 'range') {
      if (!startDate || (startDate && endDate)) {
        // Start new range
        if (onChangeRange) onChangeRange(dateStr, '');
      } else if (startDate && !endDate) {
        // Complete range
        if (dateStr < startDate) {
          if (onChangeRange) onChangeRange(dateStr, startDate);
        } else {
          if (onChangeRange) onChangeRange(startDate, dateStr);
        }
      }
    }
  };

  // Color styles based on selected theme (Project Infoziant Navy/Blue by default)
  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'navy':
      default:
        return {
          selectedCircle: 'bg-[#1E3A8A] text-white shadow-xs font-bold shadow-blue-900/30 ring-2 ring-blue-700/20',
          rangeRibbon: 'bg-blue-100/90 text-blue-950 font-semibold dark:bg-blue-950/50 dark:text-blue-200',
          rangeConnectingBefore: 'bg-blue-100/90 dark:bg-blue-950/50',
          todayDot: 'bg-[#1E3A8A]',
          todayRing: 'text-[#1E3A8A] font-bold ring-1 ring-[#1E3A8A]/30',
          hoverDay: 'hover:bg-blue-50/80 hover:text-blue-900 dark:hover:bg-slate-800',
        };
      case 'blue':
        return {
          selectedCircle: 'bg-blue-600 text-white shadow-xs font-bold shadow-blue-600/30',
          rangeRibbon: 'bg-blue-100 text-blue-950 font-semibold',
          rangeConnectingBefore: 'bg-blue-100',
          todayDot: 'bg-blue-600',
          todayRing: 'text-blue-600 font-bold ring-1 ring-blue-600/30',
          hoverDay: 'hover:bg-blue-50 hover:text-blue-700',
        };
      case 'emerald':
        return {
          selectedCircle: 'bg-emerald-700 text-white shadow-xs font-bold shadow-emerald-900/25',
          rangeRibbon: 'bg-emerald-100/80 text-emerald-950 font-semibold dark:bg-emerald-950/40 dark:text-emerald-200',
          rangeConnectingBefore: 'bg-emerald-100/80 dark:bg-emerald-950/40',
          todayDot: 'bg-emerald-700',
          todayRing: 'text-emerald-700 font-bold',
          hoverDay: 'hover:bg-emerald-50 dark:hover:bg-slate-800',
        };
      case 'amber':
        return {
          selectedCircle: 'bg-amber-600 text-white shadow-xs font-bold',
          rangeRibbon: 'bg-amber-100 text-amber-950 font-semibold',
          rangeConnectingBefore: 'bg-amber-100',
          todayDot: 'bg-amber-600',
          todayRing: 'text-amber-600 font-bold',
          hoverDay: 'hover:bg-amber-50',
        };
    }
  }, [theme]);

  const todayStr = useMemo(() => {
    const n = new Date();
    return formatDateKey(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  return (
    <div
      role="dialog"
      className={`select-none bg-surface rounded-2xl p-3.5 shadow-lg border border-border w-[260px] font-sans ${className}`}
    >
      {/* ── Compact Header: Month Year + Arrows ── */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {MONTH_NAMES[monthIndex]} {year}
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleToday}
            title="Jump to Today"
            className="text-[10px] font-bold text-slate-500 hover:text-primary dark:hover:text-slate-100 px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-0.5 mr-1 cursor-pointer"
          >
            <RotateCcw size={10} />
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            aria-label="Previous Month"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Compact Weekday Labels ── */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-0.5"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* ── Days Grid ── */}
      <div className="grid grid-cols-7">
        {/* Blank days from previous month */}
        {Array.from({ length: blankPrefixDays }).map((_, idx) => (
          <div key={`blank-${idx}`} className="h-7.5 w-full" />
        ))}

        {/* Calendar days */}
        {days.map(({ day, dateStr }) => {
          const isToday = dateStr === todayStr;
          const isSingleSelected = mode === 'single' && value === dateStr;

          // Range logic
          const effectiveEnd = endDate || rangeHoverDate || startDate || '';
          const rangeStart = startDate ? (startDate <= effectiveEnd ? startDate : effectiveEnd) : '';
          const rangeEnd = startDate ? (startDate <= effectiveEnd ? effectiveEnd : startDate) : '';

          const isRangeStart = mode === 'range' && startDate === dateStr;
          const isRangeEnd = mode === 'range' && endDate === dateStr;
          const isWithinRange =
            mode === 'range' &&
            rangeStart &&
            rangeEnd &&
            dateStr > rangeStart &&
            dateStr < rangeEnd;

          const isRangeSelectedEndpoint = isRangeStart || isRangeEnd;
          const hasHighlight = highlightedDates.includes(dateStr);

          // Calculate column index for border radius rounding on range wrap
          const dayOfWeek = new Date(year, monthIndex, day).getDay(); // 0 = Sun, 6 = Sat
          const isRowStart = dayOfWeek === 0;
          const isRowEnd = dayOfWeek === 6;

          return (
            <div
              key={dateStr}
              className={`relative h-7.5 flex items-center justify-center my-[1px] ${
                isWithinRange ? themeStyles.rangeRibbon : ''
              } ${isWithinRange && isRowStart ? 'rounded-l-full' : ''} ${
                isWithinRange && isRowEnd ? 'rounded-r-full' : ''
              }`}
              onMouseEnter={() => {
                if (mode === 'range' && startDate && !endDate) {
                  setRangeHoverDate(dateStr);
                }
              }}
            >
              {/* Range connection background behind start/end circles */}
              {mode === 'range' && isRangeStart && rangeEnd && rangeStart !== rangeEnd && (
                <div
                  className={`absolute inset-y-0 right-0 w-1/2 ${themeStyles.rangeConnectingBefore} ${
                    isRowEnd ? 'rounded-r-full' : ''
                  }`}
                />
              )}
              {mode === 'range' && isRangeEnd && rangeStart && rangeStart !== rangeEnd && (
                <div
                  className={`absolute inset-y-0 left-0 w-1/2 ${themeStyles.rangeConnectingBefore} ${
                    isRowStart ? 'rounded-l-full' : ''
                  }`}
                />
              )}

              {/* Interactive Day Button */}
              <button
                type="button"
                onClick={() => handleDayClick(dateStr)}
                className={`relative z-10 w-7 h-7 flex flex-col items-center justify-center rounded-full text-[11px] transition-all duration-150 cursor-pointer ${
                  isSingleSelected || isRangeSelectedEndpoint
                    ? themeStyles.selectedCircle
                    : isWithinRange
                    ? 'text-blue-950 dark:text-slate-100 font-semibold'
                    : isToday
                    ? `${themeStyles.todayRing} ${themeStyles.hoverDay}`
                    : `text-slate-700 dark:text-slate-200 font-medium ${themeStyles.hoverDay}`
                }`}
              >
                <span>{day}</span>

                {/* Subtle highlight dot */}
                {hasHighlight && !isSingleSelected && !isRangeSelectedEndpoint && (
                  <span
                    className={`w-1 h-1 rounded-full ${themeStyles.todayDot} -mt-0.5`}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
