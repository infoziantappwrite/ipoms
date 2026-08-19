'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

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
 * Replaces the 12 hand-rolled modals, none of which had a focus trap, a scroll
 * lock, role="dialog"/aria-modal, or (in 6 cases) an Escape handler.
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

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
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
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    // Move focus into the dialog so the keyboard user starts inside it.
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panelRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onKeyDown]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div className="scrim absolute inset-0" onClick={onClose} aria-hidden />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-surface text-fg rounded-panel border border-border',
          'shadow-4 flex flex-col max-h-[90vh]',
          WIDTHS[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-title font-semibold text-fg truncate">
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
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-control p-1.5 text-fg-subtle hover:bg-surface-sunken hover:text-fg transition-colors"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-surface-sunken rounded-b-panel">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
