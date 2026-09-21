'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  CheckCircle2,
  Ban,
  Building2,
  Target,
  BarChart3,
  LayoutGrid,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getCoordinatorSelectedColleges, setActiveCollege, getCollegeAcronym } from '@/lib/collegeSession';

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

const COLLEGE_PALETTES = [
  {
    name: 'indigo',
    badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  {
    name: 'cyan',
    badge: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  {
    name: 'emerald',
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  {
    name: 'amber',
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  {
    name: 'purple',
    badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    name: 'rose',
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
];

type MetricFilter = 'all' | 'calls' | 'positives' | 'not_hiring';
type ViewMode = 'chart' | 'cards' | 'split';

export function CoordinatorCollegeKpiCards({ selectedCollegeIds }: Props) {
  const [kpiData, setKpiData] = useState<CollegeKpiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('all');
  const [hoveredCollegeId, setHoveredCollegeId] = useState<string | null>(null);

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

  // Auto-refresh daily at midnight and on tab visibility
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const msUntilMidnight = Math.max(1000, tomorrow.getTime() - now.getTime());

    const midnightTimer = setTimeout(() => {
      fetchKpis(selectedCollegeIds);
      const dailyInterval = setInterval(() => {
        fetchKpis(selectedCollegeIds);
      }, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

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

  // Compute maximum metric value across all displayed colleges for proper chart scale
  const maxMetricValue = useMemo(() => {
    let maxVal = 1;
    kpiData.forEach((item) => {
      if (metricFilter === 'all') {
        const itemMax = Math.max(
          item.total_calls || 0,
          item.total_positives || 0,
          item.total_not_hiring || 0
        );
        if (itemMax > maxVal) maxVal = itemMax;
      } else if (metricFilter === 'calls') {
        if ((item.total_calls || 0) > maxVal) maxVal = item.total_calls;
      } else if (metricFilter === 'positives') {
        if ((item.total_positives || 0) > maxVal) maxVal = item.total_positives;
      } else if (metricFilter === 'not_hiring') {
        if ((item.total_not_hiring || 0) > maxVal) maxVal = item.total_not_hiring;
      }
    });
    // Set a comfortable round ceiling
    if (maxVal <= 5) return 10;
    if (maxVal <= 15) return 20;
    if (maxVal <= 30) return 40;
    if (maxVal <= 60) return 80;
    return Math.ceil(maxVal * 1.25);
  }, [kpiData, metricFilter]);

  if (loading && kpiData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-surface-sunken animate-pulse rounded-lg" />
        </div>
        <div className="h-96 rounded-2xl bg-surface-sunken animate-pulse border border-border" />
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
    <div className="space-y-4 select-none">
      {/* ── Section Title & Interactive Controls Bar ─────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Target size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-fg">
                Campus Outreach &amp; Conversion Analytics
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-mono">
                {kpiData.length} {kpiData.length === 1 ? 'Campus' : 'Campuses'}
              </span>
            </div>
            <p className="text-[11px] text-fg-subtle mt-0.5">
              Multi-institutional live comparative telemetry across partner colleges
            </p>
          </div>
        </div>

        {/* View Mode Segmented Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-surface-sunken p-0.5 rounded-xl border border-border flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-zinc-200 dark:border-zinc-700'
                  : 'text-fg-subtle hover:text-fg'
              }`}
              title="Full-width interactive comparative graph view"
            >
              <BarChart3 size={13} />
              <span>Interactive Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-zinc-200 dark:border-zinc-700'
                  : 'text-fg-subtle hover:text-fg'
              }`}
              title="Combined Graph & Cards View"
            >
              <Layers size={13} />
              <span>Combined</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-zinc-200 dark:border-zinc-700'
                  : 'text-fg-subtle hover:text-fg'
              }`}
              title="Individual Campus KPI Cards"
            >
              <LayoutGrid size={13} />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Full-Width Interactive Graph Paper Chart ──────────────── */}
      {(viewMode === 'chart' || viewMode === 'split') && (
        <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-5 sm:p-7 space-y-6 w-full">
          
          {/* Top Filter Bar: Only All Metrics, Calls Made, Positives, Not Hiring */}
          <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle mr-1">
                Filter Metric:
              </span>
              {[
                { id: 'all', label: 'All Metrics', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
                { id: 'calls', label: 'Calls Made', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
                { id: 'positives', label: 'Positives', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
                { id: 'not_hiring', label: 'Not Hiring', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetricFilter(m.id as MetricFilter)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    metricFilter === m.id
                      ? `${m.color} ring-2 ring-blue-500/20 font-black shadow-xs`
                      : 'bg-surface-sunken/60 border-border text-fg-subtle hover:text-fg hover:bg-surface-sunken'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-fg-subtle font-medium hidden sm:block">
              Comparing outreach across <strong className="text-fg font-mono">{kpiData.length}</strong> partner colleges
            </div>
          </div>

          {/* ── Full Width Graph Paper Styled Chart ── */}
          <div className="w-full space-y-4">
            
            {/* Chart Area with Mild Grey Graph Paper Texture */}
            <div className="h-80 sm:h-96 w-full flex items-end justify-between gap-4 sm:gap-8 pt-8 pb-3 px-6 sm:px-10 border border-zinc-200 dark:border-zinc-800 relative rounded-2xl overflow-hidden ipoms-graph-paper">
              
              {/* Background Horizontal Guide Scale with Dark Numbers */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none px-4 pt-6 pb-3">
                <div className="border-b border-zinc-300/80 dark:border-zinc-700/80 w-full flex items-center justify-between text-xs font-mono font-black text-zinc-900 dark:text-zinc-100">
                  <span>{maxMetricValue}</span>
                </div>
                <div className="border-b border-dashed border-zinc-300/60 dark:border-zinc-700/60 w-full flex items-center justify-between text-xs font-mono font-black text-zinc-800 dark:text-zinc-200">
                  <span>{Math.round(maxMetricValue * 0.75)}</span>
                </div>
                <div className="border-b border-dashed border-zinc-300/60 dark:border-zinc-700/60 w-full flex items-center justify-between text-xs font-mono font-black text-zinc-800 dark:text-zinc-200">
                  <span>{Math.round(maxMetricValue * 0.5)}</span>
                </div>
                <div className="border-b border-dashed border-zinc-300/60 dark:border-zinc-700/60 w-full flex items-center justify-between text-xs font-mono font-black text-zinc-800 dark:text-zinc-200">
                  <span>{Math.round(maxMetricValue * 0.25)}</span>
                </div>
                <div className="border-b-2 border-zinc-400 dark:border-zinc-600 w-full flex items-center justify-between text-xs font-mono font-black text-zinc-900 dark:text-zinc-100">
                  <span>0</span>
                </div>
              </div>

              {/* College Bar Columns */}
              {kpiData.map((item, idx) => {
                const isHovered = hoveredCollegeId === item.college_id;
                const acronym = getCollegeAcronym({
                  college_code: item.college_code,
                  college_name: item.college_name,
                  college_id: item.college_id,
                }) || item.college_code || `C${idx + 1}`;

                // Height calculation:
                // 1 cm = 38px height for 0 value.
                // For positive values, scale from 38px (1cm) up to 100% of chart height.
                const getBarHeight = (val: number) => {
                  if (!val || val === 0) return '38px'; // 1 cm baseline height
                  const pct = Math.min(100, Math.max(14, (val / maxMetricValue) * 100));
                  return `max(38px, ${pct}%)`;
                };

                return (
                  <div
                    key={item.college_id}
                    onMouseEnter={() => setHoveredCollegeId(item.college_id)}
                    onMouseLeave={() => setHoveredCollegeId(null)}
                    className={`flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group transition-all duration-200 ${
                      isHovered ? 'scale-[1.02]' : ''
                    }`}
                  >
                    {/* Floating Hover Card with Clean Light Background */}
                    {isHovered && (
                      <div className="absolute -top-12 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl pointer-events-none z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-sans font-bold">
                          {acronym}:
                        </span>
                        <span>{item.total_calls} Calls</span>
                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{item.total_positives} Positives</span>
                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                        <span className="text-amber-600 dark:text-amber-400">{item.total_not_hiring} Not Hiring</span>
                      </div>
                    )}

                    {/* Grouped 3 Bars: Calls Made, Positives, Not Hiring */}
                    <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full z-10 px-1">
                      {metricFilter === 'all' ? (
                        <>
                          {/* 1. Calls Made Bar (1cm height for 0) */}
                          <div className="flex-1 max-w-[32px] sm:max-w-[42px] flex flex-col items-center justify-end h-full">
                            <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 mb-1">
                              {item.total_calls}
                            </span>
                            <div
                              className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm group-hover:from-blue-500 group-hover:to-indigo-400 transition-all duration-500 border-t border-x border-blue-400/40"
                              style={{ height: getBarHeight(item.total_calls) }}
                              title={`Calls Made: ${item.total_calls}`}
                            />
                          </div>

                          {/* 2. Positives Bar (1cm height for 0) */}
                          <div className="flex-1 max-w-[32px] sm:max-w-[42px] flex flex-col items-center justify-end h-full">
                            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 mb-1">
                              {item.total_positives}
                            </span>
                            <div
                              className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm group-hover:from-emerald-500 group-hover:to-teal-300 transition-all duration-500 border-t border-x border-emerald-400/40"
                              style={{ height: getBarHeight(item.total_positives) }}
                              title={`Positives: ${item.total_positives}`}
                            />
                          </div>

                          {/* 3. Not Hiring Bar (1cm height for 0) */}
                          <div className="flex-1 max-w-[32px] sm:max-w-[42px] flex flex-col items-center justify-end h-full">
                            <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 mb-1">
                              {item.total_not_hiring}
                            </span>
                            <div
                              className="w-full rounded-t-xl bg-gradient-to-t from-amber-600 to-amber-400 shadow-sm group-hover:from-amber-500 group-hover:to-amber-300 transition-all duration-500 border-t border-x border-amber-400/40"
                              style={{ height: getBarHeight(item.total_not_hiring) }}
                              title={`Not Hiring: ${item.total_not_hiring}`}
                            />
                          </div>
                        </>
                      ) : metricFilter === 'calls' ? (
                        <div className="w-full max-w-[72px] flex flex-col items-center justify-end h-full">
                          <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400 mb-1">
                            {item.total_calls}
                          </span>
                          <div
                            className="w-full rounded-t-2xl bg-gradient-to-t from-blue-600 to-indigo-500 shadow-md transition-all duration-500 border-t border-x border-blue-400/40"
                            style={{ height: getBarHeight(item.total_calls) }}
                          />
                        </div>
                      ) : metricFilter === 'positives' ? (
                        <div className="w-full max-w-[72px] flex flex-col items-center justify-end h-full">
                          <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 mb-1">
                            {item.total_positives}
                          </span>
                          <div
                            className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md transition-all duration-500 border-t border-x border-emerald-400/40"
                            style={{ height: getBarHeight(item.total_positives) }}
                          />
                        </div>
                      ) : (
                        <div className="w-full max-w-[72px] flex flex-col items-center justify-end h-full">
                          <span className="text-sm font-mono font-black text-amber-600 dark:text-amber-400 mb-1">
                            {item.total_not_hiring}
                          </span>
                          <div
                            className="w-full rounded-t-2xl bg-gradient-to-t from-amber-600 to-amber-400 shadow-md transition-all duration-500 border-t border-x border-amber-400/40"
                            style={{ height: getBarHeight(item.total_not_hiring) }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── X-Axis Clean College Labels (No Boxed Cards) ── */}
            <div className="flex items-center justify-between gap-4 sm:gap-8 px-6 sm:px-10 pt-2">
              {kpiData.map((item, idx) => {
                const acronym = getCollegeAcronym({
                  college_code: item.college_code,
                  college_name: item.college_name,
                  college_id: item.college_id,
                }) || item.college_code || `C${idx + 1}`;

                const palette = COLLEGE_PALETTES[idx % COLLEGE_PALETTES.length];
                const isHovered = hoveredCollegeId === item.college_id;

                return (
                  <Link
                    key={item.college_id}
                    href="/tracker"
                    onClick={() => {
                      setActiveCollege(item.college_id, item.college_name);
                    }}
                    onMouseEnter={() => setHoveredCollegeId(item.college_id)}
                    onMouseLeave={() => setHoveredCollegeId(null)}
                    title={`${item.college_name} - Click to open Daily Tracker`}
                    className={`flex-1 text-center py-2 px-2 rounded-xl transition-all group flex flex-col items-center cursor-pointer ${
                      isHovered
                        ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 shadow-xs scale-105'
                        : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ${palette.badge} shadow-2xs group-hover:scale-105 transition-transform`}>
                      [{acronym}]
                    </span>
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate max-w-[120px] block mt-1">
                      {item.college_name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Bottom Color Legend */}
            <div className="flex items-center justify-center gap-8 flex-wrap pt-4 text-xs font-medium text-fg-subtle border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-t from-blue-600 to-indigo-500 shadow-xs" />
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Calls Made</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-t from-emerald-600 to-teal-400 shadow-xs" />
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Positives</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-t from-amber-600 to-amber-400 shadow-xs" />
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Not Hiring</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Detailed Per-College KPI Cards Grid ────────────────────── */}
      {(viewMode === 'cards' || viewMode === 'split') && (
        <div className={`grid ${gridColsClass} gap-3`}>
          {kpiData.map((item, idx) => {
            const acronym = getCollegeAcronym({
              college_code: item.college_code,
              college_name: item.college_name,
              college_id: item.college_id,
            });
            const palette = COLLEGE_PALETTES[idx % COLLEGE_PALETTES.length];

            return (
              <div
                key={item.college_id}
                className="rounded-xl border border-border/80 bg-surface shadow-2xs hover:border-border-strong hover:shadow-xs transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header: College Acronym & Name Link */}
                <div className="px-3.5 py-2.5 border-b border-border/60 bg-surface">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <Link
                        href="/tracker"
                        onClick={() => {
                          setActiveCollege(item.college_id, item.college_name);
                        }}
                        title={`${item.college_name} (${acronym || ''}) - Click to open tracker`}
                        className="min-w-0 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-fg hover:text-blue-600 transition-colors group truncate"
                      >
                        <Building2 size={13} className="text-blue-600 shrink-0 opacity-80 group-hover:opacity-100" />
                        {acronym && (
                          <span className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded-md ${palette.badge} shrink-0 tracking-wider`}>
                            [{acronym}]
                          </span>
                        )}
                        <span className="truncate group-hover:underline">{item.college_name}</span>
                      </Link>
                    </div>

                    {/* Light Theme Quick Action Link */}
                    <Link
                      href="/tracker"
                      onClick={() => {
                        setActiveCollege(item.college_id, item.college_name);
                      }}
                      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10.5px] font-bold flex items-center gap-0.5 transition-colors"
                    >
                      <span>Tracker</span>
                      <ArrowUpRight size={10} />
                    </Link>
                  </div>
                </div>

                {/* Minimal 3 KPI Metrics Grid */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-1.5">
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
                      <PhoneCall size={12} className="text-blue-500 shrink-0 opacity-70" />
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

                    {/* 3. Total Not Hiring Received */}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scoped Graph Paper Pattern Styling */}
      <style jsx>{`
        .ipoms-graph-paper {
          background-color: #f8fafc;
          background-image: 
            linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        :global(.dark) .ipoms-graph-paper {
          background-color: #0f172a;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
}
