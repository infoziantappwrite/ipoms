'use client';

import { useState } from 'react';
import { FolderOpen, Star, Pencil } from 'lucide-react';

export interface WeeklyRow {
  _id: string;
  company_name: string;
  job_role: string;
  cdc_reference?: string;
  company_type?: string;
  ctc_lpa?: string;
  eligible_batch?: string;
  pipeline_section: string;
  is_pinned_top: boolean;
  current_status_text: string;
  follow_up_date?: string;
  drive_date?: string;
  registered_count?: number;
  shortlisted_count?: number;
  selected_count?: number;
  last_status_updated_at?: string;
}

interface Props {
  rows: WeeklyRow[];
  sectionKey: string;
  isDeleteMode?: boolean;
  selectedRowIds?: string[];
  onToggleSelectRow?: (rowId: string) => void;
  onToggleSelectAll?: () => void;
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
  onEditRow?: (row: WeeklyRow) => void;
}

export function WeeklyTable({
  rows,
  sectionKey,
  isDeleteMode = false,
  selectedRowIds = [],
  onToggleSelectRow,
  onToggleSelectAll,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
  onEditRow,
}: Props) {
  const isCompletedSection = sectionKey === 'completed';
  const hasFollowUpColumn = sectionKey === 'in_progress' || sectionKey === 'pipeline';

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-surface-sunken border border-border flex items-center justify-center text-fg-subtle">
          <FolderOpen size={18} strokeWidth={1.75} />
        </div>
        <p className="text-xs text-fg-subtle font-medium">No companies in this section</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-surface">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border uppercase tracking-wider text-micro select-none">
            {isDeleteMode && (
              <th className="py-2.5 px-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedRowIds.length === rows.length && rows.length > 0}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-border text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                  title="Select All"
                />
              </th>
            )}
            <th className="py-2.5 px-3 w-12 text-center">S.No</th>
            <th className="py-2.5 px-3 min-w-[200px] text-left">Company Name</th>
            <th className="py-2.5 px-3 min-w-[180px]">Role</th>
            <th className="py-2.5 px-3 min-w-[100px]">CTC</th>
            <th className="py-2.5 px-3 min-w-[240px]">Status</th>
            {hasFollowUpColumn && (
              <th className="py-2.5 px-3 min-w-[140px] text-center">Follow Up</th>
            )}
            {isCompletedSection && (
              <th className="py-2.5 px-3 min-w-[120px] text-center">Offers Received</th>
            )}
            <th className="py-2.5 px-2 w-12 text-center">Edit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 font-normal bg-surface">
          {rows.map((row, idx) => (
            <TableRow
              key={row._id}
              row={row}
              index={idx + 1}
              isCompletedSection={isCompletedSection}
              hasFollowUpColumn={hasFollowUpColumn}
              isDeleteMode={isDeleteMode}
              isSelected={selectedRowIds.includes(row._id)}
              onToggleSelect={() => onToggleSelectRow && onToggleSelectRow(row._id)}
              onUpdateRow={onUpdateRow}
              onMoveSection={onMoveSection}
              onTogglePin={onTogglePin}
              onDeleteRow={onDeleteRow}
              onEditRow={onEditRow}
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
  isCompletedSection,
  hasFollowUpColumn,
  isDeleteMode,
  isSelected,
  onToggleSelect,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
  onEditRow,
}: {
  row: WeeklyRow;
  index: number;
  isCompletedSection: boolean;
  hasFollowUpColumn: boolean;
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdateRow: (id: string, updates: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (id: string, targetSection: string) => Promise<void>;
  onTogglePin: (id: string) => Promise<void>;
  onDeleteRow: (id: string) => Promise<void>;
  onEditRow?: (row: WeeklyRow) => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  const startEdit = (field: string, val: any) => {
    setEditingField(field);
    setTempValue(val);
  };

  const commitEdit = (field: string) => {
    if (editingField === field) {
      onUpdateRow(row._id, { [field]: tempValue });
      setEditingField(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') commitEdit(field);
    if (e.key === 'Escape') setEditingField(null);
  };

  return (
    <tr
      className={`hover:bg-surface-sunken/60 transition-colors ${
        isSelected ? 'bg-rose-50/70 dark:bg-rose-950/40' : row.is_pinned_top ? 'bg-primary/10 font-medium' : ''
      }`}
    >
      {/* Checkbox in delete mode */}
      {isDeleteMode && (
        <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-border text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
          />
        </td>
      )}

      {/* 1. S.No */}
      <td className="py-2.5 px-3 text-center text-fg-subtle font-mono text-micro font-medium">
        {index}
      </td>

      {/* 2. Company Name */}
      <td className="py-2.5 px-3 font-semibold text-fg">
        <div className="flex items-center gap-1.5">
          {row.is_pinned_top && (
            <Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />
          )}
          {editingField === 'company_name' ? (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => commitEdit('company_name')}
              onKeyDown={(e) => handleKeyDown(e, 'company_name')}
              autoFocus
              className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs"
            />
          ) : (
            <span
              onClick={() => startEdit('company_name', row.company_name)}
              className="cursor-pointer hover:text-primary transition-colors font-bold"
            >
              {row.company_name}
            </span>
          )}
        </div>
      </td>

      {/* 3. Role */}
      <td className="py-2.5 px-3 text-fg-muted">
        {editingField === 'job_role' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('job_role')}
            onKeyDown={(e) => handleKeyDown(e, 'job_role')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs"
          />
        ) : (
          <div
            onClick={() => startEdit('job_role', row.job_role)}
            className="cursor-pointer hover:text-primary transition-colors flex flex-wrap gap-1"
          >
            {row.job_role.split(',').map((r, i) => (
              <span
                key={i}
                className="bg-surface-sunken border border-border text-fg-muted px-1.5 py-0.5 rounded text-micro"
              >
                {r.trim()}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* 4. CTC */}
      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
        {editingField === 'ctc_lpa' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('ctc_lpa')}
            onKeyDown={(e) => handleKeyDown(e, 'ctc_lpa')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs"
          />
        ) : (
          <span
            onClick={() => startEdit('ctc_lpa', row.ctc_lpa)}
            className="cursor-pointer hover:text-primary transition-colors"
          >
            {row.ctc_lpa || <span className="text-fg-disabled italic">—</span>}
          </span>
        )}
      </td>

      {/* 5. Status */}
      <td className="py-2.5 px-3 text-fg-muted">
        {editingField === 'current_status_text' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('current_status_text')}
            onKeyDown={(e) => handleKeyDown(e, 'current_status_text')}
            autoFocus
            className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg w-full outline-none shadow-xs"
          />
        ) : (
          <span
            onClick={() => startEdit('current_status_text', row.current_status_text)}
            className="cursor-pointer hover:text-primary transition-colors break-words leading-relaxed whitespace-pre-wrap max-w-[320px] inline-block"
            title={row.current_status_text}
          >
            {row.current_status_text || <span className="text-fg-disabled italic">—</span>}
          </span>
        )}
      </td>

      {/* Follow Up Date Picker (Supported only for In Progress and Pipeline) */}
      {hasFollowUpColumn && (
        <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex items-center justify-center">
            <input
              type="date"
              value={(() => {
                if (!row.follow_up_date) return '';
                try {
                  return new Date(row.follow_up_date).toISOString().split('T')[0];
                } catch {
                  return '';
                }
              })()}
              onChange={(e) => {
                onUpdateRow(row._id, { follow_up_date: e.target.value || undefined });
              }}
              className="bg-surface-sunken hover:bg-surface border border-border hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-2.5 py-1 text-xs text-fg font-medium shadow-2xs outline-none cursor-pointer transition-all font-mono"
              title="Select date to follow up / call back HR"
            />
          </div>
        </td>
      )}

      {/* 6. Offers Received (Completed Section Only) */}
      {isCompletedSection && (
        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
          {editingField === 'selected_count' ? (
            <input
              type="number"
              min="0"
              value={tempValue}
              onChange={(e) => setTempValue(Number(e.target.value))}
              onBlur={() => commitEdit('selected_count')}
              onKeyDown={(e) => handleKeyDown(e, 'selected_count')}
              autoFocus
              className="bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-fg text-center w-16 outline-none shadow-xs"
            />
          ) : (
            <span
              onClick={() => startEdit('selected_count', row.selected_count || 0)}
              className="cursor-pointer hover:underline inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
            >
              {row.selected_count ?? 0}
            </span>
          )}
        </td>
      )}

      {/* 7. Action: Edit Pen Icon */}
      <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onEditRow?.(row)}
          title={`Edit ${row.company_name} (Role, CTC, Company spelling, Status)`}
          className="p-1.5 rounded-lg text-fg-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all cursor-pointer inline-flex items-center justify-center"
        >
          <Pencil size={13} strokeWidth={2.25} />
        </button>
      </td>
    </tr>
  );
}
