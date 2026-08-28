'use client';

import { FileSpreadsheet, Plus, Target, Trash2, RefreshCw, Copy } from 'lucide-react';
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

          {/* Search Box */}
          <div className="w-56 sm:w-64">
            <input
              type="text"
              placeholder="Search company, role…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-fg text-xs px-3.5 py-1.5 rounded-xl placeholder:text-fg-disabled outline-none shadow-xs transition-colors"
            />
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleDeleteMode && (
            <button
              type="button"
              onClick={onToggleDeleteMode}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                isDeleteMode
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-none'
                  : 'bg-surface border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300'
              }`}
              title={isDeleteMode ? 'Exit Delete Mode' : 'Select and delete leads'}
            >
              <Trash2 size={14} strokeWidth={2} />
              <span>{isDeleteMode ? 'Exit Delete' : 'Delete'}</span>
            </button>
          )}

          {/* Copy to JD (Visible on Positives Tab) */}
          {activeTab === 'positive' && onOpenCopyToJdModal && (
            <button
              type="button"
              onClick={onOpenCopyToJdModal}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 hover:shadow-amber-500/20"
              title="Copy positive leads to JD Received section for selected colleges"
            >
              <Copy size={13} strokeWidth={2.5} />
              <span>Copy to JD</span>
            </button>
          )}

          {onSyncPositives && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncPositives}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 hover:shadow-indigo-500/20"
              title="Sync positive calls and scheduled pipeline leads for this date"
            >
              {isSyncing ? (
                <>
                  <RefreshCw size={13} strokeWidth={2.5} className="animate-spin" />
                  <span>Syncing…</span>
                </>
              ) : (
                <>
                  <RefreshCw size={13} strokeWidth={2.5} />
                  <span>Sync</span>
                </>
              )}
            </button>
          )}

          {/* Solid Export Dropdown Menu (Excel, PDF, Image) */}
          <SmoothExportDropdown
            onExportExcel={onExportXlsx}
            onExportPdf={onExportPdf}
            onExportImage={onExportImage}
            isExporting={isExporting}
          />

          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Plus size={14} strokeWidth={2} /> Add
          </button>
        </div>
      </div>
    </header>
  );
}
