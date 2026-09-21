'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  CheckCircle2,
  XCircle,
  Ban,
  Building2,
  TrendingUp,
  Target,
  BarChart3,
  LayoutGrid,
  Sparkles,
  Zap,
  ArrowUpRight,
  PieChart,
  Layers,
  ChevronRight
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

// Vibrant theme colors for college badges and bars
const COLLEGE_PALETTES = [
  {
    name: 'indigo',
    primary: '#6366f1',
    light: '#e0e7ff',
    dark: '#312e81',
    border: '#c7d2fe',
    badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    bar: 'from-indigo-500 to-indigo-600',
  },
  {
    name: 'cyan',
    primary: '#06b6d4',
    light: '#cffafe',
    dark: '#164e63',
    border: '#a5f3fc',
    badge: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    bar: 'from-cyan-500 to-cyan-600',
  },
  {
    name: 'emerald',
    primary: '#10b981',
    light: '#d1fae5',
    dark: '#064e3b',
    border: '#a7f3d0',
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    bar: 'from-emerald-500 to-emerald-600',
  },
  {
    name: 'amber',
    primary: '#f59e0b',
    light: '#fef3c7',
    dark: '#78350f',
    border: '#fde68a',
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    bar: 'from-amber-500 to-amber-600',
  },
  {
    name: 'purple',
    primary: '#8b5cf6',
    light: '#ede9fe',
    dark: '#4c1d95',
    border: '#ddd6fe',
    badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    bar: 'from-purple-500 to-purple-600',
  },
  {
    name: 'rose',
    primary: '#f43f5e',
    light: '#ffe4e6',
    dark: '#881337',
    border: '#fecdd3',
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    bar: 'from-rose-500 to-rose-600',
  },
];

type MetricFilter = 'all' | 'calls' | 'positives' | 'negatives' | 'not_hiring' | 'rate';
type ViewMode = 'chart' | 'cards' | 'split';

