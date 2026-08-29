'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, FileSpreadsheet, Trash2 } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { CollegeSelector, College } from '@/components/CollegeSelector';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';
import { apiFetch } from '@/lib/api';

interface Props {
  selectedCollegeId: string;
  onSelectCollege: (id: string, name: string) => void;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  academicYear?: string;
  onAcademicYearChange?: (yr: string) => void;
  onOpenAddModal?: () => void;
  onSyncDailyPositives?: () => void;
  onExportXlsx?: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isDeleteMode?: boolean;
  selectedCount?: number;
  onToggleDeleteMode?: () => void;
  onExecuteBulkDelete?: () => void;
  isDeleting?: boolean;
}

// Friday-to-Thursday week display, mirroring the backend's own week boundary
// (getFridayWeekBounds() in server.ts) so the label always matches what
// /weekly-tracker actually filters by for this offset. The previous version
// computed calendar weeks (1st-7th, 8th-14th, ...) — a different boundary
// than the Friday-Thursday weeks every row is actually stored against, so
// the label never matched the real data even after the data itself is
// correctly filtered.
function formatWeekDisplay(offset: number) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + offset * 7);

  const day = targetDate.getDay(); // 0=Sun ... 5=Fri, 6=Sat
  const diffToFriday = day >= 5 ? day - 5 : day + 2;
  const startFriday = new Date(targetDate);
  startFriday.setDate(targetDate.getDate() - diffToFriday);

  const endThursday = new Date(startFriday);
  endThursday.setDate(startFriday.getDate() + 6);

  const startOfYear = new Date(startFriday.getFullYear(), 0, 1);
  const pastDaysOfYear = (startFriday.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  const startDay = startFriday.getDate();
  const endDay = endThursday.getDate();
  const monthName = startFriday.toLocaleDateString('en-IN', { month: 'long' });
  const startMonthShort = startFriday.toLocaleDateString('en-IN', { month: 'short' });
  const endMonthShort = endThursday.toLocaleDateString('en-IN', { month: 'short' });
  const year = startFriday.getFullYear();

  const rangeStr =
    startFriday.getMonth() === endThursday.getMonth()
      ? `${startDay} – ${endDay} ${endMonthShort} ${year}`
      : `${startDay} ${startMonthShort} – ${endDay} ${endMonthShort} ${year}`;

  return {
    monthlyWeekNumber: weekNumber,
    monthName,
    year,
    rangeStr,
    isCurrent: offset === 0,
  };
}

