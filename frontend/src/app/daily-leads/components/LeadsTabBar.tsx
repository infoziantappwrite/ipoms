'use client';

import { ClipboardList, Sparkles, Trash2, X } from 'lucide-react';

interface Props {
  activeTab: 'positive' | 'jd_received';
  onTabChange: (tab: 'positive' | 'jd_received') => void;
  positivesCount: number;
  jdCount: number;
  selectedCount?: number;
  onClearSelection?: () => void;
  onBulkDelete?: () => void;
}

export function LeadsTabBar({
  activeTab,
  onTabChange,
  positivesCount,
  jdCount,
  selectedCount = 0,
  onClearSelection,
  onBulkDelete,
}: Props) {
  return (
    <div className="px-6 border-b border-border flex items-center justify-between gap-4 bg-surface min-h-[48px]">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {/* Positives */}
        <button
          onClick={() => onTabChange('positive')}
          className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none cursor-pointer rounded-t-lg
                      ${
                        activeTab === 'positive'
                          ? 'text-emerald-950 dark:text-emerald-200 border-b-2 border-emerald-600 bg-emerald-100/90 dark:bg-emerald-950/50'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                      }`}
        >
          <Sparkles size={15} strokeWidth={2.5} className={activeTab === 'positive' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'} aria-hidden />
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

        {/* JD Received */}
        <button
          onClick={() => onTabChange('jd_received')}
          className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none cursor-pointer rounded-t-lg
                      ${
                        activeTab === 'jd_received'
                          ? 'text-blue-950 dark:text-blue-200 border-b-2 border-blue-600 bg-blue-100/90 dark:bg-blue-950/50'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                      }`}
        >
          <ClipboardList size={15} strokeWidth={2.5} className={activeTab === 'jd_received' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'} aria-hidden />
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

      {/* Inline Selection & Delete Actions in the same row */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 py-1 animate-fadeIn">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 shadow-2xs">
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
              {selectedCount}
            </span>
            <span className="text-xs font-bold text-rose-900">
              {selectedCount === 1 ? '1 selected' : `${selectedCount} selected`}
            </span>
          </div>

          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          )}

          {onBulkDelete && (
            <button
              type="button"
              onClick={onBulkDelete}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs border border-rose-700 flex items-center gap-1.5 active:translate-y-[1px] transition-all cursor-pointer"
            >
              <Trash2 size={13} strokeWidth={2.2} />
              <span>Delete Selected ({selectedCount})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
