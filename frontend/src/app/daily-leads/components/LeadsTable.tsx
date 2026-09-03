'use client';

import { useState } from 'react';
import { ArrowRightCircle, Sparkles, Trash2, Calendar, FileText, CheckCircle2, ChevronDown } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { InlineCollegeSelector } from './InlineCollegeSelector';
import { EditLeadModal } from './EditLeadModal';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';

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
  onMoveToJd?: (rowId: string) => Promise<void>;
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
  onMoveToJd,
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
            No opportunities recorded for the selected date. Click <span className="text-indigo-600 dark:text-indigo-400 font-bold">Sync</span> in the header to pull pipeline companies for this date, or <span className="text-primary font-semibold font-mono">+ Add</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* ── Bordered Table Container ─────────────────────────────────────────── */}
      <div className="overflow-x-auto bg-surface rounded-2xl border border-border shadow-2xs">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-surface-sunken/80 text-fg-muted font-bold border-b border-border uppercase tracking-wider text-micro select-none">
              {/* Checkbox Column (Only visible when isDeleteMode is active) */}
              {isDeleteMode && (
                <th className="py-3 px-3 w-10 text-center border-r border-border/80">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-border text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer align-middle accent-rose-600"
                    title="Select All Rows"
                  />
                </th>
              )}
              <th className="py-3 px-3 w-14 text-center font-bold border-r border-border/80">SI.NO</th>
              <th className="py-3 px-3 min-w-[100px] text-center border-r border-border/80">Time Stamp</th>
              <th className="py-3 px-3 min-w-[110px] text-center border-r border-border/80">Date</th>
              <th className="py-3 px-3 min-w-[120px] text-center border-r border-border/80">College</th>
              <th className="py-3 px-3 min-w-[220px] text-center border-r border-border/80">Company Name</th>
              <th className="py-3 px-3 min-w-[170px] text-center border-r border-border/80">Role</th>
              <th className="py-3 px-3 min-w-[110px] text-center border-r border-border/80">CTC</th>
              <th className={`py-3 px-3 min-w-[110px] text-center ${activeTab === 'positive' ? 'border-r border-border/80' : ''}`}>Eligible Batch</th>
              {activeTab === 'positive' && (
                <th className="py-3 px-2 w-28 text-center">Action</th>
              )}
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
                  activeTab={activeTab}
                  colleges={colleges}
                  isDeleteMode={isDeleteMode}
                  isSelected={isSelected}
                  onToggleSelect={() => onToggleSelect(row._id)}
                  onUpdateRow={onUpdateRow}
                  onEdit={() => setEditingRow(row)}
                  onMoveToJd={onMoveToJd}
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
  activeTab,
  colleges,
  isDeleteMode,
  isSelected,
  onToggleSelect,
  onUpdateRow,
  onEdit,
  onMoveToJd,
}: {
  row: DailyLeadRow;
  index: number;
  activeTab: 'positive' | 'jd_received';
  colleges: CollegeOption[];
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  onEdit: () => void;
  onMoveToJd?: (rowId: string) => Promise<void>;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  const startEdit = (field: string, val: string) => {
    if (isDeleteMode) return;
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

  const handleMoveAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMoveToJd || isMoving) return;
    setIsMoving(true);
    try {
      await onMoveToJd(row._id);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <tr
      className={`group transition-colors duration-150 border-b border-border/60 ${
        isSelected
          ? 'bg-rose-500/15 dark:bg-rose-950/40 hover:bg-rose-500/20 text-fg'
          : 'hover:bg-blue-50/50 dark:hover:bg-blue-950/30 focus-within:bg-blue-50/80 dark:focus-within:bg-blue-950/50 text-fg'
      }`}
    >
      {/* Row Selection Checkbox (Only when isDeleteMode is active) */}
      {isDeleteMode && (
        <td className="py-2.5 px-3 text-center border-r border-border/60">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-border text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer align-middle accent-rose-600"
          />
        </td>
      )}

      {/* Row Index */}
      <td className="py-2.5 px-3 text-center text-fg-subtle font-mono text-micro font-bold border-r border-border/60">
        {index}
      </td>

      {/* Time Stamp */}
      <td className="py-2.5 px-3 text-fg-subtle whitespace-nowrap font-mono text-micro text-center border-r border-border/60">
        {editingField === 'event_time' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('event_time')}
            onKeyDown={(e) => handleKeyDown(e, 'event_time')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-20 shadow-xs outline-none text-center mx-auto"
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
      <td className="py-2.5 px-3 text-fg-muted whitespace-nowrap font-mono text-micro text-center border-r border-border/60">
        {editingField === 'lead_date' ? (
          <input
            type="date"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('lead_date')}
            onKeyDown={(e) => handleKeyDown(e, 'lead_date')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg shadow-xs outline-none mx-auto"
          />
        ) : (
          <span
            onClick={() =>
              startEdit(
                'lead_date',
                row.lead_date ? new Date(row.lead_date).toISOString().split('T')[0] : ''
              )
            }
            className="cursor-pointer hover:text-primary transition-colors font-medium"
            title="Click to edit date"
          >
            {row.lead_date ? new Date(row.lead_date).toLocaleDateString('en-GB') : '—'}
          </span>
        )}
      </td>

      {/* College (Dropdown selector) */}
      <td className="py-2.5 px-3 whitespace-nowrap min-w-[130px] text-center border-r border-border/60">
        <InlineCollegeSelector
          value={currentCollegeId}
          currentCollegeId={currentCollegeId}
          collegeObj={typeof row.college_id === 'object' ? row.college_id : undefined}
          colleges={colleges}
          onChange={(collegeId) => onUpdateRow(row._id, { college_id: collegeId as any })}
          onSelect={(collegeId) => onUpdateRow(row._id, { college_id: collegeId as any })}
        />
      </td>

      {/* Company Name */}
      <td className="py-2.5 px-3 text-fg font-bold whitespace-nowrap min-w-[200px] text-center border-r border-border/60">
        {editingField === 'company_name' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('company_name')}
            onKeyDown={(e) => handleKeyDown(e, 'company_name')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full shadow-xs outline-none text-center"
          />
        ) : (
          <span
            onClick={() => startEdit('company_name', row.company_name)}
            className="cursor-pointer hover:text-primary transition-colors truncate block"
            title="Click to edit company name"
          >
            {row.company_name}
          </span>
        )}
      </td>

      {/* Role */}
      <td className="py-2.5 px-3 text-fg-subtle whitespace-nowrap min-w-[160px] text-center border-r border-border/60">
        {editingField === 'job_role' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('job_role')}
            onKeyDown={(e) => handleKeyDown(e, 'job_role')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full shadow-xs outline-none text-center"
          />
        ) : (
          <span
            onClick={() => startEdit('job_role', row.job_role)}
            className="cursor-pointer hover:text-primary transition-colors truncate block"
            title="Click to edit role"
          >
            {row.job_role || 'Graduate Trainee'}
          </span>
        )}
      </td>

      {/* CTC */}
      <td className="py-2.5 px-3 whitespace-nowrap min-w-[130px] text-center border-r border-border/60">
        {editingField === 'ctc' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('ctc')}
            onKeyDown={(e) => handleKeyDown(e, 'ctc')}
            autoFocus
            className="bg-surface border-2 border-primary rounded-lg px-2 py-1 text-xs font-bold text-fg w-full max-w-[160px] shadow-sm outline-none text-center mx-auto font-mono"
          />
        ) : (
          <div
            onClick={() => startEdit('ctc', row.ctc)}
            className="cursor-pointer flex flex-col items-center justify-center gap-1 py-0.5 hover:bg-surface-sunken/80 px-1 rounded-md transition-all group mx-auto"
            title="Click to edit CTC"
          >
            {row.ctc ? (
              row.ctc.includes(',') || row.ctc.includes('\n') ? (
                row.ctc
                  .split(/[,\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((seg, idx) => {
                    const lower = seg.toLowerCase();
                    const isIntern =
                      lower.includes('month') ||
                      lower.includes('intern') ||
                      lower.includes('/ mo') ||
                      lower.includes('pm') ||
                      lower.includes('stipend');

                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center justify-center text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border shadow-2xs whitespace-nowrap transition-transform group-hover:scale-102 ${
                          isIntern
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                        }`}
                      >
                        {seg}
                      </span>
                    );
                  })
              ) : (
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                  {row.ctc}
                </span>
              )
            ) : (
              <span className="text-fg-disabled italic font-normal text-xs">—</span>
            )}
          </div>
        )}
      </td>

      {/* Eligible Batch (Multi-select from 2025 onwards) */}
      <td className={`py-2.5 px-3 text-fg-muted whitespace-nowrap min-w-[110px] text-center ${activeTab === 'positive' ? 'border-r border-border/60' : ''}`}>
        <SmoothYearDropdown
          value={row.eligible_batch}
          onChange={(newYear) => onUpdateRow(row._id, { eligible_batch: newYear })}
          placeholder="Batch"
        />
      </td>

      {/* Action Column (Only needed for Positives tab to Move to JD; removed for JD Received since all cells are inline editable) */}
      {activeTab === 'positive' && (
        <td className="py-2.5 px-2 text-center whitespace-nowrap w-28">
          <button
            type="button"
            onClick={handleMoveAction}
            disabled={isDeleteMode || isMoving}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs hover:shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer mx-auto text-[11px] font-bold"
            title="Move this lead to JD Received tab"
            aria-label="Move to JD Received"
          >
            <ArrowRightCircle size={13} strokeWidth={2.4} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap">Move to JD</span>
          </button>
        </td>
      )}
    </tr>
  );
}
