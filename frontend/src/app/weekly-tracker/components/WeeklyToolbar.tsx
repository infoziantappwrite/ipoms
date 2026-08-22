'use client';

import { Download, FileSpreadsheet, Plus, RefreshCw } from 'lucide-react';
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
    <div className="flex items-center justify-between gap-3 px-6 py-3 bg-background/60 border-b border-border flex-wrap">

      {/* Left: Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-1 transition-colors"
        >
          <Plus size={14} strokeWidth={2} aria-hidden /> Add Company
        </button>

        <button
          onClick={onSyncDailyPositives}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          title="Import newly flagged positive calls from Daily Tracker"
        >
          <Download size={14} strokeWidth={2} aria-hidden /> Sync Daily Positives
        </button>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 bg-[#FEF3C7] hover:bg-[#FDE68A] text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw size={14} strokeWidth={2} aria-hidden /> Refresh
        </button>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 bg-success hover:bg-success text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
        >
          <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Export CSV
        </button>
      </div>

      {/* Right: Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Company Type Filter */}
        <select
          value={companyTypeFilter}
          onChange={(e) => onCompanyTypeChange(e.target.value)}
          className="bg-surface border border-border-strong text-fg text-xs px-3 py-2 rounded-lg 
                     cursor-pointer"
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
            className="w-full bg-surface border border-border-strong text-fg text-xs px-3.5 py-2 rounded-lg 
                       placeholder-fg-subtle"
          />
        </div>

        <span className="text-xs text-fg-subtle font-mono">
          {totalRecords} record(s)
        </span>
      </div>

    </div>
  );
}
