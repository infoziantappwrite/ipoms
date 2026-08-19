'use client';

interface Props {
  activeTab: 'positive' | 'jd_received';
  onTabChange: (tab: 'positive' | 'jd_received') => void;
  positivesCount: number;
  jdCount: number;
}

export function LeadsTabBar({
  activeTab,
  onTabChange,
  positivesCount,
  jdCount,
}: Props) {
  return (
    <div className="px-6 border-b border-slate-800 flex items-center gap-2">
      {/* Tab 1: Positives */}
      <button
        onClick={() => onTabChange('positive')}
        className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none
                    ${
                      activeTab === 'positive'
                        ? 'text-white border-b-2 border-emerald-500 bg-slate-900/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
      >
        <span className="text-sm">✨</span>
        <span className="tracking-wide uppercase">Tab 1: Positives</span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors ${
            activeTab === 'positive'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {positivesCount}
        </span>
      </button>

      {/* Tab 2: JD Received */}
      <button
        onClick={() => onTabChange('jd_received')}
        className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none
                    ${
                      activeTab === 'jd_received'
                        ? 'text-white border-b-2 border-blue-500 bg-slate-900/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
      >
        <span className="text-sm">📋</span>
        <span className="tracking-wide uppercase">Tab 2: JD Received</span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors ${
            activeTab === 'jd_received'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {jdCount}
        </span>
      </button>
    </div>
  );
}
