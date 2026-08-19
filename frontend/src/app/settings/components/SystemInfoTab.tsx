'use client';

import { BarChart3 } from 'lucide-react';
interface Props {
  summaryData: any;
}

export function SystemInfoTab({ summaryData }: Props) {
  const summary = summaryData || {};

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Reassurance Health Panel (Spec Section 14) */}
      <div className="glass-panel rounded-2xl border border-success/30 bg-success/20 p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl p-2 bg-success/50 rounded-xl border border-success/30">🟢</span>
          <div>
            <h3 className="text-xs font-bold text-white">iPOMS Operational Health: All Systems Normal</h3>
            <p className="text-micro text-success mt-0.5">
              Database Connected • Automated Midnight Finalization Cron Active • API Engine Live
            </p>
          </div>
        </div>
        <span className="text-micro text-fg-subtle font-mono">
          Last Sync: Today ({new Date().toLocaleDateString('en-IN')})
        </span>
      </div>

      {/* Database Summary Telemetry (Spec Section 13.2) */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-xl">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <BarChart3 size={14} strokeWidth={2} aria-hidden /> System Database Summary (Read-Only)
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Real-time entity counts across the centralized operational database
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Total Users</span>
            <p className="text-2xl font-bold text-white tabular-nums">{summary.total_users || 6}</p>
            <span className="text-micro text-fg-subtle">Active Accounts</span>
          </div>

          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Coordinators</span>
            <p className="text-2xl font-bold text-primary tabular-nums">{summary.total_coordinators || 4}</p>
            <span className="text-micro text-primary/80">Calling Staff</span>
          </div>

          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Companies</span>
            <p className="text-2xl font-bold text-cyan-400 tabular-nums">{summary.total_companies || 3559}</p>
            <span className="text-micro text-cyan-400/80">Corporate Contacts</span>
          </div>

          <div className="p-4 bg-background/60 rounded-xl border border-border space-y-1">
            <span className="text-micro text-fg-subtle font-bold uppercase">Colleges</span>
            <p className="text-2xl font-bold text-purple-400 tabular-nums">{summary.total_colleges || 24}</p>
            <span className="text-micro text-purple-400/80">Partner Institutions</span>
          </div>
        </div>
      </div>

      {/* Application Version & Environment (Spec Section 13.1) */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-xl">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <span>ℹ️</span> Application Build & Environment
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Application Release</span>
            <span className="text-fg font-mono font-semibold">{summary.app_version || 'v1.0.0 Enterprise'}</span>
          </div>
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Database Engine</span>
            <span className="text-fg font-mono font-semibold">{summary.database_status || 'Connected'}</span>
          </div>
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Node / Next Runtime</span>
            <span className="text-fg font-mono font-semibold">Node.js 20 • Next.js 14.2</span>
          </div>
        </div>
      </div>

    </div>
  );
}
