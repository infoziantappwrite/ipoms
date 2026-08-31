'use client';

import { FileSpreadsheet, Plus, Target, Trash2, RefreshCw, Copy, Search } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';

interface Props {
  selectedDate: string;
  onDateChange: (d: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
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
  onOpenCopyToJdModal,
}: Props) {

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 space-y-3 shadow-xs text-fg">
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

      {/* ── Bottom Controls Row: Date, Search, Actions ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/80">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Smooth Calendar Date Picker */}
          <SmoothDatePicker
            value={selectedDate}
            onChange={onDateChange}
            theme="navy"
          />

          {/* Search Box (High Visibility with Crisp Outline & Light Placeholder) */}
          <div className="relative w-56 sm:w-64 shrink-0">
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

          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-9 h-9 flex items-center justify-center bg-primary hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0"
            title="Add Daily Opportunity Entry"
            aria-label="Add Lead"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
