'use client';

import { CheckCircle2, CircleDashed, CircleDot, PhoneOutgoing, type LucideIcon } from 'lucide-react';

interface Kpi {
  companies_completed?: number;
  companies_in_progress?: number;
  companies_pipeline?: number;
  companies_talked_today?: number;
}

interface Stage {
  key: string;
  label: string;
  hint: string;
  value: number;
  Icon: LucideIcon;
  /** Categorical module hue — carries identity, never good/bad. */
  tone: string;
  bar: string;
  tint: string;
}

/**
 * Company funnel — the coordinator's headline answer to "where does my
 * corporate outreach actually stand".
 *
 * Two different kinds of number live here and the layout says so. "Reached
 * today" is a daily activity count that resets every midnight; Pipeline /
 * In progress / Completed are durable funnel stages a company moves through.
 * Showing four identical tiles would imply the first is a stage like the other
 * three, so it sits apart, before the divider, and only the three real stages
 * carry proportional bars and flow arrows.
 */
export function CompanyFunnel({ kpi }: { kpi?: Kpi }) {
  const completed = kpi?.companies_completed ?? 0;
  const inProgress = kpi?.companies_in_progress ?? 0;
  const pipeline = kpi?.companies_pipeline ?? 0;
  const talkedToday = kpi?.companies_talked_today ?? 0;

  const stages: Stage[] = [
    {
      key: 'pipeline',
      label: 'In pipeline',
      hint: 'Identified, not yet engaged',
      value: pipeline,
      Icon: CircleDashed,
      tone: 'text-module-4',
      bar: 'bg-module-4',
      tint: 'bg-module-4/10',
    },
    {
      key: 'in_progress',
      label: 'In progress',
      hint: 'Drive underway',
      value: inProgress,
      Icon: CircleDot,
      tone: 'text-module-3',
      bar: 'bg-module-3',
      tint: 'bg-module-3/10',
    },
    {
      key: 'completed',
      label: 'Completed',
      hint: 'Drive closed out',
      value: completed,
      Icon: CheckCircle2,
      tone: 'text-success',
      bar: 'bg-success',
      tint: 'bg-success/10',
    },
  ];

  const total = pipeline + inProgress + completed;
  const peak = Math.max(pipeline, inProgress, completed, 1);

  return (
    <section
      aria-labelledby="funnel-heading"
      className="rounded-panel border border-border bg-surface p-5 shadow-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
        <h2 id="funnel-heading" className="text-title font-bold tracking-tight text-fg">
          Company funnel
        </h2>
        <p className="text-micro text-fg-subtle">
          {total} {total === 1 ? 'company' : 'companies'} tracked this season
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-stretch">
        {/* Daily activity — set apart from the funnel stages by role. */}
        <div className="flex shrink-0 items-center gap-3.5 lg:w-56">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-panel bg-module-6/10 text-module-6"
          >
            <PhoneOutgoing size={19} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-display-lg font-bold tabular-nums text-fg">{talkedToday}</span>
              <span className="text-micro font-medium text-fg-subtle">today</span>
            </div>
            <p className="text-micro font-semibold text-fg-muted">Companies reached</p>
            <p className="mt-0.5 text-micro text-fg-subtle">Distinct, from today&rsquo;s calls</p>
          </div>
        </div>

        <div aria-hidden className="hidden w-px shrink-0 bg-border lg:block" />
        <div aria-hidden className="h-px w-full bg-border lg:hidden" />

        {/* The three durable stages, proportional and in flow order. */}
        <ol className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
          {stages.map((s, i) => (
            <li key={s.key} className="relative">
              {/* Flow arrow between stages — drawn, not a glyph. */}
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute -left-2.5 top-3 hidden text-border-strong sm:block"
                >
                  <svg width="9" height="12" viewBox="0 0 9 12" fill="none">
                    <path
                      d="M2 1.5 L6.5 6 L2 10.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}

              <div className="flex items-center gap-2">
                <s.Icon size={15} strokeWidth={2} className={`shrink-0 ${s.tone}`} aria-hidden />
                <span className="text-micro font-semibold uppercase tracking-wide text-fg-muted">
                  {s.label}
                </span>
              </div>

              <div className="mt-1.5 text-display-lg font-bold tabular-nums leading-none text-fg">
                {s.value}
              </div>

              {/* The one authored motion moment on this surface: the bars
                  sweep out from zero as the funnel appears, so the eye reads
                  the proportions between stages instead of three separate
                  numbers. Reduced motion is handled globally in globals.css. */}
              <div className={`mt-2.5 h-1.5 overflow-hidden rounded-full ${s.tint}`}>
                <div
                  className={`h-full origin-left animate-funnel-fill rounded-full ${s.bar}`}
                  style={{ width: `${Math.round((s.value / peak) * 100)}%` }}
                />
              </div>

              <p className="mt-1.5 text-micro text-fg-subtle">{s.hint}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
