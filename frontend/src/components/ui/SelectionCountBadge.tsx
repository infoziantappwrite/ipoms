'use client';

import { Trash2 } from 'lucide-react';

interface Props {
  selectedCount: number;
  totalCount?: number;
  /** Only pass when a "select all rows" affordance makes sense for this table. */
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

/**
 * The one piece that's genuinely identical between Daily Leads and Pending Tasks
 * bulk-selection: the "N selected" indicator. Everything else (which actions are
 * available — delete only, or edit + delete) differs per feature and is composed
 * by the caller as its own buttons, not baked into a shared "mode bar".
 *
 * No Cancel/Deselect-All here by design: exiting selection mode (via the page's
 * toggle button or the Escape key) already clears the selection.
 */
export function SelectionCountBadge({ selectedCount, totalCount, onSelectAll, isAllSelected }: Props) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
        <Trash2 size={13} className="text-rose-600" aria-hidden />
        <span>
          {selectedCount > 0
            ? totalCount !== undefined
              ? `${selectedCount} of ${totalCount} selected`
              : `${selectedCount} selected`
            : 'Select rows'}
        </span>
      </span>

      {onSelectAll && !isAllSelected && (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs font-semibold text-fg hover:text-fg bg-surface border border-border px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        >
          Select All
        </button>
      )}
    </div>
  );
}
