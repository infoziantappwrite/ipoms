'use client';

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { apiFetch } from '@/lib/api';

interface College {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
  logo_url?: string;
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
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          setColleges((data.data as any).colleges);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedCollege = colleges.find((c) => c._id === selectedCollegeId);
  const weekInfo = formatWeekDisplay(weekOffset);

  return (
    <header className="glass-panel border-b border-border px-6 py-4 space-y-3">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
              <BarChart3 size={18} strokeWidth={2} className="text-primary" />
              <span>Weekly Tracker</span>
            </h1>
            <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-semibold">
              2026 Season
            </span>
          </div>
        </div>

        {/* Pin Selected College Logo & Sign Out to Absolute Top Right */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedCollege && (
            <div
              title={`${selectedCollege.college_name} (${selectedCollege.college_code})`}
              className="flex items-center justify-center bg-surface/90 border border-border/80 p-1 rounded-xl shadow-sm animate-fadeIn"
            >
              {selectedCollege.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCollege.logo_url}
                  alt={selectedCollege.college_name}
                  className="w-8 h-8 object-contain rounded-lg bg-white/95 p-0.5 shadow-sm border border-border/50"
                />
              ) : (
                <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold text-xs flex items-center justify-center font-mono">
                  {selectedCollege.college_code?.slice(0, 2) || 'CL'}
                </span>
              )}
            </div>
          )}

          <div className="shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Bottom Controls Row: Friday-to-Friday Week Selector & College Filter ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t border-border/40">
        {/* Friday-to-Friday Week Selector */}
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

        {/* College Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-fg-subtle font-medium">College:</span>
          <select
            value={selectedCollegeId}
            onChange={(e) => {
              const col = colleges.find((c) => c._id === e.target.value);
              if (col) onSelectCollege(col._id, col.college_name);
            }}
            disabled={loading}
            className="bg-surface border border-border-strong text-fg text-xs px-3.5 py-2 rounded-xl min-w-[220px] cursor-pointer"
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
