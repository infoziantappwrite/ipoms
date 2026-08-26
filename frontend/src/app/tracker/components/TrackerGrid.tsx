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
  { label: '#', width: 'w-10 text-center shrink-0' },
  { label: 'Start Time', width: 'w-20 shrink-0' },
  { label: 'End Time', width: 'w-20 shrink-0' },
  { label: 'Duration', width: 'w-16 shrink-0' },
  { label: 'Company Name', width: 'w-[220px] shrink-0' },
  { label: 'HR Name', width: 'w-32 shrink-0' },
  { label: 'Contact', width: 'w-36 shrink-0' },
  { label: 'Email ID', width: 'w-44 shrink-0' },
  { label: 'Call Status', width: 'w-44 shrink-0' },
  { label: 'Follow Up', width: 'w-34 shrink-0' },
  { label: 'Comments', width: 'flex-1 min-w-[200px]' },
  { label: 'Actions', width: 'w-14 text-center shrink-0' },
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
      <div className="min-w-[1720px]">
        {/* Sticky Column Headers (Exact Sheet-grade CSS Grid - Generous tracks to prevent collision) */}
        <div className="sticky top-0 z-10 grid grid-cols-[48px_110px_95px_95px_240px_140px_150px_180px_180px_150px_minmax(260px,1fr)_64px] divide-x divide-border bg-surface-sunken border-b border-border text-xs font-semibold text-fg-subtle uppercase tracking-wider shadow-2xs whitespace-nowrap select-none">
          <div className="px-2 py-2.5 text-center flex items-center justify-center whitespace-nowrap">#</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Start Time</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">End Time</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Duration</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Company Name</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">HR Name</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Contact</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Email ID</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Call Status</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Follow Up</div>
          <div className="px-2.5 py-2.5 flex items-center whitespace-nowrap">Comments</div>
          <div className="px-2 py-2.5 text-center flex items-center justify-center whitespace-nowrap">Actions</div>
        </div>

        {/* Rows with clear bordered separation */}
        <div className="divide-y divide-border border-b border-border">
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
