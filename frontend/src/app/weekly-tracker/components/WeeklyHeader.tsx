'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  Trash2,
  Search,
  Undo2,
  Redo2,
  RefreshCw,
  ChevronsUp,
  ChevronsDown,
} from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { CollegeSelector, College } from '@/components/CollegeSelector';
import { AutoSaveBadge } from '@/components/ui/AutoSaveBadge';
import { WeeklyActionsDropdown } from './WeeklyActionsDropdown';
import { triggerHaptic } from '@/lib/haptics';
import { apiFetch } from '@/lib/api';

interface Props {
  selectedCollegeId: string;
  onSelectCollege: (id: string, name: string) => void;
  saveStatus?: 'saved' | 'saving' | 'idle';
  lastSavedAt?: Date | null;
  weekOffset?: number;
  onWeekChange?: (offset: number) => void;
  academicYear?: string;
  onAcademicYearChange?: (yr: string) => void;
  onOpenAddModal?: () => void;
  onSyncDailyPositives?: () => void;
  isSyncing?: boolean;
  onSaveProgress?: () => void;
  onExportXlsx?: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectionMode?: 'move' | 'delete' | null;
  selectedCount?: number;
  onStartMoveMode?: () => void;
  onStartDeleteMode?: () => void;
  onCancelSelection?: () => void;
  onExecuteMove?: () => void;
  onExecuteBulkDelete?: () => void;
  onOpenBulkMove?: () => void;
  isDeleting?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenCollegeDossier?: () => void;
  allSectionsCollapsed?: boolean;
  onToggleCollapseAll?: () => void;
}

