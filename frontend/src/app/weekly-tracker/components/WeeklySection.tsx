'use client';

import { useState } from 'react';
import {
  Clock,
  Trophy,
  Rocket,
  Inbox,
  Star,
  XCircle,
  Folder,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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

const SECTION_CONFIGS: Record<string, { Icon: any; headerBg: string; badgeClass: string; iconClass: string }> = {
  follow_ups_due_today: {
    Icon: Clock,
    headerBg: 'bg-amber-50/80 border-amber-200 text-amber-900',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    iconClass: 'text-amber-600',
  },
  completed: {
    Icon: Trophy,
    headerBg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconClass: 'text-emerald-600',
  },
  in_progress: {
    Icon: Rocket,
    headerBg: 'bg-blue-50/80 border-blue-200 text-blue-900',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    iconClass: 'text-blue-600',
  },
  pipeline: {
    Icon: Inbox,
    headerBg: 'bg-cyan-50/80 border-cyan-200 text-cyan-900',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    iconClass: 'text-cyan-600',
  },
  top_companies: {
    Icon: Star,
    headerBg: 'bg-purple-50/80 border-purple-200 text-purple-900',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    iconClass: 'text-purple-600',
  },
  rejected_by_hr: {
    Icon: XCircle,
    headerBg: 'bg-slate-50/80 border-slate-200 text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClass: 'text-slate-500',
  },
  rejected_by_college: {
    Icon: XCircle,
    headerBg: 'bg-slate-50/80 border-slate-200 text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClass: 'text-slate-500',
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
    Icon: Folder,
    headerBg: 'bg-slate-50 border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClass: 'text-slate-500',
  };

  const IconComponent = config.Icon;

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-xs transition-all bg-white">
      {/* Sticky Section Header per Spec Section 16 */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b cursor-pointer select-none transition-colors ${config.headerBg}`}
      >
        <div className="flex items-center gap-2.5">
          <IconComponent size={15} strokeWidth={2} className={config.iconClass} />
          <span className="text-xs font-bold tracking-wide uppercase">
            {title}
          </span>
          <span className={`text-micro px-2 py-0.5 rounded-full border font-semibold ${config.badgeClass}`}>
            {rows.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium opacity-80 hidden sm:inline">
            {summaryMetric}
          </span>
          <button className="p-1 rounded hover:bg-black/5 transition-transform" title={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Table Content */}
      {!isCollapsed && (
        <div className="bg-white">
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
