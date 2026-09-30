'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-11-15" -> Date at local midnight */
function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIsoDate(year: number, month1to12: number, day: number): string {
  return `${year}-${String(month1to12).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatCustomDateDisplay(value?: string | null): string {
  if (!value) return '';
  const d = parseIsoDate(value);
  if (!d) return '';
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export interface CustomDatePickerProps {
  value?: string | null; // "YYYY-MM-DD"
  onChange: (dateIso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowPast?: boolean;
  allowFuture?: boolean;
  minYear?: number;
  maxYear?: number;
  className?: string;
  clearable?: boolean;
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  allowPast = true,
  allowFuture = true,
  minYear = 1950,
  maxYear = 2040,
  className = '',
  clearable = true,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom'; ready: boolean }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    ready: false,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = parseIsoDate(value);

  const [viewYear, setViewYear] = useState(() => (selectedDate || today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selectedDate || today).getMonth()); // 0-11

  // Synchronize view with value when opened
  useEffect(() => {
    if (isOpen) {
      const base = selectedDate || today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setIsYearPickerOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 310;
    const popoverWidth = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) left = window.innerWidth - popoverWidth - 12;
    if (left < 12) left = 12;

    return {
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left,
      placement: placeAbove ? ('top' as const) : ('bottom' as const),
      ready: true,
    };
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    triggerHaptic('light');
    if (isOpen) {
      setIsOpen(false);
      setCoords((prev) => ({ ...prev, ready: false }));
      return;
    }
    const initialCoords = calculateCoords();
    if (initialCoords) setCoords(initialCoords);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => {
      const newCoords = calculateCoords();
      if (newCoords) setCoords(newCoords);
    };
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, calculateCoords]);

  const goPrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onChange(toIsoDate(viewYear, viewMonth + 1, day));
    setIsOpen(false);
    setCoords((prev) => ({ ...prev, ready: false }));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onChange('');
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    const todayIso = toIsoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    onChange(todayIso);
    setIsOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const displayValue = formatCustomDateDisplay(value);

  // Generate Year List for Quick Selection
  const years = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  return (
    <div className={`relative w-full text-left ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all select-none shadow-2xs ${
          disabled
            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            : value
            ? 'bg-surface dark:bg-zinc-900 border-border dark:border-zinc-700 text-fg dark:text-zinc-100 font-semibold cursor-pointer hover:border-primary/60 active:scale-[0.992]'
            : 'bg-surface dark:bg-zinc-900 border-border dark:border-zinc-700 text-fg-subtle dark:text-zinc-400 cursor-pointer hover:border-primary/60 active:scale-[0.992]'
        } ${isOpen ? 'ring-2 ring-primary/25 border-primary' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar
            size={13}
            className={disabled ? 'text-zinc-400 shrink-0' : value ? 'text-primary shrink-0' : 'text-zinc-400 shrink-0'}
          />
          <span className="truncate">{displayValue || placeholder}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {clearable && value && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 rounded-md hover:bg-surface-raised text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
              title="Clear date"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            className={`text-zinc-400 shrink-0 transition-transform duration-200 ${
              disabled ? 'opacity-30' : isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && coords.ready && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: coords.placement === 'top' ? 'auto' : `${coords.top}px`,
            bottom: coords.placement === 'top' ? `${window.innerHeight - coords.top}px` : 'auto',
            left: `${coords.left}px`,
            width: '260px',
            zIndex: 99999,
          }}
          className="bg-white dark:bg-[#161D2E] border border-zinc-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-3 flex flex-col text-fg select-none animate-in fade-in zoom-in-95 duration-150 ease-out"
        >
          {/* Header with Month/Year Navigation */}
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="w-6 h-6 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} strokeWidth={2.2} />
            </button>

            {/* Month & Year Selectable Header */}
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-zinc-900 dark:text-white cursor-pointer outline-none hover:text-primary transition-colors pr-1"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-zinc-900 dark:text-white cursor-pointer outline-none hover:text-primary transition-colors font-mono"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="w-6 h-6 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1.5">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cellDate = new Date(viewYear, viewMonth, day);
              cellDate.setHours(0, 0, 0, 0);
              const isPast = cellDate.getTime() < today.getTime();
              const isFuture = cellDate.getTime() > today.getTime();
              const isToday = cellDate.getTime() === today.getTime();
              const isSelected = selectedDate && cellDate.getTime() === selectedDate.getTime();

              const isDisabled = (!allowPast && isPast) || (!allowFuture && isFuture);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={(e) => handleSelectDay(day, e)}
                  className={`h-7 rounded-lg text-xs flex items-center justify-center transition-all ${
                    isDisabled
                      ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                      : isSelected
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold shadow-xs shadow-blue-500/25 cursor-pointer scale-[1.05]'
                      : isToday
                      ? 'bg-blue-500/10 text-primary dark:text-cyan-400 font-bold ring-1 ring-primary/40 cursor-pointer hover:bg-blue-500/20'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-cyan-400 font-medium cursor-pointer'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer with Today & Clear buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={handleToday}
              className="text-primary hover:underline font-bold cursor-pointer transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-zinc-400 hover:text-rose-500 font-medium cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
