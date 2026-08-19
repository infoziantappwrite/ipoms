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
      color: 'text-warning',
      border: 'border-warning/30 hover:border-warning/60',
      activeBorder: 'border-warning bg-warning/20',
      icon: '⏰',
    },
    {
      key: 'completed',
      label: 'Companies Completed',
      value: kpi.completed,
      subValue: `${kpi.total_offers} Offers Placed`,
      color: 'text-success',
      border: 'border-success/30 hover:border-success/60',
      activeBorder: 'border-success bg-success/20',
      icon: '🏆',
    },
    {
      key: 'in_progress',
      label: 'Companies In Progress',
      value: kpi.in_progress,
      subValue: 'Active Drives',
      color: 'text-primary',
      border: 'border-primary/30 hover:border-primary/60',
      activeBorder: 'border-primary bg-primary/20',
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
      color: 'text-fg-subtle',
      border: 'border-border-strong hover:border-border-strong',
      activeBorder: 'border-border-strong bg-surface/40',
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
              <span className={`text-2xl font-bold ${c.color} tabular-nums`}>{c.value}</span>
            </div>
            <p className="text-xs font-semibold text-fg mt-2 truncate">{c.label}</p>
            <p className="text-micro text-fg-subtle font-medium mt-0.5">{c.subValue}</p>
          </button>
        );
      })}
    </div>
  );
}
