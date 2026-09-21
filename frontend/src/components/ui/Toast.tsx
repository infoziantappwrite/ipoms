'use client';

import { createContext, useCallback, useContext, useMemo, useState, useRef, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { triggerHaptic } from '@/lib/haptics';

type ToastKind = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const STYLES: Record<ToastKind, { border: string; icon: typeof Info; accent: string; iconBg: string }> = {
  success: {
    border: 'border-emerald-200/90 dark:border-emerald-800/80',
    icon: CheckCircle2,
    accent: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/50',
  },
  warning: {
    border: 'border-amber-200/90 dark:border-amber-800/80',
    icon: AlertTriangle,
    accent: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/50',
  },
  error: {
    border: 'border-rose-200/90 dark:border-rose-800/80',
    icon: XCircle,
    accent: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/50',
  },
  info: {
    border: 'border-blue-200/90 dark:border-blue-800/80',
    icon: Info,
    accent: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50',
  },
};

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

/** `const { toast } = useToast()` — Plain, solid notification system */
export const useToast = () => useContext(ToastContext);

let nextId = 0;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsMounted(true));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    itemRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    setOffsetX(diff);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const diff = e.clientX - startXRef.current;
    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = Math.abs(diff) / elapsed;

    if (Math.abs(diff) > 80 || velocity > 0.45) {
      triggerHaptic('light');
      setIsExiting(true);
      setOffsetX(diff > 0 ? 300 : -300);
      setTimeout(onDismiss, 200);
    } else {
      setOffsetX(0);
    }
  };

  const { border, icon: Icon, accent, iconBg } = STYLES[toast.kind];
  const opacity = 1 - Math.min(0.7, Math.abs(offsetX) / 250);

  return (
    <div
      ref={itemRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: isMounted
          ? `translate3d(${offsetX}px, 0, 0) scale(${isExiting ? 0.92 : 1})`
          : 'translate3d(0, 14px, 0) scale(0.96)',
        opacity: isMounted ? opacity : 0,
        transition: isDragging
          ? 'none'
          : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out',
      }}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border px-3.5 py-3',
        'bg-white dark:bg-zinc-900 shadow-md shadow-black/8 dark:shadow-black/40 select-none cursor-grab active:cursor-grabbing',
        'text-zinc-900 dark:text-zinc-100',
        border,
      )}
    >
      <div className={cn('p-1.5 rounded-lg shrink-0 flex items-center justify-center', iconBg, accent)}>
        <Icon size={16} strokeWidth={2.2} aria-hidden />
      </div>
      <p className="flex-1 min-w-0 font-medium text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-snug tracking-tight select-text">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic('light');
          setIsExiting(true);
          setTimeout(onDismiss, 180);
        }}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      setToasts((t) => {
        // Prevent duplicate identical toasts from stacking
        if (t.some((existing) => existing.message === message)) {
          return t;
        }
        const id = nextId++;
        // Auto-dismiss in 4-6s
        window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4200);
        return [...t, { id, kind, message }];
      });

      // Trigger multimodal haptic on dispatch
      triggerHaptic(kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'light');
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Floating Notification Stack — Plain & Solid, Zero Neon Glow / Zero Glassy Blur */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-toast flex flex-col gap-2.5 w-[min(25rem,calc(100vw-2.5rem))] pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
