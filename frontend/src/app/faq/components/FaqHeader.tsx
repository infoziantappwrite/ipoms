'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';

export function FaqHeader() {
  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 shadow-xs print:hidden text-fg">
      {/* ── Top Row: Title & Top-Right User Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-900/25 shrink-0"
            style={{ background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' }}
          >
            <HelpCircle size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fg tracking-tight">
              Frequently Asked Questions
            </h1>
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
