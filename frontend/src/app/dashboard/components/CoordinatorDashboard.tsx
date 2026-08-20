'use client';

import Link from 'next/link';
import { AssignedWorkWidget } from './AssignedWorkWidget';
import { Landmark, Megaphone, Target, Zap } from 'lucide-react';

interface Props {
  data: any;
  onLoadToMetadata: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

export function CoordinatorDashboard({ data, onLoadToMetadata, onMarkComplete }: Props) {
  if (!data) return null;

  const { priority_notification, assigned_work, priority_college, today_tasks, kpi_summary, insights } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* 1. Priority Notification Alert Banner (Spec Section 7.2) */}
      {priority_notification && (
        <div className="bg-gradient-to-r from-primary/80 via-indigo-950/60 to-background border border-primary/40 rounded-2xl p-4 shadow-3 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Megaphone size={14} strokeWidth={2} aria-hidden />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {priority_notification.sender_name}
                </span>
                <span className="text-micro bg-destructive/20 text-destructive border border-destructive/30 px-2 py-0.5 rounded-full font-bold">
                  HIGH PRIORITY
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">{priority_notification.title}</h3>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">{priority_notification.message}</p>
            </div>
          </div>

          <Link
            href="/tracker"
            className="px-3.5 py-1.5 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-1 hidden sm:inline-block"
          >
            Open Daily Tracker →
          </Link>
        </div>
      )}

      {/* 2. Assigned Work Widget (Signature Feature — Spec Section 7.3 & 8-10) */}
      <AssignedWorkWidget
        assignments={assigned_work || []}
        onLoadToMetadata={onLoadToMetadata}
        onMarkComplete={onMarkComplete}
      />

      {/* 3. Mid Grid: Priority College & Today's 3 Tasks (Spec Section 7.4 & 7.5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Priority College Widget (Spec Section 7.4) */}
        {priority_college && (
          <div className="glass-panel rounded-2xl border border-border p-5 shadow-3 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Landmark size={14} strokeWidth={2} aria-hidden /> Assigned Priority Institution
                </h3>
                <span className="text-micro bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                  Today's Primary Focus
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-mono">
                    [{priority_college.code}]
                  </span>
                  <h4 className="text-sm font-bold text-white">{priority_college.name}</h4>
                </div>
                <p className="text-xs text-fg-subtle mt-1">
                  Active campus partner • 2026 Batch Placement Season
                </p>
              </div>

              {/* Mini metric counters */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-background/60 p-3 rounded-xl border border-border">
                  <span className="text-micro text-fg-subtle uppercase">Today's Call Outreach</span>
                  <p className="text-lg font-bold text-primary mt-0.5 tabular-nums">
                    {priority_college.calls_today} Calls
                  </p>
                </div>
                <div className="bg-background/60 p-3 rounded-xl border border-border">
                  <span className="text-micro text-fg-subtle uppercase">Pending Follow-Ups</span>
                  <p className="text-lg font-bold text-warning mt-0.5 tabular-nums">
                    {priority_college.pending_follow_ups} Follow-ups
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/tracker"
              className="w-full py-2 bg-surface hover:bg-surface-raised text-primary border border-primary/20 rounded-xl text-xs font-semibold text-center transition-colors block"
            >
              Open Daily Tracker for {priority_college.code} →
            </Link>
          </div>
        )}

        {/* Today's 3 Tasks (Spec Section 7.5) */}
        <div className="glass-panel rounded-2xl border border-border p-5 shadow-3 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Target size={14} strokeWidth={2} aria-hidden /> Today's Action Checklist (Max 3 Tasks)
            </h3>
            <span className="text-micro text-fg-subtle">Strictly Focused</span>
          </div>

          <div className="space-y-2.5">
            {today_tasks?.map((t: any) => (
              <Link
                key={t.id}
                href={t.target_route}
                className="bg-background/60 hover:bg-surface/80 border border-border rounded-xl p-3 flex items-center justify-between transition-all group block"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${
                      t.completed
                        ? 'bg-success/20 text-success border-success/40'
                        : 'bg-surface text-fg-subtle border-border-strong'
                    }`}
                  >
                    {t.completed ? '✓' : '•'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-fg group-hover:text-primary transition-colors">
                      {t.title}
                    </p>
                    <p className="text-micro text-fg-subtle mt-0.5">{t.progress}</p>
                  </div>
                </div>

                <span className="text-xs text-fg-subtle group-hover:text-fg-muted transition-colors">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Today's KPI Summary Strip (Spec Section 7.6) */}
      {kpi_summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Assigned Outreach</span>
            <p className="text-xl font-bold text-fg-muted mt-1 tabular-nums">
              {kpi_summary.calls_assigned} Target
            </p>
            <p className="text-micro text-fg-subtle mt-0.5">30 Call Target Benchmark</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Calls Logged Today</span>
            <p className="text-xl font-bold text-primary mt-1 tabular-nums">
              {kpi_summary.calls_completed} Completed
            </p>
            <p className="text-micro text-primary/80 mt-0.5">Daily Tracker Engine</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Positive Opportunities</span>
            <p className="text-xl font-bold text-success mt-1 tabular-nums">
              {kpi_summary.positive_responses} Positives
            </p>
            <p className="text-micro text-success/80 mt-0.5">Hot Corporate Leads</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Job Descriptions</span>
            <p className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
              {kpi_summary.jds_received} JDs Secured
            </p>
            <p className="text-micro text-cyan-500/80 mt-0.5">Confirmed Campus Roles</p>
          </div>
        </div>
      )}

      {/* 5. Quick Navigation Shortcut Cards (Spec Section 7.7) */}
      <div className="glass-panel rounded-2xl border border-border p-5 shadow-3 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Zap size={14} strokeWidth={2} aria-hidden /> Quick Workflow Navigation Hub
          </h3>
          <span className="text-micro text-fg-subtle">1-Click Module Routing</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: 'Daily Tracker', desc: 'Call logging & HR contact picker', icon: '📋', href: '/tracker', color: 'hover:border-primary' },
            { title: 'Weekly Tracker', desc: '7-section placement pipeline board', icon: '📊', href: '/weekly-tracker', color: 'hover:border-purple-500' },
            { title: 'Daily Leads', desc: 'Dual-tab positive & JD registers', icon: '📥', href: '/daily-leads', color: 'hover:border-success' },
            { title: 'Reports Center', desc: 'Live BI & 4 template builders', icon: '📈', href: '/reports', color: 'hover:border-cyan-500' },
          ].map((nav) => (
            <Link
              key={nav.title}
              href={nav.href}
              className={`bg-background/60 border border-border rounded-xl p-3.5 transition-all group ${nav.color} block shadow-1`}
            >
              <span className="text-2xl">{nav.icon}</span>
              <h4 className="text-xs font-bold text-white mt-2 group-hover:text-primary transition-colors">
                {nav.title}
              </h4>
              <p className="text-micro text-fg-subtle mt-0.5">{nav.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 6. Operational Insights (Spec Section 7.8) */}
      {insights && (
        <div className="bg-background/60 border border-border rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold text-fg-muted flex items-center gap-1.5">
            <span>💡</span> Operational Observations
          </span>
          <ul className="text-xs text-fg-subtle space-y-1 pl-4 list-disc">
            {insights.map((ins: string, i: number) => (
              <li key={i}>{ins}</li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
