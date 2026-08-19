'use client';

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface College {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
}

interface Props {
  selectedCollegeId: string;
  onSelectCollege: (id: string, name: string) => void;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
}

// Format Friday-to-Friday week display: e.g. "Week 30: 18 Jul 2026 – 24 Jul 2026"
function formatWeekDisplay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);

  const day = d.getDay();
  const diffToFriday = day >= 5 ? day - 5 : day + 2;
  const startFriday = new Date(d);
  startFriday.setDate(d.getDate() - diffToFriday);

  const endThursday = new Date(startFriday);
  endThursday.setDate(startFriday.getDate() + 6);

  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const startStr = startFriday.toLocaleDateString('en-IN', opt);
  const endStr = endThursday.toLocaleDateString('en-IN', opt);

  return {
    weekNumber,
    rangeStr: `${startStr} – ${endStr}`,
    isCurrent: offset === 0,
  };
}

export function WeeklyHeader({
  selectedCollegeId,
  onSelectCollege,
  weekOffset,
  onWeekChange,
}: Props) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setColleges(data.data.colleges);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const weekInfo = formatWeekDisplay(weekOffset);

  return (
    <header className="glass-panel border-b border-border px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">

        {/* Left: Title & Season */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 size={14} strokeWidth={2} aria-hidden /> Weekly Placement Tracker
            </h1>
            <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-semibold">
              2026 Academic Season
            </span>
          </div>
          <p className="text-xs text-fg-subtle mt-1">
            Continuous Operational Pipeline • Friday-to-Friday Reporting Cycle
          </p>
        </div>

        {/* Centre: Friday-to-Friday Week Selector */}
        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5 shadow-inner">
          <button
            onClick={() => onWeekChange(weekOffset - 1)}
            className="p-1 text-fg-subtle hover:text-white hover:bg-surface rounded-lg transition-colors"
            title="Previous Week"
          >
            ◀
          </button>

          <div className="text-center px-3">
            <div className="text-xs font-bold text-fg">
              Week {weekInfo.weekNumber}
              {weekInfo.isCurrent && (
                <span className="ml-1.5 text-micro bg-success/20 text-success border border-success/30 px-1.5 py-0.2 rounded font-normal">
                  Current
                </span>
              )}
            </div>
            <div className="text-micro text-fg-subtle font-mono">{weekInfo.rangeStr}</div>
          </div>

          <button
            onClick={() => onWeekChange(weekOffset + 1)}
            className="p-1 text-fg-subtle hover:text-white hover:bg-surface rounded-lg transition-colors"
            title="Next Week"
          >
            ▶
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => onWeekChange(0)}
              className="text-micro bg-surface hover:bg-surface-raised text-fg-muted px-2 py-1 rounded ml-1 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Right: College selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-subtle font-medium">College:</span>
          <select
            value={selectedCollegeId}
            onChange={(e) => {
              const col = colleges.find((c) => c._id === e.target.value);
              if (col) onSelectCollege(col._id, col.college_name);
            }}
            disabled={loading}
            className="bg-surface border border-border-strong text-fg text-xs px-3 py-2 rounded-lg 
                       min-w-[220px] cursor-pointer"
          >
            <option value="">{loading ? 'Loading colleges…' : '— Select College —'}</option>
            {colleges.map((c) => (
              <option key={c._id} value={c._id}>
                [{c.college_code}] {c.college_name}
              </option>
            ))}
          </select>
        </div>

      </div>
    </header>
  );
}
