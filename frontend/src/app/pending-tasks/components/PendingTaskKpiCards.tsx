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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-2">
      {/* ── 1. Total Tasks ── */}
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <ListTodo size={14} className="text-indigo-600 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-600 truncate uppercase tracking-wider">
            Total Tasks
          </span>
        </div>
        <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded ml-2 shrink-0">
          {loading ? '...' : data.total_tasks}
        </span>
      </div>

      {/* ── 2. DB Shared ── */}
      <div className="bg-white border border-emerald-200/80 bg-emerald-50/20 rounded-lg px-3 py-1.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span className="text-[11px] font-semibold text-emerald-800 truncate uppercase tracking-wider">
            DB Shared
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
            {loading ? '...' : data.db_shared_count}
          </span>
          {data.total_tasks > 0 && (
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1 py-0.5 rounded">
              {dbSharedPercentage}%
            </span>
          )}
        </div>
      </div>

      {/* ── 3. DB Pending ── */}
      <div className="bg-white border border-amber-200/80 bg-amber-50/20 rounded-lg px-3 py-1.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock size={14} className="text-amber-600 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-800 truncate uppercase tracking-wider">
            DB Pending
          </span>
        </div>
        <span className="text-xs font-bold font-mono text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded ml-2 shrink-0">
          {loading ? '...' : data.db_pending_count}
        </span>
      </div>

      {/* ── 4. Drives Scheduled ── */}
      <div className="bg-white border border-sky-200/80 bg-sky-50/20 rounded-lg px-3 py-1.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarDays size={14} className="text-sky-600 shrink-0" />
          <span className="text-[11px] font-semibold text-sky-800 truncate uppercase tracking-wider">
            Drives Scheduled
          </span>
        </div>
        <span className="text-xs font-bold font-mono text-sky-700 bg-sky-100/60 px-2 py-0.5 rounded ml-2 shrink-0">
          {loading ? '...' : data.drives_scheduled_count}
        </span>
      </div>
    </div>
  );
}
