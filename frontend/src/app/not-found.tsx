'use client';

import Link from 'next/link';
import { Home, ArrowLeft, RefreshCw, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center text-fg relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* Animation Container */}
        <div className="w-64 h-64 sm:w-72 sm:h-72 mb-4 flex items-center justify-center relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sad.svg"
            alt="404 Animation"
            className="max-h-60 w-auto object-contain drop-shadow-md"
          />
        </div>

        {/* 404 Status Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold mb-3 shadow-2xs">
          <span>Error 404</span>
          <span className="w-1 h-1 rounded-full bg-rose-500" />
          <span>Page Not Found</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight mb-2">
          Lost in Corporate Orbit?
        </h1>
        <p className="text-xs sm:text-sm text-fg-subtle max-w-sm mb-6 leading-relaxed">
          The placement page or link you're looking for doesn't exist, was moved, or experienced a temporary routing glitch.
        </p>

        {/* Quick Navigation Actions */}
        <div className="flex items-center gap-3 w-full justify-center flex-wrap">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-fg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Go Back</span>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
          >
            <Home size={15} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
