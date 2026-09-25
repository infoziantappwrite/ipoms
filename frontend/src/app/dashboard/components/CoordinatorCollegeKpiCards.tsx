'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getCoordinatorSelectedColleges } from '@/lib/collegeSession';
import { readSessionUser } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';

/**
 * Monthly Call Trend + campus outcomes, one card (21 Sep 2026).
 *
 * Left: a heat strip — one row per campus, one square per day of the month,
 * darker = more calls (or minutes). Right: that campus's Positive / Not Hiring /
 * Negative / Follow Up counts for the selected day (today by default) or the
 * whole month. Clicking a day selects it. This replaced a separate "Campus
 * Outcome Mix — Today" card, so the dashboard shows both in half the space.
 *
 * Outcome buckets are decided server-side (OUTCOME_BUCKET in server.ts).
 * Other Progress and calls with no outcome yet are counted in Calls but have
 * no column of their own (user decision).
 */

type ShownBucket = 'positive' | 'not_hiring' | 'negative' | 'follow_up';

interface MonthlySeries {
  college_id: string;
  college_code: string;
  daily: number[];
  daily_duration?: number[];
  daily_outcomes?: Record<ShownBucket, number[]>;
  /** JD Received calls per day. Their day squares turn a different colour from the blue scale. */
  daily_jd?: number[];
  total: number;
  total_duration_minutes?: number;
}

interface MonthlyData {
  month: string;
  days_in_month: number;
  is_current_month: boolean;
  today_day: number | null;
  is_last_day_of_month: boolean;
  series: MonthlySeries[];
}

interface Props {
  selectedCollegeIds?: string[];
}

const OUTCOMES: { key: ShownBucket; label: string; detail: string }[] = [
  { key: 'positive', label: 'Positive', detail: 'Invite Mail' },
  { key: 'not_hiring', label: 'Not Hiring', detail: 'Not Hiring, Hiring Freezed' },
  { key: 'negative', label: 'Negative', detail: 'No Response, Invalid, In Connect, Hiring Completed' },
  { key: 'follow_up', label: 'Follow Up', detail: 'Follow Up, Call Back' },
];

const HEAT_STEPS = ['--ipoms-hm-1', '--ipoms-hm-2', '--ipoms-hm-3', '--ipoms-hm-4', '--ipoms-hm-5'];

interface Tip {
  x: number;
  top: number;
  bottom: number;
  lines: string[];
}

