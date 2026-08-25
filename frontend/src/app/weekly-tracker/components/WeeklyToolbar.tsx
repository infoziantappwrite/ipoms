'use client';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  companyTypeFilter: string;
  onCompanyTypeChange: (type: string) => void;
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
  totalRecords,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-2.5 bg-surface border-b border-border flex-wrap text-fg">
      {/* Left: Total Records Count */}
      <div className="text-xs font-semibold text-fg-muted">
        Total Records: <span className="font-bold text-fg font-mono">{totalRecords}</span>
      </div>

      {/* Right: Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Company Type Filter */}
        <select
          value={companyTypeFilter}
          onChange={(e) => onCompanyTypeChange(e.target.value)}
          className="bg-surface-sunken border border-border text-fg text-xs px-3 py-1.5 rounded-xl font-medium shadow-2xs outline-none cursor-pointer"
        >
          {COMPANY_TYPES.map((t) => (
            <option key={t} value={t === 'All Types' ? 'all' : t} className="bg-surface text-fg">
              {t}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="w-64">
          <input
            type="text"
            placeholder="Search company, role, status…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-sunken border border-border text-fg text-xs px-3 py-1.5 rounded-xl shadow-2xs placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}
