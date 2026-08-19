'use client';

import { useState, useCallback } from 'react';
import { RowActionMenu } from './RowActionMenu';

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
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

// Follow-up proximity badge calculation (Spec Section 13)
// Green: > 7 days away, Yellow: within next 3 days, Orange/Red: due today or overdue
function getFollowUpBadge(dateStr?: string) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (diffDays < 0) {
    return {
      text: `${formattedDate} (Overdue)`,
      badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
      dotClass: 'bg-red-400',
    };
  } else if (diffDays === 0) {
    return {
      text: `${formattedDate} (Today)`,
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      dotClass: 'bg-amber-400 animate-pulse',
    };
  } else if (diffDays <= 3) {
    return {
      text: `${formattedDate} (${diffDays}d)`,
      badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      dotClass: 'bg-yellow-400',
    };
  } else {
    return {
      text: formattedDate,
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      dotClass: 'bg-emerald-400',
    };
  }
}

export function WeeklyTable({
  rows,
  sectionKey,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
}: Props) {
  const isCompletedSection = sectionKey === 'completed';

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-600 italic">
        No companies in this section
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <th className="py-2.5 px-3 w-10 text-center">#</th>
            <th className="py-2.5 px-3 min-w-[170px]">Company Name</th>
            <th className="py-2.5 px-3 min-w-[200px]">Role(s)</th>
            <th className="py-2.5 px-3 min-w-[120px]">CDC Ref</th>
            <th className="py-2.5 px-3 min-w-[130px]">Type</th>
            <th className="py-2.5 px-3 min-w-[110px]">CTC</th>
            <th className="py-2.5 px-3 min-w-[140px]">Follow-Up</th>
            <th className="py-2.5 px-3 min-w-[240px]">Current Status & Notes</th>
            {isCompletedSection && (
              <th className="py-2.5 px-3 min-w-[90px] text-center">Offers</th>
            )}
            <th className="py-2.5 px-3 w-12 text-center"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-normal">
          {rows.map((row, idx) => (
            <TableRow
              key={row._id}
              row={row}
              index={idx + 1}
              isCompletedSection={isCompletedSection}
              onUpdateRow={onUpdateRow}
              onMoveSection={onMoveSection}
              onTogglePin={onTogglePin}
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
  isCompletedSection,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
}: {
  row: WeeklyRow;
  index: number;
  isCompletedSection: boolean;
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  const startEdit = (field: string, val: any) => {
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

  const followUpBadge = getFollowUpBadge(row.follow_up_date);

  return (
    <tr className="hover:bg-slate-800/30 transition-colors group">
      {/* S.No */}
      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{index}</td>

      {/* Company Name */}
      <td className="py-2.5 px-3 font-semibold text-slate-200">
        <div className="flex items-center gap-1.5">
          {row.is_pinned_top && (
            <span className="text-amber-400 text-xs" title="Pinned to Top Companies">★</span>
          )}
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
        </div>
      </td>

      {/* Role (Comma-separated multi-roles per Spec Section 6) */}
      <td className="py-2.5 px-3 text-slate-300">
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
          <div
            onClick={() => startEdit('job_role', row.job_role)}
            className="cursor-pointer hover:text-blue-400 transition-colors flex flex-wrap gap-1"
          >
            {row.job_role.split(',').map((r, i) => (
              <span
                key={i}
                className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[11px]"
              >
                {r.trim()}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* CDC Reference */}
      <td className="py-2.5 px-3 text-slate-400">
        {editingField === 'cdc_reference' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('cdc_reference')}
            onKeyDown={(e) => handleKeyDown(e, 'cdc_reference')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('cdc_reference', row.cdc_reference)}
            className="cursor-pointer hover:text-blue-400 transition-colors"
          >
            {row.cdc_reference || <span className="text-slate-600 italic">—</span>}
          </span>
        )}
      </td>

      {/* Company Type */}
      <td className="py-2.5 px-3 text-slate-400">
        {editingField === 'company_type' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('company_type')}
            onKeyDown={(e) => handleKeyDown(e, 'company_type')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('company_type', row.company_type)}
            className="cursor-pointer hover:text-blue-400 transition-colors text-slate-400"
          >
            {row.company_type || <span className="text-slate-600 italic">—</span>}
          </span>
        )}
      </td>

      {/* CTC */}
      <td className="py-2.5 px-3 text-emerald-400 font-medium">
        {editingField === 'ctc_lpa' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('ctc_lpa')}
            onKeyDown={(e) => handleKeyDown(e, 'ctc_lpa')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('ctc_lpa', row.ctc_lpa)}
            className="cursor-pointer hover:text-blue-400 transition-colors"
          >
            {row.ctc_lpa || <span className="text-slate-600 italic">—</span>}
          </span>
        )}
      </td>

      {/* Follow-Up Date & Badge */}
      <td className="py-2.5 px-3">
        {editingField === 'follow_up_date' ? (
          <input
            type="date"
            value={tempValue ? new Date(tempValue).toISOString().split('T')[0] : ''}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('follow_up_date')}
            onKeyDown={(e) => handleKeyDown(e, 'follow_up_date')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none"
          />
        ) : (
          <div
            onClick={() => startEdit('follow_up_date', row.follow_up_date)}
            className="cursor-pointer flex items-center gap-1.5"
          >
            {followUpBadge ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${followUpBadge.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${followUpBadge.dotClass}`} />
                {followUpBadge.text}
              </span>
            ) : (
              <span className="text-slate-600 italic text-[11px] hover:text-blue-400">+ Add Date</span>
            )}
          </div>
        )}
      </td>

      {/* Current Status Notes (Rich Natural Free-Text per Spec Section 5) */}
      <td className="py-2.5 px-3 text-slate-300">
        {editingField === 'current_status_text' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEdit('current_status_text')}
            onKeyDown={(e) => handleKeyDown(e, 'current_status_text')}
            autoFocus
            className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
          />
        ) : (
          <span
            onClick={() => startEdit('current_status_text', row.current_status_text)}
            className="cursor-pointer hover:text-blue-400 transition-colors line-clamp-2"
            title={row.current_status_text}
          >
            {row.current_status_text || <span className="text-slate-600 italic">—</span>}
          </span>
        )}
      </td>

      {/* Offers (Completed Section Only per Spec Section 5) */}
      {isCompletedSection && (
        <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
          {editingField === 'selected_count' ? (
            <input
              type="number"
              min="0"
              value={tempValue}
              onChange={(e) => setTempValue(Number(e.target.value))}
              onBlur={() => commitEdit('selected_count')}
              onKeyDown={(e) => handleKeyDown(e, 'selected_count')}
              autoFocus
              className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white text-center outline-none w-16"
            />
          ) : (
            <span
              onClick={() => startEdit('selected_count', row.selected_count || 0)}
              className="cursor-pointer hover:underline"
            >
              {row.selected_count ?? 0}
            </span>
          )}
        </td>
      )}

      {/* Actions */}
      <td className="py-2.5 px-3 text-center">
        <RowActionMenu
          isPinned={row.is_pinned_top}
          currentSection={row.pipeline_section}
          onMoveSection={(newSec) => onMoveSection(row._id, newSec)}
          onTogglePin={() => onTogglePin(row._id)}
          onDelete={() => onDeleteRow(row._id)}
        />
      </td>
    </tr>
  );
}
