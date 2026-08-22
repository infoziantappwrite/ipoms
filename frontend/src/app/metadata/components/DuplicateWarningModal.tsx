'use client';

import { Mail, Phone } from 'lucide-react';
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
    <div className="fixed inset-0 scrim flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-lg border border-warning/50 shadow-4 p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <span className="text-2xl">{isExactDuplicate ? '🚫' : '⚠️'}</span>
          <div>
            <h3 className="text-sm font-bold text-white">
              {isExactDuplicate ? 'Exact Duplicate Record Blocked' : 'Possible Duplicate Contact Found'}
            </h3>
            <p className="text-micro text-warning">
              {isExactDuplicate
                ? 'An identical company, HR contact, and mobile already exist in the database.'
                : 'A contact with the same Company, HR name, and Mobile already exists.'}
            </p>
          </div>
        </div>

        {/* Side by Side Comparison (Spec Section 11) */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* New Entry */}
          <div className="p-3 bg-background/60 rounded-xl border border-border space-y-1.5">
            <span className="text-micro text-primary font-bold uppercase block">Pending New Entry</span>
            <div className="font-semibold text-white">{pendingData.company_name}</div>
            <div className="text-fg-muted">HR: {pendingData.hr_name || '—'}</div>
            <div className="text-fg-subtle font-mono text-micro"><Phone size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{pendingData.primary_mobile || '—'}</div>
            <div className="text-fg-subtle font-mono text-micro"><Mail size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{pendingData.primary_email || '—'}</div>
          </div>

          {/* Existing Match */}
          <div className="p-3 bg-warning/20 rounded-xl border border-warning/30 space-y-1.5">
            <span className="text-micro text-warning font-bold uppercase block">Existing Database Record</span>
            <div className="font-semibold text-warning">{conflictingRecord.company_name}</div>
            <div className="text-warning-foreground/90">HR: {conflictingRecord.hr_name || '—'}</div>
            <div className="text-warning/80 font-mono text-micro"><Phone size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{conflictingRecord.primary_mobile || '—'}</div>
            <div className="text-warning/80 font-mono text-micro"><Mail size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{conflictingRecord.primary_email || '—'}</div>
          </div>
        </div>

        {/* Action Buttons (Spec Section 11: View Existing, Continue Save, Cancel) */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg-muted rounded-xl text-xs font-medium"
          >
            Cancel
          </button>

          {!isExactDuplicate ? (
            <button
              type="button"
              onClick={onContinueSave}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Continue & Save Anyway
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold"
            >
              OK, Dismiss
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
