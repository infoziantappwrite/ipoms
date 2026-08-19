'use client';

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
      color: 'text-amber-400',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      activeBorder: 'border-amber-500 bg-amber-950/20',
      icon: '⏰',
    },
    {
      key: 'completed',
      label: 'Companies Completed',
      value: kpi.completed,
      subValue: `${kpi.total_offers} Offers Placed`,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      activeBorder: 'border-emerald-500 bg-emerald-950/20',
      icon: '🏆',
    },
    {
      key: 'in_progress',
      label: 'Companies In Progress',
      value: kpi.in_progress,
      subValue: 'Active Drives',
      color: 'text-blue-400',
      border: 'border-blue-500/30 hover:border-blue-500/60',
      activeBorder: 'border-blue-500 bg-blue-950/20',
      icon: '🚀',
    },
    {
      key: 'pipeline',
      label: 'Companies in Pipeline',
      value: kpi.pipeline,
      subValue: 'Awaiting JD',
      color: 'text-cyan-400',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      activeBorder: 'border-cyan-500 bg-cyan-950/20',
      icon: '📥',
    },
    {
      key: 'top_companies',
      label: 'Top Companies',
      value: kpi.top_companies,
      subValue: '≥ 3.5 LPA / Pinned',
      color: 'text-purple-400',
      border: 'border-purple-500/30 hover:border-purple-500/60',
      activeBorder: 'border-purple-500 bg-purple-950/20',
      icon: '⭐',
    },
    {
      key: 'rejected',
      label: 'Rejected Companies',
      value: kpi.rejected,
      subValue: 'HR / TPO Declines',
      color: 'text-slate-400',
      border: 'border-slate-700 hover:border-slate-500',
      activeBorder: 'border-slate-400 bg-slate-800/40',
      icon: '🚫',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const isActive = activeSectionFilter === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onFilterSection(isActive ? 'all' : c.key)}
            className={`glass-card rounded-xl p-3.5 flex flex-col text-left transition-all duration-200 border cursor-pointer
                        ${isActive ? c.activeBorder : c.border}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">{c.icon}</span>
              <span className={`text-2xl font-extrabold ${c.color} tabular-nums`}>{c.value}</span>
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-2 truncate">{c.label}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{c.subValue}</p>
          </button>
        );
      })}
    </div>
  );
}
