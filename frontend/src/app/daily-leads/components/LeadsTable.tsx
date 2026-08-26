'use client';

import { useState } from 'react';
import { Sparkles, Trash2, Calendar, FileText, CheckCircle2, ChevronDown, Pencil } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { InlineCollegeSelector } from './InlineCollegeSelector';
import { EditLeadModal } from './EditLeadModal';

export interface CollegeOption {
  _id: string;
  college_name: string;
  college_code: string;
}

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
  colleges: CollegeOption[];
  isDeleteMode?: boolean;
  selectedIds: string[];
  isAllSelected?: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  onDeleteRow?: (rowId: string) => Promise<void>;
}

export function LeadsTable({
  rows,
  activeTab,
  colleges = [],
  isDeleteMode = false,
  selectedIds,
  isAllSelected = false,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onBulkDelete,
  onUpdateRow,
  onDeleteRow,
}: Props) {
  const [editingRow, setEditingRow] = useState<DailyLeadRow | null>(null);

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
          <p className="text-xs text-fg-subtle max-w-sm leading-relaxed">
            No opportunities recorded for the selected date. Click <span className="text-indigo-600 dark:text-indigo-400 font-bold">Sync Positives</span> in the header to pull pipeline companies for this date, or <span className="text-primary font-semibold font-mono">+ Add Entry</span>.
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
              <th className="py-3 px-3 min-w-[120px]">College</th>
              <th className="py-3 px-3 min-w-[220px] text-left">Company Name</th>
              <th className="py-3 px-3 min-w-[170px]">Role</th>
              <th className="py-3 px-3 min-w-[110px]">CTC</th>
              <th className="py-3 px-3 min-w-[110px]">Eligible Batch</th>
              <th className="py-3 px-3 w-10 text-center"></th>
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
                  colleges={colleges}
                  isDeleteMode={isDeleteMode}
                  isSelected={isSelected}
                  onToggleSelect={() => onToggleSelect(row._id)}
                  onUpdateRow={onUpdateRow}
                  onEdit={() => setEditingRow(row)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Edit Lead Modal ──────────────────────────────────────────────── */}
      {editingRow && (
        <EditLeadModal
          lead={editingRow}
          colleges={colleges}
          onClose={() => setEditingRow(null)}
          onSave={onUpdateRow}
          onDelete={onDeleteRow}
        />
      )}
    </div>
  );
}

function TableRow({
  row,
  index,
  colleges,
  isDeleteMode,
  isSelected,
  onToggleSelect,
  onUpdateRow,
  onEdit,
}: {
  row: DailyLeadRow;
  index: number;
  colleges: CollegeOption[];
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  onEdit: () => void;
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

  const currentCollegeId =
    typeof row.college_id === 'object' && row.college_id?._id
      ? row.college_id._id
      : (row.college_id as unknown as string) || '';

  return (
    <tr
      className={`group transition-colors ${
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
            className="cursor-pointer hover:text-primary transition-colors font-medium"
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
            className="cursor-pointer hover:text-primary transition-colors font-medium"
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

      {/* College Dropdown Column: Shows ONLY Acronym when closed, Acronym + Name when open */}
      <td className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">
        <InlineCollegeSelector
          value={currentCollegeId}
          colleges={colleges}
          onChange={(newCollegeId) => {
            onUpdateRow(row._id, { college_id: newCollegeId as any });
          }}
          disabled={isDeleteMode}
        />
      </td>

      {/* Company Name */}
      <td className="py-3 px-3 font-bold text-fg min-w-[220px] break-words leading-snug">
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
      <td className="py-3 px-3 text-fg-muted whitespace-pre-wrap leading-tight min-w-[170px]">
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
      <td className="py-3 px-3 whitespace-nowrap font-mono text-micro font-bold text-emerald-600 dark:text-emerald-400 min-w-[110px]">
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
      <td className="py-3 px-3 text-fg-muted whitespace-nowrap min-w-[110px]">
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

      {/* Row Edit Pen Icon (Revealed on hover) */}
      <td className="py-2.5 px-3 text-center whitespace-nowrap w-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          disabled={isDeleteMode}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg bg-surface-sunken hover:bg-primary/10 text-fg-subtle hover:text-primary border border-border/60 hover:border-primary/30 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-0"
          title="Edit lead details"
        >
          <Pencil size={13} strokeWidth={2.2} />
        </button>
      </td>
    </tr>
  );
}
