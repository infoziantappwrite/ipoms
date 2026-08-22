'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  coordinatorId: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
}

export function CalendarPicker({ coordinatorId, onClose, onSelectDate }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-based
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set());
  const [loadingDots, setLoadingDots] = useState(false);

  const fetchActiveDays = useCallback(async (year: number, month: number) => {
    setLoadingDots(true);
    try {
      const res = await apiFetch(
        `/daily-tracker/calendar-activity?coordinator_id=${coordinatorId}&year=${year}&month=${month}`
      );
      if (res.success) {
        setActiveDays(new Set((res.data as any).active_days));
      }
    } catch (e) { console.error('[Calendar] Fetch failed', e); }
    finally { setLoadingDots(false); }
  }, [coordinatorId]);

  useEffect(() => {
    if (!coordinatorId) return;
    fetchActiveDays(viewYear, viewMonth);
  }, [viewYear, viewMonth, coordinatorId, fetchActiveDays]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const todayYear = today.getFullYear();

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    const isToday = day === todayDate && viewMonth === todayMonth && viewYear === todayYear;
    if (isToday) { onClose(); return; }
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(dateStr);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      {/* Modern Flat 2.0 Clean Modal Card */}
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col">

        {/* ── Modern Flat Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/75">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
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
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Weekday Headers ────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 text-center text-micro font-bold text-slate-400 px-4 pt-3.5 pb-1 uppercase tracking-wider bg-white">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* ── Calendar Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 text-center text-xs px-4 pb-4 gap-1 bg-white">
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
                      ? 'text-slate-300 cursor-not-allowed font-normal'
                      : 'cursor-pointer hover:bg-blue-50 hover:text-primary font-medium'
                  }
                  ${isToday ? 'bg-primary text-white font-bold shadow-xs hover:bg-blue-700 hover:text-white' : ''}
                  ${hasActivity && !isToday ? 'text-slate-900 font-bold' : ''}
                  ${!hasActivity && !isToday && !isFuture ? 'text-slate-600' : ''}
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

        {/* ── Modern Flat Legend & Footer ────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/80 text-xs">
          <div className="flex items-center gap-3 text-slate-600 font-medium">
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
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs border border-slate-300 transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
