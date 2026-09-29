'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Radio,
  CalendarClock,
  Users,
  Layers,
  XCircle,
  Ban,
  Briefcase,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Building2,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface TpoKpi {
  total_companies: number;
  completed: number;
  drive_in_progress: number;
  upcoming_drive: number;
  in_progress: number;
  pipeline: number;
  rejected_by_tpo: number;
  rejected: number;
  total_offers: number;
  total_students_registered: number;
}

interface TpoDashboardData {
  college: { name: string; code: string; logo_url?: string; location?: string } | null;
  kpi: TpoKpi;
}

interface StageConfig {
  key: keyof TpoKpi;
  label: string;
  sublabel: string;
  icon: any;
  borderClass: string;
  bgBadge: string;
  textColor: string;
  iconColor: string;
  barColor: string;
  isLive?: boolean;
}

const PIPELINE_STAGES: StageConfig[] = [
  {
    key: 'completed',
    label: 'Companies Completed',
    sublabel: 'Finished Drives',
    icon: CheckCircle2,
    borderClass: 'border-emerald-200/80 hover:border-emerald-400 bg-emerald-50/40',
    bgBadge: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    textColor: 'text-emerald-700',
    iconColor: 'text-emerald-600',
    barColor: 'bg-emerald-500',
  },
  {
    key: 'drive_in_progress',
    label: 'Drive In Progress',
    sublabel: 'Live Campus Drive',
    icon: Radio,
    borderClass: 'border-blue-200/80 hover:border-blue-400 bg-blue-50/40',
    bgBadge: 'bg-blue-500/10 text-blue-700 border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
    barColor: 'bg-blue-500',
    isLive: true,
  },
  {
    key: 'upcoming_drive',
    label: 'Upcoming Drive',
    sublabel: 'Scheduled Soon',
    icon: CalendarClock,
    borderClass: 'border-indigo-200/80 hover:border-indigo-400 bg-indigo-50/40',
    bgBadge: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
    textColor: 'text-indigo-700',
    iconColor: 'text-indigo-600',
    barColor: 'bg-indigo-500',
  },
  {
    key: 'in_progress',
    label: 'Companies In Progress',
    sublabel: 'Interviews & Tests',
    icon: Layers,
    borderClass: 'border-amber-200/80 hover:border-amber-400 bg-amber-50/40',
    bgBadge: 'bg-amber-500/10 text-amber-700 border-amber-200',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-600',
    barColor: 'bg-amber-500',
  },
  {
    key: 'pipeline',
    label: 'Companies in Pipeline',
    sublabel: 'Under Outreach',
    icon: Briefcase,
    borderClass: 'border-sky-200/80 hover:border-sky-400 bg-sky-50/40',
    bgBadge: 'bg-sky-500/10 text-sky-700 border-sky-200',
    textColor: 'text-sky-700',
    iconColor: 'text-sky-600',
    barColor: 'bg-sky-500',
  },
  {
    key: 'rejected_by_tpo',
    label: 'Rejected by TPO',
    sublabel: 'Declined by College',
    icon: Ban,
    borderClass: 'border-slate-200/80 hover:border-slate-300 bg-slate-50/60',
    bgBadge: 'bg-slate-500/10 text-slate-700 border-slate-200',
    textColor: 'text-slate-700',
    iconColor: 'text-slate-500',
    barColor: 'bg-slate-400',
  },
  {
    key: 'rejected',
    label: 'Rejected Companies',
    sublabel: 'Declined by HR',
    icon: XCircle,
    borderClass: 'border-rose-200/80 hover:border-rose-400 bg-rose-50/40',
    bgBadge: 'bg-rose-500/10 text-rose-700 border-rose-200',
    textColor: 'text-rose-700',
    iconColor: 'text-rose-600',
    barColor: 'bg-rose-500',
  },
];

