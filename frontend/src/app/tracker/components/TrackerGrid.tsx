'use client';

import { TrackerRow } from './TrackerRow';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';
import { Download } from 'lucide-react';

interface Props {
  rows: TrackerRowType[];
  isReadOnly: boolean;
  onRowUpdate: (rowId: string, patch: Partial<TrackerRowType>) => Promise<void>;
  onSkip: (rowId: string) => Promise<void>;
}

const COLUMN_HEADERS = [
  { label: 'S.No', width: 'w-12' },
  { label: 'Start Time', width: 'w-28' },
  { label: 'End Time', width: 'w-28' },
  { label: 'Duration', width: 'w-20' },
  { label: 'Company Name', width: 'min-w-[160px] flex-1' },
  { label: 'HR Name', width: 'w-36' },
  { label: 'Mobile', width: 'w-32' },
  { label: 'Email', width: 'w-44' },
  { label: 'Call Outcome', width: 'w-44' },
  { label: 'Comments', width: 'flex-1 min-w-[140px]' },
  { label: 'Actions', width: 'w-16' },
];

export function TrackerGrid({ rows, isReadOnly, onRowUpdate, onSkip }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-fg-muted py-16">
        <div className="text-5xl">📋</div>
        <p className="text-lg font-semibold text-fg-subtle">
          {isReadOnly ? 'No calls recorded on this date.' : "No contacts loaded yet."}
        </p>
        {!isReadOnly && (
          <p className="text-sm text-fg-muted">Click <strong className="text-primary"><Download size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Load Contacts</strong> to get started.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-border">
      {/* Sticky Column Headers */}
      <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-2
                      bg-background border-b border-border-strong text-xs font-semibold text-fg-subtle uppercase tracking-wide">
        {COLUMN_HEADERS.map((col) => (
          <div key={col.label} className={`${col.width} px-1 shrink-0`}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/60">
        {rows.map((row) => (
          <TrackerRow
            key={row._id}
            row={row}
            isReadOnly={isReadOnly}
            onUpdate={(patch) => onRowUpdate(row._id, patch)}
            onSkip={() => onSkip(row._id)}
          />
        ))}
      </div>

      {/* Keyboard shortcut hint footer */}
      {!isReadOnly && (
        <div className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border px-4 py-1.5
                        flex items-center gap-4 text-xs text-fg-muted">
          <span><kbd className="bg-surface px-1 py-0.5 rounded text-fg-subtle">Space</kbd> Fill Start Time</span>
          <span><kbd className="bg-surface px-1 py-0.5 rounded text-fg-subtle">Tab</kbd> Next cell</span>
          <span><kbd className="bg-surface px-1 py-0.5 rounded text-fg-subtle">Enter</kbd> Save row</span>
          <span><kbd className="bg-surface px-1 py-0.5 rounded text-fg-subtle">Ctrl+S</kbd> Save all</span>
          <span><kbd className="bg-surface px-1 py-0.5 rounded text-fg-subtle">Del</kbd> Clear cell</span>
        </div>
      )}
    </div>
  );
}
