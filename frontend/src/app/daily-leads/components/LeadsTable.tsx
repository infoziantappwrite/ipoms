'use client';

import { useState } from 'react';

export interface DailyLeadRow {
  _id: string;
  lead_type: 'positive' | 'jd_received';
  college_id: {
    _id: string;
    college_name: string;
    college_code: string;
  };
  coordinator_id: {
    _id: string;
    full_name: string;
    official_email: string;
  };
  company_name: string;
  job_role: string;
  ctc: string;
  eligible_batch: string;
  event_time: string;
  lead_date: string;
  remarks: string;
  is_moved_to_jd: boolean;
}

interface Props {
  rows: DailyLeadRow[];
  activeTab: 'positive' | 'jd_received';
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  onMoveToJd: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

export function LeadsTable({
  rows,
  activeTab,
  onUpdateRow,
  onMoveToJd,
  onDeleteRow,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <span className="text-4xl">{activeTab === 'positive' ? '✨' : '📋'}</span>
        <p className="text-sm font-semibold text-slate-400">
          No {activeTab === 'positive' ? 'Positive Opportunities' : 'JDs Received'} recorded for this date & college.
        </p>
        <p className="text-xs text-slate-600">
          Click <span className="text-blue-400 font-semibold">+ Add Entry</span> above to log a new opportunity.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <th className="py-3 px-3 w-10 text-center">#</th>
            <th className="py-3 px-3 min-w-[90px]">Time</th>
            <th className="py-3 px-3 min-w-[100px]">Date</th>
            <th className="py-3 px-3 min-w-[170px]">Company Name</th>
            <th className="py-3 px-3 min-w-[170px]">Role Offered</th>
            <th className="py-3 px-3 min-w-[110px]">CTC</th>
            <th className="py-3 px-3 min-w-[160px]">College</th>
            <th className="py-3 px-3 min-w-[110px]">Batch</th>
            <th className="py-3 px-3 min-w-[220px]">Remarks & Notes</th>
            <th className="py-3 px-3 w-28 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-normal">
          {rows.map((row, idx) => (
            <TableRow
              key={row._id}
              row={row}
              index={idx + 1}
              activeTab={activeTab}
              onUpdateRow={onUpdateRow}
              onMoveToJd={onMoveToJd}
              onDeleteRow={onDeleteRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({
  row,
  index,
  activeTab,
  onUpdateRow,
  onMoveToJd,
  onDeleteRow,
}: {
  row: DailyLeadRow;
  index: number;
  activeTab: 'positive' | 'jd_received';
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  onMoveToJd: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const startEdit = (field: string, val: string) => {
    setEditingField(field);
    setTempValue(val ?? '');
  };

  const commitEdit = (field: string) => {
    if (editingField === field) {
      onUpdateRow(row._id, { [field]: tempValue });
      setEditingField(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      commitEdit(field);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const formattedDate = new Date(row.lead_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <tr className="hover:bg-slate-800/30 transition-colors group">
      {/* S.No */}
      <td className="py-3 px-3 text-center text-slate-500 font-mono">{index}</td>

      {/* Time (Separate column per Spec Section 10) */}
      <td className="py-3 px-3 text-slate-300 font-mono">
        {editingField === 'event_time' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('event_time')}
            onKeyDown={(e) => handleKeyDown(e, 'event_time')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-20"
          />
        ) : (
          <span
            onClick={() => startEdit('event_time', row.event_time)}
            className="cursor-pointer hover:text-blue-400 transition-colors"
          >
            {row.event_time}
          </span>
        )}
      </td>

      {/* Date */}
      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{formattedDate}</td>

      {/* Company Name */}
      <td className="py-3 px-3 font-semibold text-slate-200">
        {editingField === 'company_name' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('company_name')}
            onKeyDown={(e) => handleKeyDown(e, 'company_name')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('company_name', row.company_name)}
            className="cursor-pointer hover:text-blue-400 transition-colors"
          >
            {row.company_name}
          </span>
        )}
      </td>

      {/* Role */}
      <td className="py-3 px-3 text-slate-300">
        {editingField === 'job_role' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('job_role')}
            onKeyDown={(e) => handleKeyDown(e, 'job_role')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('job_role', row.job_role)}
            className="cursor-pointer hover:text-blue-400 transition-colors"
          >
            {row.job_role}
          </span>
        )}
      </td>

      {/* CTC */}
      <td className="py-3 px-3 text-emerald-400 font-medium whitespace-nowrap">
        {editingField === 'ctc' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('ctc')}
            onKeyDown={(e) => handleKeyDown(e, 'ctc')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('ctc', row.ctc)}
            className="cursor-pointer hover:text-blue-400 transition-colors"
          >
            {row.ctc || <span className="text-slate-600 italic">—</span>}
          </span>
        )}
      </td>

      {/* College */}
      <td className="py-3 px-3 text-slate-300">
        <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px]">
          {row.college_id?.college_code || 'COLLEGE'}
        </span>
      </td>

      {/* Batch */}
      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
        {editingField === 'eligible_batch' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('eligible_batch')}
            onKeyDown={(e) => handleKeyDown(e, 'eligible_batch')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-20"
          />
        ) : (
          <span
            onClick={() => startEdit('eligible_batch', row.eligible_batch)}
            className="cursor-pointer hover:text-blue-400 transition-colors"
          >
            {row.eligible_batch}
          </span>
        )}
      </td>

      {/* Remarks */}
      <td className="py-3 px-3 text-slate-300">
        {editingField === 'remarks' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('remarks')}
            onKeyDown={(e) => handleKeyDown(e, 'remarks')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('remarks', row.remarks)}
            className="cursor-pointer hover:text-blue-400 transition-colors line-clamp-1"
            title={row.remarks}
          >
            {row.remarks || <span className="text-slate-600 italic">—</span>}
          </span>
        )}
      </td>

      {/* Actions: Move to JD (Tab 1) & Delete */}
      <td className="py-3 px-3 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          {activeTab === 'positive' && (
            <button
              onClick={() => onMoveToJd(row._id)}
              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1"
              title="1-Click Move to JD Received Tab"
            >
              <span>🚀</span> Move to JD
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Move ${row.company_name} to Recycle Bin?`)) {
                onDeleteRow(row._id);
              }
            }}
            className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors text-xs"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}
