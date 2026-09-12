'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  Trash2,
  Search,
  Undo2,
  Redo2,
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
            <AutoSaveBadge status={saveStatus} lastSavedAt={lastSavedAt} />
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Bottom Controls Row: Search on Left, Dustbin + Actions + College on Right ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/80 relative z-30">
        {/* Left Side: Search Bar */}
        <div className="flex items-center gap-2">
          {selectedCollegeId && onSearchChange && (
            <div className="relative w-72 sm:w-88 shrink-0">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
              />
              <input
                type="text"
                placeholder="Start searching..."
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-surface-sunken dark:bg-zinc-900 border border-border hover:border-zinc-400 dark:hover:border-zinc-500 text-fg text-xs rounded-xl shadow-xs placeholder:text-fg-subtle outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
              />
            </div>
          )}
        </div>

        {/* Right Side: College Selector + Standalone Dustbin + Three Dots Actions Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 1. Smart Auto-Shrinking College Selector */}
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

          {/* 2. Active Mode Controls (Only visible when a mode is active) */}
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
                {/* Delete Mode Active: Only Delete and Cancel buttons */}
                <button
                  type="button"
                  disabled={(selectedCount || 0) === 0 || isDeleting}
                  onClick={() => {
                    triggerHaptic('medium');
                    onExecuteBulkDelete?.();
                  }}
                  className="h-8 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                  title="Confirm Delete Selected Rows"
                >
                  <Trash2 size={13} strokeWidth={2.4} />
                  <span>Delete ({selectedCount || 0})</span>
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
            ) : null
          )}

          {/* 3. Three Dots (Actions Menu) */}
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
