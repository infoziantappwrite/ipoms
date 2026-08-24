'use client';

import { TrackerRow } from './TrackerRow';
import type { TrackerRow as TrackerRowType, CallOutcome } from '../page';
import { ClipboardList, Download } from 'lucide-react';

interface Props {
  rows: TrackerRowType[];
  isReadOnly: boolean;
  onRowUpdate: (rowId: string, patch: Partial<TrackerRowType>) => Promise<void>;
  onDelete: (rowId: string) => Promise<void>;
  onCall?: (row: TrackerRowType) => void;
}

const COLUMN_HEADERS = [
  { label: '#', width: 'w-12 text-center shrink-0' },
  { label: 'Start Time', width: 'w-28 shrink-0' },
  { label: 'End Time', width: 'w-28 shrink-0' },
  { label: 'Duration', width: 'w-20 shrink-0' },
  { label: 'Company Name', width: 'w-[250px] shrink-0' },
  { label: 'HR Name', width: 'w-36 shrink-0' },
  { label: 'Contact', width: 'w-32 shrink-0' },
  { label: 'Email ID', width: 'w-40 shrink-0' },
  { label: 'Call Status', width: 'w-44 shrink-0' },
  { label: 'Follow Up', width: 'w-36 shrink-0' },
  { label: 'Comments', width: 'flex-1 min-w-[200px]' },
  { label: 'Actions', width: 'w-16 text-center shrink-0' },
];

export function TrackerGrid({ rows, isReadOnly, onRowUpdate, onDelete, onCall }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400">
          <ClipboardList size={26} strokeWidth={1.75} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            {isReadOnly ? 'No Calls Logged on this Date' : 'Daily Calling Register Ready'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isReadOnly
              ? 'There are no call records for the selected date.'
              : 'Click "Load Contacts" in the toolbar to populate your target company contacts for today.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-border bg-surface">
      <div className="min-w-fit">
        {/* Sticky Column Headers */}
        <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-2.5
                        bg-surface-sunken border-b border-border text-xs font-semibold text-fg-subtle uppercase tracking-wide min-w-fit">
          {COLUMN_HEADERS.map((col) => (
            <div key={col.label} className={`${col.width} px-1 shrink-0`}>
              {col.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/60 min-w-fit">
          {rows.map((row) => (
            <TrackerRow
              key={row._id}
              row={row}
              isReadOnly={isReadOnly}
              onUpdate={(patch) => onRowUpdate(row._id, patch)}
              onDelete={() => onDelete(row._id)}
              onCall={onCall}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
