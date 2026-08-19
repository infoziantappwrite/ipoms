'use client';

import { TrackerRow } from './TrackerRow';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';

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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-600 py-16">
        <div className="text-5xl">📋</div>
        <p className="text-lg font-semibold text-slate-500">
          {isReadOnly ? 'No calls recorded on this date.' : "No contacts loaded yet."}
        </p>
        {!isReadOnly && (
          <p className="text-sm text-slate-600">Click <strong className="text-blue-400">📥 Load Contacts</strong> to get started.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-slate-800">
      {/* Sticky Column Headers */}
      <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-2
                      bg-slate-900 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wide">
        {COLUMN_HEADERS.map((col) => (
          <div key={col.label} className={`${col.width} px-1 shrink-0`}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
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
        <div className="sticky bottom-0 bg-slate-950/90 backdrop-blur border-t border-slate-800 px-4 py-1.5
                        flex items-center gap-4 text-xs text-slate-600">
          <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Space</kbd> Fill Start Time</span>
          <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Tab</kbd> Next cell</span>
          <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Enter</kbd> Save row</span>
          <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Ctrl+S</kbd> Save all</span>
          <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Del</kbd> Clear cell</span>
        </div>
      )}
    </div>
  );
}
