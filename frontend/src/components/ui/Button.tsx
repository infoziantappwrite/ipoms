'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

// Neumorphic press: resting state is embossed (shadow-1), :active inverts to
// debossed (shadow-inset-1) so the button reads as physically pushed in —
// this replaces a flat background-color darken as the primary press cue.
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover shadow-1 active:shadow-inset-1',
  secondary:
    'bg-surface text-fg border border-border-strong hover:bg-surface-sunken shadow-1 active:shadow-inset-1',
  ghost:
    'bg-transparent text-fg-muted hover:bg-surface-sunken hover:text-fg active:shadow-inset-1',
  danger:
    'bg-destructive text-destructive-foreground hover:brightness-110 shadow-1 active:shadow-inset-1',
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
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      // Disabled while loading — this is what prevents the double-submit that
      // the tracker's Save Progress and every modal form are currently open to.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-control font-semibold',
        'transition-[background-color,box-shadow] duration-150 select-none whitespace-nowrap',
        'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
