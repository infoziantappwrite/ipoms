'use client';

import Link from 'next/link';
import { Landmark } from 'lucide-react';

interface Props {
  data: any;
}

export function AdminDashboard({ data }: Props) {
  if (!data) return null;

  const { macro_kpis, leaderboard } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Macro Organization KPI Grid (Spec Section 5.3) */}
      {macro_kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Total Outreach</span>
            <p className="text-xl font-bold text-primary mt-1 tabular-nums">
              {macro_kpis.total_calls}
            </p>
            <p className="text-micro text-fg-subtle mt-0.5">Calls Logged Season</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Positive Conversion</span>
            <p className="text-xl font-bold text-success mt-1 tabular-nums">
              {macro_kpis.positive_rate_pct}%
            </p>
            <p className="text-micro text-success/80 mt-0.5">Conversion Benchmark</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">JDs In Hand</span>
            <p className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
              {macro_kpis.jds_in_hand}
            </p>
            <p className="text-micro text-cyan-500/80 mt-0.5">Confirmed Job Roles</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Drives Completed</span>
            <p className="text-xl font-bold text-warning mt-1 tabular-nums">
              {macro_kpis.drives_conducted}
            </p>
            <p className="text-micro text-warning/80 mt-0.5">Campus Hiring Drives</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Offers Secured</span>
            <p className="text-xl font-bold text-success mt-1 tabular-nums">
              {macro_kpis.total_offers_placed}
            </p>
            <p className="text-micro text-success/80 mt-0.5">Student Placements</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Partner Colleges</span>
            <p className="text-xl font-bold text-purple-400 mt-1 tabular-nums">
              {macro_kpis.active_partner_colleges}
            </p>
            <p className="text-micro text-purple-500/80 mt-0.5">Active Institutions</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border">
            <span className="text-micro text-fg-subtle uppercase font-semibold">Portal Users</span>
            <p className="text-xl font-bold text-fg-muted mt-1 tabular-nums">
              {macro_kpis.portal_users}
            </p>
            <p className="text-micro text-fg-subtle mt-0.5">Active Coordinators</p>
          </div>
        </div>
      )}

      {/* Institutional Placement Performance Leaderboard */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-4">
        <div className="px-5 py-4 border-b border-border bg-background/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Landmark size={14} strokeWidth={2} aria-hidden /> Institutional Placement Performance Leaderboard
            </h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Consolidated placement drives and student offer counts across partner colleges
            </p>
          </div>
          <Link
            href="/reports"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            View Full Reports & BI
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-micro uppercase">
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4 text-center">Calls Logged</th>
                <th className="py-3 px-4 text-center">Drives Conducted</th>
                <th className="py-3 px-4 text-center">Offers Placed</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leaderboard?.map((c: any) => (
                <tr key={c.college_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <span className="text-primary font-mono mr-2">[{c.college_code}]</span>
                    {c.college_name}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 font-mono">{c.calls}</td>
                  <td className="py-3 px-4 text-center text-amber-600 font-mono font-bold">
                    {c.drives_completed}
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-bold font-mono">
                    {c.total_offers}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href="/reports"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-micro font-semibold transition-colors"
                    >
                      Audit Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
