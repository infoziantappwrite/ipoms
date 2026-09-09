'use client';

import { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  count: number;
  isOpen: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmModal({
  count,
  isOpen,
  isDeleting = false,
  onClose,
  onConfirm,
}: Props) {
  // Listen for keyboard Escape and Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Trash2 size={16} strokeWidth={2.2} />
            </div>
            <h3 id="delete-modal-title" className="text-sm font-bold text-fg">
              Confirm Deletion
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Message */}
        <div className="p-5">
          <p className="text-xs text-fg leading-relaxed">
            Are you sure you want to delete <strong className="text-fg font-bold">{count}</strong> selected row{count !== 1 ? 's' : ''}?
          </p>
          <p className="text-micro text-fg-subtle mt-1.5">
            These records will be moved to the Recycle Bin and can be restored if needed.
          </p>
        </div>

        {/* Footer Buttons: Cancel and OK */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-surface-sunken border-t border-border">
          <button
            type="button"
            disabled={isDeleting}
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
            disabled={isDeleting}
            onClick={() => {
              triggerHaptic('medium');
              onConfirm();
            }}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{isDeleting ? 'Deleting…' : 'OK'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
