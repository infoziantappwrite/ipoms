'use client';

import { Database, ClipboardList, FileSpreadsheet, Plus, Search, Trash2 } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
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
    <header className="glass-panel border-b border-border px-6 py-4 space-y-3">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
              <Database size={18} strokeWidth={2} className="text-primary" />
              <span>Master Metadata Directory</span>
            </h1>
            {isRecycleBin && (
              <span className="text-xs bg-danger/20 text-danger border border-danger/30 px-2.5 py-0.5 rounded-full font-bold">
                <Trash2 size={12} className="inline mr-1 shrink-0" /> Recycle Bin Active
              </span>
            )}
          </div>
          <p className="text-xs text-fg-subtle mt-0.5">
            Centralized Corporate Directory, HR Contacts & Intelligence Repository
          </p>
        </div>

        {/* Pin Sign Out to Absolute Top Right */}
        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Bottom Controls Row: Search, Type Filter, Actions ─────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Starts-With Live Search */}
          <div className="relative">
            <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Type company (e.g. ACC) or phone…"
              className="bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-fg w-56 sm:w-64"
            />
          </div>

          {/* Company Type Filter Dropdown */}
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
        </div>

        <div className="flex items-center gap-2">
          {/* Recycle Bin Toggle */}
          <button
            onClick={onToggleRecycleBin}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              isRecycleBin
                ? 'bg-destructive text-white border-destructive shadow-2'
                : 'bg-background hover:bg-surface text-fg-muted border-border'
            }`}
            title="Toggle Recycle Bin"
          >
            <Trash2 size={14} strokeWidth={2} /> {isRecycleBin ? 'Back to Live' : 'Recycle Bin'}
          </button>

          {!isRecycleBin && (
            <>
              {/* Export Excel Button */}
              <button
                onClick={onExport}
                className="px-3 py-2 bg-background hover:bg-surface text-fg-muted border border-border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <FileSpreadsheet size={14} strokeWidth={2} /> Export
              </button>

              {/* Bulk Paste Button */}
              <button
                onClick={onOpenBulkPasteModal}
                className="px-3 py-2 bg-surface hover:bg-surface-raised text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <ClipboardList size={14} strokeWidth={2} /> Bulk Paste
              </button>

              {/* Add Contact Button */}
              <button
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} strokeWidth={2} /> Add Contact
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
