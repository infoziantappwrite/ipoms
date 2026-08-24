'use client';

import React, { useState } from 'react';
import { Sparkles, FileSpreadsheet, Trash2, Building2, AlertCircle } from 'lucide-react';

const BATCH_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'];

export interface DailyLeadRow {
  _id: string;
  lead_type: 'positive' | 'jd_received';
  college_id: {
    _id: string;
    college_name: string;
    college_code: string;
  };
  coordinator_id?: {
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
  remarks?: string;
  is_moved_to_jd?: boolean;
}

interface Props {
  rows: DailyLeadRow[];
  activeTab: 'positive' | 'jd_received';
  selectedCollegeId?: string;
  isDeleteMode?: boolean;
  selectedIds: string[];
  isAllSelected?: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onCancelDeleteMode?: () => void;
  onBulkDelete: () => Promise<void>;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
}

export function LeadsTable({
  rows,
  activeTab,
  selectedCollegeId,
  isDeleteMode = false,
  selectedIds,
  isAllSelected = false,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onCancelDeleteMode,
  onBulkDelete,
  onUpdateRow,
}: Props) {
  // Prompt when 'All Colleges' or no college is chosen
  if (!selectedCollegeId || selectedCollegeId === 'all') {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3.5 bg-white rounded-2xl border border-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-blue-50/80 border border-blue-200/80 shadow-xs flex items-center justify-center text-primary">
          <Building2 size={32} strokeWidth={1.8} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800 tracking-tight">
            Select a College to View Leads
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Please select a college from the dropdown above to view the positives and JD for the day.
          </p>
        </div>
      </div>
    );
  }

