'use client';

import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface text-fg rounded-2xl w-full max-w-md border border-border shadow-xl p-6 space-y-4 animate-scaleIn">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDanger ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30' : 'bg-primary/15 text-primary'
            }`}>
              {isDanger ? <Trash2 size={20} strokeWidth={2} /> : <AlertTriangle size={20} strokeWidth={2} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg tracking-tight">{title}</h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 font-semibold">
                Permanent Action Required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
            className="w-7 h-7 rounded-lg hover:bg-surface-sunken text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Message */}
        <div className="py-1">
          <p className="text-xs text-fg-muted leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-surface hover:bg-surface-sunken text-fg-muted hover:text-fg rounded-xl text-xs font-semibold border border-border transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 min-w-[75px] rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 ${
              isDanger ? 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-500/20' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
