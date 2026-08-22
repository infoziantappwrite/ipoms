'use client';

import { TrendingUp, BarChart3, FileSpreadsheet, Wrench } from 'lucide-react';
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
      Icon: BarChart3,
      badge: 'Real-Time Insights',
    },
    {
      id: 'library' as ReportsTab,
      label: 'Reports Library',
      Icon: FileSpreadsheet,
      badge: '4 Templates',
    },
    {
      id: 'builder' as ReportsTab,
      label: 'Report Builder & Editor',
      Icon: Wrench,
      badge: 'Interactive Canvas',
    },
  ];

  return (
    <header className="glass-panel border-b border-border px-6 pt-4 pb-0 space-y-3">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <TrendingUp size={18} strokeWidth={2} className="text-primary" />
            <span>Reports & Analytics</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            Operational BI, 4 Enterprise Report Templates & Document-Style Editor
          </p>
        </div>

        {/* Pin Sign Out to Absolute Top Right */}
        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Bottom Row: Excel-Style Navigation Tabs ───────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-border/40 pt-1 no-scrollbar">
        {tabs.map((t) => {
          const IconComponent = t.Icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all relative select-none border-b-2 cursor-pointer
                ${
                  isActive
                    ? 'text-primary border-primary bg-primary-subtle'
                    : 'text-fg-subtle hover:text-fg border-transparent hover:bg-background/20'
                }`}
            >
              <IconComponent size={15} strokeWidth={isActive ? 2.25 : 1.75} className={isActive ? 'text-primary' : 'text-fg-subtle'} />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`text-micro px-1.5 py-0.5 rounded font-mono hidden sm:inline ${
                    isActive
                      ? 'bg-primary/20 text-primary font-bold'
                      : 'bg-surface text-fg-subtle border border-border-strong'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
