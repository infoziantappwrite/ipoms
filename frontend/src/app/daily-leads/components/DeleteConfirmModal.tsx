'use client';

import { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  isOpen: boolean;
  count: number;
  tabName: string;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmModal({
  isOpen,
  count,
  tabName,
  isDeleting = false,
  onClose,
  onConfirm,
}: Props) {
  // Listen for Escape key to close and Enter key to confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !isDeleting) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click backdrop to dismiss */}
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-lead-modal-title"
        className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-fg"
      >
        {/* Close Button Top-Right */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          disabled={isDeleting}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken transition-colors cursor-pointer disabled:opacity-50"
          title="Close (Esc)"
        >
          <X size={17} />
        </button>

        <div className="p-6 sm:p-7 text-center">
          {/* Warning Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <AlertTriangle size={28} strokeWidth={2.2} />
          </div>

          {/* Warning Title */}
          <h3 id="delete-lead-modal-title" className="text-base font-bold text-fg mb-2 tracking-tight">
            Delete Record Confirmation
          </h3>

          {/* Warning Description */}
          <p className="text-xs text-fg-muted leading-relaxed max-w-sm mx-auto mb-2">
            Are you sure you want to delete{' '}
            <strong className="text-rose-600 dark:text-rose-400 font-bold font-mono">
              {count}
            </strong>{' '}
            selected {count === 1 ? 'record' : 'records'} from{' '}
            <strong className="text-fg font-semibold">{tabName}</strong>?
          </p>

          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 py-1.5 px-3 rounded-lg inline-block">
            ⚠️ This action cannot be undone.
          </p>

          {/* 2 Buttons: Cancel (no icon) and Delete (with delete icon) */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {/* Cancel Button — with NO icon */}
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-fg text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.992]"
            >
              Cancel
            </button>

            {/* Delete Button — with DELETE icon */}
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                triggerHaptic('heavy');
                onConfirm();
              }}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-[0.992]"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Deleting…</span>
                </>
              ) : (
                <>
                  <Trash2 size={15} strokeWidth={2.2} />
                  <span>{count > 1 ? `Delete (${count})` : 'Delete'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
