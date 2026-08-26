'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, WifiOff, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[iPOMS App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center text-fg relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* Animation Container */}
        <div className="w-64 h-64 sm:w-72 sm:h-72 mb-4 flex items-center justify-center relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sad.svg"
            alt="Error Animation"
            className="max-h-60 w-auto object-contain drop-shadow-md"
          />
        </div>

        {/* Error Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold mb-3 shadow-2xs">
          <WifiOff size={13} />
          <span>Temporary Connection / System Glitch</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight mb-2">
          Something went off track
        </h1>
        <p className="text-xs sm:text-sm text-fg-subtle max-w-sm mb-6 leading-relaxed">
          {error.message || 'We encountered a momentary network or server communication hiccup. Your logged tracker data is safe.'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full justify-center flex-wrap">
          <button
            onClick={() => {
              triggerHaptic('medium');
              reset();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
          >
            <RefreshCw size={15} />
            <span>Try Again & Reconnect</span>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-fg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Home size={15} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
