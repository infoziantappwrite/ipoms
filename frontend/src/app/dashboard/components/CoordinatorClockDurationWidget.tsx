'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PhoneCall, Zap } from 'lucide-react';

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
  /** 24 slots, index = IST hour. Real counts from Daily Tracker. */
  hourly_calls?: number[];
}

interface Props {
  clockData?: ClockDurationData;
  coordinatorName?: string;
}

const DIGIT_H = 56; // px — must match .odo-digit height in the styles below

/**
 * One rolling odometer digit. The column of 0-9 slides so the right numeral
 * lands in the window; only the digits that actually change appear to move,
 * which is what sells it as a mechanical counter rather than a text swap.
 *
 * The shift is a PERCENTAGE, not pixels: the column holds exactly ten equal
 * children, so 10% per digit lands correctly at any digit height. Pixel math
 * would silently desync from the smaller digits at the mobile breakpoint.
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
  const [nowHour, setNowHour] = useState<number>(() => new Date().getHours());

  // Deliberately NOT a stopwatch. This is the summed duration of calls already
  // logged today, so it only moves when the server says it moved. Ticking it up
  // locally would show minutes the coordinator never actually spent on a call —
  // the counter would read 00:04:12 on a day with zero calls. The odometer still
  // rolls, just on real data changes rather than on a timer.
  const totalSecs = Math.max(0, clockData?.today_seconds || 0);

  // Only used to highlight which bar is the current hour — minute resolution is
  // plenty, so this does not need a per-second interval.
  useEffect(() => {
    const id = setInterval(() => setNowHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const callsCount = clockData?.today_calls_count || 0;
  const positivesCount = clockData?.positive_calls_count || 0;
  const avgFormatted = clockData?.avg_call_duration_formatted;

  /**
   * Hourly rhythm window. Defaults to the real working day (9am-6pm) but widens
   * if calls genuinely happened outside it, so an early or late call is never
   * silently dropped from the chart.
   */
  const { bars, peak, hasAnyCalls } = useMemo(() => {
    const raw = clockData?.hourly_calls;
    const counts = Array.isArray(raw) && raw.length === 24 ? raw : new Array(24).fill(0);

    let firstWithCalls = -1;
    let lastWithCalls = -1;
    counts.forEach((c, h) => {
      if (c > 0) {
        if (firstWithCalls === -1) firstWithCalls = h;
        lastWithCalls = h;
      }
    });

    const startHour = firstWithCalls === -1 ? 9 : Math.min(9, firstWithCalls);
    const endHour = lastWithCalls === -1 ? 18 : Math.max(18, lastWithCalls);

    const list: { hour: number; count: number }[] = [];
    for (let h = startHour; h <= endHour; h++) list.push({ hour: h, count: counts[h] });

    return {
      bars: list,
      peak: Math.max(1, ...list.map((b) => b.count)),
      hasAnyCalls: counts.some((c) => c > 0),
    };
  }, [clockData?.hourly_calls]);

  const hourLabel = (h: number) => {
    const suffix = h >= 12 ? 'p' : 'a';
    const twelve = h % 12 === 0 ? 12 : h % 12;
    return `${twelve}${suffix}`;
  };

  return (
    <div className="ipoms-momentum relative overflow-hidden rounded-3xl bg-surface border border-border p-6 sm:p-8 shadow-xl shadow-indigo-100/50 dark:shadow-black/30 select-none">
      {/* Drifting aurora field — purely decorative, sits behind everything */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
        <i className="ipoms-aurora ipoms-aurora-1" />
        <i className="ipoms-aurora ipoms-aurora-2" />
        <i className="ipoms-aurora ipoms-aurora-3" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        {/* ── Left: heading, rolling counter, quick metrics ── */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Dedicated Calling Time Today
          </h2>
          <p className="text-xs text-fg-subtle mt-1 max-w-xl leading-relaxed">
            Synchronously calculated across all partner college operations for{' '}
            {coordinatorName || 'Placement Coordinator'}.
          </p>

          {/* Rolling odometer */}
          <div className="flex items-end gap-0.5 mt-5" role="timer" aria-live="off">
            <span className="sr-only">
              {hrs} hours {mins} minutes {secs} seconds of calling time today
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
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-[11px] font-medium text-fg-muted">
              <span className="ipoms-live-dot" /> Live
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-[11px] font-medium text-fg-muted">
              <PhoneCall size={13} className="text-primary" />
              Calls Logged
              <b className="font-mono font-bold text-fg">{callsCount}</b>
            </span>
            {positivesCount > 0 && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Zap size={13} />
                {positivesCount} Positive {positivesCount === 1 ? 'Lead' : 'Leads'}
              </span>
            )}
          </div>
        </div>

        {/* ── Right: hourly rhythm ── */}
        <div className="shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-fg-subtle mb-2.5 lg:text-right">
            Hourly Rhythm
          </div>
          <div className="ipoms-spark" aria-hidden="true">
            {bars.map((b, i) => {
              const isNow = b.hour === nowHour;
              const isFuture = b.hour > nowHour;
              const heightPct = hasAnyCalls ? Math.max(6, (b.count / peak) * 100) : 6;
              return (
                <div
                  key={b.hour}
                  className={`ipoms-spark-bar${isNow ? ' is-now' : ''}${isFuture ? ' is-future' : ''}`}
                  style={{ height: `${heightPct}%`, animationDelay: `${0.1 + i * 0.05}s` }}
                  title={`${hourLabel(b.hour)} — ${b.count} ${b.count === 1 ? 'call' : 'calls'}`}
                />
              );
            })}
          </div>
          <div className="ipoms-spark-axis">
            {bars.map((b) => (
              <span key={b.hour} className={b.hour === nowHour ? 'is-now' : undefined}>
                {hourLabel(b.hour)}
              </span>
            ))}
          </div>
          {!hasAnyCalls && (
            <p className="text-[10.5px] text-fg-subtle mt-2 lg:text-right italic">
              No calls logged yet today
            </p>
          )}
        </div>
      </div>

      {/* Scoped styles: animation-heavy and self-contained, so they live with
          the component rather than polluting the global token sheet. */}
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

        /* ── Odometer ──
           :global() is required, not incidental: the digit markup is rendered by
           the OdometerDigit child component, and styled-jsx only scopes elements
           written lexically inside THIS component. Without :global these rules
           silently never match and all ten numerals render in a row. The class
           names carry an ipoms- prefix precisely because they go global. */
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
          color: rgb(var(--foreground));
          font-variant-numeric: tabular-nums;
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
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: rgb(var(--success));
          animation: ipoms-blink 2s ease-in-out infinite;
        }
        @keyframes ipoms-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }

        /* ── Hourly rhythm bars ── */
        .ipoms-spark {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 92px;
        }
        .ipoms-spark-bar {
          width: 20px;
          border-radius: 5px 5px 3px 3px;
          background: linear-gradient(180deg, #a5b4fc, #6366f1);
          transform-origin: bottom;
          animation: ipoms-grow 900ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .ipoms-spark-bar.is-future {
          background: linear-gradient(180deg, rgb(var(--border)), rgb(var(--border-strong)));
          opacity: 0.45;
        }
        .ipoms-spark-bar.is-now {
          background: linear-gradient(180deg, #34d399, #059669);
          animation:
            ipoms-grow 900ms cubic-bezier(0.22, 1, 0.36, 1) backwards,
            ipoms-glow 2.4s ease-in-out 1.2s infinite;
        }
        @keyframes ipoms-grow {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes ipoms-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
          50% { box-shadow: 0 0 0 5px rgba(5, 150, 105, 0.16); }
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
