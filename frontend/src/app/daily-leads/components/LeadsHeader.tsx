'use client';

import { FileSpreadsheet, Plus, Target, Trash2, RefreshCw, Copy, Search, Sparkles, ClipboardList } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';

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
  activeTab?: 'positive' | 'jd_received';
  onTabChange?: (tab: 'positive' | 'jd_received') => void;
  positivesCount?: number;
  jdCount?: number;
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
          {/* Tabs: Positives & JD Received */}
          {onTabChange && (
            <div className="flex items-center gap-1.5 bg-surface-sunken/60 p-0.5 rounded-2xl border border-border/80 shadow-2xs shrink-0">
              {/* Positives Tab */}
              <button
                type="button"
                onClick={() => onTabChange('positive')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold transition-all relative select-none cursor-pointer rounded-xl ${
                  activeTab === 'positive'
                    ? 'text-emerald-950 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400/60 dark:border-emerald-700/60 shadow-2xs font-extrabold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Sparkles
                  size={14}
                  strokeWidth={2.5}
                  className={activeTab === 'positive' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}
                  aria-hidden
                />
                <span className="tracking-wide uppercase font-extrabold">Positives</span>
                <span
                  className={`text-micro px-1.5 py-0.2 rounded-full font-bold transition-colors shadow-2xs ${
                    activeTab === 'positive'
                      ? 'bg-emerald-700 text-white font-black'
                      : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-bold'
                  }`}
                >
                  {positivesCount}
                </span>
              </button>

              {/* JD Received Tab */}
              <button
                type="button"
                onClick={() => onTabChange('jd_received')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold transition-all relative select-none cursor-pointer rounded-xl ${
                  activeTab === 'jd_received'
                    ? 'text-blue-950 dark:text-blue-200 bg-blue-100 dark:bg-blue-950/60 border border-blue-400/60 dark:border-blue-700/60 shadow-2xs font-extrabold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <ClipboardList
                  size={14}
                  strokeWidth={2.5}
                  className={activeTab === 'jd_received' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}
                  aria-hidden
                />
                <span className="tracking-wide uppercase font-extrabold">JD Received</span>
                <span
                  className={`text-micro px-1.5 py-0.2 rounded-full font-bold transition-colors shadow-2xs ${
                    activeTab === 'jd_received'
                      ? 'bg-blue-700 text-white font-black'
                      : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-bold'
                  }`}
                >
                  {jdCount}
                </span>
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
          {/* Delete Action in Delete Mode */}
          {isDeleteMode && onBulkDelete && selectedCount > 0 && (
            <button
              type="button"
              onClick={onBulkDelete}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 animate-in fade-in shrink-0"
            >
              <Trash2 size={13} strokeWidth={2.2} aria-hidden />
              <span>Delete ({selectedCount})</span>
            </button>
          )}

          {onToggleDeleteMode && (
            <button
              type="button"
              onClick={onToggleDeleteMode}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 ${
                isDeleteMode
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-none'
                  : 'bg-surface border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300'
              }`}
              title={isDeleteMode ? 'Exit Delete Mode' : 'Select and delete leads'}
              aria-label={isDeleteMode ? 'Exit Delete Mode' : 'Delete Leads'}
            >
              <Trash2 size={16} strokeWidth={2.2} />
            </button>
          )}

          {/* Copy to JD (Visible on Positives Tab) */}
          {activeTab === 'positive' && onOpenCopyToJdModal && (
            <button
              type="button"
              onClick={onOpenCopyToJdModal}
              className="w-9 h-9 flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 hover:shadow-amber-500/20 shrink-0"
              title="Copy positive leads to JD Received section for selected colleges"
              aria-label="Copy to JD"
            >
              <Copy size={16} strokeWidth={2.2} />
            </button>
          )}

          {onSyncPositives && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncPositives}
              className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 hover:shadow-indigo-500/20 shrink-0"
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
              className="w-9 h-9 flex items-center justify-center bg-primary hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0"
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
