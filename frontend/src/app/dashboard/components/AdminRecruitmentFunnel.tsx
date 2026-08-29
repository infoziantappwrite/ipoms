'use client';

import { TrendingUp, ArrowRight, CheckCircle2, PhoneCall, Briefcase, Award, Users, Target } from 'lucide-react';

interface FunnelStage {
  stage: string;
  count: number;
  pct: number;
  color?: string;
}

interface Props {
  stages: FunnelStage[];
  totalCalls: number;
  positiveCalls: number;
  jdsInHand: number;
  drivesConducted: number;
  totalOffers: number;
}

export function AdminRecruitmentFunnel({
  stages,
  totalCalls,
  positiveCalls,
  jdsInHand,
  drivesConducted,
  totalOffers,
}: Props) {
  // Conversion metrics
  const callToPositivePct = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 0;
  const positiveToJdPct = positiveCalls > 0 ? Math.round((jdsInHand / positiveCalls) * 100) : 0;
  const jdToDrivePct = jdsInHand > 0 ? Math.round((drivesConducted / jdsInHand) * 100) : 0;
  const avgOffersPerDrive = drivesConducted > 0 ? (totalOffers / drivesConducted).toFixed(1) : '0';

  const stageIcons = [
    Users,
    PhoneCall,
    Target,
    Briefcase,
    CheckCircle2,
    Award,
  ];

  const stageColors = [
    { bg: 'bg-blue-500/10', text: 'text-primary', border: 'border-blue-500/30', fill: 'bg-blue-500' },
    { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', fill: 'bg-indigo-500' },
    { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', fill: 'bg-cyan-500' },
    { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', fill: 'bg-amber-500' },
    { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', fill: 'bg-purple-500' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', fill: 'bg-emerald-500' },
  ];

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 space-y-5 shadow-3">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" aria-hidden /> Institutional Recruitment Conversion Funnel
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Stage-by-stage progression from cold corporate outreach to verified campus offer letters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-semibold bg-primary/10 text-primary border border-primary/20">
            Season Conversion Velocity: <strong className="font-mono">{callToPositivePct}%</strong>
          </span>
        </div>
      </div>

      {/* ── 6-Stage Visual Stepper ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(stages || []).map((s, idx) => {
          const Icon = stageIcons[idx % stageIcons.length] || Target;
          const col = stageColors[idx % stageColors.length];

          return (
            <div
              key={s.stage}
              className={`rounded-xl p-3.5 border ${col.border} ${col.bg} flex flex-col justify-between space-y-2 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
                  Stage 0{idx + 1}
                </span>
                <span className={`p-1.5 rounded-lg bg-surface/80 shadow-xs ${col.text}`}>
                  <Icon size={14} strokeWidth={2.2} />
                </span>
              </div>

              <div>
                <p className="text-xl font-bold text-fg tabular-nums tracking-tight">
                  {s.count.toLocaleString('en-IN')}
                </p>
                <p className="text-micro font-medium text-fg-subtle truncate mt-0.5" title={s.stage}>
                  {s.stage}
                </p>
              </div>

              {/* Progress bar representing stage conversion efficiency */}
              <div className="w-full bg-surface-sunken rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${col.fill} transition-all duration-700`}
                  style={{ width: `${Math.max(8, s.pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Funnel Drop-off Efficiency Badges ── */}
      <div className="p-3.5 bg-surface-sunken/60 rounded-xl border border-border/80 flex items-center justify-between flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-micro font-bold uppercase tracking-wider text-fg-subtle">Yield Ratios:</span>
        </div>

        <div className="flex items-center gap-1 text-fg-muted font-medium">
          <span>Calls → Positives</span>
          <ArrowRight size={12} className="text-fg-subtle" />
          <span className="font-bold text-primary font-mono">{callToPositivePct}%</span>
        </div>

        <div className="flex items-center gap-1 text-fg-muted font-medium">
          <span>Positives → JDs</span>
          <ArrowRight size={12} className="text-fg-subtle" />
          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{positiveToJdPct}%</span>
        </div>

        <div className="flex items-center gap-1 text-fg-muted font-medium">
          <span>JDs → Drives</span>
          <ArrowRight size={12} className="text-fg-subtle" />
          <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{jdToDrivePct}%</span>
        </div>

        <div className="flex items-center gap-1 text-fg-muted font-medium">
          <span>Avg Offers / Drive</span>
          <ArrowRight size={12} className="text-fg-subtle" />
          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{avgOffersPerDrive} students</span>
        </div>
      </div>
    </div>
  );
}
