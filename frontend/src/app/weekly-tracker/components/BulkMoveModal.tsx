'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  Trophy,
  Zap,
  Calendar,
  Rocket,
  Inbox,
  Star,
  XCircle,
  Clock,
  CheckCircle2,
  Shuffle,
  Building2,
} from 'lucide-react';
import { WeeklyRow } from './WeeklyTable';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  selectedRows: WeeklyRow[];
  allAvailableRows?: WeeklyRow[];
  onClose: () => void;
  onConfirmMove: (targetSectionKey: string, selectedRowIds: string[]) => Promise<void>;
}

const TARGET_SECTIONS = [
  {
    key: 'completed',
    label: 'Companies Completed',
    Icon: Trophy,
    colorClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500',
    activeClass: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-100/80 dark:bg-emerald-900/60',
  },
  {
    key: 'drive_in_progress',
    label: 'Drive in Progress',
    Icon: Zap,
    colorClass: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 hover:border-amber-500',
    activeClass: 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/80 dark:bg-amber-900/60',
  },
  {
    key: 'in_drive',
    label: 'Upcoming Drives',
    Icon: Calendar,
    colorClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 hover:border-indigo-500',
    activeClass: 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-100/80 dark:bg-indigo-900/60',
  },
  {
    key: 'in_progress',
    label: 'Companies In Progress',
    Icon: Rocket,
    colorClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 hover:border-blue-500',
    activeClass: 'ring-2 ring-blue-500 border-blue-500 bg-blue-100/80 dark:bg-blue-900/60',
  },
  {
    key: 'pipeline',
    label: 'Companies in Pipeline',
    Icon: Inbox,
    colorClass: 'text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-800 hover:border-cyan-500',
    activeClass: 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-100/80 dark:bg-cyan-900/60',
  },
  {
    key: 'top_companies',
    label: 'Top Companies',
    Icon: Star,
    colorClass: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 hover:border-purple-500',
    activeClass: 'ring-2 ring-purple-500 border-purple-500 bg-purple-100/80 dark:bg-purple-900/60',
  },
  {
    key: 'rejected_companies',
    label: 'Rejected Companies',
    Icon: XCircle,
    colorClass: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 hover:border-rose-500',
    activeClass: 'ring-2 ring-rose-500 border-rose-500 bg-rose-100/80 dark:bg-rose-900/60',
  },
  {
    key: 'on_hold_by_college',
    label: 'Hold by College',
    Icon: Clock,
    colorClass: 'text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border-orange-300 dark:border-orange-800 hover:border-orange-500',
    activeClass: 'ring-2 ring-orange-500 border-orange-500 bg-orange-100/80 dark:bg-orange-900/60',
  },
  {
    key: 'on_hold_by_hr',
    label: 'Hold by HR',
    Icon: Clock,
    colorClass: 'text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 hover:border-slate-500',
    activeClass: 'ring-2 ring-slate-500 border-slate-500 bg-slate-200 dark:bg-slate-800',
  },
];

export function BulkMoveModal({
  selectedRows,
  allAvailableRows = [],
  onClose,
  onConfirmMove,
}: Props) {
  const [selectedTargetSection, setSelectedTargetSection] = useState<string>('in_drive');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRowIds, setActiveRowIds] = useState<string[]>(() => selectedRows.map((r) => r._id));

  useEffect(() => {
    setActiveRowIds(selectedRows.map((r) => r._id));
  }, [selectedRows]);

  // Keyboard shortcut listener for Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleToggleRemoveRow = (id: string) => {
    triggerHaptic('light');
    setActiveRowIds((prev) => prev.filter((x) => x !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRowIds.length === 0 || !selectedTargetSection) return;

    setIsSubmitting(true);
    triggerHaptic('medium');
    try {
      await onConfirmMove(selectedTargetSection, activeRowIds);
      onClose();
    } catch (err) {
      console.error('Failed to execute bulk move:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedRows = allAvailableRows.length > 0
    ? allAvailableRows.filter((r) => activeRowIds.includes(r._id))
    : selectedRows.filter((r) => activeRowIds.includes(r._id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ArrowRightLeft size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">Move Companies</h2>
              <p className="text-xs text-fg-subtle">
                Choose the destination section for {activeRowIds.length} selected company record{activeRowIds.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-fg-subtle hover:text-fg hover:bg-surface-sunken transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Section Selection Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fg-muted mb-2.5">
              Select Destination Section *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TARGET_SECTIONS.map((sec) => {
                const isSelected = selectedTargetSection === sec.key;
                const IconComponent = sec.Icon;
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedTargetSection(sec.key);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer shadow-2xs ${
                      isSelected
                        ? sec.activeClass
                        : `${sec.colorClass} opacity-85 hover:opacity-100`
                    }`}
                  >
                    <IconComponent size={16} strokeWidth={2.2} className="shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{sec.label}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Companies Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                Selected Companies ({activeRowIds.length})
              </label>
              {activeRowIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveRowIds([])}
                  className="text-micro text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {displayedRows.length === 0 ? (
              <div className="py-6 text-center border-2 border-dashed border-border rounded-xl text-fg-subtle text-xs">
                No companies currently selected. Please check the companies you want to move in the tracker table first.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2.5 bg-surface-sunken border border-border rounded-xl">
                {displayedRows.map((r) => (
                  <span
                    key={r._id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-fg text-xs font-medium shadow-2xs group"
                  >
                    <Building2 size={12} className="text-primary shrink-0" />
                    <span className="truncate max-w-[180px]">{r.company_name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleRemoveRow(r._id)}
                      className="text-fg-subtle hover:text-rose-600 rounded-md p-0.5 transition-colors cursor-pointer"
                      title="Remove from selection"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-sunken hover:bg-surface-raised border border-border text-fg text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={activeRowIds.length === 0 || isSubmitting}
              className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-bold shadow-xs flex items-center justify-center transition-all cursor-pointer"
            >
              <span>{isSubmitting ? 'Moving…' : 'Move'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
