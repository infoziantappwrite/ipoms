'use client';

import React, { useEffect } from 'react';
import {
  X,
  BarChart3,
  PhoneCall,
  CheckCircle2,
  Clock,
  Target,
  Repeat,
  PhoneOff,
  Ban,
  Filter,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import type { KpiData, TrackerRow, CallOutcome } from '../page';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kpi: KpiData | null;
  rows: TrackerRow[];
  collegeName?: string;
  collegeCode?: string;
  sessionDate?: string;
  onFilterOutcome?: (outcome: CallOutcome | 'all') => void;
}

export function DailySummaryModal({
  isOpen,
  onClose,
  kpi,
  rows,
  collegeName,
  collegeCode,
  sessionDate,
  onFilterOutcome,
}: Props) {
  // Close on Escape key or Shift+S toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Real-time metric computations
  const totalLoaded = kpi?.total_loaded ?? rows.length;
  const completedCount =
    kpi?.completed ??
    rows.filter((r) => r.is_finalized || Boolean(r.call_end_time && r.outcome_status)).length;
  const pendingCount =
    kpi?.pending ??
    rows.filter((r) => !r.is_finalized && !r.call_end_time && !r.outcome_status).length;
  const positiveCount =
    kpi?.positive ??
    rows.filter((r) =>
      ['jd_received', 'hiring', 'drive_completed', 'invite_mail'].includes(r.outcome_status || '')
    ).length;
  const followUpCount =
    kpi?.follow_up ??
    rows.filter((r) => ['follow_up', 'call_back'].includes(r.outcome_status || '')).length;
  const noResponseCount =
    kpi?.no_response ?? rows.filter((r) => r.outcome_status === 'no_response').length;
  const notHiringCount = rows.filter((r) => r.outcome_status === 'not_hiring').length;

  const handleCardClick = (outcome: CallOutcome | 'all') => {
    triggerHaptic('selection');
    if (onFilterOutcome) {
      onFilterOutcome(outcome);
    }
    onClose();
  };

  const formattedDate = sessionDate
    ? new Date(sessionDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none">
      <div
        className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-fg"
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-2xs shrink-0">
              <BarChart3 size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-fg tracking-tight">
                  Daily Calling Summary
                </h2>
                {collegeCode && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {collegeCode}
                  </span>
                )}
              </div>
              <p className="text-micro text-fg-subtle">
                {formattedDate} {collegeName ? `• ${collegeName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold text-fg-subtle bg-surface-sunken border border-border px-1.5 py-0.5 rounded">
              Shift+S
            </kbd>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-7 h-7 rounded-lg bg-surface-sunken hover:bg-surface-raised border border-border flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="p-5 space-y-4 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* KPI Summary Cards Grid */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle px-1">
              Performance Breakdown
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Total Calls */}
              <button
                type="button"
                onClick={() => handleCardClick('all')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/60 dark:hover:bg-sky-950/40 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PhoneCall size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sky-900 dark:text-sky-200">Total Calls</div>
                    <div className="text-[10px] text-sky-700/80 dark:text-sky-400">Loaded Contacts</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200">
                  {totalLoaded}
                </span>
              </button>

              {/* Completed */}
              <button
                type="button"
                onClick={() => handleCardClick('all')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CheckCircle2 size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Completed</div>
                    <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Calls Handled</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                  {completedCount}
                </span>
              </button>

              {/* Pending */}
              <button
                type="button"
                onClick={() => handleCardClick('all')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Clock size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">Pending</div>
                    <div className="text-[10px] text-amber-700/80 dark:text-amber-400">Remaining to Call</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                  {pendingCount}
                </span>
              </button>

              {/* Positives */}
              <button
                type="button"
                onClick={() => handleCardClick('jd_received')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Target size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-200">Positives</div>
                    <div className="text-[10px] text-blue-700/80 dark:text-blue-400">JD / Hiring / Invite</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200">
                  {positiveCount}
                </span>
              </button>

              {/* Follow Up */}
              <button
                type="button"
                onClick={() => handleCardClick('follow_up')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Repeat size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Follow Up</div>
                    <div className="text-[10px] text-indigo-700/80 dark:text-indigo-400">Scheduled Call Backs</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200">
                  {followUpCount}
                </span>
              </button>

              {/* No Response */}
              <button
                type="button"
                onClick={() => handleCardClick('no_response')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PhoneOff size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-900 dark:text-rose-200">No Response</div>
                    <div className="text-[10px] text-rose-700/80 dark:text-rose-400">Unanswered / Busy</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200">
                  {noResponseCount}
                </span>
              </button>

              {/* Not Hiring */}
              <button
                type="button"
                onClick={() => handleCardClick('not_hiring')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-all cursor-pointer group text-left sm:col-span-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Ban size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-fg">Not Hiring</div>
                    <div className="text-[10px] text-fg-subtle">Hiring Frozen / Closed</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {notHiringCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-border bg-surface-sunken/50 flex items-center gap-1.5 text-fg-subtle text-[11px] shrink-0">
          <Filter size={12} className="text-primary shrink-0" />
          <span>Click any card to filter calling table</span>
        </div>
      </div>
    </div>
  );
}
