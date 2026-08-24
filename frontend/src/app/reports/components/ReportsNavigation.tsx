'use client';

import { TrendingUp, BarChart3, Wrench } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
export type ReportsTab = 'analytics' | 'builder';

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
      id: 'builder' as ReportsTab,
      label: 'Report Builder & Editor',
      Icon: Wrench,
      badge: 'Weekly • Monthly • Pending',
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 space-y-3 shadow-2xs print:hidden">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp size={20} strokeWidth={2.25} className="text-primary" />
            <span>Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational BI, Institutional Report Generation & Document-Style Editor
          </p>
        </div>

        {/* Pin Sign Out to Absolute Top Right */}
        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Bottom Row: High-Contrast Equal 2-Column Tabs ─────────── */}
      <div className="grid grid-cols-2 w-full border-t border-slate-200 pt-2 gap-2">
        {tabs.map((t) => {
          const IconComponent = t.Icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center justify-center gap-2.5 py-3 px-3 text-xs font-bold transition-all select-none rounded-t-xl cursor-pointer w-full text-center
                ${
                  isActive
                    ? 'bg-primary text-white shadow-sm ring-1 ring-blue-700 font-extrabold'
                    : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
            >
              <IconComponent
                size={16}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'text-white shrink-0' : 'text-slate-500 shrink-0'}
              />
              <span className="truncate">{t.label}</span>
              {t.badge && (
                <span
                  className={`text-micro px-2 py-0.5 rounded font-mono hidden md:inline shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white font-bold border border-white/30'
                      : 'bg-white text-slate-600 border border-slate-300'
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
