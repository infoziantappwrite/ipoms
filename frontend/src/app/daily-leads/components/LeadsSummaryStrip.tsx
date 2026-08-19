'use client';

export interface LeadsSummaryData {
  positives_count: number;
  jd_received_count: number;
  active_colleges_count: number;
}

interface Props {
  summary: LeadsSummaryData;
  activeTab: 'positive' | 'jd_received';
  onTabChange: (tab: 'positive' | 'jd_received') => void;
}

export function LeadsSummaryStrip({ summary, activeTab, onTabChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4">

      {/* Card 1: Today's Positives */}
      <div
        onClick={() => onTabChange('positive')}
        className={`glass-card rounded-xl p-4 flex items-center justify-between border cursor-pointer transition-all duration-200
                    ${activeTab === 'positive' ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-800 hover:border-slate-700'}`}
      >
        <div>
          <p className="text-xs text-slate-400 font-medium">Today's Positives</p>
          <p className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">
            {summary.positives_count}
          </p>
          <p className="text-[11px] text-emerald-500/80 mt-0.5">Opportunities Generated</p>
        </div>
        <div className="text-3xl p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          ✨
        </div>
      </div>

      {/* Card 2: Today's JD Received */}
      <div
        onClick={() => onTabChange('jd_received')}
        className={`glass-card rounded-xl p-4 flex items-center justify-between border cursor-pointer transition-all duration-200
                    ${activeTab === 'jd_received' ? 'border-blue-500 bg-blue-950/20' : 'border-slate-800 hover:border-slate-700'}`}
      >
        <div>
          <p className="text-xs text-slate-400 font-medium">Today's JD Received</p>
          <p className="text-2xl font-black text-blue-400 mt-1 tabular-nums">
            {summary.jd_received_count}
          </p>
          <p className="text-[11px] text-blue-500/80 mt-0.5">Job Descriptions In Hand</p>
        </div>
        <div className="text-3xl p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
          📋
        </div>
      </div>

      {/* Card 3: Active Colleges */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between border border-slate-800">
        <div>
          <p className="text-xs text-slate-400 font-medium">Active Colleges Today</p>
          <p className="text-2xl font-black text-purple-400 mt-1 tabular-nums">
            {summary.active_colleges_count}
          </p>
          <p className="text-[11px] text-purple-500/80 mt-0.5">Institutions with Daily Activity</p>
        </div>
        <div className="text-3xl p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
          🏛️
        </div>
      </div>

    </div>
  );
}
