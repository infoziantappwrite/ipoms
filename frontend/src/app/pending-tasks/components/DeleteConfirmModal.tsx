'use client';

import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  message?: string;
  itemCount?: number;
  loading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Pending Task',
  message,
  itemCount = 1,
  loading = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 mx-auto">
            <Trash2 size={24} />
          </div>

          <h3 className="text-base font-bold text-slate-900 text-center mb-1.5">
            {title}
          </h3>

          <p className="text-xs text-slate-500 text-center leading-relaxed mb-6">
            {message ||
              `Are you sure you want to delete ${
                itemCount > 1 ? `these ${itemCount} pending tasks` : 'this pending task'
              }? This action cannot be undone.`}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>{loading ? 'Deleting...' : 'Confirm Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
