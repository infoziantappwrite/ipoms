'use client';

import React from 'react';
import { SmoothCalendar } from '@/components/ui/SmoothCalendar';
import { CalendarRange, Sparkles } from 'lucide-react';

interface Props {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChangeRange: (start: string, end: string, calculatedLabel: string) => void;
}

export function formatPeriodFromDates(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '';
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Mon–Fri work-week presets for the current month, computed from `now` (never hardcoded). */
function getCurrentMonthWeekPresets(now: Date): Array<{ label: string; start: string; end: string }> {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthAbbr = MONTH_ABBR[month];

  const presets: Array<{ label: string; start: string; end: string }> = [];
  let weekIndex = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() !== 1) continue; // Monday = start of work week
    weekIndex++;
    const weekEndDay = d + 4;
    if (weekEndDay > daysInMonth) break; // week spills into next month, skip
    presets.push({
      label: `Week ${weekIndex} (${monthAbbr} ${pad2(d)}–${pad2(weekEndDay)})`,
      start: toDateKey(date),
      end: toDateKey(new Date(year, month, weekEndDay)),
    });
  }

  presets.push({
    label: `Month to Date (${monthAbbr} 01–${pad2(now.getDate())})`,
    start: toDateKey(new Date(year, month, 1)),
    end: toDateKey(now),
  });

  return presets;
}

export function DateRangeCalendar({ startDate, endDate, onChangeRange }: Props) {
  // Preset shortcuts
  const handleSelectPreset = (start: string, end: string) => {
    onChangeRange(start, end, formatPeriodFromDates(start, end));
  };

  const periodLabel = formatPeriodFromDates(startDate, endDate);
  const presets = React.useMemo(() => getCurrentMonthWeekPresets(new Date()), []);

  return (
    <div className="bg-surface-sunken border border-border rounded-3xl p-4 shadow-xs flex flex-col md:flex-row gap-5 items-start">
      {/* ── Visual Smooth Calendar Component ── */}
      <div className="shrink-0 mx-auto md:mx-0">
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
      </div>

      {/* ── Selection Overview & Quick Presets ── */}
      <div className="flex-1 flex flex-col justify-between self-stretch py-1">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-primary-subtle text-primary flex items-center justify-center">
              <CalendarRange size={16} strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-fg uppercase tracking-wider">
                Selected Period
              </h3>
              <p className="text-sm font-semibold text-primary">
                {periodLabel || 'Click two dates on the calendar to set range'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-surface rounded-2xl p-3 border border-border shadow-2xs mb-4">
            <div>
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider block">
                Start Date
              </span>
              <span className="font-semibold text-fg">
                {startDate ? new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider block">
                End Date
              </span>
              <span className="font-semibold text-fg">
                {endDate ? new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick presets pills — computed from today's date, never hardcoded */}
        <div>
          <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles size={11} className="text-primary" />
            Quick Presets
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleSelectPreset(p.start, p.end)}
                className="px-3 py-1 text-xs font-semibold rounded-full bg-surface border border-border hover:bg-primary-subtle hover:border-primary/40 text-fg transition-all active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
