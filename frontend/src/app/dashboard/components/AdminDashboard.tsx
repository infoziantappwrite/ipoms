'use client';

import Link from 'next/link';

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
          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Outreach</span>
            <p className="text-xl font-black text-blue-400 mt-1 tabular-nums">
              {macro_kpis.total_calls}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Calls Logged Season</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Positive Conversion</span>
            <p className="text-xl font-black text-emerald-400 mt-1 tabular-nums">
              {macro_kpis.positive_rate_pct}%
            </p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">Conversion Benchmark</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">JDs In Hand</span>
            <p className="text-xl font-black text-cyan-400 mt-1 tabular-nums">
              {macro_kpis.jds_in_hand}
            </p>
            <p className="text-[10px] text-cyan-500/80 mt-0.5">Confirmed Job Roles</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Drives Completed</span>
            <p className="text-xl font-black text-amber-400 mt-1 tabular-nums">
              {macro_kpis.drives_conducted}
            </p>
            <p className="text-[10px] text-amber-500/80 mt-0.5">Campus Hiring Drives</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Offers Secured</span>
            <p className="text-xl font-black text-emerald-400 mt-1 tabular-nums">
              {macro_kpis.total_offers_placed}
            </p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">Student Placements</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Partner Colleges</span>
            <p className="text-xl font-black text-purple-400 mt-1 tabular-nums">
              {macro_kpis.active_partner_colleges}
            </p>
            <p className="text-[10px] text-purple-500/80 mt-0.5">Active Institutions</p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Portal Users</span>
            <p className="text-xl font-black text-slate-300 mt-1 tabular-nums">
              {macro_kpis.portal_users}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Active Coordinators</p>
          </div>
        </div>
      )}

      {/* Institutional Placement Performance Leaderboard */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>🏛️</span> Institutional Placement Performance Leaderboard
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Consolidated placement drives and student offer counts across partner colleges
            </p>
          </div>
          <Link
            href="/reports"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            View Full Reports & BI →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4 text-center">Calls Logged</th>
                <th className="py-3 px-4 text-center">Drives Conducted</th>
                <th className="py-3 px-4 text-center">Offers Placed</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {leaderboard?.map((c: any) => (
                <tr key={c.college_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    <span className="text-blue-400 font-mono mr-2">[{c.college_code}]</span>
                    {c.college_name}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300 font-mono">{c.calls}</td>
                  <td className="py-3 px-4 text-center text-amber-400 font-mono font-bold">
                    {c.drives_completed}
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold font-mono">
                    {c.total_offers}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href="/reports"
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                    >
                      Audit Report →
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
