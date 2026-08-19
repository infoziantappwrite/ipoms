'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const STYLES: Record<ToastKind, { ring: string; icon: typeof Info }> = {
  success: { ring: 'border-success/40 bg-success-subtle', icon: CheckCircle2 },
  warning: { ring: 'border-warning/40 bg-warning-subtle', icon: AlertTriangle },
  error: { ring: 'border-destructive/40 bg-destructive-subtle', icon: XCircle },
  info: { ring: 'border-info/40 bg-info-subtle', icon: Info },
};

const ICON_TONE: Record<ToastKind, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  info: 'text-info',
};

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

/** `const { toast } = useToast()` — replaces the 41 native alert() calls. */
export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId++;
      setToasts((t) => [...t, { id, kind, message }]);
      // Auto-dismiss in 3-5s per the toast-dismiss guideline; errors linger.
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* aria-live so screen readers announce without stealing focus. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]"
      >
        {toasts.map((t) => {
          const { ring, icon: Icon } = STYLES[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-2.5 rounded-panel border px-3.5 py-3 shadow-3',
                'text-body text-fg',
                ring,
              )}
            >
              <Icon size={16} strokeWidth={2} className={cn('mt-0.5 shrink-0', ICON_TONE[t.kind])} aria-hidden />
              <p className="flex-1 min-w-0">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-0.5 text-fg-subtle hover:text-fg transition-colors"
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