export function WeeklyHeader({
  selectedCollegeId,
  onSelectCollege,
  weekOffset,
  onWeekChange,
  academicYear = '2027',
  onAcademicYearChange,
  onOpenAddModal,
  onSyncDailyPositives,
  onExportXlsx,
  onExportPdf,
  onExportImage,
  isExporting = false,
  searchQuery,
  onSearchChange,
  isDeleteMode,
  selectedCount,
  onToggleDeleteMode,
  onExecuteBulkDelete,
  isDeleting,
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
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 space-y-3 shadow-xs text-fg">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <CalendarDays size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-base font-bold text-fg tracking-tight">
              Weekly Tracker
            </h1>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-semibold">
              2026 Season
            </span>
          </div>
        </div>

        {/* Pin Selected College Logo & Sign Out to Absolute Top Right */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedCollegeObj && (
            <div className="flex items-center gap-2">
              <div
                title={`${selectedCollegeObj.college_name} (${selectedCollegeObj.college_code})`}
                className="flex items-center justify-center bg-surface border border-border px-2.5 py-1 rounded-xl shadow-xs h-9 max-w-[160px] shrink-0"
              >
                {selectedCollegeObj.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedCollegeObj.logo_url}
                    alt={selectedCollegeObj.college_name}
                    className="max-h-7 max-w-full w-auto h-auto object-contain rounded"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono">
                    {selectedCollegeObj.college_code?.slice(0, 2) || 'CL'}
                  </span>
                )}
              </div>
              {selectedCollegeObj.location && (
                <span
                  className="text-xs text-fg-subtle font-medium hidden sm:inline truncate max-w-[160px]"
                  title={selectedCollegeObj.location}
                >
                  {selectedCollegeObj.location}
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
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/80 relative z-30">
        
        {/* Month-wise Friday-to-Friday Week Selector */}
        <div className="flex items-center gap-2 bg-surface-sunken border border-border rounded-xl px-2.5 py-1 shadow-xs h-10 shrink-0">
          <button
            onClick={() => onWeekChange(weekOffset - 1)}
            className="w-7 h-7 text-fg-subtle hover:text-fg hover:bg-surface-raised rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Previous Week"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>

          <div className="text-center px-1.5 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-1.5 leading-none">
              <span className="text-xs font-bold text-fg whitespace-nowrap">
                {weekInfo.monthName} {weekInfo.year}
              </span>
              <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none">
                Week {weekInfo.monthlyWeekNumber}
              </span>
              {weekInfo.isCurrent && (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap leading-none">
                  Current
                </span>
              )}
            </div>
            <div className="text-[10px] text-fg-subtle font-mono mt-0.5 whitespace-nowrap leading-none">
              {weekInfo.rangeStr}
            </div>
          </div>

          <button
            onClick={() => onWeekChange(weekOffset + 1)}
            className="w-7 h-7 text-fg-subtle hover:text-fg hover:bg-surface-raised rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Next Week"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => onWeekChange(0)}
              className="text-micro bg-surface hover:bg-surface-raised text-fg font-semibold px-2 py-1 rounded-lg ml-0.5 transition-colors cursor-pointer border border-border shadow-xs shrink-0"
            >
              Current
            </button>
          )}
        </div>

        {/* ── Search Bar & Icon Action Buttons (Search Left, Icons Right) ── */}
        {selectedCollegeId && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Search Input on the Left */}
            {onSearchChange && (
              <div className="w-44 sm:w-52">
                <input
                  type="text"
                  placeholder="Search company, role…"
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full h-8 bg-surface-sunken border border-border text-fg text-xs px-3 rounded-xl shadow-2xs placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            )}

            {/* Action Buttons on the Right */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenAddModal && (
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="h-8 px-2.5 bg-[#1e3a8a] hover:bg-[#172554] text-white rounded-lg flex items-center gap-1.5 text-[11px] font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Add Company"
                  aria-label="Add Company"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Add</span>
                </button>
              )}

              {onSyncDailyPositives && (
                <button
                  type="button"
                  onClick={onSyncDailyPositives}
                  className="h-8 px-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg flex items-center gap-1.5 text-[11px] font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Sync Daily Tracker Positives"
                  aria-label="Sync"
                >
                  <RefreshCw size={13} strokeWidth={2.5} />
                  <span>Sync</span>
                </button>
              )}

              {onExportXlsx && (
                <SmoothExportDropdown
                  onExportExcel={onExportXlsx}
                  onExportPdf={onExportPdf}
                  onExportImage={onExportImage}
                  isExporting={isExporting}
                />
              )}

              {/* ── Bulk Delete Action Button ── */}
              {onToggleDeleteMode && (
                !isDeleteMode ? (
                  <button
                    type="button"
                    onClick={onToggleDeleteMode}
                    className="h-8 px-2.5 bg-[#be123c] hover:bg-[#9f1239] text-white rounded-lg flex items-center gap-1.5 text-[11px] font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                    title="Delete Rows"
                    aria-label="Delete Rows"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={(selectedCount || 0) === 0 || isDeleting}
                      onClick={onExecuteBulkDelete}
                      className="h-8 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 text-[11px] font-bold shadow-xs transition-all cursor-pointer shrink-0 animate-pulse"
                      title="Confirm Delete Selected Rows"
                    >
                      <Trash2 size={13} strokeWidth={2.5} />
                      <span>{isDeleting ? 'Deleting…' : `Delete Selected (${selectedCount || 0})`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onToggleDeleteMode}
                      className="h-8 px-2.5 bg-surface-sunken hover:bg-surface-raised border border-border text-fg rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                      title="Cancel Delete Mode"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Smart Auto-Shrinking College Selector */}
        <div className="shrink-0 flex items-center">
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
      </div>
    </header>
  );
}
