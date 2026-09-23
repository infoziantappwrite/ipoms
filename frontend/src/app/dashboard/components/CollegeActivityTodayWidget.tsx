'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, PhoneCall, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';

interface CollegeActivityRow {
  college_id: string;
  college_code: string;
  college_name: string;
  calls: number;
  duration_seconds: number;
  duration_formatted: string;
}

interface Props {
  rows?: CollegeActivityRow[];
  onRefresh?: () => void | Promise<void>;
}

/**
 * Replaces the personal "Dedicated Calling Time" clock for a full-access Team
 * Leader (e.g. Malvika Kumar, 22 Sep 2026) — she doesn't place calls herself, so
 * a personal timer would always read 00:00:00. Shows, instead, which colleges
 * genuinely had activity today, org-wide: calls and minutes per college. Only
 * colleges with at least one real call appear — an inactive college gets no bar
 * at all, by the user's explicit choice, rather than a zero-height placeholder.
 * Naturally resets at midnight with no cron: the backend query is always
 * "today", so the first load of a new day already reflects that day.
 */
export function CollegeActivityTodayWidget({ rows = [], onRefresh }: Props) {
  const [metric, setMetric] = useState<'calls' | 'duration'>('calls');
  const [syncedAt, setSyncedAt] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const prevSignature = useRef<string>('');
  const { toast } = useToast();

  useEffect(() => {
    setSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase());
  }, []);

  useEffect(() => {
    const signature = rows.map((r) => `${r.college_id}:${r.calls}:${r.duration_seconds}`).join('|');
    if (signature && signature !== prevSignature.current) {
      prevSignature.current = signature;
      setSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase());
    }
  }, [rows]);

  const handleSync = async () => {
    triggerHaptic('light');
    setIsSyncing(true);
    const now = new Date();
    setSyncedAt(now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase());
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase());
        toast("Today's college activity synchronized", 'success');
      }, 400);
    }
  };

  const maxVal = Math.max(1, ...rows.map((r) => (metric === 'calls' ? r.calls : r.duration_seconds)));
  const totalCalls = rows.reduce((s, r) => s + r.calls, 0);
  const totalSeconds = rows.reduce((s, r) => s + r.duration_seconds, 0);
  const totalFormatted = (() => {
    const m = Math.floor(totalSeconds / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${totalSeconds % 60}s`;
  })();

  return (
    <div className="ipoms-cat relative overflow-hidden rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-lg shadow-indigo-100/40 dark:shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <BarChart3 size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-fg tracking-tight">College Activity Today</h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Real calls made and time spent, per college — only colleges with activity are shown
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <i className="ipoms-cat-ping" />
            Live{syncedAt ? ` · synced ${syncedAt}` : ''}
          </span>
          <div className="inline-flex p-0.5 bg-surface-sunken border border-border rounded-lg text-[11px] font-bold">
            {(['calls', 'duration'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric === m}
                onClick={() => setMetric(m)}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  metric === m ? 'bg-primary text-white shadow-2xs' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                {m === 'calls' ? 'Calls' : 'Duration'}
              </button>
            ))}
          </div>

          {/* Sync Button (Blue Shade, Icon-Only) */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            title="Synchronize today's college activity data"
            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-600 dark:text-blue-400 border border-blue-500/30 dark:border-blue-400/40 transition-all cursor-pointer shadow-2xs disabled:opacity-50 group/sync shrink-0"
          >
            <RefreshCw
              size={14}
              className={`transition-transform ${isSyncing ? 'animate-spin' : 'group-hover/sync:rotate-180 duration-500'}`}
            />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <PhoneCall size={24} className="text-fg-subtle/50" />
          <p className="text-sm font-semibold text-fg-subtle">No colleges active yet today</p>
          <p className="text-xs text-fg-subtle/70 max-w-sm">
            This fills in as coordinators log calls — nothing has been logged anywhere yet today.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {[...rows]
              .sort((a, b) =>
                metric === 'calls'
                  ? b.calls - a.calls || b.duration_seconds - a.duration_seconds
                  : b.duration_seconds - a.duration_seconds || b.calls - a.calls
              )
              .map((r) => {
                const val = metric === 'calls' ? r.calls : r.duration_seconds;
                const pct = Math.max(8, Math.round((val / maxVal) * 100));
                const displayCode = r.college_code === 'MAREPHRA' ? 'MAREPHRAM' : (r.college_code || '');
                return (
                  <div key={r.college_id} className="flex items-center gap-3">
                    <span className="w-24 sm:w-28 shrink-0 text-right font-mono text-xs font-bold text-primary whitespace-nowrap" title={r.college_name}>
                      {displayCode}
                    </span>
                    <div className="flex-1 min-w-0 h-[30px] rounded-lg bg-surface-sunken overflow-hidden">
                      <div
                        className="ipoms-cat-bar h-full rounded-lg flex items-center justify-end px-2.5"
                        style={{ width: `${pct}%` }}
                      >
                        {pct >= 12 && (
                          <span className="text-[11px] font-bold text-white tabular-nums whitespace-nowrap">
                            {metric === 'calls' ? `${r.calls} calls` : r.duration_formatted}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="w-24 shrink-0 text-xs font-semibold text-fg-subtle tabular-nums">
                      {pct < 12 ? (metric === 'calls' ? `${r.calls} calls` : r.duration_formatted) : ''}
                    </span>
                  </div>
                );
              })}
          </div>

          <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-fg-subtle">
            <span>
              <b className="text-fg font-bold">{rows.length}</b> {rows.length === 1 ? 'college' : 'colleges'} active today
            </span>
            <span>
              <b className="text-fg font-bold">{totalCalls}</b> total calls
            </span>
            <span>
              <b className="text-fg font-bold">{totalFormatted}</b> total time
            </span>
          </div>
        </>
      )}

      <style jsx>{`
        .ipoms-cat-bar {
          background: linear-gradient(90deg, var(--ipoms-cat-1), var(--ipoms-cat-2));
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ipoms-cat-ping {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgb(16 185 129);
          box-shadow: 0 0 0 rgba(16, 185, 129, 0.55);
          animation: ipoms-cat-pulse 1.8s ease-out infinite;
        }
        @keyframes ipoms-cat-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ipoms-cat-bar {
            transition: none;
          }
          .ipoms-cat-ping {
            animation: none;
          }
        }
        :global(:root) {
          --ipoms-cat-1: #378add;
          --ipoms-cat-2: #185fa5;
        }
        :global(.dark) {
          --ipoms-cat-1: #3987e5;
          --ipoms-cat-2: #1a2a40;
        }
      `}</style>
    </div>
  );
}
