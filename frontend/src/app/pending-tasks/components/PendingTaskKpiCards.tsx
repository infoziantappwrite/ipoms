'use client';

import { ListTodo, CheckCircle2, Clock, CalendarDays } from 'lucide-react';
import type { PendingTaskKpiData } from '../types';

interface Props {
  kpi: PendingTaskKpiData | null;
  loading: boolean;
}

export function PendingTaskKpiCards({ kpi, loading }: Props) {
  const data: PendingTaskKpiData = kpi || {
    total_tasks: 0,
    db_shared_count: 0,
    db_pending_count: 0,
    drives_scheduled_count: 0,
    actions_pending_count: 0,
  };

  const dbSharedPercentage =
    data.total_tasks > 0 ? Math.round((data.db_shared_count / data.total_tasks) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-2.5">
      {/* ── 1. Total Tasks ── */}
      <div className="bg-surface border border-border rounded-xl px-3.5 py-2 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ListTodo size={14} />
          </div>
          <span className="text-[11px] font-bold text-fg-muted truncate uppercase tracking-wider">
            Total Tasks
          </span>
        </div>
        <span className="text-xs font-black font-mono text-fg bg-surface-sunken border border-border px-2.5 py-0.5 rounded-lg ml-2 shrink-0 shadow-2xs">
          {loading ? '...' : data.total_tasks}
        </span>
      </div>

      {/* ── 2. DB Shared ── */}
      <div className="bg-surface border border-emerald-500/30 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={14} />
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 truncate uppercase tracking-wider">
            DB Shared
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <span className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg shadow-2xs">
            {loading ? '...' : data.db_shared_count}
          </span>
          {data.total_tasks > 0 && (
            <span className="text-[10px] text-emerald-800 dark:text-emerald-200 font-bold bg-emerald-500/25 border border-emerald-500/40 px-1.5 py-0.5 rounded-md">
              {dbSharedPercentage}%
            </span>
          )}
        </div>
      </div>

      {/* ── 3. DB Pending ── */}
      <div className="bg-surface border border-amber-500/30 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={14} />
          </div>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate uppercase tracking-wider">
            DB Pending
          </span>
        </div>
        <span className="text-xs font-black font-mono text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg ml-2 shrink-0 shadow-2xs">
          {loading ? '...' : data.db_pending_count}
        </span>
      </div>

      {/* ── 4. Drives Scheduled ── */}
      <div className="bg-surface border border-sky-500/30 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <CalendarDays size={14} />
          </div>
          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 truncate uppercase tracking-wider">
            Drives Scheduled
          </span>
        </div>
        <span className="text-xs font-black font-mono text-sky-700 dark:text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-lg ml-2 shrink-0 shadow-2xs">
          {loading ? '...' : data.drives_scheduled_count}
        </span>
      </div>
    </div>
  );
}
