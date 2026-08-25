'use client';

import { useEffect } from 'react';
import { InfoziantMark } from './InfoziantMark';
import { WaveLoader } from './WaveLoader';

interface Props {
  /** Fired when the user advances early (click anywhere, or any keypress — see EntryPage). */
  onSkip: () => void;
}

/**
 * Branded entry splash. Presentational only.
 * Guaranteed to ALWAYS render in Light Theme (clean pure white background and dark navy branding).
 */
export function SplashScreen({ onSkip }: Props) {
  useEffect(() => {
    // Lock document root to light theme during splash screen
    const root = document.documentElement;
    const previousWasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';

    return () => {
      // Revert when unmounting if dark was active
      if (previousWasDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onSkip}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-6 bg-white text-slate-900 px-6 cursor-pointer select-none"
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