  // When a college is selected but no records exist
  if (rows.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400">
          {activeTab === 'positive' ? (
            <Sparkles size={26} strokeWidth={1.75} className="text-emerald-500" />
          ) : (
            <FileSpreadsheet size={26} strokeWidth={1.75} className="text-blue-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            No {activeTab === 'positive' ? 'Positive Leads' : 'JDs Received'} Logged
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No opportunities recorded for this college on the selected date. Click <span className="text-primary font-semibold font-mono">+ Add Entry</span> in the header to register new activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* ── Clean Table Container ─────────────────────────────────────────── */}
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-micro select-none">
              {/* Checkbox Column (Only visible when isDeleteMode is active) */}
              {isDeleteMode && (
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer align-middle"
                    title="Select All Rows"
                  />
                </th>
              )}
              <th className="py-3 px-3 w-14 text-center font-bold">SI.NO</th>
              <th className="py-3 px-3 min-w-[100px]">Time Stamp</th>
              <th className="py-3 px-3 min-w-[110px]">Date</th>
              <th className="py-3 px-3 min-w-[240px] text-left">Company Name</th>
              <th className="py-3 px-3 min-w-[180px]">Role</th>
              <th className="py-3 px-3 min-w-[120px]">CTC</th>
              <th className="py-3 px-3 min-w-[120px]">Eligible Batch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal bg-white">
            {rows.map((row, idx) => {
              const isSelected = selectedIds.includes(row._id);
              return (
                <TableRow
                  key={row._id}
                  row={row}
                  index={idx + 1}
                  isDeleteMode={isDeleteMode}
                  isSelected={isSelected}
                  onToggleSelect={() => onToggleSelect(row._id)}
                  onUpdateRow={onUpdateRow}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableRow({
  row,
  index,
  isDeleteMode,
  isSelected,
  onToggleSelect,
  onUpdateRow,
}: {
  row: DailyLeadRow;
  index: number;
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const startEdit = (field: string, val: string) => {
    if (isDeleteMode) return; // Disable inline edits during delete selection
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

  return (
    <tr
      className={`transition-colors ${
        isSelected
          ? 'bg-rose-50/50 hover:bg-rose-50/70 text-slate-900'
          : 'hover:bg-slate-50/80 text-slate-800'
      }`}
    >
      {/* Row Selection Checkbox (Only when isDeleteMode is active) */}
      {isDeleteMode && (
        <td className="py-3 px-3 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer align-middle"
          />
        </td>
      )}

      {/* Row Index */}
      <td className="py-3 px-3 text-center text-slate-400 font-mono text-micro font-medium">
        {index}
      </td>

      {/* Time Stamp */}
      <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-micro">
        {editingField === 'event_time' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('event_time')}
            onKeyDown={(e) => handleKeyDown(e, 'event_time')}
            autoFocus
            className="bg-white border border-primary rounded px-1.5 py-0.5 text-xs text-slate-900 w-20 shadow-xs outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('event_time', row.event_time)}
            className="cursor-pointer hover:text-primary transition-colors"
            title="Click to edit time"
          >
            {row.event_time || '—'}
          </span>
        )}
      </td>

      {/* Date */}
      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-mono text-micro">
        {editingField === 'lead_date' ? (
          <input
            type="date"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('lead_date')}
            onKeyDown={(e) => handleKeyDown(e, 'lead_date')}
            autoFocus
            className="bg-white border border-primary rounded px-1.5 py-0.5 text-xs text-slate-900 shadow-xs outline-none"
          />
        ) : (
          <span
            onClick={() =>
              startEdit('lead_date', new Date(row.lead_date).toISOString().split('T')[0])
            }
            className="cursor-pointer hover:text-primary transition-colors"
            title="Click to edit date"
          >
            {row.lead_date
              ? new Date(row.lead_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </span>
        )}
      </td>

      {/* Company Name */}
      <td className="py-3 px-3 font-bold text-slate-900 min-w-[240px] break-words leading-snug">
        {editingField === 'company_name' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('company_name')}
            onKeyDown={(e) => handleKeyDown(e, 'company_name')}
            autoFocus
            className="bg-white border border-primary rounded px-1.5 py-0.5 text-xs text-slate-900 w-full shadow-xs outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('company_name', row.company_name)}
            className="cursor-pointer hover:text-primary transition-colors"
            title="Click to edit company name"
          >
            {row.company_name}
          </span>
        )}
      </td>

      {/* Job Role */}
      <td className="py-3 px-3 text-slate-700 whitespace-pre-wrap leading-tight min-w-[180px]">
        {editingField === 'job_role' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('job_role')}
            onKeyDown={(e) => handleKeyDown(e, 'job_role')}
            autoFocus
            className="bg-white border border-primary rounded px-1.5 py-0.5 text-xs text-slate-900 w-full shadow-xs outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('job_role', row.job_role)}
            className="cursor-pointer hover:text-primary transition-colors"
            title="Click to edit job role"
          >
            {row.job_role || '—'}
          </span>
        )}
      </td>

      {/* CTC */}
      <td className="py-3 px-3 whitespace-nowrap font-mono text-micro font-bold text-emerald-600">
        {editingField === 'ctc' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('ctc')}
            onKeyDown={(e) => handleKeyDown(e, 'ctc')}
            autoFocus
            className="bg-white border border-primary rounded px-1.5 py-0.5 text-xs text-slate-900 w-24 shadow-xs outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('ctc', row.ctc)}
            className="cursor-pointer hover:underline transition-colors"
            title="Click to edit CTC"
          >
            {row.ctc || <span className="text-slate-400 italic font-normal">—</span>}
          </span>
        )}
      </td>

      {/* Eligible Batch */}
      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
        {editingField === 'eligible_batch' ? (
          <select
            value={tempValue}
            onChange={(e) => {
              setTempValue(e.target.value);
            }}
            onBlur={() => commitEdit('eligible_batch')}
            autoFocus
            className="bg-white border border-primary rounded-lg px-2 py-1 text-xs text-slate-900 shadow-xs cursor-pointer outline-none font-medium"
          >
            {BATCH_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        ) : (
          <span
            onClick={() => startEdit('eligible_batch', row.eligible_batch)}
            className="cursor-pointer hover:text-primary transition-colors font-mono font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200"
            title="Click to change batch"
          >
            {row.eligible_batch}
          </span>
        )}
      </td>
    </tr>
  );
}
