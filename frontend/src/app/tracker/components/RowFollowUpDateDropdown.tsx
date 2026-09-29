'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-11-15" -> Date at local midnight, so day math never drifts across a timezone. */
function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIsoDate(year: number, month1to12: number, day: number): string {
  return `${year}-${String(month1to12).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "2026-11-15" -> "15 Nov 2026" — date, month, year, exactly what was asked for. */
export function formatFollowUpDateDisplay(value?: string | null): string {
  if (!value) return '';
  const d = parseIsoDate(value);
  if (!d) return '';
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

interface Props {
  /** ISO date string ("YYYY-MM-DD" or a full ISO timestamp) or null. */
  value?: string | null;
  onChange: (dateIso: string) => void;
  disabled?: boolean;
}

export function RowFollowUpDateDropdown({ value, onChange, disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom'; ready: boolean }>({
    top: 0, left: 0, placement: 'bottom', ready: false,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = value ? parseIsoDate(value) : null;

  const [viewYear, setViewYear] = useState(() => (selectedDate || today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selectedDate || today).getMonth()); // 0-11

  // Reset the visible month to the selected date (or today) whenever the popover reopens.
  useEffect(() => {
    if (isOpen) {
      const base = selectedDate || today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 300;
    const popoverWidth = 240;
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
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
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
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else { setViewMonth((m) => m - 1); }
  };
  const goNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else { setViewMonth((m) => m + 1); }
  };

  const handleSelectDay = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onChange(toIsoDate(viewYear, viewMonth + 1, day));
    setIsOpen(false);
    setCoords((prev) => ({ ...prev, ready: false }));
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const displayValue = formatFollowUpDateDisplay(value);

  return (
    <div className="relative w-full text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all select-none shadow-2xs whitespace-nowrap ${
          disabled
            ? 'bg-surface-sunken/40 border-border/40 text-fg-disabled/50 cursor-not-allowed'
            : value
            ? 'bg-orange-500/10 border-orange-500/60 text-orange-700 dark:text-orange-300 font-semibold cursor-pointer active:scale-[0.992]'
            : 'bg-orange-500/10 border-orange-500/70 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500/20 font-semibold cursor-pointer active:scale-[0.992]'
        } ${isOpen ? 'ring-2 ring-orange-500/30 border-orange-500' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar size={12} className={disabled ? 'text-fg-disabled/40 shrink-0' : 'text-orange-600 dark:text-orange-400 shrink-0'} />
          <span className="whitespace-nowrap text-xs">{disabled ? '—' : (displayValue || 'Pick Date *')}</span>
        </div>
        <ChevronDown
          size={12}
          className={`text-fg-subtle shrink-0 ml-1 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            disabled ? 'opacity-20' : isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
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
            width: '240px',
            zIndex: 99999,
          }}
          className="bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-2.5 flex flex-col text-fg select-none animate-in fade-in zoom-in-95 duration-150 ease-out"
        >
          <div className="flex items-center justify-between mb-2 px-0.5">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="w-6 h-6 rounded-lg hover:bg-surface-raised text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} strokeWidth={2.2} />
            </button>
            <span className="text-xs font-bold text-fg tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="w-6 h-6 rounded-lg hover:bg-surface-raised text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[9px] font-bold text-fg-subtle uppercase tracking-wide mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="h-7" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cellDate = new Date(viewYear, viewMonth, day);
              const isPast = cellDate < today;
              const isToday = cellDate.getTime() === today.getTime();
              const isSelected = selectedDate && cellDate.getTime() === selectedDate.getTime();

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={(e) => handleSelectDay(day, e)}
                  className={`h-7 rounded-lg text-[11px] flex items-center justify-center transition-colors ${
                    isPast
                      ? 'text-fg-disabled/40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-orange-500 text-white font-bold shadow-xs cursor-pointer'
                      : isToday
                      ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 font-bold ring-1 ring-orange-500/40 cursor-pointer'
                      : 'text-fg hover:bg-surface-raised hover:text-orange-600 dark:hover:text-orange-400 font-medium cursor-pointer'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
