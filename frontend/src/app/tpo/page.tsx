'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { XCircle, ArrowUpRight } from 'lucide-react';
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
  ctc_distribution?: Record<string, number>;
}

interface TpoDashboardData {
  college: { name: string; code: string; logo_url?: string; location?: string } | null;
  kpi: TpoKpi;
}

/** ── CTC Distribution Bar Chart Component ───────────────────────────── */
function CtcDistributionChart({ kpi }: { kpi: TpoKpi }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const categories = [
    { key: '3 - 5 LPA', label: '3 – 5 LPA' },
    { key: '5 - 7 LPA', label: '5 – 7 LPA' },
    { key: '7 - 10 LPA', label: '7 – 10 LPA' },
    { key: '10+ LPA', label: '10+ LPA' },
    { key: 'Internship', label: 'Internship' },
  ];

  const distribution = kpi.ctc_distribution || {
    '3 - 5 LPA': 0,
    '5 - 7 LPA': 0,
    '7 - 10 LPA': 0,
    '10+ LPA': 0,
    Internship: 0,
  };

  const items = categories.map((c) => ({
    label: c.label,
    count: distribution[c.key] ?? 0,
  }));

  const maxVal = Math.max(...items.map((i) => i.count), 1);
  // Scale Y-axis upper limit to nice steps
  let upperLimit = Math.ceil(maxVal / 9) * 9;
  if (upperLimit < 9) upperLimit = Math.ceil(maxVal / 4) * 4 || 4;
  if (upperLimit < 4) upperLimit = 4;

  const yTicks = [
    upperLimit,
    Math.round((upperLimit * 3) / 4),
    Math.round((upperLimit * 2) / 4),
    Math.round(upperLimit / 4),
    0,
  ];

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs transition-all hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">CTC Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Companies grouped by salary range</p>
        </div>
        <Link
          href="/tpo/weekly-tracker"
          className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover transition-colors"
          title="View Tracker"
        >
          <span>View All</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Chart Canvas Area */}
      <div className="my-4 flex h-[230px] w-full items-end gap-2 pt-6">
        {/* Y Axis Labels */}
        <div className="flex h-full flex-col justify-between pb-6 text-right text-[11px] font-semibold text-slate-400 select-none w-6 shrink-0">
          {yTicks.map((tick, i) => (
            <span key={i} className="leading-none tabular-nums">
              {tick}
            </span>
          ))}
        </div>

        {/* Plot Area with Grid Lines and Bars */}
        <div className="relative flex h-full flex-1 flex-col justify-between pb-6">
          {/* Horizontal Dashed Grid Lines */}
          <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-6">
            {yTicks.map((_, i) => (
              <div key={i} className="w-full border-b border-dashed border-slate-200/70" />
            ))}
          </div>

          {/* Vertical Bars Grid */}
          <div className="relative z-10 grid h-full grid-cols-5 items-end gap-2 sm:gap-3 px-1">
            {items.map((item, idx) => {
              const isHovered = hoveredIndex === idx;
              const heightPct = upperLimit > 0 ? (item.count / upperLimit) * 100 : 0;
              const displayHeight = item.count > 0 ? Math.max(heightPct, 6) : 2;

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="group relative flex h-full flex-col items-center justify-end cursor-pointer"
                >
                  {/* Translucent Column Highlight on Hover */}
                  <div
                    className={`absolute inset-x-0.5 inset-y-0 rounded-xl transition-all duration-200 ${
                      isHovered ? 'bg-blue-50/80 shadow-2xs' : 'bg-transparent'
                    }`}
                  />

                  {/* Floating Tooltip Card */}
                  {isHovered && (
                    <div className="absolute -top-12 z-30 flex flex-col items-center rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150 pointer-events-none whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Companies <span className="font-extrabold text-blue-700">{item.count}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* The Gradient Bar */}
                  <div
                    style={{ height: `${displayHeight}%` }}
                    className={`relative z-10 w-8 sm:w-10 md:w-14 rounded-t-lg transition-all duration-500 ease-out ${
                      item.count > 0
                        ? 'bg-gradient-to-b from-[#06B6D4] to-[#2563EB] shadow-xs group-hover:brightness-110'
                        : 'bg-slate-200/70 rounded-t-sm'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X Axis Labels */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 pl-8 pr-1 border-t border-slate-100/90 pt-2 text-center text-[10px] sm:text-[11px] font-semibold text-slate-500">
        {items.map((item) => (
          <span key={item.label} className="truncate" title={item.label}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** ── Main TPO Dashboard Screen ─────────────────────────────────────────── */
export default function TpoDashboardPage() {
  const [data, setData] = useState<TpoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await apiFetch<TpoDashboardData>('/tpo/dashboard');
      if (res.success && res.data) {
        setData(res.data);
        setError('');
      } else if (!isBackground) {
        setError(res.error?.message || 'Could not load the dashboard.');
      }
    } catch {
      if (!isBackground) setError('Cannot reach the iPOMS server.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    // Auto-refresh interval every 5 seconds for real-time live monitoring
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 5000);

    // BroadcastChannel real-time sync with Placement Coordinator & Weekly Tracker updates
    let ch1: BroadcastChannel | null = null;
    let ch2: BroadcastChannel | null = null;
    let ch3: BroadcastChannel | null = null;
    let chTpo: BroadcastChannel | null = null;
    try {
      ch1 = new BroadcastChannel('ipoms_tracker_sync');
      ch1.onmessage = () => loadDashboard(true);
      ch2 = new BroadcastChannel('ipoms_weekly_sync');
      ch2.onmessage = () => loadDashboard(true);
      ch3 = new BroadcastChannel('ipoms_daily_leads_sync');
      ch3.onmessage = () => loadDashboard(true);
      chTpo = new BroadcastChannel('ipoms_tpo_sync_channel');
      chTpo.onmessage = () => loadDashboard(true);
    } catch {}

    const handleTpoSync = () => loadDashboard(true);
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('ipoms_')) loadDashboard(true);
    };
    const handleFocus = () => loadDashboard(true);

    window.addEventListener('ipoms_tpo_sync', handleTpoSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      ch1?.close();
      ch2?.close();
      ch3?.close();
      chTpo?.close();
      window.removeEventListener('ipoms_tpo_sync', handleTpoSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadDashboard]);

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

  return (
    <div className="space-y-4">
      <CtcDistributionChart kpi={kpi} />
    </div>
  );
}
