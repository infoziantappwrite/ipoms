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
      {/* ── Left: Tab Buttons ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Positives Tab */}
        <button
          type="button"
          onClick={() => onTabChange('positive')}
          className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none cursor-pointer rounded-t-lg
                      ${
                        activeTab === 'positive'
                          ? 'text-emerald-950 dark:text-emerald-200 border-b-2 border-emerald-600 bg-emerald-100/90 dark:bg-emerald-950/50'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                      }`}
        >
          <Sparkles
            size={15}
            strokeWidth={2.5}
            className={activeTab === 'positive' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}
            aria-hidden
          />
          <span className="tracking-wide uppercase font-extrabold">Positives</span>
          <span
            className={`text-micro px-2 py-0.5 rounded-full font-bold transition-colors shadow-2xs ${
              activeTab === 'positive'
                ? 'bg-emerald-700 text-white font-black'
                : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-bold'
            }`}
          >
            {positivesCount}
          </span>
        </button>

        {/* JD Received Tab */}
        <button
          type="button"
          onClick={() => onTabChange('jd_received')}
          className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none cursor-pointer rounded-t-lg
                      ${
                        activeTab === 'jd_received'
                          ? 'text-blue-950 dark:text-blue-200 border-b-2 border-blue-600 bg-blue-100/90 dark:bg-blue-950/50'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                      }`}
        >
          <ClipboardList
            size={15}
            strokeWidth={2.5}
            className={activeTab === 'jd_received' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}
            aria-hidden
          />
          <span className="tracking-wide uppercase font-extrabold">JD Received</span>
          <span
            className={`text-micro px-2 py-0.5 rounded-full font-bold transition-colors shadow-2xs ${
              activeTab === 'jd_received'
                ? 'bg-blue-700 text-white font-black'
                : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-bold'
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
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Trash2 size={13} strokeWidth={2.2} aria-hidden />
            <span>Delete Selected ({selectedCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
