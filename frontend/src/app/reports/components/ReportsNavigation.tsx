'use client';

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
    <div className="glass-panel border-b border-slate-800 px-6 pt-4 pb-0 flex items-center justify-between flex-wrap gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>📈</span> Reports & Analytics Center
          </h1>
          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
            Module 06 • Operational BI
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Business Intelligence, 4 Enterprise Report Templates & Document-Style Editor
        </p>
      </div>

      {/* Excel-style navigation tabs */}
      <div className="flex items-center gap-1 self-end">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all relative select-none border-b-2
                        ${
                          activeTab === t.id
                            ? 'text-white border-blue-500 bg-slate-900/60'
                            : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/30'
                        }`}
          >
            <span className="text-sm">{t.icon}</span>
            <span>{t.label}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === t.id
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {t.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