export function WeeklyHeader({
  selectedCollegeId,
  onSelectCollege,
  saveStatus = 'idle',
  lastSavedAt = null,
  academicYear = 'all',
  onAcademicYearChange,
  onOpenAddModal,
  onSyncDailyPositives,
  isSyncing = false,
  onSaveProgress,
  onExportXlsx,
  onExportPdf,
  onExportImage,
  isExporting = false,
  searchQuery,
  onSearchChange,
  selectionMode = null,
  selectedCount = 0,
  onStartMoveMode,
  onStartDeleteMode,
  onCancelSelection,
  onExecuteMove,
  onExecuteBulkDelete,
  onOpenBulkMove,
  isDeleting,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenCollegeDossier,
  allSectionsCollapsed = false,
  onToggleCollapseAll,
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

  return (
    <header className="bg-surface px-6 py-3.5 space-y-2.5 text-fg">
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
            <AutoSaveBadge status={saveStatus} lastSavedAt={lastSavedAt} />
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Sub-bar: Unified Controls Row (College Selector + Dossier + Search on Left, Actions + Trash on Right) ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/80 relative z-30">
        {/* Left Side: College Selector + College Dossier Button + Search Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1. College Selector */}
          <CollegeSelector
            selectedCollegeId={selectedCollegeId}
            onSelect={(id, name) => {
              onSelectCollege(id, name);
            }}
            onSelectCollege={(col) => {
              setSelectedCollegeObj(col);
            }}
            align="left"
          />

          {/* 2. College Dossier Button */}
          {selectedCollegeId && onOpenCollegeDossier && (
            <button
              type="button"
              onClick={onOpenCollegeDossier}
              title="View & Edit College Profile & Placement Officer Details"
              className="flex items-center justify-center w-8 h-8 p-1 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0 overflow-hidden group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/university.gif"
                alt="College Profile & Placement Officer Details"
                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-110 active:scale-95 transition-transform duration-150"
              />
            </button>
          )}

          {/* 3. Search Bar */}
          {selectedCollegeId && onSearchChange && (
            <div className="relative w-64 sm:w-72 shrink-0">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-300 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Start searching..."
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/90 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl shadow-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-300/80 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          )}
        </div>

        {/* Right Side: Active Mode Controls + Red Dustbin + Sync + Three Dots Actions Dropdown */}
        <div className="ml-auto shrink-0 flex items-center gap-2">
          {/* Active Selection Mode Controls (Only visible when a mode is active) */}
          {selectedCollegeId && selectionMode !== null && (
            selectionMode === 'move' ? (
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {/* Move Mode Active: Only Move and Cancel buttons */}
                <button
                  type="button"
                  disabled={(selectedCount || 0) === 0}
                  onClick={() => {
                    triggerHaptic('medium');
                    onExecuteMove?.();
                  }}
                  className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                  title="Choose destination section for selected companies"
                >
                  <span>Move ({selectedCount || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onCancelSelection?.();
                  }}
                  className="h-8 px-2.5 bg-surface-sunken hover:bg-surface-raised border border-border text-fg rounded-xl flex items-center text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  title="Cancel Selection (Esc)"
                >
                  Cancel
                </button>
              </div>
            ) : selectionMode === 'delete' ? (
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {/* Delete Mode Active: Cancel button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onCancelSelection?.();
                  }}
                  className="h-8 px-2.5 bg-surface-sunken hover:bg-surface-raised border border-border text-fg rounded-xl flex items-center text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  title="Cancel Selection (Esc)"
                >
                  Cancel
                </button>
              </div>
            ) : null
          )}

          {/* Collapse / Expand All Sections Toggle */}
          {selectedCollegeId && onToggleCollapseAll && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onToggleCollapseAll();
              }}
              title={allSectionsCollapsed ? 'Expand All Sections' : 'Collapse All Sections'}
              aria-label={allSectionsCollapsed ? 'Expand all sections' : 'Collapse all sections'}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 shadow-2xs active:scale-[0.95] disabled:opacity-40"
            >
              {allSectionsCollapsed
                ? <ChevronsDown size={15} strokeWidth={2.2} />
                : <ChevronsUp size={15} strokeWidth={2.2} />}
            </button>
          )}

          {/* Standalone Red Dustbin / Trash Icon Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              if (selectionMode === 'delete') {
                if (selectedCount > 0) {
                  onExecuteBulkDelete?.();
                } else {
                  onCancelSelection?.();
                }
              } else {
                onStartDeleteMode?.();
              }
            }}
            disabled={!selectedCollegeId || isDeleting}
            className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 ${
              selectionMode === 'delete' && selectedCount > 0
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs ring-2 ring-rose-500/30'
                : selectionMode === 'delete'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 shadow-2xs'
            } disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.95]`}
            title={
              selectionMode === 'delete' && selectedCount > 0
                ? `Delete ${selectedCount} selected row${selectedCount > 1 ? 's' : ''}`
                : selectionMode === 'delete'
                ? 'Delete mode active — select rows to delete (click to exit)'
                : 'Delete Rows (Shift+D)'
            }
            aria-label="Delete Rows"
          >
            <Trash2 size={16} strokeWidth={2.2} />
            {selectionMode === 'delete' && selectedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white dark:bg-zinc-900 text-rose-600 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs tabular-nums ring-1 ring-rose-600">
                {selectedCount}
              </span>
            )}
          </button>

          {/* Standalone Quick Sync Daily Positives Button */}
          {onSyncDailyPositives && (
            <button
              type="button"
              disabled={!selectedCollegeId || isSyncing}
              onClick={() => {
                triggerHaptic('selection');
                onSyncDailyPositives();
              }}
              className="relative h-8 px-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 shadow-2xs text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.95]"
              title="Sync positive leads from Daily Leads into Companies in Pipeline"
              aria-label="Sync Daily Positives"
            >
              <RefreshCw
                size={13}
                strokeWidth={2.4}
                className={isSyncing ? 'animate-spin text-amber-600 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'}
              />
              <span className="hidden sm:inline font-bold">Sync</span>
            </button>
          )}

          {/* Three Dots (Actions Menu) */}
          <WeeklyActionsDropdown
            selectedCollegeId={selectedCollegeId}
            onOpenAddModal={onOpenAddModal}
            onSyncDailyPositives={onSyncDailyPositives}
            onSaveProgress={onSaveProgress}
            onExportXlsx={onExportXlsx}
            onExportPdf={onExportPdf}
            onExportImage={onExportImage}
            isExporting={isExporting}
            onOpenBulkMove={onStartMoveMode || onOpenBulkMove}
            onStartDeleteMode={onStartDeleteMode}
          />
        </div>
      </div>
    </header>
  );
}
