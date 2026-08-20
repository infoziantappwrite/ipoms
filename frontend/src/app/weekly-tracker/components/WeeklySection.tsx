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
    headerBg: 'bg-warning/30 border-warning/30',
    badgeClass: 'bg-warning/20 text-warning border-warning/40',
  },
  completed: {
    icon: '🏆',
    headerBg: 'bg-success/30 border-success/30',
    badgeClass: 'bg-success/20 text-success border-success/40',
  },
  in_progress: {
    icon: '🚀',
    headerBg: 'bg-primary/30 border-primary/30',
    badgeClass: 'bg-primary/20 text-primary border-primary/40',
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
    headerBg: 'bg-background/60 border-border-strong',
    badgeClass: 'bg-surface text-fg-muted border-border-strong',
  },
  rejected_by_college: {
    icon: '🚫',
    headerBg: 'bg-background/60 border-border-strong',
    badgeClass: 'bg-surface text-fg-muted border-border-strong',
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
    headerBg: 'bg-background border-border',
    badgeClass: 'bg-surface text-fg-muted border-border-strong',
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-2 transition-all">
      {/* Sticky Section Header per Spec Section 16 */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b cursor-pointer select-none transition-colors ${config.headerBg}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{config.icon}</span>
          <span className="text-xs font-bold text-fg tracking-wide uppercase">
            {order}. {title}
          </span>
          <span className={`text-micro px-2 py-0.5 rounded-full border font-semibold ${config.badgeClass}`}>
            {rows.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-subtle font-medium hidden sm:inline">
            {summaryMetric}
          </span>
          <button className="text-fg-subtle hover:text-white text-xs px-1 transition-transform">
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Table Content */}
      {!isCollapsed && (
        <div className="bg-background/70">
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
