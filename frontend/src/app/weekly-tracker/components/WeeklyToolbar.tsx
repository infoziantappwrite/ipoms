'use client';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  companyTypeFilter: string;
  onCompanyTypeChange: (type: string) => void;
  onOpenAddModal: () => void;
  onSyncDailyPositives: () => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  totalRecords: number;
}

const COMPANY_TYPES = [
  'All Types',
  'Software / IT',
  'Software / Product',
  'Core / Engineering',
  'Banking / Finance',
  'Healthcare / Pharma',
  'EdTech / Education',
  'Consulting',
  'BPO / KPO',
];

export function WeeklyToolbar({
  searchQuery,
  onSearchChange,
  companyTypeFilter,
  onCompanyTypeChange,
  onOpenAddModal,
  onSyncDailyPositives,
  onRefresh,
  onExportCsv,
  totalRecords,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex-wrap">

      {/* Left: Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <span>➕</span> Add Company
        </button>

        <button
          onClick={onSyncDailyPositives}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          title="Import newly flagged positive calls from Daily Tracker"
        >
          <span>📥</span> Sync Daily Positives
        </button>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs transition-colors"
        >
          <span>🔄</span> Refresh
        </button>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
        >
          <span>📑</span> Export CSV
        </button>
      </div>

      {/* Right: Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Company Type Filter */}
        <select
          value={companyTypeFilter}
          onChange={(e) => onCompanyTypeChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg 
                     focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {COMPANY_TYPES.map((t) => (
            <option key={t} value={t === 'All Types' ? 'all' : t}>
              {t}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="w-64">
          <input
            type="text"
            placeholder="Search company, role, CDC, status…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg 
                       focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {totalRecords} record(s)
        </span>
      </div>

    </div>
  );
}