export default function TpoDashboardPage() {
  const [data, setData] = useState<TpoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<TpoDashboardData>('/tpo/dashboard');
        if (res.success && res.data) setData(res.data);
        else setError(res.error?.message || 'Could not load the dashboard.');
      } catch {
        setError('Cannot reach the iPOMS server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        <span className="text-xs font-semibold text-slate-500">Loading placement dashboard…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center">
        <XCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-bold text-rose-900">Dashboard Unavailable</h3>
        <p className="mt-1 text-xs text-rose-600">{error || 'No placement data found for this institution.'}</p>
      </div>
    );
  }

  const kpi = data.kpi;
  const collegeName = data.college?.name || 'Placement Institution';
  const totalCompanies = kpi.total_companies || 0;
  const completionRate = totalCompanies > 0 ? Math.round((kpi.completed / totalCompanies) * 100) : 0;
  const activePipelineTotal = kpi.drive_in_progress + kpi.upcoming_drive + kpi.in_progress + kpi.pipeline;

  return (
    <div className="space-y-6">
      {/* ── Main Title Card: Tracker - <College Name> (No repetitive college name, No 'weekly tracker' text) ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                <Sparkles size={12} />
                Live Overview
              </span>
              <span className="text-[11px] font-medium text-slate-400">2026 Academic Season</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Tracker - {collegeName}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time placement drive metrics, student registrations, confirmed offers, and recruitment pipeline status.
            </p>
          </div>

          <Link
            href="/tpo/weekly-tracker"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800 hover:shadow-sm shrink-0"
          >
            <span>View Full Tracker Table</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Hero KPI Cards (Minimal, Colourful & High-Impact) ───────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Students Registered */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/40 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Users size={18} strokeWidth={2.2} />
            </span>
            <span className="rounded-full bg-blue-100/70 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              Verified
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
            {kpi.total_students_registered}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Students Registered</span>
          </div>
        </div>

        {/* 2. Total Offers */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <GraduationCap size={18} strokeWidth={2.2} />
            </span>
            <span className="rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Selections
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-emerald-600">
            {kpi.total_offers}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Offers Secured</span>
          </div>
        </div>

        {/* 3. Companies Tracked */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <Briefcase size={18} strokeWidth={2.2} />
            </span>
            <span className="rounded-full bg-indigo-100/70 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              Campus Drives
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
            {kpi.total_companies}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Companies Tracked</span>
          </div>
        </div>

        {/* 4. Completion Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <TrendingUp size={18} strokeWidth={2.2} />
            </span>
            <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {kpi.completed} of {totalCompanies} Done
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
            {completionRate}%
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Completion Rate</span>
          </div>
        </div>
      </div>

      {/* ── Colourful Pipeline Stage Cards ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recruitment Stages Breakdown
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            {activePipelineTotal} Active in Process
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => {
            const Icon = stage.icon;
            const count = (kpi[stage.key] as number) || 0;
            return (
              <Link
                key={stage.key}
                href="/tpo/weekly-tracker"
                className={`group relative overflow-hidden rounded-2xl border p-4 shadow-xs transition-all hover:scale-[1.01] hover:shadow-md ${stage.borderClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${stage.bgBadge}`}>
                    <Icon size={18} strokeWidth={2} className={stage.iconColor} />
                  </span>
                  {stage.isLive && count > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-700 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      Live
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <p className="text-2xl font-black tabular-nums tracking-tight text-slate-900">
                    {count}
                  </p>
                  <p className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                    {stage.label}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    {stage.sublabel}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Visual Analytics Section ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Proportional Distribution Progress Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 size={15} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pipeline Stage Distribution</h3>
                <p className="text-[11px] text-slate-500">Visual breakdown across total active & completed companies</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {totalCompanies} Companies
            </span>
          </div>

          {/* Segmented multi-color bar */}
          {totalCompanies > 0 ? (
            <div className="space-y-3">
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
                {PIPELINE_STAGES.map((stage) => {
                  const val = (kpi[stage.key] as number) || 0;
                  if (val === 0) return null;
                  const pct = (val / totalCompanies) * 100;
                  return (
                    <div
                      key={stage.key}
                      style={{ width: `${pct}%` }}
                      className={`h-full first:rounded-l-full last:rounded-r-full transition-all ${stage.barColor}`}
                      title={`${stage.label}: ${val} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>

              {/* Legend with counts */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 pt-1">
                {PIPELINE_STAGES.map((stage) => {
                  const val = (kpi[stage.key] as number) || 0;
                  const pct = totalCompanies > 0 ? Math.round((val / totalCompanies) * 100) : 0;
                  return (
                    <div key={stage.key} className="flex items-center gap-2 text-xs">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${stage.barColor}`} />
                      <span className="text-slate-600 truncate flex-1 font-medium">{stage.label}</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {val} <span className="text-[10px] text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs italic text-slate-400">
              No company drive data recorded for this academic cycle yet.
            </div>
          )}
        </div>

        {/* 2. Quick Placement Summary & Navigation Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
                <Building2 size={15} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Placement Insights
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs text-slate-300">Active Recruitment Drives</span>
                <span className="text-sm font-bold text-blue-400 tabular-nums">
                  {kpi.drive_in_progress + kpi.upcoming_drive}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs text-slate-300">Selections per Completed Drive</span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                  {kpi.completed > 0 ? (kpi.total_offers / kpi.completed).toFixed(1) : '0'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-300">Total Selection Yield</span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {kpi.total_offers} Offers
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/tpo/weekly-tracker"
            className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-xs"
          >
            <span>Explore All Company Details</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
