'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PhoneCall,
  Zap,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ClockDurationData {
  today_seconds?: number;
  today_formatted?: string;
  hours?: number;
  minutes?: number;
  seconds?: number;
  today_calls_count?: number;
  avg_call_duration_seconds?: number;
  avg_call_duration_formatted?: string;
  positive_calls_count?: number;
  outcomes?: {
    positive: number;
    not_hiring: number;
    negative: number;
    follow_up: number;
  };
  /** 24 slots, index = IST hour. Real counts from Daily Tracker. */
  hourly_calls?: number[];
  /** 24 slots, index = IST hour. Positive calls converted in that hour. */
  hourly_positives?: number[];
  college_breakdown?: Array<{
    college_id: string;
    college_name: string;
    college_code: string;
    duration_seconds: number;
    calls_count: number;
    positive_count: number;
  }>;
}

interface Props {
  clockData?: ClockDurationData;
  coordinatorName?: string;
}

const DIGIT_H = 56; // px — must match .odo-digit height in styles

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * One rolling odometer digit. The column of 0-9 slides so the right numeral lands
 * in the window.
 */
function OdometerDigit({ value }: { value: number }) {
  return (
    <span className="ipoms-odo-digit">
      <span
        className="ipoms-odo-col"
        style={{ transform: `translateY(-${value * 10}%)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <b key={n}>{n}</b>
        ))}
      </span>
    </span>
  );
}

function OdometerPair({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(99, value));
  return (
    <span className="inline-flex">
      <OdometerDigit value={Math.floor(safe / 10)} />
      <OdometerDigit value={safe % 10} />
    </span>
  );
}

export function CoordinatorClockDurationWidget({ clockData, coordinatorName }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const nowHour = now.getHours();

  // Selected date for day-by-day navigation (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [customDayData, setCustomDayData] = useState<ClockDurationData | null>(null);
  const [loadingCustomDay, setLoadingCustomDay] = useState(false);

  // Real-time wall-clock minute tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayIso = toIsoDate(now);
  const selectedIso = toIsoDate(selectedDate);
  const isSelectedToday = selectedIso === todayIso;
  const isSelectedFuture = selectedDate.getTime() > new Date().setHours(23, 59, 59, 999);

  // Navigate day by day
  const handleStepDay = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const handleJumpToday = () => {
    setSelectedDate(new Date());
  };

  // Fetch custom day data when navigating away from today
  useEffect(() => {
    if (isSelectedToday) {
      setCustomDayData(null);
      return;
    }
    if (isSelectedFuture) {
      setCustomDayData({
        today_seconds: 0,
        today_calls_count: 0,
        positive_calls_count: 0,
        hourly_calls: new Array(24).fill(0),
        college_breakdown: [],
      });
      return;
    }

    let active = true;
    setLoadingCustomDay(true);
    apiFetch(`/dashboard/coordinator/clock-duration?date=${selectedIso}`)
      .then((res) => {
        if (active && res.success && res.data) {
          setCustomDayData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingCustomDay(false);
      });

    return () => {
      active = false;
    };
  }, [selectedIso, isSelectedToday, isSelectedFuture]);

  // Effective day data depending on today vs custom day
  const effectiveData = isSelectedToday ? clockData : customDayData;
  const totalSecs = Math.max(0, effectiveData?.today_seconds || 0);

  const [syncedAt, setSyncedAt] = useState<Date>(() => new Date());
  const [justUpdated, setJustUpdated] = useState(false);
  const prevTotal = useRef<number | null>(null);

  useEffect(() => {
    setSyncedAt(new Date());
  }, [clockData]);

  useEffect(() => {
    if (prevTotal.current !== null && prevTotal.current !== totalSecs) {
      setJustUpdated(true);
      const t = setTimeout(() => setJustUpdated(false), 1600);
      prevTotal.current = totalSecs;
      return () => clearTimeout(t);
    }
    prevTotal.current = totalSecs;
  }, [totalSecs]);

  const syncedLabel = syncedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const callsCount = effectiveData?.today_calls_count || 0;
  const positivesCount = effectiveData?.positive_calls_count || 0;

  /**
   * Hourly rhythm window (10am to 7pm default, extends if calls recorded outside).
   */
  const { bars, peak, hasAnyCalls } = useMemo(() => {
    const raw = effectiveData?.hourly_calls;
    const rawPos = effectiveData?.hourly_positives;
    const counts = Array.isArray(raw) && raw.length === 24 ? raw : new Array(24).fill(0);
    const posCounts = Array.isArray(rawPos) && rawPos.length === 24 ? rawPos : new Array(24).fill(0);

    let firstWithCalls = -1;
    let lastWithCalls = -1;
    counts.forEach((c, h) => {
      if (c > 0) {
        if (firstWithCalls === -1) firstWithCalls = h;
        lastWithCalls = h;
      }
    });

    const startHour = firstWithCalls === -1 ? 10 : Math.min(10, firstWithCalls);
    const endHour = lastWithCalls === -1 ? 19 : Math.max(19, lastWithCalls);

    const list: { hour: number; count: number; positiveCount: number }[] = [];
    for (let h = startHour; h <= endHour; h++) {
      list.push({ hour: h, count: counts[h], positiveCount: posCounts[h] || 0 });
    }

    return {
      bars: list,
      peak: Math.max(1, ...list.map((b) => b.count)),
      hasAnyCalls: counts.some((c) => c > 0),
    };
  }, [effectiveData?.hourly_calls, effectiveData?.hourly_positives]);

  const nowFraction = useMemo(() => {
    if (!isSelectedToday || bars.length === 0) return null;
    const start = bars[0].hour;
    const span = bars.length;
    const pos = (now.getHours() + now.getMinutes() / 60 - start) / span;
    return pos >= 0 && pos <= 1 ? pos : null;
  }, [bars, now, isSelectedToday]);

  const hourLabel = (h: number) => {
    const suffix = h >= 12 ? 'p' : 'a';
    const twelve = h % 12 === 0 ? 12 : h % 12;
    return `${twelve}${suffix}`;
  };

  // Live synchronization active window: 6:00 AM (06:00) till 7:00 PM (19:00)
  const isSyncActive = useMemo(() => {
    const h = now.getHours();
    return h >= 6 && h < 19;
  }, [now]);

  const selectedDateFormatted = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="ipoms-momentum relative overflow-hidden rounded-3xl bg-surface border border-border p-6 sm:p-8 shadow-xl shadow-indigo-100/50 dark:shadow-black/30 select-none">
      {/* Drifting aurora field — decorative backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
        <i className="ipoms-aurora ipoms-aurora-1" />
        <i className="ipoms-aurora ipoms-aurora-2" />
        <i className="ipoms-aurora ipoms-aurora-3" />
        <i className="ipoms-sweep" />
      </div>

      {/* Travelling gradient hairline around card */}
      <span className="ipoms-ring" aria-hidden="true">
        <span className="ipoms-ring-spin" />
      </span>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        {/* ── Left: Heading, Rolling Counter, Quick Metrics ── */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Dedicated Calling Time Today
          </h2>
          <p className="text-xs text-fg-subtle mt-1 max-w-xl leading-relaxed">
            Synchronously calculated across all partner college operations for{' '}
            {coordinatorName || 'Placement Coordinator'}.
          </p>

          {/* Rolling odometer */}
          <div
            className={`ipoms-odo flex items-end gap-0.5 mt-5${justUpdated ? ' is-updated' : ''}`}
            role="timer"
            aria-live="off"
          >
            <span className="sr-only">
              {hrs} hours {mins} minutes {secs} seconds of calling time
            </span>
            <OdometerPair value={hrs} />
            <span className="ipoms-odo-sep">:</span>
            <OdometerPair value={mins} />
            <span className="ipoms-odo-sep">:</span>
            <OdometerPair value={secs} />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-fg-subtle ml-2 pb-2.5 font-mono">
              hrs : min : sec
            </span>
          </div>

          {/* Quick metrics */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            {isSelectedToday ? (
              isSyncActive ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-[11px] font-medium text-fg-muted">
                  <span className="ipoms-live-dot" /> Live
                  <span className="text-fg-subtle font-mono text-[10px]">· synced {syncedLabel}</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-[11px] font-medium text-fg-muted"
                  title="Live sync active between 6:00 AM and 7:00 PM"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-disabled" /> Sync Stopped
                  <span className="text-fg-subtle font-mono text-[10px]">· (6 AM – 7 PM window)</span>
                </span>
              )
            ) : isSelectedFuture ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-[11px] font-semibold text-fg-subtle">
                <Calendar size={13} className="text-primary" />
                Upcoming Date
                <span className="text-fg-subtle font-mono text-[10px]">· (0 calls)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-[11px] font-semibold text-primary">
                <Calendar size={13} />
                Historical Record
              </span>
            )}

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-[11px] font-medium text-fg-muted">
              <PhoneCall size={13} className="text-primary" />
              Calls Logged
              <b className="font-mono font-bold text-fg">{callsCount}</b>
            </span>
          </div>

          {/* Single-line Outcomes Breakdown */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {(() => {
              const oc = effectiveData?.outcomes || {
                positive: effectiveData?.positive_calls_count || 0,
                not_hiring: 0,
                negative: 0,
                follow_up: 0,
              };
              return (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    Positive <b className="font-mono font-bold text-fg ml-0.5">{oc.positive}</b>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    Not Hiring <b className="font-mono font-bold text-fg ml-0.5">{oc.not_hiring}</b>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    Negative <b className="font-mono font-bold text-fg ml-0.5">{oc.negative}</b>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    Follow Up <b className="font-mono font-bold text-fg ml-0.5">{oc.follow_up}</b>
                  </span>
                </>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Hourly Rhythm with Left/Right Arrow Day Stepper ── */}
        <div className="shrink-0">
          <div className="flex items-center justify-between gap-3 mb-5 lg:justify-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Daily Rhythm
            </span>

            {/* Date Stepper Controls (< / >) */}
            <div className="flex items-center gap-1 bg-surface-sunken border border-border rounded-xl px-1.5 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                title="Previous Day"
                className="w-6 h-6 rounded-lg bg-surface hover:bg-surface-raised border border-border flex items-center justify-center text-fg hover:text-primary transition-all cursor-pointer active:scale-90"
              >
                <ChevronLeft size={13} strokeWidth={2.5} />
              </button>

              <div className="px-2 font-mono text-[11px] font-bold text-fg whitespace-nowrap">
                {selectedDateFormatted}
              </div>

              <button
                type="button"
                onClick={() => handleStepDay(1)}
                title="Next Day"
                className="w-6 h-6 rounded-lg bg-surface hover:bg-surface-raised border border-border flex items-center justify-center text-fg hover:text-primary transition-all cursor-pointer active:scale-90"
              >
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>

              {!isSelectedToday && (
                <button
                  type="button"
                  onClick={handleJumpToday}
                  title="Jump to Today"
                  className="ml-1 px-2 py-0.5 rounded-md bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Today
                </button>
              )}
            </div>
          </div>

          {/* Hourly rhythm spark bars */}
          <div className="ipoms-spark" aria-hidden="true">
            {bars.map((b, i) => {
              const isNow = isSelectedToday && b.hour === nowHour;
              const isFuture = isSelectedToday && b.hour > nowHour;
              const isPositive = b.positiveCount > 0;
              const heightPct = hasAnyCalls ? Math.max(6, (b.count / peak) * 100) : 6;
              return (
                <div
                  key={b.hour}
                  className={`ipoms-spark-bar${isPositive ? ' is-positive' : ''}${isNow ? ' is-now' : ''}${isFuture ? ' is-future' : ''}${!hasAnyCalls && !isFuture ? ' is-idle' : ''}`}
                  style={{
                    height: `${heightPct}%`,
                    animationDelay: !hasAnyCalls && !isFuture ? `${i * 0.14}s` : `${0.1 + i * 0.05}s`,
                  }}
                  title={`${hourLabel(b.hour)} — ${b.count} ${b.count === 1 ? 'call' : 'calls'}${isPositive ? ` · ${b.positiveCount} converted positive ✨` : ''}`}
                />
              );
            })}

            {/* The "now" marker line for today */}
            {nowFraction !== null && (
              <span className="ipoms-now-line" style={{ left: `${nowFraction * 100}%` }}>
                <span className="ipoms-now-tag">now</span>
              </span>
            )}
          </div>

          <div className="ipoms-spark-axis">
            {bars.map((b) => (
              <span key={b.hour} className={isSelectedToday && b.hour === nowHour ? 'is-now' : undefined}>
                {hourLabel(b.hour)}
              </span>
            ))}
          </div>

          {!hasAnyCalls && (
            <p className="text-[10.5px] text-fg-subtle mt-2 lg:text-right italic">
              {isSelectedFuture ? 'Future date · No calls scheduled' : 'No calls logged for this date'}
            </p>
          )}
        </div>
      </div>

      {/* Scoped CSS styling */}
      <style jsx>{`
        .ipoms-aurora {
          position: absolute;
          display: block;
          border-radius: 9999px;
          filter: blur(56px);
          opacity: 0.5;
        }
        .ipoms-aurora-1 {
          width: 340px;
          height: 340px;
          background: #c7d2fe;
          top: -150px;
          left: -90px;
          animation: ipoms-drift-1 14s ease-in-out infinite;
        }
        .ipoms-aurora-2 {
          width: 300px;
          height: 300px;
          background: #ddd6fe;
          bottom: -160px;
          right: 140px;
          animation: ipoms-drift-2 17s ease-in-out infinite;
        }
        .ipoms-aurora-3 {
          width: 260px;
          height: 260px;
          background: #a7f3d0;
          top: -90px;
          right: -70px;
          animation: ipoms-drift-3 20s ease-in-out infinite;
        }
        :global(.dark) .ipoms-aurora {
          opacity: 0.16;
        }

        /* ── Light sweep ── */
        .ipoms-sweep {
          position: absolute;
          inset: 0;
          display: block;
          background: linear-gradient(
            105deg,
            transparent 38%,
            rgba(255, 255, 255, 0.7) 50%,
            transparent 62%
          );
          background-size: 260% 100%;
          background-repeat: no-repeat;
          animation: ipoms-sweep 7s ease-in-out infinite;
        }
        :global(.dark) .ipoms-sweep {
          background-image: linear-gradient(
            105deg,
            transparent 38%,
            rgba(165, 180, 252, 0.09) 50%,
            transparent 62%
          );
        }
        @keyframes ipoms-sweep {
          0% { background-position: 160% 0; }
          45%, 100% { background-position: -60% 0; }
        }

        /* ── Travelling gradient hairline ── */
        .ipoms-ring {
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          padding: 1.5px;
          overflow: hidden;
          pointer-events: none;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        .ipoms-ring-spin {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 200%;
          aspect-ratio: 1;
          translate: -50% -50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(99, 102, 241, 0.9) 40deg,
            rgba(139, 92, 246, 0.9) 80deg,
            rgba(16, 185, 129, 0.85) 120deg,
            transparent 160deg,
            transparent 360deg
          );
          animation: ipoms-spin 9s linear infinite;
        }
        @keyframes ipoms-spin {
          to { rotate: 360deg; }
        }

        /* ── Odometer ── */
        .ipoms-odo {
          transition: filter 500ms ease;
        }
        .ipoms-odo :global(.ipoms-odo-col b) {
          transition: color 500ms ease;
        }
        .ipoms-odo.is-updated {
          filter: drop-shadow(0 0 14px rgba(99, 102, 241, 0.55));
        }
        .ipoms-odo.is-updated :global(.ipoms-odo-col b) {
          color: #3730a3;
        }
        :global(.dark) .ipoms-odo.is-updated :global(.ipoms-odo-col b) {
          color: #c7d2fe;
        }
        :global(.dark) .ipoms-aurora-1 { background: #6366f1; }
        :global(.dark) .ipoms-aurora-2 { background: #8b5cf6; }
        :global(.dark) .ipoms-aurora-3 { background: #10b981; }

        @keyframes ipoms-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 34px) scale(1.12); }
        }
        @keyframes ipoms-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-44px, -26px) scale(1.08); }
        }
        @keyframes ipoms-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(1.15); }
        }

        :global(.ipoms-odo-digit) {
          display: block;
          height: ${DIGIT_H}px;
          width: 32px;
          overflow: hidden;
          position: relative;
          text-align: center;
        }
        :global(.ipoms-odo-col) {
          display: flex;
          flex-direction: column;
          transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        :global(.ipoms-odo-col b) {
          display: block;
          height: ${DIGIT_H}px;
          line-height: ${DIGIT_H}px;
          font-family: var(--font-mono);
          font-size: 46px;
          font-weight: 400;
          letter-spacing: -0.03em;
          color: #4f46e5;
          font-variant-numeric: tabular-nums;
        }
        :global(.dark) :global(.ipoms-odo-col b) {
          color: #818cf8;
        }
        .ipoms-odo-sep {
          font-family: var(--font-mono);
          font-size: 38px;
          line-height: ${DIGIT_H}px;
          color: rgb(var(--fg-disabled));
          padding: 0 3px;
        }

        /* ── Live dot ── */
        .ipoms-live-dot {
          position: relative;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: rgb(var(--success));
          animation: ipoms-blink 2s ease-in-out infinite;
        }
        .ipoms-live-dot::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1.5px solid rgb(var(--success));
          animation: ipoms-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes ipoms-ping {
          0% { transform: scale(1); opacity: 0.8; }
          80%, 100% { transform: scale(3.2); opacity: 0; }
        }
        @keyframes ipoms-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }

        /* ── Hourly rhythm bars ── */
        .ipoms-spark {
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 92px;
        }

        .ipoms-spark-bar.is-idle {
          animation: ipoms-idle 2.8s ease-in-out infinite;
        }
        @keyframes ipoms-idle {
          0%, 100% { opacity: 0.45; filter: saturate(0.7); }
          30% { opacity: 1; filter: saturate(1.3) brightness(1.08); }
        }

        .ipoms-now-line {
          position: absolute;
          top: -4px;
          bottom: 0;
          width: 1.5px;
          margin-left: -0.75px;
          background: linear-gradient(180deg, transparent, #10b981 30%, #10b981);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
          border-radius: 2px;
          transition: left 1s ease;
          pointer-events: none;
        }
        .ipoms-now-line::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -3px;
          width: 7px;
          height: 7px;
          translate: -50% 0;
          border-radius: 9999px;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
          animation: ipoms-blink 2s ease-in-out infinite;
        }
        .ipoms-now-tag {
          position: absolute;
          top: -16px;
          left: 50%;
          translate: -50% 0;
          font-family: var(--font-mono);
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #059669;
          white-space: nowrap;
        }
        :global(.dark) .ipoms-now-tag { color: #34d399; }
        .ipoms-spark-bar {
          width: 20px;
          border-radius: 5px 5px 3px 3px;
          background: linear-gradient(180deg, #a5b4fc, #6366f1);
          transform-origin: bottom;
          animation: ipoms-grow 900ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        /* Green shade rhythm bar when call(s) were converted as positive */
        .ipoms-spark-bar.is-positive {
          background: linear-gradient(180deg, #34d399, #059669);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.45);
        }
        :global(.dark) .ipoms-spark-bar.is-positive {
          background: linear-gradient(180deg, #6ee7b7, #10b981);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.55);
        }
        .ipoms-spark-bar.is-future {
          background: linear-gradient(180deg, rgb(var(--border)), rgb(var(--border-strong)));
          opacity: 0.45;
        }
        .ipoms-spark-bar.is-now {
          animation:
            ipoms-grow 900ms cubic-bezier(0.22, 1, 0.36, 1) backwards,
            ipoms-glow 2.4s ease-in-out 1.2s infinite;
        }
        .ipoms-spark-bar.is-now:not(.is-positive) {
          background: linear-gradient(180deg, #818cf8, #4f46e5);
        }
        @keyframes ipoms-grow {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes ipoms-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          50% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.25); }
        }
        .ipoms-spark-axis {
          display: flex;
          gap: 6px;
          margin-top: 7px;
        }
        .ipoms-spark-axis :global(span) {
          width: 20px;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 9.5px;
          color: rgb(var(--fg-subtle));
        }
        .ipoms-spark-axis :global(span.is-now) {
          color: rgb(var(--success));
          font-weight: 700;
        }

        @media (max-width: 640px) {
          :global(.ipoms-odo-digit) { width: 24px; height: 42px; }
          :global(.ipoms-odo-col b) { height: 42px; line-height: 42px; font-size: 34px; }
          .ipoms-odo-sep { font-size: 28px; line-height: 42px; }
          .ipoms-spark { height: 68px; }
          .ipoms-spark-bar { width: 15px; }
          .ipoms-spark-axis :global(span) { width: 15px; font-size: 8.5px; }
        }
      `}</style>
    </div>
  );
}
