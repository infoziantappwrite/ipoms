'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { triggerHaptic } from '@/lib/haptics';

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof WIDTHS;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Apple Design Modal & Mobile Bottom Sheet:
 * - Desktop: Origin/Center spring zoom with dimming scrim.
 * - Mobile: Drag-down bottom sheet with 1:1 finger tracking and velocity release dismissal.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Animation and drag state
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    triggerHaptic('light');
    setTimeout(() => {
      onClose();
      setIsExiting(false);
      setDragY(0);
    }, 180);
  }, [onClose]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [handleClose],
  );

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }

    restoreFocusTo.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    // Spring trigger on next frame
    requestAnimationFrame(() => setMounted(true));

    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panelRef.current)?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onKeyDown]);

  // Mobile Drag Down Handlers
  const handleDragStart = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const diff = e.clientY - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    } else {
      // Rubber band resistance when dragging upwards
      setDragY(diff * 0.25);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = dragY / elapsed;

    if (dragY > 120 || velocity > 0.5) {
      handleClose();
    } else {
      // Spring back
      setDragY(0);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const scrimOpacity = Math.max(0.2, 1 - dragY / 400);

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center sm:p-4">
      {/* Scrim with smooth fade & drag response */}
      <div
        className="scrim absolute inset-0 transition-opacity duration-200"
        style={{ opacity: mounted && !isExiting ? scrimOpacity : 0 }}
        onClick={handleClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        style={{
          transform: isDragging
            ? `translate3d(0, ${Math.max(0, dragY)}px, 0)`
            : isExiting
            ? 'translate3d(0, 30px, 0) scale(0.96)'
            : mounted
            ? 'translate3d(0, 0, 0) scale(1)'
            : 'translate3d(0, 24px, 0) scale(0.95)',
          opacity: isExiting ? 0 : mounted ? 1 : 0,
          transition: isDragging
            ? 'none'
            : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out',
        }}
        className={cn(
          'relative w-full bg-surface text-fg rounded-t-3xl sm:rounded-panel border-t sm:border border-border',
          'shadow-4 flex flex-col max-h-[92vh] sm:max-h-[88vh]',
          WIDTHS[size],
        )}
      >
        {/* Mobile Drag Pill Handle */}
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          className="flex sm:hidden flex-col items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="apple-sheet-handle" />
        </div>

        <header
          onPointerDown={(e) => {
            // Also enable drag from header on mobile
            if (window.innerWidth < 640 && (e.target as HTMLElement).tagName !== 'BUTTON') {
              handleDragStart(e);
            }
          }}
          className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border select-none"
        >
          <div className="min-w-0">
            <h2 id="modal-title" className="text-title font-semibold text-fg truncate tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-body text-fg-subtle mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-control p-1.5 text-fg-subtle hover:bg-surface-sunken hover:text-fg active:scale-95 active:shadow-inset-1 transition-all duration-150"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="px-5 py-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-surface-sunken rounded-b-panel safe-bottom">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

