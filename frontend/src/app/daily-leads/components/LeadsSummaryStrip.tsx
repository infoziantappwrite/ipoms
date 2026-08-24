'use client';

import { Sparkles, FileText, Building2 } from 'lucide-react';

export interface LeadsSummaryData {
  positives_count: number;
  jd_received_count: number;
  active_colleges_count: number;
}

interface Props {
  summary: LeadsSummaryData;
  activeTab: 'positive' | 'jd_received';
  isAllDates?: boolean;
  onTabChange: (tab: 'positive' | 'jd_received') => void;
}

export function LeadsSummaryStrip({ summary, activeTab, isAllDates = false, onTabChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 px-6 py-2">

      {/* Card 1: Positives */}
      <button
        type="button"
        onClick={() => onTabChange('positive')}
        className={`bg-white rounded-xl px-3.5 py-2 flex items-center justify-between border transition-all duration-200 cursor-pointer shadow-2xs ${
          activeTab === 'positive'
            ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-100/80 border border-emerald-200 flex items-center justify-center shrink-0">
            <Sparkles size={13} strokeWidth={2.25} className="text-emerald-700" />
          </div>
          <div className="text-left truncate">
            <p className="text-xs font-bold text-slate-800 truncate">
              {isAllDates ? 'Total Positives' : "Today's Positives"}
            </p>
            <p className="text-micro text-slate-400 font-medium hidden sm:block">Opportunities</p>
          </div>
        </div>
        <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums shrink-0 ml-2">
          {summary.positives_count}
        </span>
      </button>

      {/* Card 2: JD Received */}
      <button
        type="button"
        onClick={() => onTabChange('jd_received')}
        className={`bg-white rounded-xl px-3.5 py-2 flex items-center justify-between border transition-all duration-200 cursor-pointer shadow-2xs ${
          activeTab === 'jd_received'
            ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center shrink-0">
            <FileText size={13} strokeWidth={2.25} className="text-blue-700" />
          </div>
          <div className="text-left truncate">
            <p className="text-xs font-bold text-slate-800 truncate">
              {isAllDates ? 'Total JD Received' : "Today's JD Received"}
            </p>
            <p className="text-micro text-slate-400 font-medium hidden sm:block">In Hand</p>
          </div>
        </div>
        <span className="text-sm font-bold font-mono text-blue-700 tabular-nums shrink-0 ml-2">
          {summary.jd_received_count}
        </span>
      </button>

      {/* Card 3: Active Colleges */}
      <div className="bg-white rounded-xl px-3.5 py-2 flex items-center justify-between border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-purple-100/80 border border-purple-200 flex items-center justify-center shrink-0">
            <Building2 size={13} strokeWidth={2.25} className="text-purple-700" />
          </div>
          <div className="text-left truncate">
            <p className="text-xs font-bold text-slate-800 truncate">
              {isAllDates ? 'Active Colleges' : 'Active Colleges Today'}
            </p>
            <p className="text-micro text-slate-400 font-medium hidden sm:block">Active Roster</p>
          </div>
        </div>
        <span className="text-sm font-bold font-mono text-purple-700 tabular-nums shrink-0 ml-2">
          {summary.active_colleges_count}
        </span>
      </div>

    </div>
  );
}
