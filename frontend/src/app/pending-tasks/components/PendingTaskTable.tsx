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
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-2xs">
          <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading pending tasks...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-6 pb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Building2 size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No Pending Tasks</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            There are no active placement pending tasks logged for {collegeName}.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* ── Table Header ────────────────────────────────────────── */}
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                {/* Select All Checkbox */}
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    title={selectedIds.length === tasks.length ? 'Deselect all rows' : 'Select all rows'}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>

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

                {/* Action to be Taken */}
                <th className="px-4 py-3 min-w-[240px]">
                  Action to be Taken
                </th>

                {/* Drive Date */}
                <th className="px-4 py-3 min-w-[120px]">
                  Drive Date
                </th>

                {/* Actions */}
                <th className="w-20 px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            {/* ── Table Body ────────────────────────────────────────── */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {tasks.map((task, idx) => {
                const isSelected = selectedIds.includes(task._id);

                return (
                  <tr
                    key={task._id}
                    className={`transition-colors hover:bg-indigo-50/30 ${
                      isSelected ? 'bg-indigo-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(task._id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* S.No */}
                    <td className="px-3 py-3 text-center font-mono font-semibold text-slate-500 text-xs">
                      {task.serial_no || idx + 1}
                    </td>

                    {/* Company Name */}
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">
                        {task.company_name}
                      </span>
                    </td>

                    {/* JD Received Date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] text-slate-700">
                          {formatDate(task.jd_received_date)}
                        </span>
                      </div>
                    </td>

                    {/* DB Shared Date */}
                    <td className="px-4 py-3">
                      {task.db_shared_date ? (
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar size={13} className="text-emerald-500 shrink-0" />
                          <span className="font-mono text-[11px] text-slate-700 font-semibold">
                            {formatDate(task.db_shared_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">—</span>
                      )}
                    </td>

                    {/* Current Status */}
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {task.current_status || 'JD Received'}
                      </span>
                    </td>

                    {/* Action to be Taken */}
                    <td className="px-4 py-3">
                      <div className="bg-indigo-50/60 border border-indigo-100 text-indigo-900 px-2.5 py-1 rounded-lg text-xs font-semibold max-w-[280px]">
                        {task.action_to_be_taken}
                      </div>
                      {task.remarks && (
                        <p className="text-[10px] text-slate-400 mt-1 italic truncate max-w-[280px]">
                          Note: {task.remarks}
                        </p>
                      )}
                    </td>

                    {/* Drive Date */}
                    <td className="px-4 py-3">
                      {task.drive_date ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          <Calendar size={12} className="text-sky-600" />
                          {formatDate(task.drive_date)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(task)}
                          title="Edit Task"
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(task)}
                          title="Delete Task"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
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
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="font-bold text-slate-700">{tasks.length}</span> pending task(s)
          </div>
          {selectedIds.length > 0 && (
            <div className="text-indigo-700 font-semibold">
              {selectedIds.length} row(s) selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
