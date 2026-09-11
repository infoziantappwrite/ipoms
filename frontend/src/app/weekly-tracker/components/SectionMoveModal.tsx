'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  Trophy,
  Rocket,
  Inbox,
  Star,
  XCircle,
  Clock,
  Check,
  Calendar,
  Zap,
  Building2,
} from 'lucide-react';
import type { WeeklyRow } from './WeeklyTable';
import { triggerHaptic } from '@/lib/haptics';

export interface MoveSectionOption {
  key: string;
  label: string;
  Icon: React.ElementType;
  colorClass: string;
  badgeClass: string;
  activeBorderClass: string;
}

export const ALL_PIPELINE_SECTIONS: MoveSectionOption[] = [
  {
    key: 'completed',
    label: 'Companies Completed',
    Icon: Trophy,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    activeBorderClass: 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/60 ring-2 ring-emerald-500/30',
  },
  {
    key: 'drive_in_progress',
    label: 'Drive in Progress',
    Icon: Zap,
    colorClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    activeBorderClass: 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/60 ring-2 ring-amber-500/30',
  },
  {
    key: 'in_drive',
    label: 'Upcoming Drives',
    Icon: Calendar,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
    activeBorderClass: 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/30',
  },
  {
    key: 'in_progress',
    label: 'Companies In Progress',
    Icon: Rocket,
    colorClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    activeBorderClass: 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 ring-2 ring-blue-500/30',
  },
  {
    key: 'pipeline',
    label: 'Companies in Pipeline',
    Icon: Inbox,
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
    activeBorderClass: 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/60 ring-2 ring-cyan-500/30',
  },
  {
    key: 'top_companies',
    label: 'Top Companies',
    Icon: Star,
    colorClass: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
    activeBorderClass: 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/60 ring-2 ring-purple-500/30',
  },
  {
    key: 'rejected_companies',
    label: 'Rejected Companies',
    Icon: XCircle,
    colorClass: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    activeBorderClass: 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/60 ring-2 ring-rose-500/30',
  },
  {
    key: 'on_hold_by_college',
    label: 'Companies On Hold By College',
    Icon: Clock,
    colorClass: 'text-orange-600 dark:text-orange-400',
    badgeClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
    activeBorderClass: 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/60 ring-2 ring-orange-500/30',
  },
  {
    key: 'on_hold_by_hr',
    label: 'Companies On Hold By HR',
    Icon: Clock,
    colorClass: 'text-slate-600 dark:text-slate-400',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
    activeBorderClass: 'border-slate-500 bg-slate-100/70 dark:bg-slate-800/60 ring-2 ring-slate-500/30',
  },
];

interface Props {
  currentSectionKey: string;
  currentSectionTitle: string;
  rows: WeeklyRow[];
  onClose: () => void;
  onMoveSection: (rowId: string, targetSection: string) => Promise<void>;
}

export function SectionMoveModal({
  currentSectionKey,
  currentSectionTitle,
  rows,
  onClose,
  onMoveSection,
}: Props) {
  const [selectedRowId, setSelectedRowId] = useState<string>(rows[0]?._id || '');
  const [targetSection, setTargetSection] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const filteredRows = rows.filter((r) =>
    r.company_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (r.job_role && r.job_role.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const selectedRow = rows.find((r) => r._id === selectedRowId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRowId) {
      alert('Please select a company to move');
      return;
    }
    if (!targetSection) {
      alert('Please select a destination section');
      return;
    }
    if (targetSection === currentSectionKey) {
      alert('The company is already in this section');
      return;
    }

    setIsSubmitting(true);
    try {
      await onMoveSection(selectedRowId, targetSection);
      triggerHaptic('success');
      onClose();
    } catch (err) {
      console.error('Failed to move company:', err);
      alert('Failed to move company. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-sunken/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ArrowRightLeft size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg">Move Company to Section</h2>
              <p className="text-xs text-fg-subtle">
                Transfer from <span className="font-semibold text-fg">{currentSectionTitle}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Select Company */}
          <div>
            <label className="block text-xs font-bold text-fg uppercase tracking-wider mb-2">
              1. Select Company to Move ({rows.length} available) <span className="text-rose-500">*</span>
            </label>

            {rows.length > 5 && (
              <input
                type="text"
                placeholder="Search company or role…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg mb-2 text-fg placeholder:text-fg-disabled outline-none focus:border-primary"
              />
            )}

            <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border/60 bg-surface-sunken/30">
              {filteredRows.length === 0 ? (
                <div className="p-4 text-center text-xs text-fg-subtle italic">
                  No matching companies found
                </div>
              ) : (
                filteredRows.map((r, idx) => {
                  const isSelected = selectedRowId === r._id;
                  return (
                    <div
                      key={r._id}
                      onClick={() => setSelectedRowId(r._id)}
                      className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-l-3 border-primary text-fg font-semibold'
                          : 'hover:bg-surface-raised text-fg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center text-micro font-mono text-fg-subtle shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-fg truncate">{r.company_name}</p>
                          <p className="text-micro text-fg-subtle truncate">{r.job_role || 'Graduate Trainee'}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Select Destination Section */}
          <div>
            <label className="block text-xs font-bold text-fg uppercase tracking-wider mb-2">
              2. Choose Destination Section <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_PIPELINE_SECTIONS.map((sec) => {
                const IconComponent = sec.Icon;
                const isCurrent = sec.key === currentSectionKey;
                const isSelected = targetSection === sec.key;

                return (
                  <button
                    key={sec.key}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setTargetSection(sec.key)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'opacity-40 bg-surface-sunken border-border cursor-not-allowed'
                        : isSelected
                        ? sec.activeBorderClass
                        : 'border-border/80 bg-surface hover:bg-surface-raised text-fg'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sec.badgeClass}`}
                    >
                      <IconComponent size={14} strokeWidth={2.2} className={sec.colorClass} />
                    </div>
                    <div className="truncate flex-1">
                      <span className="font-semibold block truncate">{sec.label}</span>
                      {isCurrent && (
                        <span className="text-micro text-fg-subtle block">(Current Section)</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} strokeWidth={2.5} className="text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Summary preview */}
          {selectedRow && targetSection && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-fg flex items-center gap-2">
              <Building2 size={15} className="text-primary shrink-0" />
              <span>
                Move <strong>{selectedRow.company_name}</strong> to{' '}
                <strong>{ALL_PIPELINE_SECTIONS.find((s) => s.key === targetSection)?.label}</strong>
              </span>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedRowId || !targetSection || isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowRightLeft size={13} strokeWidth={2.5} />
              <span>{isSubmitting ? 'Moving…' : 'Move Company'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
