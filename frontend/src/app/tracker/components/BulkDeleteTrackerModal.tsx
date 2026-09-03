'use client';

import { useState, useEffect } from 'react';
import {
  Trash2,
  X,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  collegeId: string;
  collegeCode: string;
  collegeName: string;
  todayCount: number;
  onClose: () => void;
  onConfirmDelete: (scope: 'today' | 'college_all' | 'entire_database') => Promise<void>;
}

export function BulkDeleteTrackerModal({
  collegeId,
  collegeCode,
  collegeName,
  todayCount,
  onClose,
  onConfirmDelete,
}: Props) {
  const [scope, setScope] = useState<'today' | 'college_all' | 'entire_database'>('today');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  const handleDelete = async () => {
    if (scope === 'entire_database' && confirmText.trim().toUpperCase() !== 'DELETE') {
      alert('Please type DELETE to confirm wiping the entire tracker database.');
      return;
    }

    try {
      setLoading(true);
      triggerHaptic('medium');
      await onConfirmDelete(scope);
      onClose();
    } catch (err: any) {
      console.error('[DT] Bulk delete failed', err);
      alert(err.message || 'Failed to delete tracker records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">Bulk Delete Daily Tracker</h3>
              <p className="text-micro text-fg-subtle">
                Purge calling sheet entries or historical tracker data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-xl bg-surface-sunken hover:bg-surface-raised border border-border flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Target Institution Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken border border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 size={16} className="text-primary shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-fg block truncate">
                  [{collegeCode}] {collegeName}
                </span>
                <span className="text-micro text-fg-subtle">
                  Today&apos;s Sheet: <strong>{todayCount} contacts loaded</strong>
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
              Active Context
            </span>
          </div>

          {/* Scope Radio Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-fg block">
              Select Deletion Scope:
            </label>

            {/* Option 1: Today's Sheet Only */}
            <label
              onClick={() => setScope('today')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                scope === 'today'
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs'
                  : 'border-border bg-surface hover:bg-surface-raised/60'
              }`}
            >
              <input
                type="radio"
                name="delete_scope"
                value="today"
                checked={scope === 'today'}
                onChange={() => setScope('today')}
                className="mt-0.5 accent-rose-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs text-fg">
                  <Calendar size={13} className="text-rose-600" />
                  <span>Clear Today&apos;s Calling Sheet ({todayCount} contacts)</span>
                </div>
                <p className="text-micro text-fg-subtle mt-0.5">
                  Removes all unfinalized rows loaded into today&apos;s active session for [{collegeCode}]. Allows you to load a fresh list from metadata.
                </p>
              </div>
            </label>

            {/* Option 2: All Dates for this College */}
            <label
              onClick={() => setScope('college_all')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                scope === 'college_all'
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs'
                  : 'border-border bg-surface hover:bg-surface-raised/60'
              }`}
            >
              <input
                type="radio"
                name="delete_scope"
                value="college_all"
                checked={scope === 'college_all'}
                onChange={() => setScope('college_all')}
                className="mt-0.5 accent-rose-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs text-fg">
                  <Building2 size={13} className="text-rose-600" />
                  <span>Clear Entire Tracker History for [{collegeCode}]</span>
                </div>
                <p className="text-micro text-fg-subtle mt-0.5">
                  Permanently deletes all historical call records and daily tracker logs across all months for this institution.
                </p>
              </div>
            </label>

            {/* Option 3: Entire Daily Tracker Database */}
            <label
              onClick={() => setScope('entire_database')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                scope === 'entire_database'
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs'
                  : 'border-border bg-surface hover:bg-surface-raised/60'
              }`}
            >
              <input
                type="radio"
                name="delete_scope"
                value="entire_database"
                checked={scope === 'entire_database'}
                onChange={() => setScope('entire_database')}
                className="mt-0.5 accent-rose-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-400">
                  <Layers size={13} />
                  <span>Wipe Entire Daily Tracker Database (All Colleges)</span>
                </div>
                <p className="text-micro text-fg-subtle mt-0.5">
                  Purges all daily tracker records across all partner colleges in the entire system. Complete clean slate.
                </p>
              </div>
            </label>
          </div>

          {/* Special Confirmation Input for Full Database Wipe */}
          {scope === 'entire_database' && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                Type &quot;DELETE&quot; to confirm complete database wipe:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-surface border border-rose-300 dark:border-rose-900 text-xs font-mono font-bold text-fg px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>
          )}

          {/* Warning Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Permanent Action:</strong> Deleted tracker records cannot be recovered.
              Any call durations or outcome histories will be permanently cleared from this sheet.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-raised/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-sunken hover:bg-surface-raised border border-border text-fg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || (scope === 'entire_database' && confirmText.trim().toUpperCase() !== 'DELETE')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} strokeWidth={2} />
                <span>
                  {scope === 'today'
                    ? `Delete Today's Sheet (${todayCount})`
                    : scope === 'college_all'
                    ? `Delete All for [${collegeCode}]`
                    : 'Wipe Entire Tracker Database'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
