'use client';

import { useMemo } from 'react';

export type SaveStatus = 'saved' | 'saving' | 'idle' | 'error';

interface Props {
  status: SaveStatus;
  lastSavedAt?: Date | null;
  className?: string;
}

/**
 * Continuous Glowing Auto-Save Status Dot Indicator.
 * - Continuously pulses/glows in emerald green during normal operational state.
 * - Stops glowing green and turns rose/amber if save fails or encounters an error.
 */
export function AutoSaveBadge({ status, lastSavedAt, className = '' }: Props) {
  const isHealthy = status !== 'error';
  const isSaving = status === 'saving';
  const isError = status === 'error';

  const tooltipText = useMemo(() => {
    if (isError) {
      return 'Auto-save interrupted • Save not completed properly. Press Ctrl+S to retry.';
    }
    if (isSaving) {
      return 'Auto-saving changes to cloud…';
    }
    if (lastSavedAt) {
      const time = lastSavedAt.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return `Auto-save active & working • Last saved at ${time}`;
    }
    return 'Auto-save active & working in background';
  }, [isError, isSaving, lastSavedAt]);

  return (
    <div
      className={`inline-flex items-center justify-center p-1.5 rounded-xl hover:bg-surface-sunken transition-colors cursor-help select-none ${className}`}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <div className="relative flex items-center justify-center w-3 h-3">
        {isHealthy ? (
          <>
            {/* Continuous glowing radar halo pulse */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-60 animate-ping duration-1000" />
            {/* Core continuous glowing green dot */}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)] dark:shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse" />
          </>
        ) : (
          /* When save is not done properly / error, the green glow stops */
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 dark:bg-rose-400 ring-2 ring-rose-500/40" />
        )}
      </div>
    </div>
  );
}
