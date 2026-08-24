'use client';

import { useState } from 'react';
import { Rocket, Sparkles, FileSpreadsheet, Trash2, CheckSquare, Square } from 'lucide-react';

const BATCH_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'];

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
  selectedIds: string[];
  isAllSelected?: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  onMoveToJd: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

export function LeadsTable({
  rows,
  activeTab,
  selectedIds,
  isAllSelected = false,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onBulkDelete,
  onUpdateRow,
  onMoveToJd,
  onDeleteRow,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
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
            No opportunities recorded for this college and date filter. Click <span className="text-primary font-semibold font-mono">+ Add Entry</span> in the header to register new activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* ── Table Container ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-micro select-none">
              {/* Multi-Select Header Checkbox */}
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer align-middle"
                  title="Select All"
                />
              </th>
              <th className="py-3 px-2 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[90px]">Time</th>
              <th className="py-3 px-3 min-w-[100px]">Date</th>
              <th className="py-3 px-3 min-w-[220px] max-w-[280px] text-left">Company Name</th>
              <th className="py-3 px-3 min-w-[170px]">Role Offered</th>
              <th className="py-3 px-3 min-w-[110px]">CTC</th>
              <th className="py-3 px-3 min-w-[160px]">College</th>
              <th className="py-3 px-3 min-w-[110px]">Batch</th>
              <th className="py-3 px-3 min-w-[220px]">Remarks & Notes</th>
              <th className="py-3 px-3 w-28 text-center">Action</th>
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
                  activeTab={activeTab}
                  isSelected={isSelected}
                  onToggleSelect={() => onToggleSelect(row._id)}
                  onUpdateRow={onUpdateRow}
                  onMoveToJd={onMoveToJd}
                  onDeleteRow={onDeleteRow}
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
  activeTab,
  isSelected,
  onToggleSelect,
  onUpdateRow,
  onMoveToJd,
  onDeleteRow,
}: {
  row: DailyLeadRow;
  index: number;
  activeTab: 'positive' | 'jd_received';
  isSelected: boolean;
  onToggleSelect: () => void;
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

  return (
    <tr className={`transition-colors ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-slate-50/80'}`}>
      {/* Row Selection Checkbox */}
      <td className="py-3 px-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer align-middle"
        />
      </td>

      {/* Row Index */}
      <td className="py-3 px-2 text-center text-slate-400 font-mono text-micro">
        {index}
      </td>

      {/* Time */}
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
            {new Date(row.lead_date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}
      </td>

      {/* Company Name */}
      <td className="py-3 px-3 font-bold text-slate-900 min-w-[220px] max-w-[280px] break-words leading-tight">
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
      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
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
            className="bg-white border border-primary rounded px-1.5 py-0.5 text-xs text-slate-900 w-20 shadow-xs outline-none"
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

      {/* College Code Badge */}
      <td className="py-3 px-3 whitespace-nowrap">
        <span className="inline-block px-2 py-0.5 rounded-md text-micro font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
          {row.college_id?.college_code || 'N/A'}
        </span>
      </td>

      {/* Batch */}
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
            title="Click to change year"
          >
            {row.eligible_batch}
          </span>
        )}
      </td>

      {/* Remarks */}
      <td className="py-3 px-3 text-slate-600">
        {editingField === 'remarks' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('remarks')}
            onKeyDown={(e) => handleKeyDown(e, 'remarks')}
            autoFocus
            className="bg-white border border-primary rounded px-1.5 py-0.5 text-xs text-slate-900 w-full shadow-xs outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('remarks', row.remarks)}
            className="cursor-pointer hover:text-primary transition-colors break-words leading-relaxed whitespace-pre-wrap max-w-[260px] inline-block"
            title={row.remarks}
          >
            {row.remarks || <span className="text-slate-400 italic">—</span>}
          </span>
        )}
      </td>

      {/* Actions: Move to JD (Tab 1) & Line Delete Icon */}
      <td className="py-3 px-3 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          {activeTab === 'positive' && (
            <button
              onClick={() => onMoveToJd(row._id)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-micro font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              title="1-Click Move to JD Received Tab"
            >
              <Rocket size={13} strokeWidth={2} />
              <span>Move to JD</span>
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Move ${row.company_name} to Recycle Bin?`)) {
                onDeleteRow(row._id);
              }
            }}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 p-1.5 rounded-lg transition-all cursor-pointer"
            title="Delete row"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  );
}
