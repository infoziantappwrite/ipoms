'use client';

import { Building2, ClipboardList, FileSpreadsheet, Plus, Search, Trash2 } from 'lucide-react';
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
    <div className="glass-panel border-b border-border px-6 py-5 flex items-center justify-between flex-wrap gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 size={14} strokeWidth={2} aria-hidden /> Master Metadata Database
          </h1>
          <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-semibold">
            Module 02 • {totalCount} Contacts
          </span>
          {isRecycleBin && (
            <span className="text-xs bg-destructive/20 text-destructive border border-destructive/30 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
              <Trash2 size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Recycle Bin Active
            </span>
          )}
        </div>
        <p className="text-xs text-fg-subtle mt-1">
          Centralized Corporate Directory, HR Contacts & Intelligence Repository
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Starts-With Live Search (Spec Section 8) */}
        <div className="relative">
          <Search size={14} strokeWidth={2} aria-hidden />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type company (e.g. ACC) or phone…"
            className="bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-fg w-56 sm:w-64"
          />
        </div>

        {/* Company Type Filter Dropdown (Spec Section 13) */}
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-fg cursor-pointer"
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
              ? 'bg-destructive text-white border-destructive shadow-2'
              : 'bg-background hover:bg-surface text-fg-muted border-border'
          }`}
          title="Toggle Recycle Bin"
        >
          <Trash2 size={14} strokeWidth={2} aria-hidden /> {isRecycleBin ? 'Back to Live' : 'Recycle Bin'}
        </button>

        {!isRecycleBin && (
          <>
            {/* Export Excel Button */}
            <button
              onClick={onExport}
              className="px-3 py-2 bg-background hover:bg-surface text-fg-muted border border-border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Export
            </button>

            {/* Bulk Paste Button (Spec Section 16) */}
            <button
              onClick={onOpenBulkPasteModal}
              className="px-3 py-2 bg-surface hover:bg-surface-raised text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <ClipboardList size={14} strokeWidth={2} aria-hidden /> Bulk Paste
            </button>

            {/* Add Contact Button */}
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2} aria-hidden /> Add Contact
            </button>
          </>
        )}
      </div>
    </div>
  );
}
