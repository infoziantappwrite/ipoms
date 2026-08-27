'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { WeeklyTable, WeeklyRow } from './WeeklyTable';
import { EditCompanyModal } from './EditCompanyModal';

interface Props {
  sectionKey: string;
  title: string;
  order: number;
  summaryMetric: string;
  rows: WeeklyRow[];
  isGlobalDeleteMode?: boolean;
  globalSelectedRowIds?: string[];
  onToggleSelectRow?: (rowId: string) => void;
  onToggleSelectSection?: (rowIds: string[]) => void;
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
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
  rejected_by_hr: {
    Icon: XCircle,
    headerBg: 'bg-surface-sunken border-border text-fg-muted',
    badgeClass: 'bg-surface text-fg-muted border-border',
    iconClass: 'text-fg-subtle',
  },
  rejected_by_college: {
    Icon: XCircle,
    headerBg: 'bg-surface-sunken border-border text-fg-muted',
    badgeClass: 'bg-surface text-fg-muted border-border',
    iconClass: 'text-fg-subtle',
  },
};

export function WeeklySection({
  sectionKey,
  title,
  order,
  summaryMetric,
  rows,
  isGlobalDeleteMode,
  globalSelectedRowIds,
  onToggleSelectRow: onGlobalToggleSelectRow,
  onToggleSelectSection: onGlobalToggleSelectSection,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocalDeleteMode, setIsLocalDeleteMode] = useState(false);
  const [localSelectedRowIds, setLocalSelectedRowIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingRow, setEditingRow] = useState<WeeklyRow | null>(null);

  const isDeleteMode = isGlobalDeleteMode !== undefined ? isGlobalDeleteMode : isLocalDeleteMode;
  const selectedRowIds = isGlobalDeleteMode ? (globalSelectedRowIds || []) : localSelectedRowIds;

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

  const handleBatchDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedRowIds.length === 0) return;
    if (!confirm(`Move ${selectedRowIds.length} selected row(s) to Recycle Bin?`)) return;

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

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-xs transition-all bg-surface">
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
          {/* Summary Metric (Hidden in delete mode) */}
          {!isDeleteMode && (
            <span className="text-xs font-medium opacity-80 hidden sm:inline mr-1">
              {summaryMetric}
            </span>
          )}

          {/* Delete Selection Mode Controls in Title Bar */}
          {isDeleteMode ? (
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
                  if (isGlobalDeleteMode && onGlobalToggleSelectSection) {
                    onGlobalToggleSelectSection([]);
                  } else {
                    setIsLocalDeleteMode(false);
                    setLocalSelectedRowIds([]);
                  }
                }}
                className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
                title="Cancel selection"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            rows.length > 0 && (
              <div className="flex items-center gap-1">
                {/* Delete Bin */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLocalDeleteMode(true);
                    setIsCollapsed(false);
                  }}
                  className="p-1.5 rounded-lg text-fg-subtle hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Select and delete rows in this section"
                  aria-label="Select and delete rows"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          )}

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
    </div>
  );
}
