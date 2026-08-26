'use client';

import { forwardRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { triggerHaptic } from '@/lib/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

// Apple Design tactile press: resting state is embossed with instant active compression (scale(0.97) + shadow-inset)
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover shadow-1 active:shadow-inset-1 active:scale-[0.975]',
  secondary:
    'bg-surface text-fg border border-border-strong hover:bg-surface-sunken shadow-1 active:shadow-inset-1 active:scale-[0.975]',
  ghost:
    'bg-transparent text-fg-muted hover:bg-surface-sunken hover:text-fg active:shadow-inset-1 active:scale-[0.975]',
  danger:
    'bg-destructive text-destructive-foreground hover:brightness-110 shadow-1 active:shadow-inset-1 active:scale-[0.975]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-micro gap-1.5',
  md: 'h-control px-4 text-body gap-2',
  lg: 'h-11 px-5 text-title gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Icon-only buttons MUST pass this — there is no visible label to announce. */
  'aria-label'?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, onPointerDown, children, ...props },
  ref,
) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        triggerHaptic(variant === 'danger' ? 'medium' : 'light');
      }
      onPointerDown?.(e);
    },
    [disabled, loading, variant, onPointerDown],
  );

  return (
    <button
      ref={ref}
      // Disabled while loading — this is what prevents the double-submit that
      // the tracker's Save Progress and every modal form are currently open to.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onPointerDown={handlePointerDown}
      className={cn(
        'inline-flex items-center justify-center rounded-control font-semibold cursor-pointer',
        'transition-[background-color,box-shadow,transform,filter] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none whitespace-nowrap',
        'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
      ) : null}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-90')}>{children}</span>
    </button>
  );
});

