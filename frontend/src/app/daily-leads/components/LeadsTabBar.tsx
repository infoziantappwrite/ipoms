'use client';

import { ClipboardList, Sparkles } from 'lucide-react';
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
    <div className="px-6 border-b border-border flex items-center gap-2">
      {/* Tab 1: Positives */}
      <button
        onClick={() => onTabChange('positive')}
        className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none
                    ${
                      activeTab === 'positive'
                        ? 'text-success border-b-2 border-success bg-success-subtle'
                        : 'text-fg-subtle hover:text-fg hover:bg-background/30'
                    }`}
      >
        <Sparkles size={14} strokeWidth={2} aria-hidden />
        <span className="tracking-wide uppercase">Tab 1: Positives</span>
        <span
          className={`text-micro px-2 py-0.5 rounded-full font-bold transition-colors ${
            activeTab === 'positive'
              ? 'bg-success/20 text-success border border-success/40'
              : 'bg-surface text-fg-subtle'
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
                        ? 'text-primary border-b-2 border-primary bg-primary-subtle'
                        : 'text-fg-subtle hover:text-fg hover:bg-background/30'
                    }`}
      >
        <ClipboardList size={14} strokeWidth={2} aria-hidden />
        <span className="tracking-wide uppercase">Tab 2: JD Received</span>
        <span
          className={`text-micro px-2 py-0.5 rounded-full font-bold transition-colors ${
            activeTab === 'jd_received'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'bg-surface text-fg-subtle'
          }`}
        >
          {jdCount}
        </span>
      </button>
    </div>
  );
}
