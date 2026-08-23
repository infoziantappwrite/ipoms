'use client';

import { InfoziantMark } from './InfoziantMark';
import { WaveLoader } from './WaveLoader';

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
      className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-6 bg-surface px-6 cursor-pointer select-none"
    >
      <span className="sr-only">Loading iPOMS, opening sign in shortly</span>

      <div className="flex flex-col items-center gap-5 text-center">
        <InfoziantMark size={160} />

        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary drop-shadow-sm">
            iPOMS
          </h1>
          <p className="font-display text-xs font-semibold text-slate-500 tracking-normal whitespace-nowrap">
            Infoziant Placement Operations Management System
          </p>
        </div>
      </div>

      {/* 5-bar animated equalizer wave loader */}
      <div className="mt-2 flex flex-col items-center">
        <WaveLoader />
      </div>
    </div>
  );
}
