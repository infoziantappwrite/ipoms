'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Download,
  ChevronDown,
  Trash2,
  X,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';
import { SmoothLeadStatusDropdown } from '@/components/ui/SmoothLeadStatusDropdown';
import { SmoothMonthDropdown } from '@/components/ui/SmoothMonthDropdown';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';

interface Stats {
  total: number;
  hiring: number;
  follow_up: number;
  invite_email: number;
}

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedYear: string;
  onYearChange: (y: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  stats: Stats;
  onOpenAddModal: () => void;
  onExportExcel: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting: boolean;
  onSyncTracker: () => void;
  isSyncing: boolean;
  isDeleteMode: boolean;
  onToggleDeleteMode: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  isDeletingSelected?: boolean;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

export function ActiveLeadHeader({
  searchQuery,
  onSearchChange,
  selectedYear,
  onYearChange,
  selectedStatus,
  onStatusChange,
  selectedMonth,
  onMonthChange,
  stats,
  onOpenAddModal,
  onExportExcel,
  onExportPdf,
  onExportImage,
  isExporting,
  onSyncTracker,
  isSyncing,
  isDeleteMode,
  onToggleDeleteMode,
  selectedCount,
  onDeleteSelected,
  isDeletingSelected = false,
  page = 1,
  totalPages = 1,
  totalCount,
  onPageChange,
}: Props) {
  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-3.5 space-y-3 text-fg shadow-xs">
      {/* ── Top Row: Title, Subtitle, Minimal KPI Badges & Sign Out ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
            <h1 className="text-xl font-bold text-fg tracking-tight">
              Active Leads Management
            </h1>
          </div>
        </div>

        {/* ── Minimal KPI Badges Strip & Top Pagination ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Total Companies */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-surface-sunken border border-border shadow-2xs">
            <span className="text-[11px] font-semibold text-fg-subtle">Total:</span>
            <span className="font-mono font-bold text-primary text-xs">{totalCount !== undefined ? totalCount : stats.total}</span>
          </div>

          {/* Top Pagination Navigation Bar */}
          {totalPages > 1 && onPageChange && (
            <div className="flex items-center gap-1 bg-surface-sunken px-1.5 py-0.5 rounded-xl border border-border shadow-2xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                title="Previous Page"
                className="w-7 h-7 rounded-lg bg-surface border border-border hover:bg-surface-raised active:scale-[0.992] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} strokeWidth={2.25} />
              </button>
              <span className="text-[11px] font-mono font-bold text-fg px-2 select-none">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                title="Next Page"
                className="w-7 h-7 rounded-lg bg-surface border border-border hover:bg-surface-raised active:scale-[0.992] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg transition-all cursor-pointer shadow-2xs"
              >
                <ChevronRight size={14} strokeWidth={2.25} />
              </button>
            </div>
          )}

          <div className="ml-2 flex items-center gap-2 shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar (Single Row) ────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/40 overflow-x-auto no-scrollbar flex-nowrap">
        {/* Left Side: Search & Filter Dropdowns */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Search (High Visibility with Crisp Outline & Light Placeholder) */}
          <div className="relative shrink-0 w-44 sm:w-52">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-300 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search company, role, CTC…"
              className="w-full h-8 pl-8 pr-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/90 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl shadow-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-300/80 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {/* Smooth Academic Year Filter */}
          <SmoothYearDropdown
            value={selectedYear}
            onChange={onYearChange}
            allowAll
            allLabel="Year"
            placeholder="Year"
            className="w-[90px] shrink-0"
          />

          {/* Smooth Status Filter */}
          <SmoothLeadStatusDropdown
            value={selectedStatus}
            onChange={onStatusChange}
            allowAll
            allLabel="Status"
            placeholder="Status"
            className="w-[105px] shrink-0"
          />

          {/* Smooth Month Filter */}
          <SmoothMonthDropdown
            value={selectedMonth}
            onChange={onMonthChange}
            allowAll
            allLabel="Month"
            placeholder="Month"
            className="w-[110px] shrink-0"
          />
        </div>

        {/* Right Side: Action Buttons with Clean Divider */}
        <div className="flex items-center gap-2 shrink-0 ml-auto pl-2 border-l border-border/60">
          {/* Sync Button (Icon Only with Interactive Tooltip) */}
          <div className="relative group/sync shrink-0">
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncTracker}
              className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-[0.992] hover:shadow-indigo-500/20 shrink-0"
              title="Sync leads from Daily Tracker (Follow Up, Hiring, Invite Email)"
              aria-label="Sync leads from Daily Tracker"
            >
              <RefreshCw
                size={14}
                strokeWidth={2.2}
                className={`text-white transition-transform duration-500 shrink-0 ${
                  isSyncing ? 'animate-spin' : 'group-hover/sync:rotate-180'
                }`}
              />
            </button>

            {/* Custom Interactive Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover/sync:flex flex-col items-center z-50 w-64 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-slate-800 rotate-45 -mb-1 border-t border-l border-slate-700/50" />
              <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-[11px] font-medium leading-relaxed px-3 py-2 rounded-xl shadow-2xl border border-slate-700/60 text-center">
                Sync leads from Daily Tracker (Follow Up, Hiring, Invite Email)
              </div>
            </div>
          </div>

          {/* Solid Export Dropdown Menu (Excel, PDF, Image) using Body Portal (Icon Only) */}
          <SmoothExportDropdown
            onExportExcel={onExportExcel}
            onExportPdf={onExportPdf}
            onExportImage={onExportImage}
            isExporting={isExporting}
            iconOnly={true}
          />

          {/* Delete Mode Toggle / Delete Selected Actions (Icon Only) */}
          {!isDeleteMode ? (
            <button
              type="button"
              onClick={onToggleDeleteMode}
              className="w-8 h-8 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/50 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-[0.992] ring-1 ring-rose-400/30 dark:ring-rose-400/30 shrink-0"
              title="Delete mode — select and delete leads"
              aria-label="Delete leads"
            >
              <Trash2 size={14} strokeWidth={2.2} className="text-rose-600 dark:text-rose-400 shrink-0" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
              {/* Delete Selected Button */}
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={selectedCount === 0 || isDeletingSelected}
                className="h-8 px-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.992] whitespace-nowrap shrink-0"
                title="Confirm delete selected leads"
                aria-label="Delete selected leads"
              >
                {isDeletingSelected ? (
                  <Loader2 size={13} className="animate-spin shrink-0" />
                ) : (
                  <Trash2 size={13} strokeWidth={2.2} className="shrink-0" />
                )}
                {selectedCount > 0 && <span className="font-mono text-xs font-bold">{selectedCount}</span>}
              </button>

              {/* Exit Delete Button */}
              <button
                type="button"
                onClick={onToggleDeleteMode}
                className="w-8 h-8 bg-surface-sunken hover:bg-surface border border-border text-fg-subtle hover:text-fg rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-[0.992] shrink-0"
                title="Exit Delete mode"
                aria-label="Exit Delete mode"
              >
                <X size={14} strokeWidth={2.5} className="shrink-0" />
              </button>
            </div>
          )}

          {/* Add Button (Icon Only) */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-8 h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer active:scale-[0.992] shrink-0"
            title="Add Active Lead"
            aria-label="Add Active Lead"
          >
            <Plus size={15} strokeWidth={2.5} className="shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
}
