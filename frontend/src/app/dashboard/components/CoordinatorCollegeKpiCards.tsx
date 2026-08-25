'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  CheckCircle2,
  XCircle,
  Ban,
  Building2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Target,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getCoordinatorSelectedColleges, setActiveCollege } from '@/lib/collegeSession';

interface CollegeKpiItem {
  college_id: string;
  college_name: string;
  college_code: string;
  location?: string;
  logo_url?: string;
  total_calls: number;
  total_positives: number;
  total_negatives: number;
  total_not_hiring: number;
  active_leads: number;
  weekly_pipeline: number;
  positive_rate: number;
}

interface Props {
  selectedCollegeIds?: string[];
}

export function CoordinatorCollegeKpiCards({ selectedCollegeIds }: Props) {
  const [kpiData, setKpiData] = useState<CollegeKpiItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKpis = async (ids?: string[]) => {
    try {
      setLoading(true);
      const targetIds = ids && ids.length > 0 ? ids : getCoordinatorSelectedColleges();
      const queryParam = targetIds.length > 0 ? `?college_ids=${targetIds.join(',')}` : '';
      const res = await apiFetch(`/dashboard/college-kpis${queryParam}`);
      if (res.success && Array.isArray((res.data as any)?.colleges)) {
        setKpiData((res.data as any).colleges);
      }
    } catch (err) {
      console.error('Failed to fetch college KPIs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis(selectedCollegeIds);
  }, [selectedCollegeIds]);

  // Listen to global changes
  useEffect(() => {
    const handleCollegesChange = (e: any) => {
      if (e.detail?.selectedIds) {
        fetchKpis(e.detail.selectedIds);
      } else {
        fetchKpis();
      }
    };
    window.addEventListener('ipoms_coordinator_colleges_changed', handleCollegesChange);
    return () => window.removeEventListener('ipoms_coordinator_colleges_changed', handleCollegesChange);
  }, []);

  if (loading && kpiData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-surface-sunken animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-surface-sunken animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (kpiData.length === 0) {
    return null;
  }

  const gridColsClass =
    kpiData.length === 1
      ? 'grid-cols-1'
      : kpiData.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-4">
      {/* ── Section Title ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-fg">
            Campus Outreach &amp; Conversion Analytics
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken border border-border text-fg-subtle">
            {kpiData.length} {kpiData.length === 1 ? 'Campus Card' : 'Campus Cards'}
          </span>
        </div>

        <p className="text-xs text-fg-subtle">
          Real-time metrics for your chosen focus institutions
        </p>
      </div>

      {/* ── Dynamic Per-College KPI Cards Grid ────────────────────────── */}
      <div className={`grid ${gridColsClass} gap-5`}>
        {kpiData.map((item, index) => {
          const totalOutreach = item.total_calls || 1;
          const positivePct = Math.round(((item.total_positives || 0) / totalOutreach) * 100);
          const notHiringPct = Math.round(((item.total_not_hiring || 0) / totalOutreach) * 100);
          const negativePct = Math.round(((item.total_negatives || 0) / totalOutreach) * 100);

          return (
            <div
              key={item.college_id}
              className="rounded-2xl border border-border bg-surface shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* Card Top Strip / Header */}
              <div className="p-5 border-b border-border/70 bg-gradient-to-br from-surface via-surface to-surface-sunken/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm px-2 py-0.5 rounded-md bg-blue-600/15 text-blue-700 dark:text-sky-300 border border-blue-600/25">
                        [{item.college_code}]
                      </span>
                      <span className="text-micro font-bold uppercase tracking-wider text-fg-subtle">
                        Focus #{index + 1}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-fg line-clamp-2 leading-tight">
                      {item.college_name}
                    </h3>
                  </div>

                  {/* Positive Rate Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/20 shadow-2xs">
                      <TrendingUp size={13} />
                      <span>{item.positive_rate}% Positive</span>
                    </div>
                  </div>
                </div>

                {item.location && (
                  <p className="text-micro text-fg-subtle truncate flex items-center gap-1.5">
                    <Building2 size={12} className="text-fg-subtle shrink-0" />
                    <span>{item.location}</span>
                  </p>
                )}
              </div>

              {/* Card 4 KPI Metrics Grid */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. Total Calls Made */}
                  <div className="p-3 rounded-xl bg-surface-sunken border border-border/80 flex flex-col justify-between space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-fg-subtle">
                      <span className="text-micro font-bold uppercase tracking-wider text-fg-subtle">
                        Calls Made
                      </span>
                      <PhoneCall size={14} className="text-blue-600 dark:text-sky-400" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-fg">
                      {item.total_calls}
                    </span>
                  </div>

                  {/* 2. Total Positives Received */}
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-500/30 flex flex-col justify-between space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                      <span className="text-micro font-bold uppercase tracking-wider">
                        Positives
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-700 dark:text-emerald-300">
                        {item.total_positives}
                      </span>
                      <span className="text-micro font-semibold text-emerald-600/80 dark:text-emerald-400/80 truncate">
                        (Hiring/Invite)
                      </span>
                    </div>
                  </div>

                  {/* 3. Total Negatives Received */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-fg-subtle">
                      <span className="text-micro font-bold uppercase tracking-wider">
                        Negatives
                      </span>
                      <XCircle size={14} className="text-rose-500 dark:text-rose-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-fg">
                        {item.total_negatives}
                      </span>
                      <span className="text-micro font-medium text-fg-subtle truncate">
                        (No Resp/Inv)
                      </span>
                    </div>
                  </div>

                  {/* 4. Total Not Hiring Received */}
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-500/30 flex flex-col justify-between space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                      <span className="text-micro font-bold uppercase tracking-wider">
                        Not Hiring
                      </span>
                      <Ban size={14} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-700 dark:text-amber-300">
                        {item.total_not_hiring}
                      </span>
                      <span className="text-micro font-medium text-amber-600/80 dark:text-amber-400/80 truncate">
                        (Closed)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Outcome Proportion Distribution Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-micro text-fg-subtle font-medium">
                    <span>Outcome Distribution</span>
                    <span>{item.total_calls} Total Calls Logged</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-sunken overflow-hidden flex">
                    {item.total_positives > 0 && (
                      <div
                        style={{ width: `${positivePct}%` }}
                        className="h-full bg-emerald-500"
                        title={`Positives: ${item.total_positives}`}
                      />
                    )}
                    {item.total_not_hiring > 0 && (
                      <div
                        style={{ width: `${notHiringPct}%` }}
                        className="h-full bg-amber-500"
                        title={`Not Hiring: ${item.total_not_hiring}`}
                      />
                    )}
                    {item.total_negatives > 0 && (
                      <div
                        style={{ width: `${negativePct}%` }}
                        className="h-full bg-slate-400 dark:bg-slate-600"
                        title={`Negatives: ${item.total_negatives}`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Quick Links */}
              <div className="px-5 py-3 border-t border-border bg-surface-sunken/30 flex items-center justify-between gap-3 text-xs">
                <Link
                  href={`/tracker`}
                  onClick={() => {
                    setActiveCollege(item.college_id, item.college_name);
                  }}
                  className="font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1.5 transition-colors group"
                >
                  <span>Open Daily Tracker</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href={`/daily-leads`}
                  onClick={() => {
                    setActiveCollege(item.college_id, item.college_name);
                  }}
                  className="text-fg-subtle hover:text-fg font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <span>Leads ({item.active_leads})</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
