'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Check, CheckCircle2, Clock, PhoneCall, RefreshCw, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';

export interface CollegeActivityRow {
  college_id: string;
  college_code: string;
  college_name: string;
  calls: number;
  completed_calls?: number;
  duration_seconds: number;
  duration_formatted: string;
}

interface Props {
  rows?: CollegeActivityRow[];
  onRefresh?: () => void | Promise<void>;
}

/**
 * Replaces the personal "Dedicated Calling Time" clock for a full-access Team
 * Leader (e.g. Malvika Kumar) — she doesn't place calls herself, so a personal
 * timer would always read 00:00:00. Shows, instead, which colleges genuinely
 * had activity today org-wide, with dual-progress visualization showing both
 * total logged calls and how many of those calls are completed.
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
    const signature = rows.map((r) => `${r.college_id}:${r.calls}:${r.completed_calls ?? r.calls}:${r.duration_seconds}`).join('|');
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
  const totalCompletedCalls = rows.reduce((s, r) => s + (typeof r.completed_calls === 'number' ? r.completed_calls : r.calls), 0);
  const totalSeconds = rows.reduce((s, r) => s + r.duration_seconds, 0);
  const totalFormatted = (() => {
    const m = Math.floor(totalSeconds / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${totalSeconds % 60}s`;
  })();

  const overallCompletionPct = totalCalls > 0 ? Math.round((totalCompletedCalls / totalCalls) * 100) : 0;

  return (
    <div className="ipoms-cat relative overflow-hidden rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-lg shadow-indigo-100/40 dark:shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <BarChart3 size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-fg tracking-tight">
              College Activity Today
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Live calls made and completion rate per college — only colleges with activity are shown
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

          {/* Sync Button (Solid Mustard Amber, Icon-Only) */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            title="Synchronize today's college activity data"
            className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-all cursor-pointer shadow-2xs disabled:opacity-50 group/sync shrink-0"
          >
            <RefreshCw
              size={14}
              className={`text-white transition-transform ${isSyncing ? 'animate-spin' : 'group-hover/sync:rotate-180 duration-500'}`}
            />
          </button>
        </div>
      </div>

      {/* Mini Visual Legend for Calls View */}
      {rows.length > 0 && metric === 'calls' && (
        <div className="flex items-center gap-4 mb-4 text-[11px] text-fg-subtle font-medium bg-surface-sunken/60 border border-border/60 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-xs bg-gradient-to-r from-blue-600 to-sky-500 shadow-2xs" />
            <span>Completed Calls</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-xs bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-700" />
            <span>Logged / In-Progress</span>
          </div>
        </div>
      )}

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
          <div className="space-y-2.5">
            {[...rows]
              .sort((a, b) =>
                metric === 'calls'
                  ? b.calls - a.calls || b.duration_seconds - a.duration_seconds
                  : b.duration_seconds - a.duration_seconds || b.calls - a.calls
              )
              .map((r) => {
                const totalRowCalls = r.calls;
                const completedRowCalls = typeof r.completed_calls === 'number' ? r.completed_calls : r.calls;
                const pendingRowCalls = Math.max(0, totalRowCalls - completedRowCalls);
                const completionRate = totalRowCalls > 0 ? Math.round((completedRowCalls / totalRowCalls) * 100) : 0;
                
                const val = metric === 'calls' ? totalRowCalls : r.duration_seconds;
                const outerBarPct = Math.max(12, Math.round((val / maxVal) * 100));
                const innerCompletedPct = totalRowCalls > 0 ? Math.min(100, Math.round((completedRowCalls / totalRowCalls) * 100)) : 0;
                
                const displayCode = r.college_code === 'MAREPHRA' ? 'MAREPHRAM' : (r.college_code || '');

                return (
                  <div 
                    key={r.college_id} 
                    className="flex items-center gap-3 px-1 py-1 rounded-xl"
                  >
                    {/* College Acronym */}
                    <span 
                      className="w-24 sm:w-28 shrink-0 text-right font-mono text-xs font-bold text-primary whitespace-nowrap cursor-default" 
                    >
                      {displayCode}
                    </span>

                    {/* Interactive Progress Bar */}
                    <div className="flex-1 min-w-0 h-[34px] rounded-xl bg-surface-sunken border border-border/50 overflow-hidden relative flex items-center p-0.5 shadow-2xs">
                      {metric === 'calls' ? (
                        <>
                        {/* Outer Bar represents Total Logged Calls */}
                        <div
                          className="ipoms-outer-bar h-full rounded-lg relative overflow-hidden flex items-center transition-all"
                          style={{ width: `${outerBarPct}%` }}
                        >
                          {/* Inner Completed Calls Fill */}
                          <div
                            className="ipoms-inner-completed-bar h-full rounded-lg flex items-center px-2.5 transition-all shadow-sm shrink-0"
                            style={{ width: `${innerCompletedPct}%`, minWidth: completedRowCalls > 0 ? '75px' : '0px' }}
                          >
                            {completedRowCalls > 0 && (
                              <span className="text-[11px] font-bold text-white tabular-nums whitespace-nowrap drop-shadow-xs flex items-center gap-1">
                                {completedRowCalls === totalRowCalls ? (
                                  <>
                                    <Check size={12} strokeWidth={3} className="text-emerald-300" />
                                    <span>{completedRowCalls} calls</span>
                                  </>
                                ) : (
                                  <span>{completedRowCalls} completed</span>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Remaining Pending Area inside light blue bar if wide enough */}
                          {pendingRowCalls > 0 && outerBarPct >= 40 && innerCompletedPct <= 82 && (
                            <div className="flex-1 flex items-center justify-end px-2">
                              <span className="text-[10px] font-bold text-sky-800 dark:text-sky-200 tabular-nums whitespace-nowrap">
                                {pendingRowCalls} pending
                              </span>
                            </div>
                          )}
                        </div>

                        {/* If pending doesn't fit inside light blue bar, show in grey track */}
                        {pendingRowCalls > 0 && (outerBarPct < 40 || innerCompletedPct > 82) && (
                          <span className="ml-2.5 text-[10px] font-bold text-fg-subtle dark:text-fg-muted tabular-nums whitespace-nowrap">
                            {pendingRowCalls} pending
                          </span>
                        )}
                        </>
                      ) : (
                        /* Duration View Bar */
                        <div
                          className="ipoms-cat-bar h-full rounded-lg flex items-center justify-end px-2.5 transition-all shadow-sm"
                          style={{ width: `${outerBarPct}%` }}
                        >
                          {outerBarPct >= 18 && (
                            <span className="text-[11px] font-bold text-white tabular-nums whitespace-nowrap drop-shadow-xs">
                              {r.duration_formatted}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right-Side Metrics Badge */}
                    <div className="w-32 sm:w-36 shrink-0 flex items-center justify-end gap-1.5 tabular-nums">
                      {metric === 'calls' ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-extrabold text-fg">{completedRowCalls}</span>
                          <span className="text-fg-subtle text-[11px]">/{totalRowCalls}</span>
                          
                          {completedRowCalls === totalRowCalls ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <Check size={10} strokeWidth={3} />
                              100%
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {completionRate}%
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Only show outside if the bar is too small to display inside */
                        outerBarPct < 18 ? (
                          <span className="text-xs font-bold text-fg tabular-nums flex items-center gap-1">
                            <Clock size={12} className="text-primary" />
                            {r.duration_formatted}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Footer Summary Stats */}
          <div className="mt-5 pt-3.5 border-t border-border flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-fg-subtle">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span>
                <b className="text-fg font-bold">{rows.length}</b> {rows.length === 1 ? 'college' : 'colleges'} active today
              </span>
              <span>
                <b className="text-fg font-bold">{totalCompletedCalls}</b> of <b className="text-fg font-bold">{totalCalls}</b> calls completed
              </span>
              <span>
                <b className="text-fg font-bold">{totalFormatted}</b> total calling time
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-fg-subtle">Today's Completion:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                overallCompletionPct >= 80 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}>
                {overallCompletionPct}%
              </span>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        /* Outer bar: smooth clean solid tint representing total logged calls */
        .ipoms-outer-bar {
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        :global(.dark) .ipoms-outer-bar {
          background: rgba(14, 165, 233, 0.18);
          border: 1px solid rgba(14, 165, 233, 0.35);
        }

        /* Inner completed fill bar: solid high-contrast vibrant gradient */
        .ipoms-inner-completed-bar {
          background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 60%, #0284c7 100%);
          box-shadow: 0 1px 4px rgba(37, 99, 235, 0.35);
          transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Duration Bar: swapped gradient (light cyan/turquoise at start -> dark royal blue at end) */
        .ipoms-cat-bar {
          background: linear-gradient(90deg, #22d3ee 0%, #06b6d4 15%, #0284c7 50%, #2563eb 80%, #1d4ed8 100%);
          box-shadow: 0 1px 4px rgba(37, 99, 235, 0.3);
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
          .ipoms-outer-bar,
          .ipoms-inner-completed-bar,
          .ipoms-cat-bar {
            transition: none;
          }
          .ipoms-cat-ping {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

