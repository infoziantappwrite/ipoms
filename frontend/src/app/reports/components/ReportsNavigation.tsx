'use client';

import { TrendingUp } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
export type ReportsTab = 'analytics' | 'library' | 'builder';

interface Props {
  activeTab: ReportsTab;
  onTabChange: (tab: ReportsTab) => void;
}

export function ReportsNavigation({ activeTab, onTabChange }: Props) {
  const tabs = [
    {
      id: 'analytics' as ReportsTab,
      label: 'Live Analytics & BI',
      icon: '📊',
      badge: 'Real-Time Insights',
    },
    {
      id: 'library' as ReportsTab,
      label: 'Reports Library',
      icon: '📑',
      badge: '4 Templates',
    },
    {
      id: 'builder' as ReportsTab,
      label: 'Report Builder & Editor',
      icon: '🛠️',
      badge: 'Interactive Canvas',
    },
  ];

  return (
    <header className="glass-panel border-b border-border px-6 pt-4 pb-0 space-y-3">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp size={18} strokeWidth={2} className="text-primary" /> Report Generation
            </h1>
            <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-semibold">
              Operational BI & Analytics
            </span>
          </div>
          <p className="text-xs text-fg-subtle mt-0.5">
            Business Intelligence, 4 Enterprise Report Templates & Document-Style Editor
          </p>
        </div>

        {/* Pin Sign Out to Absolute Top Right */}
        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Bottom Row: Excel-Style Navigation Tabs ───────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-border/40 pt-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all relative select-none border-b-2
              ${
                activeTab === t.id
                  ? 'text-primary border-primary bg-primary-subtle'
                  : 'text-fg-subtle hover:text-fg border-transparent hover:bg-background/30'
              }`}
          >
            <span className="text-sm">{t.icon}</span>
            <span>{t.label}</span>
            <span
              className={`text-micro px-2 py-0.5 rounded-full font-bold ${
                activeTab === t.id
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-surface text-fg-subtle'
              }`}
            >
              {t.badge}
            </span>
          </button>
        ))}
      </div>
    </header>
  );
}
