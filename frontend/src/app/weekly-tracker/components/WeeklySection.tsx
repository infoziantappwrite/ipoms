'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Trophy,
  Rocket,
  Inbox,
  Star,
  XCircle,
  Folder,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Calendar,
  Zap,
  Flame,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { WeeklyTable, WeeklyRow } from './WeeklyTable';
import { EditCompanyModal } from './EditCompanyModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface Props {
  sectionKey: string;
  title: string;
  order: number;
  summaryMetric?: string;
  rows: WeeklyRow[];
  isGlobalDeleteMode?: boolean;
  selectionMode?: 'move' | 'delete' | null;
  globalSelectedRowIds?: string[];
  onToggleSelectRow?: (rowId: string) => void;
  onToggleSelectSection?: (rowIds: string[]) => void;
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
  onReorderRows?: (sectionKey: string, newRows: WeeklyRow[]) => Promise<void> | void;
  onMoveRowCrossSection?: (
    rowId: string,
    sourceSectionKey: string,
    targetSectionKey: string,
    targetIndex?: number
  ) => Promise<void> | void;
}

const SECTION_CONFIGS: Record<string, { Icon: any; headerBg: string; badgeClass: string; iconClass: string }> = {
  follow_ups_due_today: {
    Icon: Clock,
    headerBg: 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  completed: {
    Icon: Trophy,
    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  drive_in_progress: {
    Icon: Zap,
    headerBg: 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-200',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/70',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  in_drive: {
    Icon: Calendar,
    headerBg: 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  companies_in_drive: {
    Icon: Calendar,
    headerBg: 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  upcoming_drives: {
    Icon: Calendar,
    headerBg: 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  in_progress: {
    Icon: Rocket,
    headerBg: 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-300',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/60',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  pipeline: {
    Icon: Inbox,
    headerBg: 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900/40 text-cyan-900 dark:text-cyan-300',
    badgeClass: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/60',
    iconClass: 'text-cyan-600 dark:text-cyan-400',
  },
  top_companies: {
    Icon: Star,
    headerBg: 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/40 text-purple-900 dark:text-purple-300',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
    iconClass: 'text-purple-600 dark:text-purple-400',
  },
  rejected_companies: {
    Icon: XCircle,
    headerBg: 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/60',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  on_hold_by_college: {
    Icon: Clock,
    headerBg: 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/40 text-orange-900 dark:text-orange-300',
    badgeClass: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700/60',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  on_hold_by_hr: {
    Icon: Clock,
    headerBg: 'bg-slate-100/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300',
    badgeClass: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  rejected_by_hr: {
    Icon: XCircle,
    headerBg: 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/60',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  rejected_by_college: {
    Icon: Clock,
    headerBg: 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/40 text-orange-900 dark:text-orange-300',
    badgeClass: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700/60',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
};

export function WeeklySection({
  sectionKey,
  title,
  order,
  summaryMetric,
  rows,
  isGlobalDeleteMode,
  selectionMode,
  globalSelectedRowIds,
  onToggleSelectRow: onGlobalToggleSelectRow,
  onToggleSelectSection: onGlobalToggleSelectSection,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
  onReorderRows,
  onMoveRowCrossSection,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocalDeleteMode, setIsLocalDeleteMode] = useState(false);
  const [localSelectedRowIds, setLocalSelectedRowIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WeeklyRow | null>(null);
  const [isDragOverSection, setIsDragOverSection] = useState(false);
  const [isJustDropped, setIsJustDropped] = useState(false);

  // Global Drag Reset & Escape Key Handler to prevent sticky drag over highlights
  useEffect(() => {
    const handleGlobalDragReset = () => {
      setIsDragOverSection(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleGlobalDragReset();
        setLocalSelectedRowIds([]);
        setIsLocalDeleteMode(false);
        setIsJustDropped(false);
        (window as any).__ipoms_dragged_weekly_row = null;
      }
    };

    window.addEventListener('dragend', handleGlobalDragReset);
    window.addEventListener('drop', handleGlobalDragReset);
    window.addEventListener('mouseup', handleGlobalDragReset);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dragend', handleGlobalDragReset);
      window.removeEventListener('drop', handleGlobalDragReset);
      window.removeEventListener('mouseup', handleGlobalDragReset);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isDeleteMode = isGlobalDeleteMode !== undefined ? isGlobalDeleteMode : isLocalDeleteMode;
  const selectedRowIds = isGlobalDeleteMode ? (globalSelectedRowIds || []) : localSelectedRowIds;
  const sectionSelectedCount = rows.filter((r) => selectedRowIds.includes(r._id)).length;

  const config = SECTION_CONFIGS[sectionKey] || {
    Icon: Folder,
    headerBg: 'bg-surface-sunken border-border text-fg',
    badgeClass: 'bg-surface text-fg-muted border-border',
    iconClass: 'text-fg-subtle',
  };

  const IconComponent = config.Icon;

  const handleToggleSelectRow = (id: string) => {
    if (isGlobalDeleteMode && onGlobalToggleSelectRow) {
      onGlobalToggleSelectRow(id);
    } else {
      setLocalSelectedRowIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const handleToggleSelectAll = () => {
    if (isGlobalDeleteMode && onGlobalToggleSelectSection) {
      onGlobalToggleSelectSection(rows.map((r) => r._id));
    } else {
      if (localSelectedRowIds.length === rows.length) {
        setLocalSelectedRowIds([]);
      } else {
        setLocalSelectedRowIds(rows.map((r) => r._id));
      }
    }
  };

  const handleBatchDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedRowIds.length === 0) return;
    setIsDeleteModalOpen(true);
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedRowIds.length === 0) return;
    setIsDeleteModalOpen(false);
    setIsDeleting(true);
    try {
      await apiFetch('/weekly-tracker/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedRowIds }),
      });
      for (const id of selectedRowIds) {
        await onDeleteRow(id);
      }
      setLocalSelectedRowIds([]);
      setIsLocalDeleteMode(false);
    } catch (err) {
      console.error('Failed to batch delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSectionDragOver = (e: React.DragEvent) => {
    const globalDragged = (window as any).__ipoms_dragged_weekly_row;
    if (globalDragged && globalDragged.sourceSectionKey !== sectionKey) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!isDragOverSection) setIsDragOverSection(true);
    }
  };

  const handleSectionDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverSection(false);
    }
  };

  const handleSectionDrop = (e: React.DragEvent) => {
    setIsDragOverSection(false);
    const globalDragged = (window as any).__ipoms_dragged_weekly_row;
    let data: any = globalDragged;
    if (!data) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) data = JSON.parse(raw);
      } catch {}
    }

    if (data && data.rowId && data.sourceSectionKey !== sectionKey) {
      e.preventDefault();
      e.stopPropagation();
      setIsJustDropped(true);
      setTimeout(() => setIsJustDropped(false), 1500);
      onMoveRowCrossSection?.(data.rowId, data.sourceSectionKey, sectionKey, rows.length);
      (window as any).__ipoms_dragged_weekly_row = null;
    }
  };

  return (
    <div
      onDragOver={handleSectionDragOver}
      onDragLeave={handleSectionDragLeave}
      onDrop={handleSectionDrop}
      className={`rounded-xl border transition-all duration-300 overflow-hidden shadow-xs bg-surface ${
        isDragOverSection
          ? 'border-primary ring-2 ring-primary/60 shadow-lg scale-[1.002]'
          : isJustDropped
          ? 'border-primary ring-2 ring-primary/40 bg-primary/[0.02] shadow-md'
          : 'border-border'
      }`}
    >
      {/* Sticky Section Header */}
      <div
        onClick={() => {
          if (!isDeleteMode) setIsCollapsed(!isCollapsed);
        }}
        className={`sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b cursor-pointer select-none transition-colors ${config.headerBg}`}
      >
        <div className="flex items-center gap-2.5">
          <IconComponent size={15} strokeWidth={2} className={config.iconClass} />
          <span className="text-xs font-bold tracking-wide uppercase">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Selection Mode Badge (only shows if items are selected in this specific section) */}
          {isGlobalDeleteMode && sectionSelectedCount > 0 && (
            <span className={`text-micro font-bold px-2 py-0.5 rounded-full border ${
              selectionMode === 'delete'
                ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                : 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800'
            }`}>
              {sectionSelectedCount} selected
            </span>
          )}

          {/* Local Delete Mode Controls in Title Bar (only when not in global mode) */}
          {!isGlobalDeleteMode && isLocalDeleteMode ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-micro font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-full">
                {selectedRowIds.length} selected
              </span>
              <button
                type="button"
                disabled={selectedRowIds.length === 0 || isDeleting}
                onClick={handleBatchDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Delete Selected Rows"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLocalDeleteMode(false);
                  setLocalSelectedRowIds([]);
                }}
                className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
                title="Cancel selection"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="p-1 rounded hover:bg-surface-raised transition-transform"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Table Content */}
      {!isCollapsed && (
        <WeeklyTable
          rows={rows}
          sectionKey={sectionKey}
          isDeleteMode={isDeleteMode}
          selectedRowIds={selectedRowIds}
          onToggleSelectRow={handleToggleSelectRow}
          onToggleSelectAll={handleToggleSelectAll}
          onUpdateRow={onUpdateRow}
          onMoveSection={onMoveSection}
          onTogglePin={onTogglePin}
          onDeleteRow={onDeleteRow}
          onReorderRows={(newRows) => onReorderRows && onReorderRows(sectionKey, newRows)}
          onMoveRowCrossSection={onMoveRowCrossSection}
          onEditRow={(row) => setEditingRow(row)}
        />
      )}

      {/* Edit Company Modal */}
      {editingRow && (
        <EditCompanyModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onUpdated={onUpdateRow}
          onDeleted={onDeleteRow}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        count={selectedRowIds.length}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
