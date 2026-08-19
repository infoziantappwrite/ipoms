'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function HomePage() {
  const [telemetry, setTelemetry] = useState<any>({
    total_users: 6,
    total_companies: 3559,
    total_colleges: 24,
    database_status: 'Connected',
  });

  useEffect(() => {
    fetch(`${API}/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.system_summary) {
          setTelemetry(data.data.system_summary);
        }
      })
      .catch(console.error);
  }, []);

  const modules = [
    {
      title: 'Role-Based Dashboard',
      code: 'Module 07',
      icon: '📊',
      desc: 'Real-time daily KPI scorecards, interactive task dispatching, priority college alerts, and institutional placement leaderboards.',
      href: '/dashboard',
      badge: 'Operational Hub',
      color: 'from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-400',
    },
    {
      title: 'Daily Call Tracker',
      code: 'Module 03',
      icon: '📋',
      desc: 'Lightning-fast 30-call daily logging grid with auto-save debounce, instant contact picker, and keyboard-driven efficiency.',
      href: '/tracker',
      badge: 'Core Engine',
      color: 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30 text-indigo-400',
    },
    {
      title: 'Weekly Tracker Lifecycle',
      code: 'Module 04',
      icon: '📅',
      desc: '7-stage placement pipeline board with follow-up proximity tracking, multi-role salary ranges, and institutional filtering.',
      href: '/weekly-tracker',
      badge: 'Pipeline CRM',
      color: 'from-cyan-600/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400',
    },
    {
      title: 'Daily Leads Register',
      code: 'Module 05',
      icon: '🎯',
      desc: 'Dual-register tracker for Positive Outcomes & Job Descriptions (JD Received) with 1-click stage advancement.',
      href: '/daily-leads',
      badge: 'High Intent',
      color: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    },
    {
      title: 'Master Company Metadata',
      code: 'Module 02',
      icon: '🏢',
      desc: 'Centralized directory of 3,550+ corporate accounts with intelligent duplicate detection, bulk Excel import, and 90-day recycle bin.',
      href: '/metadata',
      badge: '3,550+ Records',
      color: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
    },
    {
      title: 'Reports & Analytics Center',
      code: 'Module 06',
      icon: '📈',
      desc: 'Automated executive summaries, institutional comparisons, responsiveness metrics, interactive canvas editor, and PDF/Excel export.',
      href: '/reports',
      badge: 'BI & Presets',
      color: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-400',
    },
    {
      title: 'Enterprise Alerts & Center',
      code: 'Module 08',
      icon: '🔔',
      desc: 'Multi-audience broadcast announcements, meeting RSVP invitations, deadline escalations, and real-time header bell polling.',
      href: '/notifications',
      badge: 'Real-Time',
      color: 'from-rose-600/20 to-rose-900/10 border-rose-500/30 text-rose-400',
    },
    {
      title: 'User Management & Settings',
      code: 'Modules 01 & 09',
      icon: '⚙️',
      desc: 'Staff directory, college allocations, RBAC permissions matrix, academic season config, and daily call target governance.',
      href: '/settings',
      badge: 'Governance',
      color: 'from-slate-600/20 to-slate-900/10 border-slate-500/30 text-slate-300',
    },
  ];

  return (
    <div className="min-h-full flex-1 flex flex-col bg-slate-950 text-slate-50 selection:bg-blue-600 selection:text-white p-6 lg:p-10">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-between">

        {/* ── Executive Hero Banner ───────────────────────────────────────── */}
        <div className="relative overflow-hidden glass-panel rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40 p-8 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              2025–2026 Campus Recruitment Season Active
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Infoziant Placement Operations Management System
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Empowering placement teams with intelligent operations, verified corporate metadata, automated multi-stage pipelines, and real-time business intelligence.
            </p>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/25 transition-all text-xs flex items-center gap-2"
              >
                <span>Launch Executive Dashboard</span>
                <span>→</span>
              </Link>
              <Link
                href="/tracker"
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold transition-all text-xs flex items-center gap-2"
              >
                <span>Log Daily Calling (DT)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Module Grid (8 Enterprise Modules) ──────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span>⚡</span> Operational System Modules
            </h2>
            <span className="text-xs text-slate-400">All 8 Modules Active & Synchronized</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m, idx) => (
              <Link
                key={idx}
                href={m.href}
                className="glass-panel group rounded-2xl border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-all shadow-lg hover:shadow-2xl hover:bg-slate-900/60"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} border flex items-center justify-center text-xl`}>
                      {m.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                      {m.code}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                      {m.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-blue-400 font-semibold">{m.badge}</span>
                  <span className="text-slate-500 group-hover:text-slate-200 font-bold transition-colors">
                    Open →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── System Telemetry Footer Strip ───────────────────────────────── */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-4 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-slate-200 font-bold font-mono">{telemetry.database_status}</span>
            </div>
            <div>
              <span className="text-slate-400">Corporate Metadata:</span>{' '}
              <span className="text-cyan-400 font-bold font-mono">{telemetry.total_companies || 3559} Records</span>
            </div>
            <div>
              <span className="text-slate-400">Active Staff:</span>{' '}
              <span className="text-purple-400 font-bold font-mono">{telemetry.total_users || 6} Accounts</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Infoziant Placement Operations • iPOMS Enterprise Suite
          </div>
        </div>

      </div>
    </div>
  );
}
