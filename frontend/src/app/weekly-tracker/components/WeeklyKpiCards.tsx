'use client';

import { Clock, Trophy, Rocket, Inbox, Star, XCircle, Calendar } from 'lucide-react';

export interface WeeklyKpiData {
  pipeline: number;
  in_drive?: number;
  in_progress: number;
  completed: number;
  total_offers: number;
  top_companies: number;
  follow_ups_due_today: number;
  rejected: number;
}

interface Props {
  kpi: WeeklyKpiData;
  activeSectionFilter: string;
  onFilterSection: (sectionKey: string) => void;
}

export function WeeklyKpiCards({ kpi, activeSectionFilter, onFilterSection }: Props) {
  const cards = [
    {
      key: 'completed',
      label: 'Completed',
      value: kpi.completed,
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/60',
      borderCol: 'border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-300',
      activeBorder: 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/80 ring-2 ring-emerald-400/30',
      Icon: Trophy,
    },
    {
      key: 'in_drive',
      label: 'In Drive',
      value: kpi.in_drive ?? 0,
      textColor: 'text-indigo-700 dark:text-indigo-400',
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/60',
      borderCol: 'border-indigo-200/80 dark:border-indigo-900/50 hover:border-indigo-300',
      activeBorder: 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/80 ring-2 ring-indigo-400/30',
      Icon: Calendar,
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      value: kpi.in_progress,
      textColor: 'text-blue-700 dark:text-blue-400',
      bgLight: 'bg-blue-50 dark:bg-blue-950/60',
      borderCol: 'border-blue-200/80 dark:border-blue-900/50 hover:border-blue-300',
      activeBorder: 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/80 ring-2 ring-blue-400/30',
      Icon: Rocket,
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      value: kpi.pipeline,
      textColor: 'text-cyan-700 dark:text-cyan-400',
      bgLight: 'bg-cyan-50 dark:bg-cyan-950/60',
      borderCol: 'border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-300',
      activeBorder: 'border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/80 ring-2 ring-cyan-400/30',
      Icon: Inbox,
    },
    {
      key: 'top_companies',
      label: 'Top Companies',
      value: kpi.top_companies,
      textColor: 'text-purple-700 dark:text-purple-400',
      bgLight: 'bg-purple-50 dark:bg-purple-950/60',
      borderCol: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-300',
      activeBorder: 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/80 ring-2 ring-purple-400/30',
      Icon: Star,
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: kpi.rejected,
      textColor: 'text-fg-subtle',
      bgLight: 'bg-surface-sunken',
      borderCol: 'border-border hover:border-border-strong',
      activeBorder: 'border-slate-500 bg-surface-raised ring-2 ring-slate-400/30',
      Icon: XCircle,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
      {cards.map((c) => {
        const isActive = activeSectionFilter === c.key;
        const IconComponent = c.Icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilterSection(isActive ? 'all' : c.key)}
            className={`bg-surface rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 border transition-all duration-200 cursor-pointer shadow-2xs ${
              isActive ? c.activeBorder : `${c.borderCol} hover:bg-surface-sunken/60`
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-5 h-5 rounded-md ${c.bgLight} flex items-center justify-center shrink-0`}>
                <IconComponent size={12} strokeWidth={2.5} className={c.textColor} aria-hidden />
              </div>
              <span className="text-micro font-semibold text-fg-muted truncate">
                {c.label}
              </span>
            </div>
            <span className={`text-xs font-bold font-mono tabular-nums ${c.textColor} shrink-0`}>
              {c.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}
