'use client';

import { useState, useEffect } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Plus, RefreshCw, RotateCw, FileSpreadsheet } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { CollegeSelector, College } from '@/components/CollegeSelector';
import { apiFetch } from '@/lib/api';

interface Props {
  selectedCollegeId: string;
  onSelectCollege: (id: string, name: string) => void;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onOpenAddModal?: () => void;
  onSyncDailyPositives?: () => void;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

// Calculate Month-wise Friday-to-Friday week display (e.g., "August 2026 • Week 3: 21 Aug 2026 – 27 Aug 2026")
function formatWeekDisplay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);

  const day = d.getDay();
  const diffToFriday = day >= 5 ? day - 5 : day + 2;
  const startFriday = new Date(d);
  startFriday.setDate(d.getDate() - diffToFriday);

  const endThursday = new Date(startFriday);
  endThursday.setDate(startFriday.getDate() + 6);

  // Monthly Week Calculation: Count how many Fridays occurred in this month up to startFriday
  let fridayCount = 0;
  const cur = new Date(startFriday.getFullYear(), startFriday.getMonth(), 1);
  while (cur <= startFriday) {
    if (cur.getDay() === 5) {
      fridayCount++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  const monthlyWeekNumber = fridayCount > 0 ? fridayCount : 1;

  const monthName = startFriday.toLocaleDateString('en-IN', { month: 'long' });
  const year = startFriday.getFullYear();

  const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const startStr = startFriday.toLocaleDateString('en-IN', opt);
  const endStr = endThursday.toLocaleDateString('en-IN', opt);

  return {
    monthlyWeekNumber,
    monthName,
    year,
    rangeStr: `${startStr} – ${endStr}`,
    isCurrent: offset === 0,
  };
}

export function WeeklyHeader({
  selectedCollegeId,
  onSelectCollege,
  weekOffset,
  onWeekChange,
  onOpenAddModal,
  onSyncDailyPositives,
  onRefresh,
  onExportCsv,
  searchQuery,
  onSearchChange,
}: Props) {
  const [selectedCollegeObj, setSelectedCollegeObj] = useState<College | null>(null);

  useEffect(() => {
    if (!selectedCollegeId) {
      setSelectedCollegeObj(null);
      return;
    }
    apiFetch('/colleges').then((data) => {
      if (data.success && Array.isArray((data.data as any)?.colleges)) {
        const found = (data.data as any).colleges.find((c: College) => c._id === selectedCollegeId);
        if (found) setSelectedCollegeObj(found);
      }
    }).catch(console.error);
  }, [selectedCollegeId]);

  const weekInfo = formatWeekDisplay(weekOffset);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 space-y-3 shadow-xs">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-primary">
              <BarChart3 size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Weekly Tracker
            </h1>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold">
              2026 Season
            </span>
          </div>
        </div>

        {/* Pin Selected College Logo & Sign Out to Absolute Top Right */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedCollegeObj && (
            <div
              title={`${selectedCollegeObj.college_name} (${selectedCollegeObj.college_code})`}
              className="flex items-center justify-center bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs h-9 max-w-[160px] shrink-0"
            >
              {selectedCollegeObj.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCollegeObj.logo_url}
                  alt={selectedCollegeObj.college_name}
                  className="max-h-7 max-w-full w-auto h-auto object-contain rounded"
                />
              ) : (
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-primary font-bold text-xs flex items-center justify-center font-mono">
                  {selectedCollegeObj.college_code?.slice(0, 2) || 'CL'}
                </span>
              )}
            </div>
          )}

          <div className="shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Bottom Controls Row: Monthly-wise Week Selector, Action Buttons & College Filter ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t border-slate-100">
        
        {/* Month-wise Friday-to-Friday Week Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
          <button
            onClick={() => onWeekChange(weekOffset - 1)}
            className="w-7 h-7 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            title="Previous Week"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>

          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {weekInfo.monthName} {weekInfo.year}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100/80 border border-blue-300 px-2 py-0.5 rounded-full">
                Week {weekInfo.monthlyWeekNumber}
              </span>
              {weekInfo.isCurrent && (
                <span className="text-micro bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-md font-semibold">
                  Current
                </span>
              )}
            </div>
            <div className="text-micro text-slate-500 font-mono mt-0.5">
              {weekInfo.rangeStr}
            </div>
          </div>

          <button
            onClick={() => onWeekChange(weekOffset + 1)}
            className="w-7 h-7 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            title="Next Week"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => onWeekChange(0)}
              className="text-micro bg-white hover:bg-slate-100 text-slate-700 font-semibold px-2 py-1 rounded-lg ml-1 transition-colors cursor-pointer border border-slate-300 shadow-xs"
            >
              Current
            </button>
          )}
        </div>

        {/* ── Icon-Only Action Buttons & Search next to icons ── */}
        {selectedCollegeId && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              {onOpenAddModal && (
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="w-8 h-8 bg-[#1e3a8a] hover:bg-[#172554] text-white rounded-lg flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Add Company"
                  aria-label="Add Company"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              )}

              {onSyncDailyPositives && (
                <button
                  type="button"
                  onClick={onSyncDailyPositives}
                  className="w-8 h-8 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Sync Daily Positives"
                  aria-label="Sync Daily Positives"
                >
                  <RefreshCw size={15} strokeWidth={2.5} />
                </button>
              )}

              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="w-8 h-8 bg-[#fef3c7] hover:bg-[#fde68a] text-[#78350f] border border-[#fde68a] rounded-lg flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <RotateCw size={15} strokeWidth={2.5} />
                </button>
              )}

              {onExportCsv && (
                <button
                  type="button"
                  onClick={onExportCsv}
                  className="w-8 h-8 bg-[#047857] hover:bg-[#065f46] text-white rounded-lg flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Export CSV"
                  aria-label="Export CSV"
                >
                  <FileSpreadsheet size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Search Input next to icons */}
            {onSearchChange && (
              <div className="w-52 sm:w-60">
                <input
                  type="text"
                  placeholder="Search company, role, status…"
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-xl shadow-2xs placeholder:text-slate-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        )}

        {/* Smart Auto-Shrinking College Selector */}
        <CollegeSelector
          selectedCollegeId={selectedCollegeId}
          onSelect={(id, name) => {
            onSelectCollege(id, name);
          }}
          onSelectCollege={(col) => {
            setSelectedCollegeObj(col);
          }}
          align="right"
        />
      </div>
    </header>
  );
}
