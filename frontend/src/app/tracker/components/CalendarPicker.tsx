'use client';

import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
      const r = await fetch(
        `${API}/daily-tracker/calendar-activity?coordinator_id=${coordinatorId}&year=${year}&month=${month}`
      );
      const data = await r.json();
      if (data.success) {
        setActiveDays(new Set(data.data.active_days));
      }
    } catch (e) { console.error('[Calendar] Fetch failed', e); }
    finally { setLoadingDots(false); }
  }, [coordinatorId]);

  useEffect(() => {
    fetchActiveDays(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchActiveDays]);

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
    if (isToday) { onClose(); return; } // Today — don't open history for today
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(dateStr);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel rounded-2xl w-80 border border-slate-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <button onClick={prevMonth} className="text-slate-400 hover:text-white px-2 py-1 rounded transition-colors">←</button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{MONTHS[viewMonth - 1]} {viewYear}</p>
            {loadingDots && <p className="text-xs text-slate-500 animate-pulse">Loading activity…</p>}
          </div>
          <button onClick={nextMonth} className="text-slate-400 hover:text-white px-2 py-1 rounded transition-colors">→</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center text-xs text-slate-500 px-3 pt-3 pb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 text-center text-xs px-3 pb-4 gap-y-1">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
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
                  relative py-1.5 rounded-lg text-xs transition-colors
                  ${isFuture ? 'text-slate-700 cursor-default' : 'cursor-pointer hover:bg-slate-700'}
                  ${isToday ? 'bg-blue-600 text-white font-bold' : ''}
                  ${hasActivity && !isToday ? 'text-white font-semibold' : ''}
                  ${!hasActivity && !isToday && !isFuture ? 'text-slate-500' : ''}
                `}
              >
                {day}
                {/* Activity dot — Spec Section 15 */}
                {hasActivity && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full
                                    ${isToday ? 'bg-white' : 'bg-blue-400'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 px-5 py-3 border-t border-slate-700 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Has calls</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-lg bg-blue-600 inline-flex items-center justify-center text-white text-xs">T</span>
            <span>Today</span>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
