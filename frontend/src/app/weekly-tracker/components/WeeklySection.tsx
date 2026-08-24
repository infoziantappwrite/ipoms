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

interface Props {
  sectionKey: string;
  title: string;
  order: number;
  summaryMetric: string;
  rows: WeeklyRow[];
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

const SECTION_CONFIGS: Record<string, { Icon: any; headerBg: string; badgeClass: string; iconClass: string }> = {
  follow_ups_due_today: {
    Icon: Clock,
    headerBg: 'bg-amber-50/80 border-amber-200 text-amber-900',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    iconClass: 'text-amber-600',
  },
  completed: {
    Icon: Trophy,
    headerBg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconClass: 'text-emerald-600',
  },
  in_progress: {
    Icon: Rocket,
    headerBg: 'bg-blue-50/80 border-blue-200 text-blue-900',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    iconClass: 'text-blue-600',
  },
  pipeline: {
    Icon: Inbox,
    headerBg: 'bg-cyan-50/80 border-cyan-200 text-cyan-900',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    iconClass: 'text-cyan-600',
  },
  top_companies: {
    Icon: Star,
    headerBg: 'bg-purple-50/80 border-purple-200 text-purple-900',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    iconClass: 'text-purple-600',
  },
  rejected_by_hr: {
    Icon: XCircle,
    headerBg: 'bg-slate-50/80 border-slate-200 text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClass: 'text-slate-500',
  },
  rejected_by_college: {
    Icon: XCircle,
    headerBg: 'bg-slate-50/80 border-slate-200 text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClass: 'text-slate-500',
  },
};

export function WeeklySection({
  sectionKey,
  title,
  order,
  summaryMetric,
  rows,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const config = SECTION_CONFIGS[sectionKey] || {
    Icon: Folder,
    headerBg: 'bg-slate-50 border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClass: 'text-slate-500',
  };

  const IconComponent = config.Icon;

  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === rows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(rows.map((r) => r._id));
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
      setSelectedRowIds([]);
      setIsDeleteMode(false);
    } catch (err) {
      console.error('Failed to batch delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-xs transition-all bg-white">
      {/* Sticky Section Header per Spec Section 16 */}
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

        <div className="flex items-center gap-3">
          {/* Summary Metric (Hidden in delete mode) */}
          {!isDeleteMode && (
            <span className="text-xs font-medium opacity-80 hidden sm:inline">
              {summaryMetric}
            </span>
          )}

          {/* Delete Selection Mode Controls in Title Bar */}
          {isDeleteMode ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-micro font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
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
                  setIsDeleteMode(false);
                  setSelectedRowIds([]);
                }}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Cancel selection"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            rows.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteMode(true);
                  setIsCollapsed(false);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Select and delete rows in this section"
                aria-label="Select and delete rows"
              >
                <Trash2 size={15} />
              </button>
            )
          )}

          <button
            type="button"
            className="p-1 rounded hover:bg-black/5 transition-transform"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Table Content */}
      {!isCollapsed && (
        <div className="bg-white">
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
          />
        </div>
      )}
    </div>
  );
}
