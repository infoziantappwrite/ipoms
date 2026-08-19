'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InfoziantLogo } from '@/components/InfoziantLogo';
import {
  LayoutDashboard, PhoneCall, CalendarDays, Target, Building2,
  TrendingUp, Bell, Settings, ArrowRight, LogIn, Zap,
} from 'lucide-react';

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
      Icon: LayoutDashboard,
      desc: 'Real-time daily KPI scorecards, interactive task dispatching, priority college alerts, and institutional placement leaderboards.',
      href: '/dashboard',
      badge: 'Operational Hub',
      color: 'bg-module-1/10 text-module-1 border-module-1/25',
    },
    {
      title: 'Daily Call Tracker',
      code: 'Module 03',
      Icon: PhoneCall,
      desc: 'Lightning-fast 30-call daily logging grid with auto-save debounce, instant contact picker, and keyboard-driven efficiency.',
      href: '/tracker',
      badge: 'Core Engine',
      color: 'bg-module-2/10 text-module-2 border-module-2/25',
    },
    {
      title: 'Weekly Tracker Lifecycle',
      code: 'Module 04',
      Icon: CalendarDays,
      desc: '7-stage placement pipeline board with follow-up proximity tracking, multi-role salary ranges, and institutional filtering.',
      href: '/weekly-tracker',
      badge: 'Pipeline CRM',
      color: 'bg-module-3/10 text-module-3 border-module-3/25',
    },
    {
      title: 'Daily Leads Register',
      code: 'Module 05',
      Icon: Target,
      desc: 'Dual-register tracker for Positive Outcomes & Job Descriptions (JD Received) with 1-click stage advancement.',
      href: '/daily-leads',
      badge: 'High Intent',
      color: 'bg-module-4/10 text-module-4 border-module-4/25',
    },
    {
      title: 'Master Company Metadata',
      code: 'Module 02',
      Icon: Building2,
      desc: 'Centralized directory of 3,550+ corporate accounts with intelligent duplicate detection, bulk Excel import, and 90-day recycle bin.',
      href: '/metadata',
      badge: '3,550+ Records',
      color: 'bg-module-5/10 text-module-5 border-module-5/25',
    },
    {
      title: 'Reports & Analytics Center',
      code: 'Module 06',
      Icon: TrendingUp,
      desc: 'Automated executive summaries, institutional comparisons, responsiveness metrics, interactive canvas editor, and PDF/Excel export.',
      href: '/reports',
      badge: 'BI & Presets',
      color: 'bg-module-6/10 text-module-6 border-module-6/25',
    },
    {
      title: 'Enterprise Alerts & Center',
      code: 'Module 08',
      Icon: Bell,
      desc: 'Multi-audience broadcast announcements, meeting RSVP invitations, deadline escalations, and real-time header bell polling.',
      href: '/notifications',
      badge: 'Real-Time',
      color: 'bg-module-7/10 text-module-7 border-module-7/25',
    },
    {
      title: 'User Management & Settings',
      code: 'Modules 01 & 09',
      Icon: Settings,
      desc: 'Staff directory, college allocations, RBAC permissions matrix, academic season config, and daily call target governance.',
      href: '/settings',
      badge: 'Governance',
      color: 'bg-module-8/10 text-module-8 border-module-8/25',
    },
  ];

  return (
    <div className="min-h-full flex-1 flex flex-col bg-background text-fg p-4 sm:p-6 lg:p-10 selection:bg-primary selection:text-white">
      <div className="max-w-7xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-between">

        {/* ── Executive Hero Banner (Light Theme) ─────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-indigo-50/40 to-white border border-primary-subtle/80 rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <InfoziantLogo size="md" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-subtle/70 border border-primary-subtle text-primary text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                2025–2026 Campus Recruitment Season
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-fg tracking-tight leading-tight pt-1">
              Placement Operations Management System
            </h1>

            <p className="text-sm sm:text-base text-fg-muted leading-relaxed font-normal">
              Empowering placement teams with intelligent operations, verified corporate metadata, automated multi-stage pipelines, and real-time business intelligence.
            </p>

            <div className="flex items-center gap-3 pt-3 flex-wrap">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 transition-all text-xs flex items-center gap-2"
              >
                <span>Launch Executive Dashboard</span>
                <span>→</span>
              </Link>
              <Link
                href="/tracker"
                className="px-6 py-3 bg-white hover:bg-surface-sunken text-fg border border-border-strong rounded-xl font-bold transition-all text-xs flex items-center gap-2 shadow-2xs"
              >
                <span>Log Daily Calling (DT)</span>
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-control font-semibold transition-colors text-body flex items-center gap-2 shadow-1 ml-auto"
              >
                <LogIn size={14} strokeWidth={2} aria-hidden />
                <span>Staff Sign In / Login</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Module Grid (8 Enterprise Modules in Light Theme) ───────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-2">
              <Zap size={14} strokeWidth={2} aria-hidden /> Operational System Modules
            </h2>
            <span className="text-xs text-fg-subtle font-medium">All 8 Modules Active & Synchronized</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m, idx) => (
              <Link
                key={idx}
                href={m.href}
                className="group bg-white rounded-2xl border border-border hover:border-primary p-5 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-all shadow-xs hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-panel border flex items-center justify-center shadow-2xs ${m.color}`}>
                      <m.Icon size={20} strokeWidth={2} aria-hidden />
                    </div>
                    <span className="text-micro font-mono font-bold bg-surface-sunken text-fg-muted px-2 py-0.5 rounded border border-border">
                      {m.code}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-fg group-hover:text-primary transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-fg-subtle mt-1 leading-relaxed line-clamp-3">
                      {m.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-micro text-primary font-bold bg-primary-subtle px-2 py-0.5 rounded border border-primary-subtle">
                    {m.badge}
                  </span>
                  <span className="text-fg-subtle group-hover:text-primary font-bold transition-colors">
                    Open →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── System Telemetry Footer Strip (Light Theme) ─────────────────── */}
        <div className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between flex-wrap gap-4 text-xs shadow-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-fg-subtle font-medium">Database Engine:</span>
              <span className="text-fg font-bold font-mono">{telemetry.database_status}</span>
            </div>
            <div>
              <span className="text-fg-subtle font-medium">Corporate Metadata:</span>{' '}
              <span className="text-primary font-bold font-mono">{telemetry.total_companies || 3559} Records</span>
            </div>
            <div>
              <span className="text-fg-subtle font-medium">Active Staff:</span>{' '}
              <span className="text-purple-700 font-bold font-mono">{telemetry.total_users || 6} Accounts</span>
            </div>
          </div>

          <div className="text-micro text-fg-subtle font-mono">
            Infoziant Placement Operations • iPOMS Enterprise Suite
          </div>
        </div>

      </div>
    </div>
  );
}
