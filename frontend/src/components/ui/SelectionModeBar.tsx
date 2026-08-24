'use client';

import { Trash2, Edit3 } from 'lucide-react';

interface Props {
  selectedCount: number;
  totalCount?: number;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

/**
 * Shared pill shown once a table enters bulk-selection mode (Daily Leads, Pending Tasks).
 * Keeps the rose "selection active" theme and select-all/edit/delete/cancel controls in one place
 * so the two features don't drift into visually different implementations of the same interaction.
 */
export function SelectionModeBar({
  selectedCount,
  totalCount,
  onSelectAll,
  isAllSelected,
  onCancel,
  onDelete,
  onEdit,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: Props) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg animate-fadeIn">
      <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
        <Trash2 size={13} className="text-rose-600" aria-hidden />
        <span>
          {selectedCount > 0
            ? totalCount !== undefined
              ? `${selectedCount} of ${totalCount} selected`
              : `${selectedCount} selected`
            : 'Select rows'}
        </span>
      </span>

      {onSelectAll && (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs font-semibold text-fg hover:text-fg bg-surface border border-border px-2 py-0.5 rounded-md transition-colors cursor-pointer"
        >
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </button>
      )}

      {selectedCount > 0 && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-indigo-700 bg-surface hover:bg-indigo-50 border border-indigo-200 rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          <Edit3 size={12} aria-hidden />
          <span>{editLabel}</span>
        </button>
      )}

      {selectedCount > 0 && (
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-700 rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          <Trash2 size={12} aria-hidden />
          <span>{deleteLabel} ({selectedCount})</span>
        </button>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-fg-subtle hover:text-fg bg-surface border border-border px-2 py-0.5 rounded-md transition-colors cursor-pointer ml-0.5"
      >
        Cancel
      </button>
    </div>
  );
}