export function CoordinatorCollegeKpiCards({ selectedCollegeIds }: Props) {
  const [kpiData, setKpiData] = useState<CollegeKpiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('all');
  const [hoveredCollegeId, setHoveredCollegeId] = useState<string | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);

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
        if ((res.data as any).colleges.length > 0 && !selectedCollegeId) {
          setSelectedCollegeId((res.data as any).colleges[0].college_id);
        }
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

  // Aggregated calculations for interactive analytics
  const {
    totalCalls,
    totalPositives,
    totalNegatives,
    totalNotHiring,
    avgPositiveRate,
    topCollege,
    maxMetricValue,
  } = useMemo(() => {
    let calls = 0;
    let positives = 0;
    let negatives = 0;
    let notHiring = 0;
    let maxVal = 1;
    let top = kpiData[0] || null;

    kpiData.forEach((item) => {
      calls += item.total_calls || 0;
      positives += item.total_positives || 0;
      negatives += item.total_negatives || 0;
      notHiring += item.total_not_hiring || 0;

      if (!top || item.total_positives > (top.total_positives || 0)) {
        top = item;
      }

      const itemMax = Math.max(
        item.total_calls || 0,
        item.total_positives || 0,
        item.total_negatives || 0,
        item.total_not_hiring || 0
      );
      if (itemMax > maxVal) maxVal = itemMax;
    });

    const avgRate = calls > 0 ? Math.round((positives / calls) * 100) : 0;

    return {
      totalCalls: calls,
      totalPositives: positives,
      totalNegatives: negatives,
      totalNotHiring: notHiring,
      avgPositiveRate: avgRate,
      topCollege: top,
      maxMetricValue: Math.max(5, maxVal),
    };
  }, [kpiData]);

  const activeFocusCollege = useMemo(() => {
    const activeId = hoveredCollegeId || selectedCollegeId;
    return kpiData.find((c) => c.college_id === activeId) || kpiData[0] || null;
  }, [hoveredCollegeId, selectedCollegeId, kpiData]);

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
    <div className="space-y-4 select-none">
      {/* ── Section Title & Interactive Controls Bar ─────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface border border-border/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Target size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-fg">
                Campus Outreach &amp; Conversion Analytics
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {kpiData.length} {kpiData.length === 1 ? 'Campus' : 'Campuses'}
              </span>
            </div>
            <p className="text-[11px] text-fg-subtle mt-0.5">
              Interactive multi-institutional telemetry, outreach volume, and yield performance
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
                  ? 'bg-primary text-primary-fg shadow-xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
              title="Interactive comparative graph view"
            >
              <BarChart3 size={13} />
              <span>Interactive Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-primary text-primary-fg shadow-xs'
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
                  ? 'bg-primary text-primary-fg shadow-xs'
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

      {/* ── 1. Interactive Colourful Graph View ──────────────────────── */}
      {(viewMode === 'chart' || viewMode === 'split') && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-surface-sunken/40 shadow-sm overflow-hidden p-5 sm:p-6 space-y-6">
          
          {/* Top Filter Bar: Metric Filters & Graph Legend */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
            {/* Metric Selector Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle mr-1">
                Filter Metric:
              </span>
              {[
                { id: 'all', label: 'All Metrics', color: 'bg-primary/10 text-primary border-primary/20' },
                { id: 'calls', label: 'Calls Made', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
                { id: 'positives', label: 'Positives', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                { id: 'negatives', label: 'Negatives', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
                { id: 'not_hiring', label: 'Not Hiring', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                { id: 'rate', label: 'Positive Rate %', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetricFilter(m.id as MetricFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    metricFilter === m.id
                      ? `${m.color} ring-2 ring-primary/20 font-black shadow-xs`
                      : 'bg-surface border-border text-fg-subtle hover:text-fg hover:bg-surface-sunken'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Quick Summary Pill Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
                <Sparkles size={13} />
                Team Yield: {avgPositiveRate}%
              </span>
            </div>
          </div>

          {/* ── Main Chart Body: SVG / Pure React Animated Bar Chart ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left/Center: Visual Grouped Bar Columns */}
            <div className="lg:col-span-8 space-y-4">
              <div className="h-64 sm:h-72 w-full flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-border relative">
                {/* Background horizontal grid guide lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-border w-full" />
                  <div className="border-b border-dashed border-border w-full" />
                  <div className="border-b border-dashed border-border w-full" />
                  <div className="border-b border-border w-full" />
                </div>

                {kpiData.map((item, idx) => {
                  const acronym = getCollegeAcronym({
                    college_code: item.college_code,
                    college_name: item.college_name,
                    college_id: item.college_id,
                  }) || item.college_code || `C${idx + 1}`;

                  const palette = COLLEGE_PALETTES[idx % COLLEGE_PALETTES.length];
                  const isHovered = hoveredCollegeId === item.college_id;
                  const isSelected = selectedCollegeId === item.college_id;

                  // Height calculations
                  const callsPct = Math.max(6, (item.total_calls / maxMetricValue) * 100);
                  const positivesPct = Math.max(6, (item.total_positives / maxMetricValue) * 100);
                  const negativesPct = Math.max(6, (item.total_negatives / maxMetricValue) * 100);
                  const notHiringPct = Math.max(6, (item.total_not_hiring / maxMetricValue) * 100);
                  const ratePct = Math.max(6, item.positive_rate);

                  return (
                    <div
                      key={item.college_id}
                      onMouseEnter={() => setHoveredCollegeId(item.college_id)}
                      onMouseLeave={() => setHoveredCollegeId(null)}
                      onClick={() => setSelectedCollegeId(item.college_id)}
                      className={`flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group transition-transform ${
                        isSelected ? 'scale-[1.03]' : 'hover:scale-[1.02]'
                      }`}
                    >
                      {/* Interactive Floating Hover / Active Metric Indicator */}
                      {(isHovered || isSelected) && (
                        <div className="absolute -top-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                          {metricFilter === 'rate'
                            ? `${item.positive_rate}% Positives`
                            : metricFilter === 'calls'
                            ? `${item.total_calls} Calls`
                            : metricFilter === 'positives'
                            ? `${item.total_positives} Positives`
                            : `${item.total_calls} Calls • ${item.total_positives} Pos`}
                        </div>
                      )}

                      {/* Bar Group Container */}
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full z-10 px-1">
                        {metricFilter === 'all' ? (
                          <>
                            {/* Bar 1: Calls Made */}
                            <div
                              className="w-full max-w-[14px] rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-500 opacity-90 group-hover:opacity-100 transition-all duration-500 relative shadow-xs"
                              style={{ height: `${callsPct}%` }}
                              title={`Calls: ${item.total_calls}`}
                            />
                            {/* Bar 2: Positives */}
                            <div
                              className="w-full max-w-[14px] rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-400 opacity-90 group-hover:opacity-100 transition-all duration-500 relative shadow-xs"
                              style={{ height: `${positivesPct}%` }}
                              title={`Positives: ${item.total_positives}`}
                            />
                            {/* Bar 3: Negatives */}
                            <div
                              className="w-full max-w-[14px] rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 opacity-80 group-hover:opacity-100 transition-all duration-500 relative shadow-xs"
                              style={{ height: `${negativesPct}%` }}
                              title={`Negatives: ${item.total_negatives}`}
                            />
                            {/* Bar 4: Not Hiring */}
                            <div
                              className="w-full max-w-[14px] rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400 opacity-80 group-hover:opacity-100 transition-all duration-500 relative shadow-xs"
                              style={{ height: `${notHiringPct}%` }}
                              title={`Not Hiring: ${item.total_not_hiring}`}
                            />
                          </>
                        ) : metricFilter === 'calls' ? (
                          <div
                            className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-400 shadow-md transition-all duration-500"
                            style={{ height: `${callsPct}%` }}
                          >
                            <span className="block text-center text-[10px] font-mono font-bold text-white pt-1">
                              {item.total_calls}
                            </span>
                          </div>
                        ) : metricFilter === 'positives' ? (
                          <div
                            className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md transition-all duration-500"
                            style={{ height: `${positivesPct}%` }}
                          >
                            <span className="block text-center text-[10px] font-mono font-bold text-white pt-1">
                              {item.total_positives}
                            </span>
                          </div>
                        ) : metricFilter === 'negatives' ? (
                          <div
                            className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-rose-600 to-rose-400 shadow-md transition-all duration-500"
                            style={{ height: `${negativesPct}%` }}
                          >
                            <span className="block text-center text-[10px] font-mono font-bold text-white pt-1">
                              {item.total_negatives}
                            </span>
                          </div>
                        ) : metricFilter === 'not_hiring' ? (
                          <div
                            className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 shadow-md transition-all duration-500"
                            style={{ height: `${notHiringPct}%` }}
                          >
                            <span className="block text-center text-[10px] font-mono font-bold text-white pt-1">
                              {item.total_not_hiring}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-purple-600 to-indigo-400 shadow-md transition-all duration-500"
                            style={{ height: `${ratePct}%` }}
                          >
                            <span className="block text-center text-[10px] font-mono font-bold text-white pt-1">
                              {item.positive_rate}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-Axis College Labels & Badges */}
              <div className="flex items-center justify-between gap-3 sm:gap-6 px-2">
                {kpiData.map((item, idx) => {
                  const acronym = getCollegeAcronym({
                    college_code: item.college_code,
                    college_name: item.college_name,
                    college_id: item.college_id,
                  }) || item.college_code || `C${idx + 1}`;

                  const palette = COLLEGE_PALETTES[idx % COLLEGE_PALETTES.length];
                  const isSelected = selectedCollegeId === item.college_id;
                  const isHovered = hoveredCollegeId === item.college_id;

                  return (
                    <button
                      key={item.college_id}
                      type="button"
                      onClick={() => setSelectedCollegeId(item.college_id)}
                      onMouseEnter={() => setHoveredCollegeId(item.college_id)}
                      onMouseLeave={() => setHoveredCollegeId(null)}
                      className={`flex-1 text-center py-1.5 px-1 rounded-xl transition-all border ${
                        isSelected || isHovered
                          ? `${palette.badge} ring-2 ring-primary/20 shadow-xs scale-105`
                          : 'bg-surface-sunken/40 border-border/60 hover:bg-surface-sunken'
                      }`}
                    >
                      <span className="font-mono text-xs font-extrabold block truncate">
                        {acronym}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        {item.positive_rate}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap pt-2 text-[11px] font-medium text-fg-subtle">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                  <span>Calls Made</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span>Positives</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>Negatives</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span>Not Hiring</span>
                </div>
              </div>
            </div>

            {/* Right: Selected College Deep-Dive & Action Card */}
            <div className="lg:col-span-4 bg-surface rounded-xl border border-border p-4 shadow-xs space-y-4">
              {activeFocusCollege ? (
                <>
                  <div className="flex items-start justify-between gap-2 border-b border-border/80 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          [{getCollegeAcronym(activeFocusCollege) || activeFocusCollege.college_code}]
                        </span>
                        <span className="text-xs font-bold text-fg truncate">
                          {activeFocusCollege.college_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-fg-subtle mt-1 flex items-center gap-1">
                        <TrendingUp size={12} className="text-emerald-500" />
                        Yield Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{activeFocusCollege.positive_rate}%</strong>
                      </p>
                    </div>
                  </div>

                  {/* Metric Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-blue-700 dark:text-blue-400 block">
                          Calls Made
                        </span>
                        <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                          {activeFocusCollege.total_calls}
                        </span>
                      </div>
                      <PhoneCall size={14} className="text-blue-500 opacity-80" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                          Positives
                        </span>
                        <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {activeFocusCollege.total_positives}
                        </span>
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-500 opacity-80" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                          Negatives
                        </span>
                        <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                          {activeFocusCollege.total_negatives}
                        </span>
                      </div>
                      <XCircle size={14} className="text-rose-500 opacity-80" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                          Not Hiring
                        </span>
                        <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                          {activeFocusCollege.total_not_hiring}
                        </span>
                      </div>
                      <Ban size={14} className="text-amber-500 opacity-80" />
                    </div>
                  </div>

                  {/* Share of Handled Portfolio */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-fg-subtle">
                      <span>Share of Total Calls:</span>
                      <strong className="font-mono text-fg">
                        {totalCalls > 0 ? Math.round((activeFocusCollege.total_calls / totalCalls) * 100) : 0}%
                      </strong>
                    </div>
                    <div className="w-full bg-surface-sunken h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${totalCalls > 0 ? (activeFocusCollege.total_calls / totalCalls) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Action Link to Tracker */}
                  <Link
                    href="/tracker"
                    onClick={() => {
                      setActiveCollege(activeFocusCollege.college_id, activeFocusCollege.college_name);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-primary text-primary-fg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary-hover transition-colors"
                  >
                    <span>Open Tracker For [{getCollegeAcronym(activeFocusCollege) || activeFocusCollege.college_code}]</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </>
              ) : null}
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
                        className="min-w-0 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-fg hover:text-primary transition-colors group truncate"
                      >
                        <Building2 size={13} className="text-primary shrink-0 opacity-80 group-hover:opacity-100" />
                        {acronym && (
                          <span className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded-md ${palette.badge} shrink-0 tracking-wider`}>
                            [{acronym}]
                          </span>
                        )}
                        <span className="truncate group-hover:underline">{item.college_name}</span>
                      </Link>
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
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
