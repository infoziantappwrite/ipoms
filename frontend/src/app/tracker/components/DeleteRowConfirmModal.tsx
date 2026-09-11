'use client';

import { useState, useEffect } from 'react';
import { Trash2, X, AlertCircle, Loader2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function DeleteRowConfirmModal({ isOpen, count, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      triggerHaptic('medium');
      await onConfirm();
      onClose();
    } catch (e) {
      console.error('[DeleteConfirm] Failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-fg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-sm font-bold text-fg">
              Delete {count} {count === 1 ? 'Row' : 'Rows'}?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-surface-sunken hover:bg-surface-raised border border-border flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs">
          <p className="text-fg-subtle leading-relaxed">
            This will remove the selected {count === 1 ? 'entry' : 'entries'} from today&apos;s calling sheet. This action cannot be undone.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-border bg-surface-sunken flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl border border-border text-fg-subtle hover:text-fg hover:bg-surface text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              <>
                <Trash2 size={13} strokeWidth={2.2} />
                <span>OK</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
