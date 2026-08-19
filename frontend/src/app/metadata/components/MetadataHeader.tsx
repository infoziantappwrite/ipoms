'use client';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeChange: (t: string) => void;
  isRecycleBin: boolean;
  onToggleRecycleBin: () => void;
  onOpenAddModal: () => void;
  onOpenBulkPasteModal: () => void;
  onExport: () => void;
  totalCount: number;
}

export function MetadataHeader({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  isRecycleBin,
  onToggleRecycleBin,
  onOpenAddModal,
  onOpenBulkPasteModal,
  onExport,
  totalCount,
}: Props) {
  const companyTypes = [
    { id: 'all', label: 'All Industries' },
    { id: 'software', label: 'Software' },
    { id: 'ai', label: 'AI & Data' },
    { id: 'bpo', label: 'BPO / BPM' },
    { id: 'banking', label: 'Banking' },
    { id: 'education', label: 'Education' },
    { id: 'finance', label: 'Finance' },
    { id: 'core_engineering', label: 'Core Engineering' },
    { id: 'product', label: 'Product' },
    { id: 'consulting', label: 'Consulting' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="glass-panel border-b border-slate-800 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>🏢</span> Master Metadata Database
          </h1>
          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
            Module 02 • {totalCount} Contacts
          </span>
          {isRecycleBin && (
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
              🗑️ Recycle Bin Active
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Centralized Corporate Directory, HR Contacts & Intelligence Repository
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Starts-With Live Search (Spec Section 8) */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type company (e.g. ACC) or phone…"
            className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-56 sm:w-64"
          />
        </div>

        {/* Company Type Filter Dropdown (Spec Section 13) */}
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {companyTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Recycle Bin Toggle (Spec Section 12) */}
        <button
          onClick={onToggleRecycleBin}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
            isRecycleBin
              ? 'bg-red-600 text-white border-red-500 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Toggle Recycle Bin"
        >
          <span>🗑️</span> {isRecycleBin ? 'Back to Live' : 'Recycle Bin'}
        </button>

        {!isRecycleBin && (
          <>
            {/* Export Excel Button */}
            <button
              onClick={onExport}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <span>📑</span> Export
            </button>

            {/* Bulk Paste Button (Spec Section 16) */}
            <button
              onClick={onOpenBulkPasteModal}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <span>📋</span> Bulk Paste
            </button>

            {/* Add Contact Button */}
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center gap-1.5"
            >
              <span>➕</span> Add Contact
            </button>
          </>
        )}
      </div>
    </div>
  );
}
