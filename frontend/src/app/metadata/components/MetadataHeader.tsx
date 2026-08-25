'use client';

import { Database, ClipboardList, FileSpreadsheet, Plus, Search, Trash2 } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothIndustryDropdown } from '@/components/ui/SmoothIndustryDropdown';

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
  return (
    <header className="bg-surface border-b border-border px-6 py-4 space-y-3 text-fg">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Database size={18} strokeWidth={2.25} />
            </div>
            <h1 className="text-base font-bold text-fg tracking-tight">
              Master Metadata Directory
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
              className="bg-surface-sunken border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-56 sm:w-64 transition-colors"
            />
          </div>

          {/* Smooth Industry Type Filter Dropdown */}
          <SmoothIndustryDropdown
            value={selectedType}
            onChange={onTypeChange}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Recycle Bin Toggle */}
          <button
            onClick={onToggleRecycleBin}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isRecycleBin
                ? 'bg-destructive text-white border-destructive shadow-2'
                : 'bg-surface hover:bg-surface-raised text-fg-muted border-border'
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
                className="px-3 py-1.5 bg-surface hover:bg-surface-raised text-fg border border-border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet size={14} strokeWidth={2} className="text-fg-subtle" /> Export
              </button>

              {/* Bulk Paste Button (Bright & High-Contrast in Dark Mode) */}
              <button
                onClick={onOpenBulkPasteModal}
                className="px-3.5 py-1.5 bg-blue-50/90 dark:bg-sky-950/60 hover:bg-blue-100 dark:hover:bg-sky-900/60 text-blue-800 dark:text-sky-300 border border-blue-300 dark:border-sky-500/50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ring-1 ring-blue-400/30 dark:ring-sky-400/30"
              >
                <ClipboardList size={14} strokeWidth={2.2} className="text-blue-700 dark:text-sky-400" /> Bulk Paste
              </button>

              {/* Add Contact Button */}
              <button
                onClick={onOpenAddModal}
                className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
