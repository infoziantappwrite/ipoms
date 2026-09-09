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
      const targetIds = ids !== undefined ? ids : getCoordinatorSelectedColleges();
      if (!targetIds || targetIds.length === 0) {
        setKpiData([]);
        setLoading(false);
        return;
      }
      const queryParam = `?college_ids=${encodeURIComponent(targetIds.join(','))}`;
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

  // ── Auto-refresh every morning at 12:00:00 AM Midnight & on Tab Visibility ──
  useEffect(() => {
    // Calculate time until next 12:00:00 AM midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const msUntilMidnight = Math.max(1000, tomorrow.getTime() - now.getTime());

    const midnightTimer = setTimeout(() => {
      fetchKpis(selectedCollegeIds);
      // Recurring 24-hour interval after first midnight hit
      const dailyInterval = setInterval(() => {
        fetchKpis(selectedCollegeIds);
      }, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    // Re-check and refresh immediately when the user returns to the tab next morning
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchKpis(selectedCollegeIds);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(midnightTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      ? 'grid-cols-1 max-w-xl'
      : kpiData.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : kpiData.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : kpiData.length === 4
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-3">
      {/* ── Section Title ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <h2 className="text-sm font-bold tracking-tight text-fg">
            Campus Outreach &amp; Conversion Analytics
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-primary/10 text-primary border border-primary/20">
            {kpiData.length} {kpiData.length === 1 ? 'Campus' : 'Campuses'}
          </span>
        </div>

        <p className="text-[11px] text-fg-subtle">
          Today&apos;s outreach metrics (Refreshes daily at 12:00 AM)
        </p>
      </div>

      {/* ── Dynamic Per-College KPI Cards Grid ────────────────────────── */}
      <div className={`grid ${gridColsClass} gap-3`}>
        {kpiData.map((item, index) => {
          const totalOutreach = item.total_calls || 1;
          const positivePct = Math.round(((item.total_positives || 0) / totalOutreach) * 100);
          const notHiringPct = Math.round(((item.total_not_hiring || 0) / totalOutreach) * 100);
          const negativePct = Math.round(((item.total_negatives || 0) / totalOutreach) * 100);

          return (
            <div
              key={item.college_id}
              className="rounded-xl border border-border/80 bg-surface shadow-2xs hover:border-border-strong hover:shadow-xs transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header: Single Unified Link with College Details */}
              <div className="px-3.5 py-2.5 border-b border-border/60 bg-surface">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Link
                      href="/tracker"
                      onClick={() => {
                        setActiveCollege(item.college_id, item.college_name);
                      }}
                      title={`${item.college_name}${item.location ? ` • ${item.location}` : ''} (Click to open tracker)`}
                      className="min-w-0 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-fg hover:text-primary transition-colors group truncate"
                    >
                      <Building2 size={13} className="text-primary shrink-0 opacity-80 group-hover:opacity-100" />
                      <span className="truncate group-hover:underline">{item.college_name}</span>
                      {item.location && (
                        <span className="text-[11px] font-normal text-fg-subtle shrink-0 hidden sm:inline">
                          • {item.location}
                        </span>
                      )}
                    </Link>

                    <span className="text-[9.5px] font-semibold text-fg-subtle shrink-0 bg-surface-sunken/80 px-1.5 py-0.5 rounded border border-border/60">
                      Focus #{index + 1}
                    </span>
                  </div>

                  {/* Positive Rate Badge */}
                  <div className="flex items-center shrink-0">
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[10.5px] border border-emerald-500/20">
                      <TrendingUp size={11} />
                      <span>{item.positive_rate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimal 4 KPI Metrics Grid */}
              <div className="p-3 sm:p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-1.5">
                  {/* 1. Total Calls Made */}
                  <div className="p-2 rounded-lg bg-surface-sunken/60 border border-border/60 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider text-fg-subtle block truncate">
                        Calls Made
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-fg block">
                        {item.total_calls}
                      </span>
                    </div>
                    <PhoneCall size={12} className="text-primary shrink-0 opacity-70" />
                  </div>

                  {/* 2. Total Positives Received */}
                  <div className="p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block truncate">
                        Positives
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 block">
                        {item.total_positives}
                      </span>
                    </div>
                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0 opacity-80" />
                  </div>

                  {/* 3. Total Negatives Received */}
                  <div className="p-2 rounded-lg bg-surface-sunken/60 border border-border/60 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider text-fg-subtle block truncate">
                        Negatives
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-fg block">
                        {item.total_negatives}
                      </span>
                    </div>
                    <XCircle size={12} className="text-rose-500 shrink-0 opacity-70" />
                  </div>

                  {/* 4. Total Not Hiring Received */}
                  <div className="p-2 rounded-lg bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9.5px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
                        Not Hiring
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 block">
                        {item.total_not_hiring}
                      </span>
                    </div>
                    <Ban size={12} className="text-amber-600 dark:text-amber-400 shrink-0 opacity-80" />
                  </div>
                </div>

                {/* Minimal Proportion Bar */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] text-fg-subtle font-medium">
                    <span>Distribution</span>
                    <span>{item.total_calls} Calls Logged</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-surface-sunken overflow-hidden flex">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
