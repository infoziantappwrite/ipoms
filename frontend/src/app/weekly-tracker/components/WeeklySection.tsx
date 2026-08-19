'use client';

import { useState } from 'react';
import { WeeklyTable, WeeklyRow } from './WeeklyTable';

interface Props {
  sectionKey: string;
  title: string;
  order: number;
  summaryMetric: string;
  rows: WeeklyRow[];
  onUpdateRow: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onMoveSection: (rowId: string, newSection: string) => Promise<void>;
  onTogglePin: (rowId: string) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

const SECTION_CONFIGS: Record<string, { icon: string; headerBg: string; badgeClass: string }> = {
  follow_ups_due_today: {
    icon: '⏰',
    headerBg: 'bg-amber-950/30 border-amber-500/30',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  completed: {
    icon: '🏆',
    headerBg: 'bg-emerald-950/30 border-emerald-500/30',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  in_progress: {
    icon: '🚀',
    headerBg: 'bg-blue-950/30 border-blue-500/30',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  pipeline: {
    icon: '📥',
    headerBg: 'bg-cyan-950/30 border-cyan-500/30',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  top_companies: {
    icon: '⭐',
    headerBg: 'bg-purple-950/30 border-purple-500/30',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  rejected_by_hr: {
    icon: '🚫',
    headerBg: 'bg-slate-900/60 border-slate-700',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-600',
  },
  rejected_by_college: {
    icon: '🚫',
    headerBg: 'bg-slate-900/60 border-slate-700',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-600',
  },
};

export function WeeklySection({
  sectionKey,
  title,
  order,
  summaryMetric,
  rows,
  onUpdateRow,
  onMoveSection,
  onTogglePin,
  onDeleteRow,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const config = SECTION_CONFIGS[sectionKey] || {
    icon: '📂',
    headerBg: 'bg-slate-900 border-slate-800',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden shadow-md transition-all">
      {/* Sticky Section Header per Spec Section 16 */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-md cursor-pointer select-none transition-colors ${config.headerBg}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{config.icon}</span>
          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">
            {order}. {title}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${config.badgeClass}`}>
            {rows.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            {summaryMetric}
          </span>
          <button className="text-slate-400 hover:text-white text-xs px-1 transition-transform">
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Table Content */}
      {!isCollapsed && (
        <div className="bg-slate-950/70">
          <WeeklyTable
            rows={rows}
            sectionKey={sectionKey}
            onUpdateRow={onUpdateRow}
            onMoveSection={onMoveSection}
            onTogglePin={onTogglePin}
            onDeleteRow={onDeleteRow}
          />
        </div>
      )}
    </div>
  );
}
