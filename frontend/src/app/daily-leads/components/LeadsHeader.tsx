'use client';

import { FileSpreadsheet, Plus, Target, Trash2, RefreshCw, Copy, Search, Sparkles, ClipboardList } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  selectedDate: string;
  onDateChange: (d: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal?: () => void;
  onExportXlsx: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting?: boolean;
  onRefresh: () => void;
  onSyncPositives?: () => void;
  isSyncing?: boolean;
  isDeleteMode?: boolean;
  onToggleDeleteMode?: () => void;
  activeTab?: 'positive' | 'jd_received' | 'my_positives' | 'my_jd';
  onTabChange?: (tab: 'positive' | 'jd_received' | 'my_positives' | 'my_jd') => void;
  myJdCount?: number;
  positivesCount?: number;
  jdCount?: number;
  myPositivesCount?: number;
  selectedCount?: number;
  onBulkDelete?: () => void;
  onOpenCopyToJdModal?: () => void;
}

export function LeadsHeader({
  selectedDate,
  onDateChange,
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onExportXlsx,
  onExportPdf,
  onExportImage,
  isExporting = false,
  onRefresh,
  onSyncPositives,
  isSyncing = false,
  isDeleteMode = false,
  onToggleDeleteMode,
  activeTab = 'positive',
  onTabChange,
  positivesCount = 0,
  jdCount = 0,
  myPositivesCount,
  myJdCount,
  selectedCount = 0,
  onBulkDelete,
  onOpenCopyToJdModal,
}: Props) {

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 pt-4 pb-3 space-y-3 shadow-xs text-fg">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-base font-bold text-fg tracking-tight">
              Daily Leads
            </h1>
          </div>
          <p className="text-xs text-fg-subtle mt-1 font-medium">
            Positives and JD Tracker
          </p>
        </div>

        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Single Unified Controls Row: Tabs, Calendar, Search & Action Buttons ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/80">
        {/* Left Side: Tabs + Divider + Calendar Date Picker + Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tabs: Positives, JD Received & My College Positives — Apple Smooth Sliding Segmented Control */}
          {onTabChange && (
            <div className="relative grid grid-cols-4 gap-0.5 p-0.5 bg-surface-sunken/80 dark:bg-zinc-900/90 rounded-lg border border-border/80 shadow-2xs shrink-0 select-none">
              {/* Glider / Smooth Sliding Indicator */}
              <div
                className={`absolute top-0.5 bottom-0.5 w-[calc((100%-10px)/4)] rounded-md border shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
                  activeTab === 'positive'
                    ? 'left-0.5 translate-x-0 bg-white dark:bg-emerald-950/80 border-emerald-500/40 dark:border-emerald-600/50 shadow-emerald-500/10'
                    : activeTab === 'jd_received'
                    ? 'left-0.5 translate-x-[calc(100%+2px)] bg-white dark:bg-blue-950/80 border-blue-500/40 dark:border-blue-600/50 shadow-blue-500/10'
                    : activeTab === 'my_positives'
                    ? 'left-0.5 translate-x-[calc(200%+4px)] bg-white dark:bg-indigo-950/80 border-indigo-500/40 dark:border-indigo-600/50 shadow-indigo-500/10'
                    : 'left-0.5 translate-x-[calc(300%+6px)] bg-white dark:bg-sky-950/80 border-sky-500/40 dark:border-sky-600/50 shadow-sky-500/10'
                }`}
              />

              {/* Positives Tab */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  onTabChange('positive');
                }}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md ${
                  activeTab === 'positive'
                    ? 'text-emerald-900 dark:text-emerald-200 font-extrabold'
                    : 'text-fg-subtle hover:text-fg'
                }`}
              >
                <span className="tracking-wide uppercase font-extrabold text-[11px]">Positives</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
                    activeTab === 'positive'
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white font-black'
                      : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted'
                  }`}
                >
                  {positivesCount}
                </span>
              </button>

              {/* JD Received Tab */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  onTabChange('jd_received');
                }}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md ${
                  activeTab === 'jd_received'
                    ? 'text-blue-900 dark:text-blue-200 font-extrabold'
                    : 'text-fg-subtle hover:text-fg'
                }`}
              >
                <span className="tracking-wide uppercase font-extrabold text-[11px]">JD Received</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
                    activeTab === 'jd_received'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white font-black'
                      : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted'
                  }`}
                >
                  {jdCount}
                </span>
              </button>

              {/* My College Positives Tab */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  onTabChange('my_positives');
                }}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md ${
                  activeTab === 'my_positives'
                    ? 'text-indigo-900 dark:text-indigo-200 font-extrabold'
                    : 'text-fg-subtle hover:text-fg'
                }`}
              >
                <span className="tracking-wide uppercase font-extrabold text-[11px]">My Positives</span>
                {myPositivesCount !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
                      activeTab === 'my_positives'
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white font-black'
                        : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted'
                    }`}
                  >
                    {myPositivesCount}
                  </span>
                )}
              </button>

              {/* My JD Tab - every JD received for my focus colleges, all-time */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  onTabChange('my_jd');
                }}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md ${
                  activeTab === 'my_jd'
                    ? 'text-sky-900 dark:text-sky-200 font-extrabold'
                    : 'text-fg-subtle hover:text-fg'
                }`}
              >
                <span className="tracking-wide uppercase font-extrabold text-[11px]">My JD</span>
                {myJdCount !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
                      activeTab === 'my_jd'
                        ? 'bg-sky-600 dark:bg-sky-500 text-white font-black'
                        : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted'
                    }`}
                  >
                    {myJdCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-0.5 shrink-0 hidden sm:block" />

          {/* Smooth Calendar Date Picker */}
          <SmoothDatePicker
            value={selectedDate}
            onChange={onDateChange}
            theme="navy"
          />

          {/* Search Box (High Visibility with Crisp Outline & Light Placeholder) */}
          <div className="relative w-52 sm:w-60 shrink-0">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-300 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search company, role…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/90 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl shadow-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-300/80 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Right Action Buttons (Icon-Only Minimal SaaS) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Delete Mode: Cancel button */}
          {isDeleteMode && onToggleDeleteMode && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onToggleDeleteMode();
              }}
              className="h-9 px-2.5 bg-surface-sunken hover:bg-surface-raised border border-border text-fg rounded-xl flex items-center text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Cancel Selection (Esc)"
            >
              Cancel
            </button>
          )}

          {/* Standalone Single Dustbin / Trash Icon Button */}
          {onToggleDeleteMode && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                if (isDeleteMode && selectedCount > 0 && onBulkDelete) {
                  onBulkDelete();
                } else {
                  onToggleDeleteMode();
                }
              }}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-xs cursor-pointer select-none shrink-0 ${
                isDeleteMode && selectedCount > 0
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs ring-2 ring-rose-500/30'
                  : isDeleteMode
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                  : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 shadow-2xs'
              } active:scale-[0.95]`}
              title={
                isDeleteMode && selectedCount > 0
                  ? `Delete ${selectedCount} selected record${selectedCount > 1 ? 's' : ''}`
                  : isDeleteMode
                  ? 'Delete mode active — select rows to delete (click to exit)'
                  : 'Select and delete leads'
              }
              aria-label={isDeleteMode ? 'Delete Selected Leads' : 'Delete Leads'}
            >
              <Trash2 size={16} strokeWidth={2.2} />
              {isDeleteMode && selectedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white dark:bg-zinc-900 text-rose-600 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs tabular-nums ring-1 ring-rose-600">
                  {selectedCount}
                </span>
              )}
            </button>
          )}

          {/* Move to JD (Visible on Positives Tab) */}
          {activeTab === 'positive' && onOpenCopyToJdModal && (
            <button
              type="button"
              onClick={onOpenCopyToJdModal}
              className="w-9 h-9 flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.992] hover:shadow-amber-500/20 shrink-0"
              title="Move positive leads to JD Received section for selected colleges"
              aria-label="Move to JD"
            >
              <Copy size={16} strokeWidth={2.2} />
            </button>
          )}

          {onSyncPositives && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncPositives}
              className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.992] hover:shadow-indigo-500/20 shrink-0"
              title="Sync positive calls and scheduled pipeline leads for this date"
              aria-label="Sync Positives"
            >
              <RefreshCw size={16} strokeWidth={2.2} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          )}

          {/* Solid Export Dropdown Menu (Excel, PDF, Image) */}
          <SmoothExportDropdown
            onExportExcel={onExportXlsx}
            onExportPdf={onExportPdf}
            onExportImage={onExportImage}
            isExporting={isExporting}
            iconOnly={true}
          />

          {onOpenAddModal ? (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="w-9 h-9 flex items-center justify-center bg-primary hover:bg-blue-700 text-primary-foreground rounded-xl shadow-xs transition-colors cursor-pointer active:scale-[0.992] shrink-0"
              title="Add Daily Opportunity Entry"
              aria-label="Add Lead"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl whitespace-nowrap">
              Supervisor (Read-Only)
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
