'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, FileSpreadsheet, Trash2, Search } from 'lucide-react';
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

/**
 * Month-based Weekly Period System:
 * - Every month is divided into 4 sequential operational weeks:
 *   • Week 1: 1st to 7th (7 days)
 *   • Week 2: 8th to 14th (7 days)
 *   • Week 3: 15th to 21st (7 days)
 *   • Week 4: 22nd to the last day of that month (28th, 29th, 30th, or 31st)
 * - Week periods NEVER cross month boundaries.
 * - The new month (e.g. September) always starts fresh with Week 1 (1 Sept – 7 Sept).
 */
function formatWeekDisplay(offset: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentDate = now.getDate();

  // Determine current week in month (1-4)
  const currentWeekInMonth =
    currentDate <= 7 ? 1 : currentDate <= 14 ? 2 : currentDate <= 21 ? 3 : 4;

  // Absolute 0-indexed week across all time: (year * 12 + month) * 4 + (week - 1)
  const currentAbsoluteWeek =
    (currentYear * 12 + currentMonth) * 4 + (currentWeekInMonth - 1);
  const targetAbsoluteWeek = currentAbsoluteWeek + offset;

  const targetMonthTotal = Math.floor(targetAbsoluteWeek / 4);
  const targetWeekNumber = ((targetAbsoluteWeek % 4) + 4) % 4 + 1; // 1, 2, 3, 4
  const targetYear = Math.floor(targetMonthTotal / 12);
  const targetMonth = ((targetMonthTotal % 12) + 12) % 12;

  // Calculate days for the target week
  const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  let startDay = 1;
  let endDay = 7;
  if (targetWeekNumber === 1) {
    startDay = 1;
    endDay = 7;
  } else if (targetWeekNumber === 2) {
    startDay = 8;
    endDay = 14;
  } else if (targetWeekNumber === 3) {
    startDay = 15;
    endDay = 21;
  } else {
    // Week 4 runs from 22nd to the last day of the month (28th, 29th, 30th, or 31st)
    startDay = 22;
    endDay = lastDayOfMonth;
  }

  const startDateObj = new Date(targetYear, targetMonth, startDay);
  const endDateObj = new Date(targetYear, targetMonth, endDay);

  const monthName = startDateObj.toLocaleDateString('en-IN', { month: 'long' });
  const monthShort = startDateObj.toLocaleDateString('en-IN', { month: 'short' });
  const year = targetYear;

  const rangeStr = `${startDay} ${monthShort} – ${endDay} ${monthShort} ${year}`;

  return {
    monthlyWeekNumber: targetWeekNumber,
    monthName,
    year,
    rangeStr,
    isCurrent: offset === 0,
    startDate: startDateObj,
    endDate: endDateObj,
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

          <div className="flex items-center gap-2 shrink-0">
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
            {/* Search Input on the Left (High Visibility with Crisp Outline & Light Placeholder) */}
            {onSearchChange && (
              <div className="relative w-48 sm:w-56 shrink-0">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-300 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search company, role…"
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/90 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl shadow-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-300/80 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            )}

            {/* Action Buttons on the Right (Only Icons for Add, Sync, Export, Delete) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenAddModal && (
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Add Company / Entry"
                  aria-label="Add Company"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              )}

              {onSyncDailyPositives && (
                <button
                  type="button"
                  onClick={onSyncDailyPositives}
                  className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Sync Daily Tracker Positives"
                  aria-label="Sync"
                >
                  <RefreshCw size={15} strokeWidth={2.2} />
                </button>
              )}

              {onExportXlsx && (
                <SmoothExportDropdown
                  onExportExcel={onExportXlsx}
                  onExportPdf={onExportPdf}
                  onExportImage={onExportImage}
                  isExporting={isExporting}
                  iconOnly={true}
                  className="!w-8 !h-8 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !shadow-xs"
                />
              )}

              {/* ── Bulk Delete Action Button ── */}
              {onToggleDeleteMode && (
                !isDeleteMode ? (
                  <button
                    type="button"
                    onClick={onToggleDeleteMode}
                    className="w-8 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
                    title="Delete Rows"
                    aria-label="Delete Rows"
                  >
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={(selectedCount || 0) === 0 || isDeleting}
                      onClick={onExecuteBulkDelete}
                      className="h-8 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 animate-pulse"
                      title="Confirm Delete Selected Rows"
                    >
                      <Trash2 size={13} strokeWidth={2.5} />
                      <span>Delete ({selectedCount || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={onToggleDeleteMode}
                      className="h-8 px-2.5 bg-surface-sunken hover:bg-surface-raised border border-border text-fg rounded-xl flex items-center text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      title="Cancel Delete Mode"
                    >
                      Cancel
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
