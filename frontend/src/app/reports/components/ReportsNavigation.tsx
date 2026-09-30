'use client';

import { TrendingUp } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';

export function ReportsNavigation() {
  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 space-y-3 shadow-xs print:hidden text-fg">
      {/* ── Top Row: Title & Top-Right Actions (Sign Out) ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0"
            style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 30%, #0284c7 65%, #1d4ed8 100%)' }}
          >
            <TrendingUp size={17} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold text-fg tracking-tight">
              Report Builder
            </h1>
          </div>
        </div>

        {/* Top-Right Sign Out */}
        <div className="flex items-center gap-2.5 shrink-0">
          <UserSignOutButton />
        </div>
      </div>
    </header>
  );
}
