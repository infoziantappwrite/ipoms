'use client';

import { useEffect, useRef, useState } from 'react';

// ── Types
interface KpiData {
  total_loaded: number;
  completed: number;
  pending: number;
  positive: number;
  no_response: number;
  follow_up: number;
  skipped: number;
}

interface Props {
  kpi: KpiData;
}

// ── Individual KPI Card
function KpiCard({
  label, value, color, icon, ring,
}: {
  label: string; value: number; color: string; icon: string; ring: string;
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
      className={`glass-card rounded-xl p-4 flex flex-col gap-1 border ${ring}
                  transition-all duration-300 ${bump ? 'scale-105' : 'scale-100'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        <span className={`text-2xl font-bold ${color} tabular-nums`}>{value}</span>
      </div>
      <p className="text-xs text-fg-subtle font-medium mt-1">{label}</p>
    </div>
  );
}

// ── KpiCards Component
export function KpiCards({ kpi }: Props) {
  const cards = [
    {
      label: 'Completed',
      value: kpi.completed,
      color: 'text-success',
      ring: 'border-success/20 hover:border-success/40',
      icon: '✅',
    },
    {
      label: 'Pending',
      value: kpi.pending,
      color: 'text-warning',
      ring: 'border-warning/20 hover:border-warning/40',
      icon: '⏳',
    },
    {
      label: 'Positive',
      value: kpi.positive,
      color: 'text-primary',
      ring: 'border-primary/20 hover:border-primary/40',
      icon: '🎯',
    },
    {
      label: 'No Response',
      value: kpi.no_response,
      color: 'text-destructive',
      ring: 'border-destructive/20 hover:border-destructive/40',
      icon: '📵',
    },
    {
      label: 'Follow Up',
      value: kpi.follow_up,
      color: 'text-warning',
      ring: 'border-warning/20 hover:border-warning/40',
      icon: '🔁',
    },
    {
      label: 'Skipped',
      value: kpi.skipped,
      color: 'text-fg-subtle',
      ring: 'border-border-strong/30 hover:border-border-strong/40',
      icon: '⏭️',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
