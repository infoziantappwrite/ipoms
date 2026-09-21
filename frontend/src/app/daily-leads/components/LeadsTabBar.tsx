'use client';

import React from 'react';
import { ClipboardList, Sparkles, Trash2 } from 'lucide-react';

interface Props {
  activeTab: 'positive' | 'jd_received';
  onTabChange: (tab: 'positive' | 'jd_received') => void;
  positivesCount: number;
  jdCount: number;
  totalRows?: number;
  isDeleteMode?: boolean;
  selectedCount?: number;
  onBulkDelete?: () => void;
}

export function LeadsTabBar({
  activeTab,
  onTabChange,
  positivesCount,
  jdCount,
  isDeleteMode = false,
  selectedCount = 0,
  onBulkDelete,
}: Props) {
  return (
    <div className="px-6 border-b border-border flex items-center justify-between gap-4 bg-surface min-h-[48px]">
      {/* ── Left: Tab Buttons — Apple Smooth Sliding Segmented Control ── */}
      <div className="relative grid grid-cols-2 gap-1 p-1 bg-surface-sunken/80 dark:bg-zinc-900/90 rounded-lg border border-border/80 shadow-2xs shrink-0 select-none">
        {/* Glider / Smooth Sliding Indicator */}
        <div
          className={`absolute top-1 bottom-1 w-[calc((100%-12px)/2)] rounded-md border shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
            activeTab === 'positive'
              ? 'left-1 translate-x-0 bg-white dark:bg-emerald-950/80 border-emerald-500/40 dark:border-emerald-600/50 shadow-emerald-500/10'
              : 'left-1 translate-x-[calc(100%+4px)] bg-white dark:bg-blue-950/80 border-blue-500/40 dark:border-blue-600/50 shadow-blue-500/10'
          }`}
        />

        {/* Positives Tab */}
        <button
          type="button"
          onClick={() => onTabChange('positive')}
          className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md ${
            activeTab === 'positive'
              ? 'text-emerald-900 dark:text-emerald-200 font-extrabold'
              : 'text-fg-subtle hover:text-fg'
          }`}
        >
          <Sparkles
            size={14}
            strokeWidth={2.3}
            className={`transition-colors duration-200 ${
              activeTab === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'
            }`}
            aria-hidden
          />
          <span className="tracking-wide uppercase font-extrabold">Positives</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
              activeTab === 'positive'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white font-black'
                : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted'
            }`}
          >
            {positivesCount}
          </span>
        </button>

        {/* JD Received Tab */}
        <button
          type="button"
          onClick={() => onTabChange('jd_received')}
          className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md ${
            activeTab === 'jd_received'
              ? 'text-blue-900 dark:text-blue-200 font-extrabold'
              : 'text-fg-subtle hover:text-fg'
          }`}
        >
          <ClipboardList
            size={14}
            strokeWidth={2.3}
            className={`transition-colors duration-200 ${
              activeTab === 'jd_received' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'
            }`}
            aria-hidden
          />
          <span className="tracking-wide uppercase font-extrabold">JD Received</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
              activeTab === 'jd_received'
                ? 'bg-blue-600 dark:bg-blue-500 text-white font-black'
                : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted'
            }`}
          >
            {jdCount}
          </span>
        </button>
      </div>

      {/* ── Right: Delete Action (Only visible in Delete Mode when rows are selected) ── */}
      {isDeleteMode && (
        <div className="flex items-center gap-2 py-1.5 animate-in fade-in duration-150">
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.992]"
          >
            <Trash2 size={13} strokeWidth={2.2} aria-hidden />
            <span>Delete Selected ({selectedCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
