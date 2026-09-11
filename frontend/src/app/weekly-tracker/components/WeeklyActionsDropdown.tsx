'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreVertical,
  Plus,
  RefreshCw,
  Save,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ArrowRightLeft,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  selectedCollegeId: string;
  onOpenAddModal?: () => void;
  onSyncDailyPositives?: () => void;
  onSaveProgress?: () => void;
  onExportXlsx?: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting?: boolean;
  onOpenBulkMove?: () => void;
}

export function WeeklyActionsDropdown({
  selectedCollegeId,
  onOpenAddModal,
  onSyncDailyPositives,
  onSaveProgress,
  onExportXlsx,
  onExportPdf,
  onExportImage,
  isExporting = false,
  onOpenBulkMove,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const executeAction = useCallback((actionFn?: () => void) => {
    if (!actionFn) return;
    triggerHaptic('selection');
    setIsOpen(false);
    actionFn();
  }, []);

  return (
    <div className="relative inline-block text-left shrink-0" ref={containerRef}>
      {/* ── 3 Vertical Dots Trigger Button ── */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setIsOpen((prev) => !prev);
        }}
        disabled={!selectedCollegeId}
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 ${
          isOpen
            ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30'
            : 'bg-surface hover:bg-surface-sunken border border-border text-fg-subtle hover:text-fg shadow-2xs'
        } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.95]`}
        title="Weekly Actions Menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreVertical size={16} strokeWidth={2.2} />
      </button>

      {/* ── Compact Solid Dropdown Menu (Anchored to Right Corner) ── */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-surface border border-border shadow-2xl z-50 p-1 animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-border/60 text-fg">
          {/* Section 1: Sheet Operations */}
          <div className="p-0.5 space-y-0.5">
            <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
              Sheet Operations
            </div>

            {/* Add Company / Entry */}
            {onOpenAddModal && (
              <button
                type="button"
                onClick={() => executeAction(onOpenAddModal)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Plus size={13} strokeWidth={2.5} />
                  </div>
                  <span>Add Company / Entry</span>
                </div>
                <kbd className="text-[9px] font-mono text-fg-subtle bg-surface-sunken border border-border px-1 py-0.2 rounded">
                  Shift+A
                </kbd>
              </button>
            )}

            {/* Move Companies */}
            {onOpenBulkMove && (
              <button
                type="button"
                onClick={() => executeAction(onOpenBulkMove)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <ArrowRightLeft size={12} strokeWidth={2.2} />
                  </div>
                  <span>Move Companies</span>
                </div>
                <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                  Move
                </span>
              </button>
            )}

            {/* Sync Daily Positives */}
            {onSyncDailyPositives && (
              <button
                type="button"
                onClick={() => executeAction(onSyncDailyPositives)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <RefreshCw size={12} strokeWidth={2.2} />
                  </div>
                  <span>Sync Daily Positives</span>
                </div>
                <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                  Daily
                </span>
              </button>
            )}

            {/* Save Progress */}
            {onSaveProgress && (
              <button
                type="button"
                onClick={() => executeAction(onSaveProgress)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Save size={12} strokeWidth={2.5} />
                  </div>
                  <span>Save Progress</span>
                </div>
                <kbd className="text-[9px] font-mono text-fg-subtle bg-surface-sunken border border-border px-1 py-0.2 rounded">
                  Ctrl+S
                </kbd>
              </button>
            )}
          </div>

          {/* Section 2: Export Options */}
          {(onExportXlsx || onExportPdf || onExportImage) && (
            <div className="p-0.5 space-y-0.5">
              <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-subtle flex items-center justify-between">
                <span>Export Reports</span>
                {isExporting && (
                  <span className="text-primary text-[9px] font-bold animate-pulse">
                    Exporting…
                  </span>
                )}
              </div>

              {/* 1. Export to Excel (.xlsx) */}
              {onExportXlsx && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => executeAction(onExportXlsx)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <FileSpreadsheet size={12} strokeWidth={2.2} />
                    </div>
                    <span>Export to Excel</span>
                  </div>
                  <span className="text-[9.5px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-300/60 dark:border-emerald-800/50 shrink-0">
                    .xlsx
                  </span>
                </button>
              )}

              {/* 2. Export to PDF (.pdf) */}
              {onExportPdf && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => executeAction(onExportPdf)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <FileText size={12} strokeWidth={2.2} />
                    </div>
                    <span>Export to PDF</span>
                  </div>
                  <span className="text-[9.5px] font-medium text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/70 px-1.5 py-0.2 rounded border border-rose-300/60 dark:border-rose-800/50 shrink-0">
                    .pdf
                  </span>
                </button>
              )}

              {/* 3. Export as Image (.png) */}
              {onExportImage && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => executeAction(onExportImage)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <ImageIcon size={12} strokeWidth={2.2} />
                    </div>
                    <span>Export as Image</span>
                  </div>
                  <span className="text-[9.5px] font-medium text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/70 px-1.5 py-0.2 rounded border border-sky-300/60 dark:border-sky-800/50 shrink-0">
                    .png
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
