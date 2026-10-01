'use client';

import React from 'react';
import { ClipboardList, Sparkles, Trash2 } from 'lucide-react';

interface Props {
  activeTab: 'positive' | 'jd_received' | 'my_positives';
  onTabChange: (tab: 'positive' | 'jd_received' | 'my_positives') => void;
  positivesCount: number;
  jdCount: number;
  myPositivesCount?: number;
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
  myPositivesCount = 0,
  isDeleteMode = false,
  selectedCount = 0,
  onBulkDelete,
}: Props) {
  return (
    <div className="px-6 border-b border-border flex items-center justify-between gap-4 bg-surface min-h-[48px]">
      {/* ── Left: Tab Buttons — Apple Smooth Sliding Segmented Control ── */}
      <div className="relative grid grid-cols-3 gap-1 p-1 bg-surface-sunken/80 dark:bg-zinc-900/90 rounded-lg border border-border/80 shadow-2xs shrink-0 select-none">
        {/* Glider / Smooth Sliding Indicator */}
        <div
          style={
            activeTab === 'positive'
              ? { background: 'linear-gradient(180deg, #1D64D8 0%, #174EB8 50%, #0B2556 100%)' }
              : activeTab === 'jd_received'
              ? { background: 'linear-gradient(180deg, #38BF3D 0%, #1BA32D 50%, #0B6B1E 100%)' }
              : { background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 50%, #3730A3 100%)' }
          }
          className={`absolute top-1 bottom-1 w-[calc((100%-12px)/3)] rounded-md border shadow-md transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
            activeTab === 'positive'
              ? 'left-1 translate-x-0 border-blue-400/40 shadow-blue-900/30'
              : activeTab === 'jd_received'
              ? 'left-1 translate-x-[calc(100%+4px)] border-emerald-400/40 shadow-emerald-600/25'
              : 'left-1 translate-x-[calc(200%+8px)] border-indigo-400/40 shadow-indigo-500/25'
          }`}
        />

        {/* Positives Tab */}
        <button
          type="button"
          onClick={() => onTabChange('positive')}
          className={`relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md select-none ${
            activeTab === 'positive'
              ? 'text-white font-extrabold'
              : 'text-fg-subtle hover:text-fg'
          }`}
        >
          <span className="tracking-wide uppercase font-extrabold text-[11px]">Positives</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
              activeTab === 'positive'
                ? 'bg-black/20 text-white font-black'
                : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted border border-border/40'
            }`}
          >
            {positivesCount}
          </span>
        </button>

        {/* JD Received Tab */}
        <button
          type="button"
          onClick={() => onTabChange('jd_received')}
          className={`relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md select-none ${
            activeTab === 'jd_received'
              ? 'text-white font-extrabold'
              : 'text-fg-subtle hover:text-fg'
          }`}
        >
          <span className="tracking-wide uppercase font-extrabold text-[11px]">JD Received</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
              activeTab === 'jd_received'
                ? 'bg-black/20 text-white font-black'
                : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted border border-border/40'
            }`}
          >
            {jdCount}
          </span>
        </button>

        {/* My College Positives Tab */}
        <button
          type="button"
          onClick={() => onTabChange('my_positives')}
          className={`relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-colors duration-200 cursor-pointer rounded-md select-none ${
            activeTab === 'my_positives'
              ? 'text-white font-extrabold'
              : 'text-fg-subtle hover:text-fg'
          }`}
        >
          <span className="tracking-wide uppercase font-extrabold text-[11px]">My Positives</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] transition-colors duration-200 tabular-nums shadow-2xs ${
              activeTab === 'my_positives'
                ? 'bg-black/20 text-white font-black'
                : 'bg-surface-sunken dark:bg-zinc-800 text-fg-muted border border-border/40'
            }`}
          >
            {myPositivesCount}
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
            className="flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md shadow-red-600/25 transition-all cursor-pointer hover:brightness-110 active:scale-[0.95]"
            style={{ background: 'linear-gradient(180deg, #E60000 0%, #C80000 50%, #990000 100%)' }}
          >
            <Trash2 size={13} strokeWidth={2.2} aria-hidden />
            <span>Delete Selected ({selectedCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
