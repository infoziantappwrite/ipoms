'use client';

import { useState } from 'react';
import { Sparkles, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export interface DailyLeadRow {
  _id: string;
  lead_type: 'positive' | 'jd_received';
  event_time: string;
  lead_date: string;
  company_name: string;
  job_role: string;
  ctc: string;
  eligible_batch: string;
  remarks?: string;
  coordinator_id?: {
    _id: string;
    full_name: string;
  };
  college_id?: {
    _id: string;
    college_name: string;
    college_code: string;
  };
  is_jd_received?: boolean;
}

const BATCH_YEARS = ['2025', '2026', '2027', '2028', '2029'];

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
  onBulkDelete,
  onUpdateRow,
}: Props) {
  // Prompt when 'All Colleges' or no college is chosen
  if (!selectedCollegeId || selectedCollegeId === 'all') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-border rounded-2xl shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4 shadow-sm">
          <Calendar size={28} strokeWidth={2} />
        </div>
        <h3 className="text-base font-bold text-fg mb-1">
          Select a College to View Daily Leads
        </h3>
        <p className="text-xs text-fg-subtle max-w-md">
          Please select a specific college from the top dropdown to view its segregated {activeTab === 'positive' ? 'Positive Leads' : 'JD Received'} for the selected date.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-border rounded-2xl shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-surface-sunken border border-border text-fg-subtle flex items-center justify-center mb-3">
          <FileText size={28} strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-fg">
            No {activeTab === 'positive' ? 'Positive Leads' : 'JD Received Records'} Found
          </h3>
          <p className="text-xs text-fg-subtle max-w-sm">
            No opportunities recorded for this college on the selected date. Click <span className="text-primary font-semibold font-mono">+ Add Entry</span> in the header to register new activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* ── Clean Table Container ─────────────────────────────────────────── */}
      <div className="overflow-x-auto bg-surface rounded-2xl border border-border shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-surface-sunken text-fg-muted font-bold border-b border-border uppercase tracking-wider text-micro select-none">
              {/* Checkbox Column (Only visible when isDeleteMode is active) */}
              {isDeleteMode && (
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-border text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer align-middle"
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
          <tbody className="divide-y divide-border/60 font-normal bg-surface">
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
          ? 'bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-50/80 dark:hover:bg-rose-950/60 text-fg'
          : 'hover:bg-surface-sunken/80 text-fg'
      }`}
    >
      {/* Row Selection Checkbox (Only when isDeleteMode is active) */}
      {isDeleteMode && (
        <td className="py-3 px-3 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-border text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer align-middle"
          />
        </td>
      )}

      {/* Row Index */}
      <td className="py-3 px-3 text-center text-fg-subtle font-mono text-micro font-medium">
        {index}
      </td>

      {/* Time Stamp */}
      <td className="py-3 px-3 text-fg-subtle whitespace-nowrap font-mono text-micro">
        {editingField === 'event_time' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('event_time')}
            onKeyDown={(e) => handleKeyDown(e, 'event_time')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-20 shadow-xs outline-none"
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
      <td className="py-3 px-3 text-fg-muted whitespace-nowrap font-mono text-micro">
        {editingField === 'lead_date' ? (
          <input
            type="date"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('lead_date')}
            onKeyDown={(e) => handleKeyDown(e, 'lead_date')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg shadow-xs outline-none"
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
      <td className="py-3 px-3 font-bold text-fg min-w-[240px] break-words leading-snug">
        {editingField === 'company_name' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('company_name')}
            onKeyDown={(e) => handleKeyDown(e, 'company_name')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full shadow-xs outline-none"
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
      <td className="py-3 px-3 text-fg-muted whitespace-pre-wrap leading-tight min-w-[180px]">
        {editingField === 'job_role' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('job_role')}
            onKeyDown={(e) => handleKeyDown(e, 'job_role')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full shadow-xs outline-none"
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
      <td className="py-3 px-3 whitespace-nowrap font-mono text-micro font-bold text-emerald-600 dark:text-emerald-400">
        {editingField === 'ctc' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('ctc')}
            onKeyDown={(e) => handleKeyDown(e, 'ctc')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-24 shadow-xs outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit('ctc', row.ctc)}
            className="cursor-pointer hover:underline transition-colors"
            title="Click to edit CTC"
          >
            {row.ctc || <span className="text-fg-disabled italic font-normal">—</span>}
          </span>
        )}
      </td>

      {/* Eligible Batch */}
      <td className="py-3 px-3 text-fg-muted whitespace-nowrap">
        {editingField === 'eligible_batch' ? (
          <select
            value={tempValue}
            onChange={(e) => {
              setTempValue(e.target.value);
            }}
            onBlur={() => commitEdit('eligible_batch')}
            autoFocus
            className="bg-surface border border-primary rounded-lg px-2 py-1 text-xs text-fg shadow-xs cursor-pointer outline-none font-medium"
          >
            {BATCH_YEARS.map((y) => (
              <option key={y} value={y} className="bg-surface text-fg">
                {y}
              </option>
            ))}
          </select>
        ) : (
          <span
            onClick={() => startEdit('eligible_batch', row.eligible_batch)}
            className="cursor-pointer hover:text-primary transition-colors font-mono font-medium px-2 py-0.5 rounded bg-surface-sunken border border-border"
            title="Click to change batch"
          >
            {row.eligible_batch}
          </span>
        )}
      </td>
    </tr>
  );
}
