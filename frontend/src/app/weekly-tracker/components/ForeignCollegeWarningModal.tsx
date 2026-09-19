'use client';

import { useEffect } from 'react';
import { AlertTriangle, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  isOpen: boolean;
  collegeName: string;
  collegeCode?: string;
  actionText?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isProcessing?: boolean;
}

export function ForeignCollegeWarningModal({
  isOpen,
  collegeName,
  collegeCode,
  actionText = 'edit',
  onClose,
  onConfirm,
  isProcessing = false,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !isProcessing) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="foreign-warning-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-fg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Amber Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-2xs">
              <ShieldAlert size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 id="foreign-warning-title" className="text-sm font-bold text-fg leading-tight">
                Unassigned Institution Notice
              </h3>
              <p className="text-[11px] text-fg-subtle">
                Permission &amp; audit confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            disabled={isProcessing}
            className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Target Institution Pill */}
          <div className="p-3 bg-surface-sunken rounded-xl border border-border flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {collegeCode && (
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-bold text-[10px] border border-primary/20">
                    {collegeCode}
                  </span>
                )}
                <span className="font-bold text-fg break-words">
                  {collegeName || 'This Institution'}
                </span>
              </div>
              <p className="text-micro text-fg-muted">
                This college is not in your directly assigned institutions list.
              </p>
            </div>
          </div>

          {/* Warning Explanatory Text */}
          <p className="text-fg-muted leading-relaxed">
            Continue with this <span className="font-bold text-fg capitalize">{actionText}</span> action anyway? The assigned placement coordinator for this institution will be noted in the system audit log.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-surface-sunken border-t border-border">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-raised border border-border text-fg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              triggerHaptic('medium');
              onConfirm();
            }}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{isProcessing ? 'Processing…' : 'Continue Anyway'}</span>
            <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
