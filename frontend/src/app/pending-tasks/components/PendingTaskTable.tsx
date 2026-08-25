'use client';

import { useState } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  ExternalLink,
} from 'lucide-react';
import type { PendingTaskRow } from '../types';

interface Props {
  tasks: PendingTaskRow[];
  selectedIds: string[];
  isSelectionMode?: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (task: PendingTaskRow) => void;
  onDelete: (task: PendingTaskRow) => void;
  onOpenAddModal: () => void;
  loading: boolean;
  collegeName: string;
}

export function PendingTaskTable({
  tasks,
  selectedIds,
  isSelectionMode = false,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onOpenAddModal,
  loading,
  collegeName,
}: Props) {
  const isAllSelected = tasks.length > 1 && selectedIds.length === tasks.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < tasks.length;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="px-6 pb-6">
        <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-2xs">
          <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-fg-subtle">Loading pending tasks...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-6 pb-6">
        <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-surface-sunken border border-border flex items-center justify-center text-fg-subtle mx-auto mb-3">
            <Building2 size={24} />
          </div>
          <h3 className="text-base font-bold text-fg mb-1">No Pending Tasks</h3>
          <p className="text-xs text-fg-subtle max-w-sm mx-auto mb-4">
            There are no active placement pending tasks logged for {collegeName}.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add First Task</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* ── Table Header ────────────────────────────────────────── */}
            <thead>
              <tr className="bg-surface-sunken border-b border-border text-[11px] font-bold text-fg-muted uppercase tracking-wider select-none">
                {/* Select All Checkbox (Visible only in selection mode) */}
                {isSelectionMode && (
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      title={selectedIds.length === tasks.length ? 'Deselect all rows' : 'Select all rows'}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                    />
                  </th>
                )}

                {/* S.No */}
                <th className="w-14 px-3 py-3 text-center">
                  S.No
                </th>

                {/* Company Name */}
                <th className="px-4 py-3 min-w-[180px]">
                  Company Name
                </th>

                {/* JD Received Date */}
                <th className="px-4 py-3 min-w-[130px]">
                  JD Received Date
                </th>

                {/* DB Shared Date */}
                <th className="px-4 py-3 min-w-[130px]">
                  DB Shared Date
                </th>

                {/* Current Status */}
                <th className="px-4 py-3 min-w-[150px]">
                  Current Status
                </th>

                {/* Remarks / Next Action */}
                <th className="px-4 py-3 min-w-[240px]">
                  Remarks / Next Action
                </th>

                {/* Drive Date */}
                <th className="px-4 py-3 min-w-[120px]">
                  Drive Date
                </th>

                {/* Actions */}
                <th className="w-16 px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            {/* ── Table Body ────────────────────────────────────────── */}
            <tbody className="divide-y divide-border/60 text-xs bg-surface">
              {tasks.map((task, idx) => {
                const isSelected = selectedIds.includes(task._id);

                return (
                  <tr
                    key={task._id}
                    className={`transition-colors hover:bg-surface-sunken/70 ${
                      isSelected ? 'bg-primary/10' : idx % 2 === 0 ? 'bg-surface' : 'bg-surface-sunken/30'
                    }`}
                  >
                    {/* Checkbox (Visible only in selection mode) */}
                    {isSelectionMode && (
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(task._id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                        />
                      </td>
                    )}

                    {/* S.No */}
                    <td className="px-3 py-3 text-center font-mono font-semibold text-fg-subtle text-xs">
                      {task.serial_no || idx + 1}
                    </td>

                    {/* Company Name */}
                    <td className="px-4 py-3">
                      <span className="font-bold text-fg">
                        {task.company_name}
                      </span>
                    </td>

                    {/* JD Received Date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-fg-muted font-medium">
                        <Calendar size={13} className="text-fg-subtle shrink-0" />
                        <span className="font-mono text-[11px] text-fg-muted">
                          {formatDate(task.jd_received_date)}
                        </span>
                      </div>
                    </td>

                    {/* DB Shared Date */}
                    <td className="px-4 py-3">
                      {task.db_shared_date ? (
                        <div className="flex items-center gap-1.5 text-fg-muted font-medium">
                          <Calendar size={13} className="text-emerald-500 shrink-0" />
                          <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatDate(task.db_shared_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-fg-disabled text-xs font-mono">—</span>
                      )}
                    </td>

                    {/* Current Status */}
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-sunken text-fg-muted border border-border">
                        {task.current_status || 'JD Received'}
                      </span>
                    </td>

                    {/* Remarks / Next Action */}
                    <td className="px-4 py-3">
                      <div className="bg-blue-500/10 dark:bg-sky-950/60 border border-blue-500/20 dark:border-sky-500/40 text-blue-700 dark:text-sky-300 px-2.5 py-1 rounded-lg text-xs font-bold max-w-[280px]">
                        {task.action_to_be_taken}
                      </div>
                      {task.remarks && (
                        <p className="text-[10px] text-fg-subtle mt-1 italic truncate max-w-[280px]">
                          Note: {task.remarks}
                        </p>
                      )}
                    </td>

                    {/* Drive Date */}
                    <td className="px-4 py-3">
                      {task.drive_date ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <Calendar size={12} className="text-sky-600 dark:text-sky-400" />
                          {formatDate(task.drive_date)}
                        </span>
                      ) : (
                        <span className="text-fg-disabled text-xs">—</span>
                      )}
                    </td>

                    {/* Actions Column (Only Pen / Edit icon) */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => onEdit(task)}
                          title="Edit Task"
                          className="w-7 h-7 rounded-lg text-fg-subtle hover:text-sky-400 hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer ────────────────────────────────────────── */}
        <div className="bg-surface-sunken border-t border-border px-6 py-3 flex items-center justify-between text-xs text-fg-subtle font-medium">
          <div>
            Showing <span className="font-bold text-fg">{tasks.length}</span> pending task(s)
          </div>
          {selectedIds.length > 0 && (
            <div className="text-primary font-semibold">
              {selectedIds.length} row(s) selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
