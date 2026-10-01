'use client';

import { TrendingUp, RotateCcw } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';

interface ReportsNavigationProps {
  onReset?: () => void;
}

export function ReportsNavigation({ onReset }: ReportsNavigationProps) {
  const handleResetClick = () => {
    if (onReset) {
      onReset();
    } else {
      window.dispatchEvent(new CustomEvent('ipoms:report-builder-reset'));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 space-y-3 shadow-xs print:hidden text-fg">
      {/* ── Top Row: Title & Top-Right Actions (Reset & Sign Out) ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-900/25 shrink-0"
            style={{ background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' }}
          >
            <TrendingUp size={17} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold text-fg tracking-tight">
              Report Builder
            </h1>
          </div>
        </div>

        {/* Top-Right Actions: Reset Button + Sign Out */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetClick}
            title="Start fresh — clear all selections and input fields"
            aria-label="Start fresh — clear all selections and input fields"
            style={{ background: 'linear-gradient(180deg, #9AA0A6 0%, #64748B 50%, #334155 100%)' }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-md shadow-slate-500/25 hover:brightness-110 active:scale-[0.95] transition-all cursor-pointer"
          >
            <RotateCcw size={13} strokeWidth={2.2} aria-hidden />
            <span>Reset</span>
          </button>
          <UserSignOutButton />
        </div>
      </div>
    </header>
  );
}
