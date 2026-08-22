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
      {/* Positives */}
      <button
        onClick={() => onTabChange('positive')}
        className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none cursor-pointer
                    ${
                      activeTab === 'positive'
                        ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/70'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
      >
        <Sparkles size={14} strokeWidth={2} aria-hidden />
        <span className="tracking-wide uppercase">Positives</span>
        <span
          className={`text-micro px-2 py-0.5 rounded-full font-bold transition-colors ${
            activeTab === 'positive'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {positivesCount}
        </span>
      </button>

      {/* JD Received */}
      <button
        onClick={() => onTabChange('jd_received')}
        className={`flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all relative select-none cursor-pointer
                    ${
                      activeTab === 'jd_received'
                        ? 'text-primary border-b-2 border-primary bg-blue-50/70'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
      >
        <ClipboardList size={14} strokeWidth={2} aria-hidden />
        <span className="tracking-wide uppercase">JD Received</span>
        <span
          className={`text-micro px-2 py-0.5 rounded-full font-bold transition-colors ${
            activeTab === 'jd_received'
              ? 'bg-blue-100 text-primary border border-blue-300'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {jdCount}
        </span>
      </button>
    </div>
  );
}
