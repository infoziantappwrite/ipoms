'use client';

import { InfoziantMark } from './InfoziantMark';

interface Props {
  /** Fired when the user advances early (click anywhere, or any keypress — see EntryPage). */
  onSkip: () => void;
}

/**
 * Branded entry splash. Presentational only — the 2s timer and routing live in
 * the page that renders this, so this stays testable and reusable.
 *
 * Pure white (`bg-surface`) rather than `bg-background` (#F8FAFC): the brief
 * asked for a white background specifically.
 *
 * No visible Skip control by request. Click-anywhere and any-keypress still
 * advance immediately (wired via the wrapping div's onClick + EntryPage's
 * keydown listener) — a silent escape hatch, not a discoverable one.
 */
export function SplashScreen({ onSkip }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onSkip}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-8 bg-surface px-6"
    >
      <span className="sr-only">Loading iPOMS, opening sign in shortly</span>

      <div className="flex flex-col items-center gap-5 text-center">
        <InfoziantMark size={160} />

        <div className="space-y-1.5">
          <h1 className="text-display-lg font-bold tracking-tight text-fg">
            iPOMS
          </h1>
          <p className="text-body text-fg-subtle max-w-sm">
            Infoziant Placement Operations Management System
          </p>
        </div>
      </div>

      {/* Indeterminate loading bar — debossed track, navy fill sliding across.
          No percentage: nothing real is being measured, so a number would lie. */}
      <div
        aria-hidden
        className="h-1.5 w-56 overflow-hidden rounded-full bg-surface-sunken shadow-inset-1"
      >
        <div className="h-full w-1/4 rounded-full bg-primary animate-indeterminate" />
      </div>
    </div>
  );
}
