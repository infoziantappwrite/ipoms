'use client';

import { Mail, Phone, X, Ban, AlertTriangle } from 'lucide-react';

interface Props {
  conflictingRecord: any;
  pendingData: any;
  isExactDuplicate: boolean;
  onContinueSave: () => void;
  onCancel: () => void;
}

export function DuplicateWarningModal({
  conflictingRecord,
  pendingData,
  isExactDuplicate,
  onContinueSave,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface text-fg rounded-2xl w-full max-w-lg border border-border shadow-xl p-6 space-y-4 animate-scaleIn">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 dark:text-amber-400">
              {isExactDuplicate ? <Ban size={28} strokeWidth={1.8} aria-hidden /> : <AlertTriangle size={28} strokeWidth={1.8} aria-hidden />}
            </span>
            <div>
              <h3 className="text-sm font-bold text-fg">
                {isExactDuplicate ? 'Exact Duplicate Record Blocked' : 'Possible Duplicate Contact Found'}
              </h3>
              <p className="text-micro text-amber-600 dark:text-amber-400 mt-0.5">
                {isExactDuplicate
                  ? 'An identical company, HR contact, and mobile already exist in the database.'
                  : 'A contact with the same Company, HR name, or Mobile already exists.'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="w-7 h-7 rounded-lg hover:bg-surface-sunken text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Side by Side Comparison */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* New Entry */}
          <div className="p-3 bg-surface-sunken rounded-xl border border-border space-y-1.5">
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Pending New Entry</span>
            <div className="font-semibold text-fg">{pendingData.company_name}</div>
            <div className="text-fg-muted">HR: {pendingData.hr_name || '—'}</div>
            <div className="text-fg-subtle font-mono text-micro flex items-center gap-1">
              <Phone size={12} strokeWidth={2} className="text-primary shrink-0" />
              <span>{pendingData.primary_mobile || '—'}</span>
            </div>
            <div className="text-fg-subtle font-mono text-micro flex items-center gap-1">
              <Mail size={12} strokeWidth={2} className="text-primary shrink-0" />
              <span>{pendingData.primary_email || '—'}</span>
            </div>
          </div>

          {/* Existing Match */}
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1.5">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">Existing Database Record</span>
            <div className="font-semibold text-amber-700 dark:text-amber-300">{conflictingRecord.company_name}</div>
            <div className="text-fg-muted">HR: {conflictingRecord.hr_name || '—'}</div>
            <div className="text-fg-subtle font-mono text-micro flex items-center gap-1">
              <Phone size={12} strokeWidth={2} className="text-amber-600 shrink-0" />
              <span>{conflictingRecord.primary_mobile || '—'}</span>
            </div>
            <div className="text-fg-subtle font-mono text-micro flex items-center gap-1">
              <Mail size={12} strokeWidth={2} className="text-amber-600 shrink-0" />
              <span>{conflictingRecord.primary_email || '—'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-surface hover:bg-surface-sunken text-fg-muted hover:text-fg rounded-lg text-xs font-medium border border-border transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {!isExactDuplicate ? (
            <button
              type="button"
              onClick={onContinueSave}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Continue & Save Anyway
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              OK, Dismiss
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
