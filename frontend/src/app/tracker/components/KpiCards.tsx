'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, PhoneOff, Repeat, Target, type LucideIcon } from 'lucide-react';

// ── Types
interface KpiData {
  total_loaded: number;
  completed: number;
  pending: number;
  positive: number;
  no_response: number;
  follow_up: number;
  skipped?: number;
}

interface Props {
  kpi: KpiData;
}

// ── Individual Compact KPI Card (Slim Profile)
function KpiCard({
  label, value, textColor, bgLight, borderCol, Icon,
}: {
  label: string;
  value: number;
  textColor: string;
  bgLight: string;
  borderCol: string;
  Icon: LucideIcon;
}) {
  const prevRef = useRef(value);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (value !== prevRef.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div
      className={`flex-1 min-w-0 bg-surface border ${borderCol} rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs transition-all duration-200 ${
        bump ? 'scale-102 ring-2 ring-primary/20' : 'scale-100'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={`w-5 h-5 rounded-md ${bgLight} flex items-center justify-center shrink-0`}>
          <Icon size={12} strokeWidth={2.5} className={textColor} aria-hidden />
        </div>
        <span className="text-micro font-semibold text-fg-muted truncate">
          {label}
        </span>
      </div>
      <span className={`text-xs font-bold font-mono tabular-nums ${textColor} shrink-0`}>
        {value}
      </span>
    </div>
  );
}

// ── KpiCards Component (Single Row Compact)
export function KpiCards({ kpi }: Props) {
  const cards = [
    {
      label: 'Completed',
      value: kpi.completed,
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/60',
      borderCol: 'border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-300',
      Icon: CheckCircle2,
    },
    {
      label: 'Pending',
      value: kpi.pending,
      textColor: 'text-amber-700 dark:text-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/60',
      borderCol: 'border-amber-200/80 dark:border-amber-900/50 hover:border-amber-300',
      Icon: Clock,
    },
    {
      label: 'Positive',
      value: kpi.positive,
      textColor: 'text-blue-700 dark:text-blue-400',
      bgLight: 'bg-blue-50 dark:bg-blue-950/60',
      borderCol: 'border-blue-200/80 dark:border-blue-900/50 hover:border-blue-300',
      Icon: Target,
    },
    {
      label: 'No Response',
      value: kpi.no_response,
      textColor: 'text-rose-700 dark:text-rose-400',
      bgLight: 'bg-rose-50 dark:bg-rose-950/60',
      borderCol: 'border-rose-200/80 dark:border-rose-900/50 hover:border-rose-300',
      Icon: PhoneOff,
    },
    {
      label: 'Follow Up',
      value: kpi.follow_up,
      textColor: 'text-indigo-700 dark:text-indigo-400',
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/60',
      borderCol: 'border-indigo-200/80 dark:border-indigo-900/50 hover:border-indigo-300',
      Icon: Repeat,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
