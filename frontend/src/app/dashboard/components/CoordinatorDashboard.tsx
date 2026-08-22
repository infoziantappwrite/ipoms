'use client';

import Link from 'next/link';
import {
  ArrowRight, Check, Landmark, Megaphone,
} from 'lucide-react';

import { AssignedWorkWidget } from './AssignedWorkWidget';
import { CompanyFunnel } from './CompanyFunnel';

interface Props {
  data: any;
  onLoadToMetadata: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

export function CoordinatorDashboard({ data, onLoadToMetadata, onMarkComplete }: Props) {
  if (!data) return null;

  const {
    priority_notification, assigned_work, priority_college,
    today_tasks, kpi_summary,
  } = data;

  // AppShell already owns the <main id="main"> landmark for every route, so
  // this surface contributes a plain container rather than a second one.
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">

      {/* ── Directive ───────────────────────────────────────────────────────
          A tinted band, not a gradient hero. This is a message to read once
          and act on; competing with the funnel for attention would cost the
          coordinator the one number they actually steer by. */}
      {priority_notification && (
        <section
          aria-labelledby="directive-heading"
          className="rounded-panel border border-info/30 bg-info-subtle p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 gap-3">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-info/10 text-info"
              >
                <Megaphone size={16} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-micro font-semibold uppercase tracking-wide text-info">
                  {priority_notification.sender_name}
                </p>
                <h2 id="directive-heading" className="mt-0.5 text-body font-bold text-fg">
                  {priority_notification.title}
                </h2>
                <p className="mt-1 text-micro leading-relaxed text-fg-muted">
                  {priority_notification.message}
                </p>
              </div>
            </div>

            <Link
              href="/tracker"
              className="flex shrink-0 items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-1.5 text-micro font-semibold text-primary shadow-1 transition-[box-shadow,color] duration-200 hover:text-primary-hover active:shadow-inset-1"
            >
              Open Daily Tracker
              <ArrowRight size={13} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ── Company funnel — the headline ─────────────────────────────────── */}
      <CompanyFunnel kpi={kpi_summary} />

      {/* ── Assigned work (signature feature) ─────────────────────────────── */}
      <AssignedWorkWidget
        assignments={assigned_work || []}
        onLoadToMetadata={onLoadToMetadata}
        onMarkComplete={onMarkComplete}
      />

      {/* ── Priority college & today's three tasks ────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {priority_college && (
          <section
            aria-labelledby="college-heading"
            className="flex flex-col rounded-panel border border-border bg-surface p-5 shadow-2 lg:col-span-2"
          >
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Landmark size={15} strokeWidth={2} className="shrink-0 text-fg-subtle" aria-hidden />
              <h2 id="college-heading" className="text-title font-bold tracking-tight text-fg">
                Priority college
              </h2>
            </div>

            <div className="mt-3.5 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="rounded-control bg-primary-subtle px-1.5 py-0.5 font-mono text-micro font-bold text-primary">
                  {priority_college.code}
                </span>
              </div>
              <h3 className="mt-1.5 text-body font-bold leading-snug text-fg">
                {priority_college.name}
              </h3>
              <p className="mt-0.5 text-micro text-fg-subtle">
                Active campus partner &middot; 2026 placement season
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-panel border border-border bg-surface-sunken p-3">
                  <dt className="text-micro font-medium text-fg-subtle">Calls today</dt>
                  <dd className="mt-0.5 text-display-lg font-bold tabular-nums leading-none text-fg">
                    {priority_college.calls_today}
                  </dd>
                </div>
                <div className="rounded-panel border border-border bg-surface-sunken p-3">
                  <dt className="text-micro font-medium text-fg-subtle">Follow-ups due</dt>
                  <dd
                    className={`mt-0.5 text-display-lg font-bold tabular-nums leading-none ${
                      priority_college.pending_follow_ups > 0 ? 'text-warning' : 'text-fg'
                    }`}
                  >
                    {priority_college.pending_follow_ups}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href="/tracker"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-control border border-border bg-surface px-3 py-2 text-micro font-semibold text-primary shadow-1 transition-[box-shadow,color] duration-200 hover:text-primary-hover active:shadow-inset-1"
            >
              Open tracker for {priority_college.code}
              <ArrowRight size={13} strokeWidth={2} aria-hidden />
            </Link>
          </section>
        )}

        <section
          aria-labelledby="tasks-heading"
          className="rounded-panel border border-border bg-surface p-5 shadow-2 lg:col-span-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
            <h2 id="tasks-heading" className="text-title font-bold tracking-tight text-fg">
              Today
            </h2>
            <p className="text-micro text-fg-subtle">Three things, deliberately</p>
          </div>

          <ol className="mt-3.5 space-y-2.5">
            {today_tasks?.map((t: any) => (
              <li key={t.id}>
                <Link
                  href={t.target_route}
                  className="group flex items-center gap-3 rounded-panel border border-border bg-surface-sunken p-3 transition-shadow duration-200 hover:shadow-1"
                >
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                      t.completed
                        ? 'border-transparent bg-success text-success-foreground'
                        : 'border-border-strong bg-surface'
                    }`}
                  >
                    {t.completed && <Check size={13} strokeWidth={3} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-body font-semibold leading-snug ${
                        t.completed ? 'text-fg-subtle line-through' : 'text-fg'
                      }`}
                    >
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-micro tabular-nums text-fg-subtle">{t.progress}</p>
                  </div>

                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    aria-hidden
                    className="shrink-0 text-fg-subtle transition-colors duration-200 group-hover:text-primary"
                  />
                  <span className="sr-only">{t.completed ? 'Complete' : 'Not complete'}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
