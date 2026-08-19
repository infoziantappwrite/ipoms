'use client';

import Link from 'next/link';
import { AssignedWorkWidget } from './AssignedWorkWidget';

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
        <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-slate-900 border border-blue-500/40 rounded-2xl p-4 shadow-lg flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl p-2 bg-blue-600/20 rounded-xl border border-blue-500/30 text-blue-400 shrink-0">
              📢
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  {priority_notification.sender_name}
                </span>
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                  HIGH PRIORITY
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">{priority_notification.title}</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{priority_notification.message}</p>
            </div>
          </div>

          <Link
            href="/tracker"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm hidden sm:inline-block"
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
          <div className="glass-panel rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>🏛️</span> Assigned Priority Institution
                </h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                  Today's Primary Focus
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400 font-mono">
                    [{priority_college.code}]
                  </span>
                  <h4 className="text-sm font-bold text-white">{priority_college.name}</h4>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active campus partner • 2026 Batch Placement Season
                </p>
              </div>

              {/* Mini metric counters */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Today's Call Outreach</span>
                  <p className="text-lg font-black text-blue-400 mt-0.5 tabular-nums">
                    {priority_college.calls_today} Calls
                  </p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Pending Follow-Ups</span>
                  <p className="text-lg font-black text-amber-400 mt-0.5 tabular-nums">
                    {priority_college.pending_follow_ups} Follow-ups
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/tracker"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-semibold text-center transition-colors block"
            >
              Open Daily Tracker for {priority_college.code} →
            </Link>
          </div>
        )}

        {/* Today's 3 Tasks (Spec Section 7.5) */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>🎯</span> Today's Action Checklist (Max 3 Tasks)
            </h3>
            <span className="text-[10px] text-slate-400">Strictly Focused</span>
          </div>

          <div className="space-y-2.5">
            {today_tasks?.map((t: any) => (
              <Link
                key={t.id}
                href={t.target_route}
                className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between transition-all group block"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${
                      t.completed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {t.completed ? '✓' : '•'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.progress}</p>
                  </div>
                </div>

                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
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
          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Outreach</span>
            <p className="text-xl font-black text-slate-300 mt-1 tabular-nums">
              {kpi_summary.calls_assigned} Target
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">30 Call Target Benchmark</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Calls Logged Today</span>
            <p className="text-xl font-black text-blue-400 mt-1 tabular-nums">
              {kpi_summary.calls_completed} Completed
            </p>
            <p className="text-[10px] text-blue-500/80 mt-0.5">Daily Tracker Engine</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Positive Opportunities</span>
            <p className="text-xl font-black text-emerald-400 mt-1 tabular-nums">
              {kpi_summary.positive_responses} Positives
            </p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">Hot Corporate Leads</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Job Descriptions</span>
            <p className="text-xl font-black text-cyan-400 mt-1 tabular-nums">
              {kpi_summary.jds_received} JDs Secured
            </p>
            <p className="text-[10px] text-cyan-500/80 mt-0.5">Confirmed Campus Roles</p>
          </div>
        </div>
      )}

      {/* 5. Quick Navigation Shortcut Cards (Spec Section 7.7) */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <span>⚡</span> Quick Workflow Navigation Hub
          </h3>
          <span className="text-[10px] text-slate-400">1-Click Module Routing</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: 'Daily Tracker', desc: 'Call logging & HR contact picker', icon: '📋', href: '/tracker', color: 'hover:border-blue-500' },
            { title: 'Weekly Tracker', desc: '7-section placement pipeline board', icon: '📊', href: '/weekly-tracker', color: 'hover:border-purple-500' },
            { title: 'Daily Leads', desc: 'Dual-tab positive & JD registers', icon: '📥', href: '/daily-leads', color: 'hover:border-emerald-500' },
            { title: 'Reports Center', desc: 'Live BI & 4 template builders', icon: '📈', href: '/reports', color: 'hover:border-cyan-500' },
          ].map((nav) => (
            <Link
              key={nav.title}
              href={nav.href}
              className={`bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 transition-all group ${nav.color} block shadow-sm`}
            >
              <span className="text-2xl">{nav.icon}</span>
              <h4 className="text-xs font-bold text-white mt-2 group-hover:text-blue-400 transition-colors">
                {nav.title}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{nav.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 6. Operational Insights (Spec Section 7.8) */}
      {insights && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span>💡</span> Operational Observations
          </span>
          <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
            {insights.map((ins: string, i: number) => (
              <li key={i}>{ins}</li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