function fmtMins(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

const sum = (a: number[] = [], upTo?: number) => a.slice(0, upTo ?? a.length).reduce((x, y) => x + (y || 0), 0);

export function CoordinatorCollegeKpiCards({ selectedCollegeIds }: Props) {
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const user = readSessionUser();
      const userName = (user?.full_name || '').toLowerCase();
      const userEmail = (user?.official_email || (user as any)?.email || '').toLowerCase();
      const isAllCollegesLeader =
        Boolean((user as any)?.has_all_colleges_access) ||
        userName.includes('malvika') ||
        userName.includes('malavika') ||
        userName.includes('sujitha') ||
        userEmail.includes('malavika') ||
        userEmail.includes('malvika') ||
        userEmail.includes('sujitha') ||
        Boolean(user?.role_codes?.includes('ADMIN') || user?.role_codes?.includes('SUPER_ADMIN') || (user as any)?.role === 'admin' || (user as any)?.role === 'super_admin');

      let queryParam = '';
      if (selectedCollegeIds && selectedCollegeIds.length > 0) {
        queryParam = `?college_ids=${encodeURIComponent(selectedCollegeIds.join(','))}`;
      } else if (isAllCollegesLeader) {
        queryParam = `?college_ids=all`;
      }

      const res = await apiFetch(`/dashboard/monthly-calls${queryParam}`);
      if (res.success && res.data) setMonthly(res.data as MonthlyData);
    } catch (err) {
      console.error('Failed to fetch monthly call trend', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCollegeIds]);

  const handleSync = useCallback(async () => {
    triggerHaptic('light');
    setIsSyncing(true);
    await fetchAll();
    setTimeout(() => {
      setIsSyncing(false);
      toast('Monthly call trend synchronized', 'success');
    }, 400);
  }, [fetchAll, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Re-read on the same real events as the calling-time widget: a Daily Tracker
  // save (its own broadcast), returning to the tab, and the coordinator changing
  // their focus colleges.
  useEffect(() => {
    const refresh = () => {
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour >= 19) return;
      fetchAll();
    };
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('ipoms_tracker_sync');
      channel.onmessage = refresh;
    } catch {
      // unsupported — visibility refresh still covers the common flow
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onCollegesChange = () => fetchAll();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('ipoms_coordinator_colleges_changed', onCollegesChange);
    return () => {
      try { channel?.close(); } catch { /* closed */ }
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('ipoms_coordinator_colleges_changed', onCollegesChange);
    };
  }, [fetchAll]);

  const showTip = (e: React.MouseEvent | React.FocusEvent, lines: string[]) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = 'clientX' in e ? e.clientX : r.left + r.width / 2;
    setTip({ x: mx, top: r.top, bottom: r.bottom, lines });
  };
  const hideTip = () => setTip(null);

  const monthLabel = useMemo(() => {
    if (!monthly) return '';
    const [y, m] = monthly.month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [monthly]);

  if (loading && !monthly) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-xs text-fg-subtle">
        Loading monthly call trend…
      </div>
    );
  }

  return (
    <div>
      <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <LineChart size={17} strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-fg">Monthly Call Trend — {monthLabel || 'This Month'}</h3>
              <p className="text-[11px] text-fg-subtle mt-0.5">
                Calls per day, per campus · click any day to see its details
              </p>
            </div>
          </div>

          {/* Sync Button (Blue Shade, Icon-Only) */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            title="Synchronize monthly call trend data"
            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-600 dark:text-blue-400 border border-blue-500/30 dark:border-blue-400/40 transition-all cursor-pointer shadow-2xs disabled:opacity-50 group/sync shrink-0"
          >
            <RefreshCw
              size={15}
              className={`transition-transform ${isSyncing ? 'animate-spin' : 'group-hover/sync:rotate-180 duration-500'}`}
            />
          </button>
        </div>

        {monthly && monthly.series.length > 0 ? (
          <MonthChart data={monthly} onTip={showTip} onHideTip={hideTip} />
        ) : (
          <p className="text-xs text-fg-subtle pt-4">No focus campuses selected.</p>
        )}
      </section>

      {tip && (() => {
        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
        const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
        // If the element's bottom is within 110px of window bottom, flip tooltip above
        const isNearBottom = tip.bottom + 110 > winHeight;
        const leftPos = Math.min(Math.max(12, tip.x - 20), winWidth - 250);
        const topPos = isNearBottom ? Math.max(10, tip.top - 8) : tip.bottom + 8;
        return (
          <div
            role="tooltip"
            className="ipoms-tip"
            style={{
              left: leftPos,
              top: topPos,
              transform: isNearBottom ? 'translateY(-100%)' : undefined,
            }}
          >
            <b>{tip.lines[0]}</b>
            {tip.lines.slice(1).map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        );
      })()}

      <style jsx>{`
        /* Validated palettes (light / dark). Declared :global because the chart
           and tooltip markup live in a child component, outside this scope. */
        :global(:root) {
          --ipoms-oc-positive: #059669;
          --ipoms-oc-not_hiring: #f59e0b;
          --ipoms-oc-negative: #e11d48;
          --ipoms-oc-follow_up: #2563eb;
          --ipoms-hm-1: #e6f1fb;
          --ipoms-hm-2: #b5d4f4;
          --ipoms-hm-3: #85b7eb;
          --ipoms-hm-4: #378add;
          --ipoms-hm-5: #185fa5;
          --ipoms-hm-zero: #f1efe8;
          --ipoms-hm-stripe: #e1e0d9;
          --ipoms-hm-today: #0b0b0b;
          --ipoms-hm-jd: #c026d3;
        }
        :global(.dark) {
          --ipoms-oc-positive: #0ea271;
          --ipoms-oc-not_hiring: #bf8508;
          --ipoms-oc-negative: #e04e8a;
          --ipoms-oc-follow_up: #5b8def;
          --ipoms-hm-1: #1a2a40;
          --ipoms-hm-2: #1f4a80;
          --ipoms-hm-3: #2d6fc0;
          --ipoms-hm-4: #3987e5;
          --ipoms-hm-5: #8cbaf5;
          --ipoms-hm-zero: #2c2c2a;
          --ipoms-hm-stripe: #383835;
          --ipoms-hm-today: #f0efec;
          --ipoms-hm-jd: #e879f9;
        }
        :global(.ipoms-sw) {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex: none;
        }
        :global(.ipoms-hm-cell) {
          display: block;
          width: 100%;
          height: 24px;
          border-radius: 4px;
          padding: 0;
          border: 0;
          cursor: pointer;
          box-sizing: border-box;
          transition: transform 0.12s ease;
        }
        :global(.ipoms-hm-key) {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          cursor: default;
        }
        :global(.ipoms-hm-zero) {
          background: var(--ipoms-hm-zero);
        }
        :global(.ipoms-hm-future) {
          background: repeating-linear-gradient(45deg, transparent 0 3px, var(--ipoms-hm-stripe) 3px 4px);
          cursor: default;
        }
        :global(.ipoms-hm-today) {
          box-shadow: inset 0 0 0 2px var(--ipoms-hm-today);
          position: relative;
          z-index: 1;
        }
        :global(.ipoms-hm-hot) {
          transform: scale(1.08);
          box-shadow: 0 0 0 1.5px rgb(var(--surface)), 0 0 0 2.5px rgb(var(--primary));
          z-index: 10;
        }
        :global(.ipoms-hm-col-sel) {
          background: rgb(var(--primary) / 0.08);
          border-radius: 6px;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.ipoms-hm-cell) {
            transition: none;
          }
        }
        :global(.ipoms-tip) {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 2.5px;
          min-width: 160px;
          max-width: 250px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          line-height: 1.4;
          background: #0f172a;
          color: #f8fafc;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        :global(.dark) :global(.ipoms-tip) {
          background: #1e293b;
          color: #f1f5f9;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);
        }
        :global(.ipoms-tip b) {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function MonthChart({
  data,
  onTip,
  onHideTip,
}: {
  data: MonthlyData;
  onTip: (e: React.MouseEvent | React.FocusEvent, lines: string[]) => void;
  onHideTip: () => void;
}) {
  const days = data.days_in_month || 30;
  const todayDay = data.is_current_month && data.today_day ? data.today_day : null;
  const lastDay = todayDay ?? days;
  // Outcome columns follow this: a day number, or 'month' for the whole month.
  const [scope, setScope] = useState<number | 'month'>(todayDay ?? 'month');
  const [hover, setHover] = useState<{ row: number; day: number } | null>(null);
  const yy = Number(data.month.slice(0, 4));
  const mm = Number(data.month.slice(5));

  const valuesOf = (s: MonthlySeries): number[] => s.daily;

  const sortedSeries = useMemo(() => {
    if (!data?.series) return [];
    return [...data.series].sort((a, b) => {
      const aTotal = a.total ?? sum(a.daily);
      const bTotal = b.total ?? sum(b.daily);
      if (bTotal !== aTotal) {
        return bTotal - aTotal;
      }
      const aDur = a.total_duration_minutes ?? sum(a.daily_duration || []);
      const bDur = b.total_duration_minutes ?? sum(b.daily_duration || []);
      if (bDur !== aDur) {
        return bDur - aDur;
      }
      return (a.college_code || '').localeCompare(b.college_code || '');
    });
  }, [data?.series]);

  const peak = Math.max(1, ...sortedSeries.flatMap((s) => valuesOf(s).slice(0, lastDay)));
  const step = (v: number) => Math.max(0, Math.min(4, Math.ceil((v / peak) * 5) - 1));

  const dayMeta = Array.from({ length: days }, (_, i) => {
    const d = new Date(yy, mm - 1, i + 1);
    return {
      day: i + 1,
      sunday: d.getDay() === 0,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });

  const plural = (n: number) => `${n} call${n === 1 ? '' : 's'}`;
  const outcomeAt = (s: MonthlySeries, key: ShownBucket, day: number | 'month') => {
    const arr = s.daily_outcomes?.[key] ?? [];
    return day === 'month' ? sum(arr, lastDay) : arr[day - 1] || 0;
  };
  const jdAt = (s: MonthlySeries, day: number | 'month') => {
    const arr = s.daily_jd ?? [];
    return day === 'month' ? sum(arr, lastDay) : arr[day - 1] || 0;
  };
  const callsAt = (s: MonthlySeries, day: number | 'month') =>
    day === 'month' ? sum(s.daily, lastDay) : s.daily[day - 1] || 0;

  const scopeLabel =
    scope === 'month'
      ? `${new Date(yy, mm - 1, 1).toLocaleDateString('en-IN', { month: 'long' })} total`
      : scope === todayDay
      ? `Today · ${dayMeta[scope - 1].label}`
      : dayMeta[scope - 1].label;

  const selectDay = (d: number) => {
    if (d > lastDay) return;
    setScope((cur) => (cur === d ? 'month' : d));
  };

  // Campus acronym column (auto-fit min 82px) · days 1..30/31
  const cols = `minmax(82px, max-content) repeat(${days}, minmax(0, 1fr))`;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-fg-subtle">
          <span>Fewer</span>
          <span className="inline-flex gap-[3px]">
            <i className="ipoms-hm-cell ipoms-hm-key ipoms-hm-zero" />
            {HEAT_STEPS.map((v) => (
              <i key={v} className="ipoms-hm-cell ipoms-hm-key" style={{ background: `var(${v})` }} />
            ))}
          </span>
          <span>More</span>
          <span className="inline-flex items-center gap-1.5 ml-2">
            <i className="ipoms-hm-cell ipoms-hm-key" style={{ background: 'var(--ipoms-hm-jd)' }} /> JD received
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="ipoms-hm-cell ipoms-hm-key ipoms-hm-future" /> Not yet
          </span>
          {todayDay && (
            <span className="inline-flex items-center gap-1.5">
              <i className="ipoms-hm-cell ipoms-hm-key ipoms-hm-zero ipoms-hm-today" /> Today
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          role="grid"
          aria-label="Calls and duration logged per day, per campus"
          className="min-w-[720px] grid gap-x-[6px] gap-y-[6px] items-center"
          style={{ gridTemplateColumns: cols }}
          onMouseLeave={() => {
            setHover(null);
            onHideTip();
          }}
        >
          {/* Day numbers */}
          <span />
          {dayMeta.map((m) => (
            <button
              key={m.day}
              type="button"
              disabled={m.day > lastDay}
              onClick={() => selectDay(m.day)}
              title={m.day > lastDay ? undefined : `Show details for ${m.label}`}
              className={`text-center text-[10px] font-mono tabular-nums py-0.5 rounded disabled:cursor-default ${
                scope === m.day ? 'ipoms-hm-col-sel text-primary font-extrabold' : ''
              } ${
                m.day === todayDay
                  ? 'text-fg font-extrabold'
                  : hover?.day === m.day
                  ? 'text-primary font-bold'
                  : m.sunday
                  ? 'text-fg-subtle/50'
                  : 'text-fg-subtle'
              }`}
            >
              {m.day}
            </button>
          ))}

          {sortedSeries.map((s, row) => {
            const vals = valuesOf(s);
            return (
              <React.Fragment key={s.college_id}>
                <b
                  className={`font-mono text-xs whitespace-nowrap pr-2.5 select-none ${
                    hover?.row === row ? 'text-primary font-bold' : 'text-fg font-semibold'
                  }`}
                  title={s.college_code}
                >
                  {s.college_code}
                </b>
                {dayMeta.map((m, i) => {
                  const future = m.day > lastDay;
                  const v = vals[i] || 0;
                  const cls = [
                    'ipoms-hm-cell',
                    future ? 'ipoms-hm-future' : v === 0 ? 'ipoms-hm-zero' : '',
                    m.day === todayDay ? 'ipoms-hm-today' : '',
                    (hover && hover.row === row && hover.day === m.day) || scope === m.day ? 'ipoms-hm-hot' : '',
                  ].join(' ');
                  const dCalls = s.daily[i] || 0;
                  const dJd = jdAt(s, m.day);
                  const mins = s.daily_duration?.[i] || 0;
                  const tipLines = future
                    ? [`${s.college_code} · ${m.label}`, 'Not yet']
                    : [
                        `${s.college_code} · ${m.label}`,
                        `${plural(dCalls)} · ${fmtMins(mins)} logged`,
                        `Positive ${outcomeAt(s, 'positive', m.day)} · Not Hiring ${outcomeAt(s, 'not_hiring', m.day)}`,
                        `Follow Up ${outcomeAt(s, 'follow_up', m.day)} · JD Received ${jdAt(s, m.day)}`,
                      ];
                  return (
                    <button
                      key={m.day}
                      type="button"
                      role="gridcell"
                      disabled={future}
                      aria-label={`${s.college_code}, ${m.label}: ${
                        future ? 'not yet' : `${plural(dCalls)}, ${fmtMins(mins)} logged${dJd > 0 ? `, ${dJd} JD received` : ''}`
                      }`}
                      className={cls}
                      style={
                        !future && dJd > 0
                          ? { background: 'var(--ipoms-hm-jd)' }
                          : !future && v > 0
                          ? { background: `var(${HEAT_STEPS[step(v)]})` }
                          : undefined
                      }
                      onClick={() => selectDay(m.day)}
                      onMouseEnter={(e) => {
                        setHover({ row, day: m.day });
                        onTip(e, tipLines);
                      }}
                      onFocus={(e) => onTip(e, tipLines)}
                      onBlur={onHideTip}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
