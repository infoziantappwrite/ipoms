'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CloudCheck, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export function AutoSaveFloatingIndicator() {
  const [visible, setVisible] = useState(false);
  const [timestamp, setTimestamp] = useState('');
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSaveNotice = (customMsg?: string) => {
    // Blur any active element to trigger pending onBlur auto-saves
    if (typeof document !== 'undefined' && document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }

    // Dispatch global auto-save flush event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ipoms_auto_save_flush'));
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    setTimestamp(timeStr);
    setVisible(true);
    triggerHaptic('success');

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 2400);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerAutoSaveNotice();
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail?.message;
      triggerAutoSaveNotice(detail);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ipoms_trigger_autosave_banner' as any, handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ipoms_trigger_autosave_banner' as any, handleCustomEvent);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none select-none animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200"
    >
      {/* ── Floating Capsule Pill ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-4 py-2 sm:py-2.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-xl dark:shadow-2xl border border-slate-200/90 dark:border-emerald-500/40 backdrop-blur-md ring-1 ring-slate-900/5 dark:ring-emerald-500/20 transition-colors">
        {/* Animated Check Icon */}
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-500/40 flex items-center justify-center shrink-0">
          <CheckCircle2 size={13} strokeWidth={2.75} className="sm:size-[14px]" />
        </div>

        {/* Message */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold tracking-tight">
          <span className="text-slate-900 dark:text-white font-bold">Auto-Saved</span>
          <span className="text-slate-400 font-normal hidden sm:inline">•</span>
          <span className="text-emerald-700 dark:text-emerald-300 font-medium hidden sm:inline">
            All changes permanently synchronized in cloud
          </span>
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 px-2 py-0.5 rounded-md ml-0.5">
            {timestamp}
          </span>
        </div>

        {/* Small Lightning Sparkle */}
        <Zap size={13} className="text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 shrink-0 hidden xs:block" />
      </div>
    </div>
  );
}
