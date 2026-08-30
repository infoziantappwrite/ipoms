'use client';

import React, { useState, useEffect } from 'react';
import { Database, ClipboardList, FileSpreadsheet, Plus, Search, Trash2, Clock, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothIndustryDropdown } from '@/components/ui/SmoothIndustryDropdown';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';
import { SnoRangeSelector } from './SnoRangeSelector';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeChange: (t: string) => void;
  isRecycleBin: boolean;
  onToggleRecycleBin: () => void;
  isRecent: boolean;
  onToggleRecent: () => void;
  fromSno: number | null;
  toSno: number | null;
  onApplyRange: (from: number | null, to: number | null) => void;
  onClearRange: () => void;
  onOpenAddModal: () => void;
  onOpenBulkPasteModal: () => void;
  onExport: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting?: boolean;
  totalCount: number;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
}

export function MetadataHeader({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  isRecycleBin,
  onToggleRecycleBin,
  isRecent,
  onToggleRecent,
  fromSno,
  toSno,
  onApplyRange,
  onClearRange,
  onOpenAddModal,
  onOpenBulkPasteModal,
  onExport,
  onExportPdf,
  onExportImage,
  isExporting = false,
  totalCount,
  page,
  totalPages,
  onPageChange,
}: Props) {
  const [inputPage, setInputPage] = useState<string>(String(page ?? 1));

  useEffect(() => {
    if (page !== undefined) setInputPage(String(page));
  }, [page]);

  const handlePageInputSubmit = () => {
    const p = parseInt(inputPage.trim(), 10);
    if (!isNaN(p) && onPageChange && totalPages) {
      const clamped = Math.max(1, Math.min(p, totalPages));
      onPageChange(clamped);
      setInputPage(String(clamped));
    } else if (page) {
      setInputPage(String(page));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 space-y-3 text-fg shadow-xs">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {isRecycleBin ? (
              <>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 shadow-2xs">
                  <Trash2 size={18} strokeWidth={2.25} />
                </div>
                <h1 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
                  <span>Recycle Bin of Metadata</span>
                </h1>
                <span className="text-xs bg-rose-500/15 text-rose-600 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Deleted Items
                </span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                  <Database size={18} strokeWidth={2.25} />
                </div>
                <h1 className="text-base font-bold text-fg tracking-tight">
                  Master Metadata Directory
                </h1>
              </>
            )}
          </div>
          <p className="text-xs text-fg-subtle mt-0.5">
            {isRecycleBin
              ? 'View, restore, or permanently purge recently deleted company and HR contact records'
              : 'Centralized Corporate Directory, HR Contacts & Intelligence Repository'}
          </p>
        </div>

        {/* Pin Sign Out to Absolute Top Right */}
        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Bottom Controls Row: Search, Type Filter, S.No Range, Actions ─────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Starts-With Live Search (High Visibility with Crisp Outline & Light Placeholder) */}
          <div className="relative w-52 sm:w-60 shrink-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-300 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Type company (e.g. ACC) or phone…"
              className="w-full h-8 pl-8 pr-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/90 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl shadow-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-300/80 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {/* Smooth Industry Type Filter Dropdown */}
          <SmoothIndustryDropdown
            value={selectedType}
            onChange={onTypeChange}
          />

          {/* S.No Range Selector Dropdown */}
          {!isRecycleBin && (
            <SnoRangeSelector
              fromSno={fromSno}
              toSno={toSno}
              maxSno={totalCount}
              onApplyRange={onApplyRange}
              onClearRange={onClearRange}
            />
          )}

          {/* Recent Data / Metadata Toggle */}
          <button
            type="button"
            onClick={onToggleRecent}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
              isRecent
                ? 'bg-primary text-white border-primary shadow-xs ring-1 ring-primary/30'
                : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/25 hover:border-primary/40'
            }`}
            title={isRecent ? 'Switch back to all metadata from Serial Number 1' : 'View contacts added in the past 1 to 2 weeks'}
          >
            {isRecent ? (
              <>
                <Database size={13} strokeWidth={2.25} />
                <span>Metadata</span>
              </>
            ) : (
              <>
                <Clock size={13} strokeWidth={2.25} />
                <span>Recent Data</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Pagination Controls with Jump-to-Page Input Before Delete/Recycle Bin */}
          {totalPages !== undefined && totalPages > 1 && onPageChange && page !== undefined && (
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                title="Previous Page"
                className="w-8 h-8 rounded-full bg-surface border border-border hover:bg-surface-raised active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} strokeWidth={2.25} />
              </button>

              <div
                className="flex items-center gap-1 px-2 py-0.5 bg-surface border border-border rounded-full shadow-2xs"
                title={`Type a page number (1 to ${totalPages}) and press Enter`}
              >
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePageInputSubmit();
                    }
                  }}
                  onBlur={handlePageInputSubmit}
                  className="w-10 text-center font-mono font-bold text-xs bg-surface-sunken border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md py-0.5 text-fg outline-none transition-colors"
                />
                <span className="text-xs font-mono font-bold text-fg-subtle select-none">
                  / {totalPages}
                </span>
              </div>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                title="Next Page"
                className="w-8 h-8 rounded-full bg-surface border border-border hover:bg-surface-raised active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg transition-all cursor-pointer shadow-2xs"
              >
                <ChevronRight size={14} strokeWidth={2.25} />
              </button>
            </div>
          )}

          {/* Recycle Bin / Back to Online Toggle */}
          {isRecycleBin ? (
            <button
              onClick={onToggleRecycleBin}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white border border-emerald-500/80 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-500/20"
              title="Return to Online Metadata Directory"
              aria-label="Back to Online"
            >
              <ArrowLeft size={14} strokeWidth={2.25} /> Back to Online
            </button>
          ) : (
            <button
              onClick={onToggleRecycleBin}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-xs transition-all active:scale-95"
              title="Recycle Bin (Deleted Contacts)"
              aria-label="Recycle Bin"
            >
              <Trash2 size={16} strokeWidth={2.2} />
            </button>
          )}

          {!isRecycleBin && (
            <>
              {/* Solid Export Dropdown Menu (Green Icon Button) */}
              <SmoothExportDropdown
                onExportExcel={onExport}
                onExportPdf={onExportPdf}
                onExportImage={onExportImage}
                isExporting={isExporting}
                iconOnly={true}
                title="Export Data (Excel, PDF, Image)"
              />

              {/* Bulk Paste Icon Button (Solid Mango Orange with Tooltip) */}
              <button
                onClick={onOpenBulkPasteModal}
                className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                title="Bulk Paste & Import Contacts"
                aria-label="Bulk Paste Contacts"
              >
                <ClipboardList size={16} strokeWidth={2.2} />
              </button>

              {/* Add Contact Icon Button (Solid Navy Blue with Tooltip) */}
              <button
                onClick={onOpenAddModal}
                className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                title="Add Single Contact"
                aria-label="Add Contact"
              >
                <Plus size={17} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
