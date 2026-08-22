'use client';

import { Clock, Trophy, Rocket, Inbox, Star, XCircle } from 'lucide-react';

export interface WeeklyKpiData {
  pipeline: number;
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
      key: 'follow_ups_due_today',
      label: 'Follow-ups Due Today',
      value: kpi.follow_ups_due_today,
      subValue: 'Urgent Action',
      color: 'text-amber-700',
      border: 'border-amber-200 bg-amber-50/50 hover:border-amber-300',
      activeBorder: 'border-amber-500 bg-amber-50 ring-1 ring-amber-400',
      Icon: Clock,
      iconClass: 'text-amber-600',
    },
    {
      key: 'completed',
      label: 'Companies Completed',
      value: kpi.completed,
      subValue: `${kpi.total_offers} Offers Placed`,
      color: 'text-emerald-700',
      border: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300',
      activeBorder: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400',
      Icon: Trophy,
      iconClass: 'text-emerald-600',
    },
    {
      key: 'in_progress',
      label: 'Companies In Progress',
      value: kpi.in_progress,
      subValue: 'Active Drives',
      color: 'text-blue-700',
      border: 'border-blue-200 bg-blue-50/50 hover:border-blue-300',
      activeBorder: 'border-blue-500 bg-blue-50 ring-1 ring-blue-400',
      Icon: Rocket,
      iconClass: 'text-blue-600',
    },
    {
      key: 'pipeline',
      label: 'Companies in Pipeline',
      value: kpi.pipeline,
      subValue: 'Awaiting JD',
      color: 'text-cyan-700',
      border: 'border-cyan-200 bg-cyan-50/50 hover:border-cyan-300',
      activeBorder: 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-400',
      Icon: Inbox,
      iconClass: 'text-cyan-600',
    },
    {
      key: 'top_companies',
      label: 'Top Companies',
      value: kpi.top_companies,
      subValue: '≥ 3.5 LPA / Pinned',
      color: 'text-purple-700',
      border: 'border-purple-200 bg-purple-50/50 hover:border-purple-300',
      activeBorder: 'border-purple-500 bg-purple-50 ring-1 ring-purple-400',
      Icon: Star,
      iconClass: 'text-purple-600',
    },
    {
      key: 'rejected',
      label: 'Rejected Companies',
      value: kpi.rejected,
      subValue: 'HR / TPO Declines',
      color: 'text-slate-600',
      border: 'border-slate-200 bg-slate-50/50 hover:border-slate-300',
      activeBorder: 'border-slate-400 bg-slate-100 ring-1 ring-slate-400',
      Icon: XCircle,
      iconClass: 'text-slate-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const isActive = activeSectionFilter === c.key;
        const IconComponent = c.Icon;
        return (
          <button
            key={c.key}
            onClick={() => onFilterSection(isActive ? 'all' : c.key)}
            className={`rounded-xl p-3.5 flex flex-col text-left transition-all duration-200 border cursor-pointer shadow-xs
                        ${isActive ? c.activeBorder : c.border}`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center">
                <IconComponent size={16} strokeWidth={2} className={c.iconClass} />
              </div>
              <span className={`text-2xl font-bold ${c.color} tabular-nums`}>{c.value}</span>
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2 truncate">{c.label}</p>
            <p className="text-micro text-slate-500 font-medium mt-0.5">{c.subValue}</p>
          </button>
        );
      })}
    </div>
  );
}
