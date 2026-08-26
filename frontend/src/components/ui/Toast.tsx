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

const STYLES: Record<ToastKind, { ring: string; icon: typeof Info; accent: string }> = {
  success: { ring: 'border-success/30 bg-surface/95 dark:bg-surface/90', icon: CheckCircle2, accent: 'text-success' },
  warning: { ring: 'border-warning/30 bg-surface/95 dark:bg-surface/90', icon: AlertTriangle, accent: 'text-warning' },
  error: { ring: 'border-destructive/30 bg-surface/95 dark:bg-surface/90', icon: XCircle, accent: 'text-destructive' },
  info: { ring: 'border-primary/30 bg-surface/95 dark:bg-surface/90', icon: Info, accent: 'text-primary' },
};

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

/** `const { toast } = useToast()` — Apple Fluid Motion Toast system */
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
    // Spring entrance
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
    // Allow dragging in either direction
    setOffsetX(diff);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const diff = e.clientX - startXRef.current;
    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = Math.abs(diff) / elapsed; // px per ms

    // If moved > 80px or flicked quickly (> 0.45 px/ms)
    if (Math.abs(diff) > 80 || velocity > 0.45) {
      triggerHaptic('light');
      setIsExiting(true);
      setOffsetX(diff > 0 ? 300 : -300);
      setTimeout(onDismiss, 200);
    } else {
      // Spring back to center
      setOffsetX(0);
    }
  };

  const { ring, icon: Icon, accent } = STYLES[toast.kind];
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
          ? `translate3d(${offsetX}px, 0, 0) scale(${isExiting ? 0.9 : 1})`
          : 'translate3d(0, 16px, 0) scale(0.94)',
        opacity: isMounted ? opacity : 0,
        transition: isDragging
          ? 'none'
          : 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease-out',
      }}
      className={cn(
        'group relative flex items-center gap-3 rounded-2xl border px-4 py-3',
        'shadow-3 backdrop-blur-md cursor-grab active:cursor-grabbing select-none',
        'text-body text-fg',
        ring,
      )}
    >
      <div className={cn('p-1 rounded-xl bg-surface-sunken/80 shrink-0 shadow-2xs', accent)}>
        <Icon size={17} strokeWidth={2.2} aria-hidden />
      </div>
      <p className="flex-1 min-w-0 font-medium text-sm leading-snug tracking-tight">{toast.message}</p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic('light');
          setIsExiting(true);
          setTimeout(onDismiss, 180);
        }}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-lg p-1 text-fg-subtle hover:text-fg hover:bg-surface-sunken transition-colors"
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
      const id = nextId++;
      setToasts((t) => [...t, { id, kind, message }]);

      // Trigger multimodal haptic on dispatch
      triggerHaptic(kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'light');

      // Auto-dismiss in 4-6s
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4200);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* iOS Pill / Dynamic Island Notification Stack */}
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

