'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Props {
  coordinatorId?: string;
  collegeId?: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CalendarPicker({ coordinatorId, collegeId, onClose, onSelectDate }: Props) {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDate = today.getDate();

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set());
  const [loadingDots, setLoadingDots] = useState(false);

  // Fetch active days with recorded calls for this month
  useEffect(() => {
    let isMounted = true;
    setLoadingDots(true);

    const params = new URLSearchParams({
      year: String(viewYear),
      month: String(viewMonth),
    });
    if (coordinatorId) params.append('coordinator_id', coordinatorId);
    if (collegeId) params.append('college_id', collegeId);

    apiFetch(`/tracker/active-days?${params.toString()}`)
      .then((data) => {
        if (isMounted && data.success && Array.isArray((data.data as any)?.days)) {
          setActiveDays(new Set((data.data as any).days));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch active days:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingDots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [coordinatorId, collegeId, viewYear, viewMonth]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();

  const handleDayClick = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(dateStr);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn cursor-pointer"
    >
      {/* Themed Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col text-fg cursor-default"
      >

        {/* ── Modern Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-sunken">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="w-8 h-8 rounded-lg bg-surface border border-border hover:bg-surface-raised text-fg flex items-center justify-center transition-colors shadow-xs cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          
          <div className="text-center">
            <h3 className="text-sm font-bold text-fg tracking-tight">
              {MONTHS[viewMonth - 1]} {viewYear}
            </h3>
            {loadingDots && (
              <p className="text-micro text-primary font-medium animate-pulse mt-0.5">
                Checking call activity…
              </p>
            )}
          </div>

          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="w-8 h-8 rounded-lg bg-surface border border-border hover:bg-surface-raised text-fg flex items-center justify-center transition-colors shadow-xs cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Weekday Headers ────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 text-center text-micro font-bold text-fg-subtle px-4 pt-3.5 pb-1 uppercase tracking-wider bg-surface">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* ── Calendar Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 text-center text-xs px-4 pb-4 gap-1 bg-surface">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayOfWeek = new Date(viewYear, viewMonth - 1, day).getDay(); // 0 = Sun, 6 = Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isToday = day === todayDate && viewMonth === todayMonth && viewYear === todayYear;
            const hasActivity = activeDays.has(day);
            const isFuture = new Date(viewYear, viewMonth - 1, day) > today;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  relative h-9 flex flex-col items-center justify-center rounded-xl text-xs transition-colors cursor-pointer
                  ${
                    isToday
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary-hover hover:text-primary-foreground'
                      : isFuture
                      ? 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-medium'
                      : hasActivity
                      ? 'text-fg font-bold hover:bg-surface-raised hover:text-primary'
                      : 'text-fg-muted hover:bg-surface-raised hover:text-primary font-medium'
                  }
                `}
                title={
                  isToday
                    ? 'Today (Live Session)'
                    : isFuture
                    ? `Upcoming date (${day} ${MONTHS[viewMonth - 1]} ${viewYear}) - Click to view in Read-Only Mode`
                    : `Past date (${day} ${MONTHS[viewMonth - 1]} ${viewYear}) - Click to view archived tracker`
                }
              >
                <span>{day}</span>
                {/* Activity Dot (No dots on Saturdays and Sundays) */}
                {hasActivity && !isToday && !isWeekend && (
                  <span className="w-1.5 h-1.5 rounded-full mt-0.5 bg-primary" />
                )}
                {isFuture && !isWeekend && (
                  <span className="w-1 h-1 rounded-full mt-0.5 bg-sky-400/70" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Legend & Footer ────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-sunken text-xs">
          <div className="flex items-center gap-3 text-fg-muted font-medium flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-micro">Has calls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-primary text-primary-foreground text-micro font-bold inline-flex items-center justify-center">
                T
              </span>
              <span className="text-micro">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-micro">Upcoming</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
