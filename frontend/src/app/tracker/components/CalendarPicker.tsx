'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Props {
  coordinatorId: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CalendarPicker({ coordinatorId, onClose, onSelectDate }: Props) {
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

    apiFetch(`/tracker/active-days?coordinator_id=${coordinatorId}&year=${viewYear}&month=${viewMonth}`)
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
  }, [coordinatorId, viewYear, viewMonth]);

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
    <div className="fixed inset-0 bg-overlay/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      {/* Themed Modal Card */}
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col text-fg">

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
            const isToday = day === todayDate && viewMonth === todayMonth && viewYear === todayYear;
            const hasActivity = activeDays.has(day);
            const isFuture = new Date(viewYear, viewMonth - 1, day) > today;

            return (
              <button
                key={day}
                onClick={() => !isFuture && handleDayClick(day)}
                disabled={isFuture}
                className={`
                  relative h-9 flex flex-col items-center justify-center rounded-xl text-xs transition-colors
                  ${
                    isFuture
                      ? 'text-fg-disabled cursor-not-allowed font-normal'
                      : 'cursor-pointer hover:bg-surface-raised hover:text-primary font-medium'
                  }
                  ${isToday ? 'bg-primary text-white font-bold shadow-xs hover:bg-primary-hover hover:text-white' : ''}
                  ${hasActivity && !isToday ? 'text-fg font-bold' : ''}
                  ${!hasActivity && !isToday && !isFuture ? 'text-fg-muted' : ''}
                `}
              >
                <span>{day}</span>
                {/* Activity Dot */}
                {hasActivity && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isToday ? 'bg-white' : 'bg-primary'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Legend & Footer ────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-sunken text-xs">
          <div className="flex items-center gap-3 text-fg-muted font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-micro">Has calls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-primary text-white text-micro font-bold inline-flex items-center justify-center">
                T
              </span>
              <span className="text-micro">Today</span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-surface hover:bg-surface-raised text-fg font-semibold rounded-lg text-xs border border-border transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
