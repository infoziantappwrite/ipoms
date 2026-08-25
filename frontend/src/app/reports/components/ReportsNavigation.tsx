'use client';

import { TrendingUp } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';

export function ReportsNavigation() {
  return (
    <header className="bg-surface border-b border-border px-6 py-4 space-y-3 shadow-2xs print:hidden text-fg">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <TrendingUp size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fg tracking-tight">
              Report Builder
            </h1>
            <p className="text-xs text-fg-subtle mt-0.5 font-medium">
              Configure parameters, select templates, and generate interactive document reports
            </p>
          </div>
        </div>

        {/* Pin Sign Out to Absolute Top Right */}
        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>
    </header>
  );
}
