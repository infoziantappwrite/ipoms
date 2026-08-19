'use client';

import { AlertCircle, Inbox, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/**
 * Skeleton — the app had zero. Anything over ~300ms needs one, otherwise an
 * empty table reads as "no work today" rather than "still loading".
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-control bg-surface-sunken', className)}
    />
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading data" className="space-y-1.5 p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-row flex-1', c === 0 && 'max-w-12')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-14 px-6">
      <div className="rounded-full bg-surface-sunken p-3 text-fg-subtle">
        <Inbox size={22} strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-title font-semibold text-fg">{title}</h3>
      {description && <p className="text-body text-fg-subtle max-w-sm">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/**
 * ErrorState — every fetch in the app currently fails into console.error(),
 * so a backend outage is invisible to the user. Errors need a recovery path.
 */
export function ErrorState({
  title = 'Could not load this data',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center text-center gap-2 py-14 px-6"
    >
      <div className="rounded-full bg-destructive-subtle p-3 text-destructive">
        <AlertCircle size={22} strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-title font-semibold text-fg">{title}</h3>
      {description && <p className="text-body text-fg-subtle max-w-sm">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          <RotateCw size={14} strokeWidth={2} aria-hidden />
          Retry
        </Button>
      )}
    </div>
  );
}
