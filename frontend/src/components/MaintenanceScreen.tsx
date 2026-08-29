'use client';

import { useState } from 'react';
import { Wrench, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { InfoziantMark } from '@/components/InfoziantMark';
import { apiFetch } from '@/lib/api';

interface Props {
  reason?: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  onRetry?: () => void;
}

export function MaintenanceScreen({ reason, startTime, endTime, onRetry }: Props) {
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await apiFetch('/health');
      if (res.success && onRetry) {
        onRetry();
      }
    } catch {
      // Still under maintenance
    } finally {
      setChecking(false);
    }
  };

  const formatTime = (dateVal?: string | Date | null) => {
    if (!dateVal) return null;
    try {
      return new Date(dateVal).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return null;
    }
  };

  const formattedStart = formatTime(startTime);
  const formattedEnd = formatTime(endTime);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl border border-border p-8 text-center space-y-6 shadow-5 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center">
          <InfoziantMark className="h-10 w-10 text-primary" />
        </div>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 grid place-items-center shadow-xs">
          <Wrench size={30} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-fg tracking-tight">System Under Scheduled Maintenance</h2>
          <p className="text-xs text-fg-subtle leading-relaxed">
            {reason || 'iPOMS is currently undergoing scheduled maintenance and system optimization. Access for placement coordinators and team leaders is temporarily paused.'}
          </p>
        </div>

        {/* Time window card */}
        {(formattedStart || formattedEnd) && (
          <div className="p-3.5 bg-surface-sunken rounded-xl border border-border text-xs space-y-1.5 text-left">
            <div className="flex items-center gap-1.5 text-fg-subtle text-[11px] font-semibold">
              <Clock size={13} className="text-primary" /> Maintenance Window
            </div>
            {formattedStart && (
              <div className="flex justify-between text-micro text-fg-muted font-mono">
                <span>Started:</span>
                <span>{formattedStart}</span>
              </div>
            )}
            {formattedEnd && (
              <div className="flex justify-between text-micro text-fg-muted font-mono font-bold text-primary">
                <span>Expected Completion:</span>
                <span>{formattedEnd}</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking System...' : 'Check System Status'}
          </button>

          <p className="text-[10px] text-fg-subtle flex items-center justify-center gap-1">
            <ShieldCheck size={11} className="text-emerald-500" /> Administrator break-glass login remains active
          </p>
        </div>
      </div>
    </div>
  );
}
