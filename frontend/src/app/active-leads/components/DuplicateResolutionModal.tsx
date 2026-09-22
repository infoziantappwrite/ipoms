'use client';

import React, { useState } from 'react';
import { Layers, Check, Sparkles, X, Merge, ChevronRight, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export interface DuplicateConflict {
  company_name: string;
  lead_id?: string;
  existing_role?: string;
  existing_ctc?: string;
  weekly_roles: string[];
  suggested_merged_role: string;
  lead_type: 'pipeline' | 'jd_received';
  pipeline_section?: string;
  ctc?: string;
}

export interface ConflictResolution {
  action: 'merge' | 'pick' | 'custom' | 'keep_existing';
  chosen_role: string;
  chosen_ctc?: string;
}

interface Props {
  isOpen: boolean;
  conflicts: DuplicateConflict[];
  onClose: () => void;
  onConfirm: (resolutions: Record<string, ConflictResolution>) => Promise<void>;
  isResolving: boolean;
}

export function DuplicateResolutionModal({
  isOpen,
  conflicts,
  onClose,
  onConfirm,
  isResolving,
}: Props) {
  // Initialize state with default "merge" for each company
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>(() => {
    const initial: Record<string, ConflictResolution> = {};
    conflicts.forEach((c) => {
      initial[c.company_name] = {
        action: 'merge',
        chosen_role: c.suggested_merged_role,
        chosen_ctc: c.ctc || c.existing_ctc || '',
      };
    });
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || conflicts.length === 0) return null;

  const handleSelectRole = (companyName: string, role: string, action: 'merge' | 'pick' | 'custom') => {
    triggerHaptic('selection');
    setResolutions((prev) => ({
      ...prev,
      [companyName]: {
        action,
        chosen_role: role,
        chosen_ctc: prev[companyName]?.chosen_ctc,
      },
    }));
  };

  const handleMergeAll = () => {
    triggerHaptic('medium');
    const updated: Record<string, ConflictResolution> = {};
    conflicts.forEach((c) => {
      updated[c.company_name] = {
        action: 'merge',
        chosen_role: c.suggested_merged_role,
        chosen_ctc: c.ctc || c.existing_ctc || '',
      };
    });
    setResolutions(updated);
  };

  const filteredConflicts = conflicts.filter((c) =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.weekly_roles.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    await onConfirm(resolutions);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161D2E] border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface-sunken/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                Resolve Multiple Company Roles
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold">
                  {conflicts.length} {conflicts.length === 1 ? 'Company' : 'Companies'}
                </span>
              </h2>
              <p className="text-xs text-fg-subtle mt-0.5">
                These companies have multiple roles in the Weekly Tracker. Choose to merge roles into a single row or keep a specific role to avoid duplicate rows.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search & 1-Click Merge All */}
        <div className="px-6 py-2.5 bg-surface border-b border-border flex items-center justify-between gap-3 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conflicting companies…"
            className="h-8 px-3 text-xs bg-surface-sunken border border-border rounded-lg text-fg placeholder:text-fg-subtle outline-none focus:border-primary w-64"
          />
          <button
            type="button"
            onClick={handleMergeAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <Merge size={13} />
            <span>Merge All into Single Rows</span>
          </button>
        </div>

        {/* Scrollable List of Conflicts */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {filteredConflicts.map((conflict, idx) => {
            const currentRes = resolutions[conflict.company_name] || {
              action: 'merge',
              chosen_role: conflict.suggested_merged_role,
            };

            return (
              <div
                key={conflict.company_name}
                className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-surface-sunken text-fg-subtle text-[11px] font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-fg">{conflict.company_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                      {conflict.lead_type === 'jd_received' ? 'JD Received' : 'Pipeline'}
                    </span>
                  </div>
                  {conflict.ctc && (
                    <span className="text-xs font-mono font-bold text-fg-muted px-2 py-0.5 bg-surface-sunken rounded border border-border">
                      CTC: {conflict.ctc}
                    </span>
                  )}
                </div>

                {/* Role Options */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold text-fg-subtle">Select how you want to keep this company:</p>

                  {/* Option 1: Merge into single row */}
                  <label
                    onClick={() => handleSelectRole(conflict.company_name, conflict.suggested_merged_role, 'merge')}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      currentRes.action === 'merge'
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20 font-medium'
                        : 'border-border bg-surface-sunken/40 hover:bg-surface-sunken text-fg'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`role_opt_${conflict.company_name}`}
                      checked={currentRes.action === 'merge'}
                      onChange={() => {}}
                      className="mt-0.5 shrink-0 text-primary focus:ring-0 cursor-pointer"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">Merge Roles (Single Row):</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                          Recommended
                        </span>
                      </div>
                      <p className="text-fg-subtle mt-0.5 font-medium">{conflict.suggested_merged_role}</p>
                    </div>
                  </label>

                  {/* Options 2..N: Pick individual role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {conflict.weekly_roles.map((r) => {
                      const isPicked = currentRes.action === 'pick' && currentRes.chosen_role === r;
                      return (
                        <label
                          key={r}
                          onClick={() => handleSelectRole(conflict.company_name, r, 'pick')}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                            isPicked
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold ring-1 ring-blue-500/30'
                              : 'border-border bg-surface hover:bg-surface-raised text-fg'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`role_opt_${conflict.company_name}`}
                            checked={isPicked}
                            onChange={() => {}}
                            className="shrink-0 text-primary focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{r}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-border bg-surface-sunken/60 flex items-center justify-between shrink-0">
          <span className="text-xs text-fg-subtle">
            All resolved companies will update with single clean rows in Active Leads.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isResolving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-fg transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isResolving}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isResolving ? (
                <span className="flex items-center gap-1.5">Updating…</span>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>Confirm & Update Active Leads (OK)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
