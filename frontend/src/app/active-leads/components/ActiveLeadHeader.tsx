'use client';

import React from 'react';
import {
  Sparkles,
  Search,
  Plus,
  FileSpreadsheet,
  ClipboardList,
} from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';
import { SmoothLeadStatusDropdown } from '@/components/ui/SmoothLeadStatusDropdown';
import { SmoothMonthDropdown } from '@/components/ui/SmoothMonthDropdown';

interface Stats {
  total: number;
  hiring: number;
  follow_up: number;
  not_hiring: number;
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
  onOpenBulkPasteModal: () => void;
  onExportExcel: () => void;
  isExporting: boolean;
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
  onOpenBulkPasteModal,
  onExportExcel,
  isExporting,
}: Props) {
  return (
    <header className="bg-surface border-b border-border px-6 py-3.5 space-y-3 text-fg">
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

        {/* ── Minimal KPI Badges Strip ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Total */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-sunken border border-border shadow-2xs">
            <span className="text-[11px] font-semibold text-fg-subtle">Total:</span>
            <span className="font-mono font-bold text-fg text-xs">{stats.total}</span>
          </div>

          {/* Hiring */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] font-semibold">Hiring:</span>
            <span className="font-mono font-bold text-xs">{stats.hiring}</span>
          </div>

          {/* Follow Up */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold">Follow Up:</span>
            <span className="font-mono font-bold text-xs">{stats.follow_up}</span>
          </div>

          {/* Not Hiring */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-[11px] font-semibold">Not Hiring:</span>
            <span className="font-mono font-bold text-xs">{stats.not_hiring}</span>
          </div>

          <div className="ml-2 shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search company, role or CTC…"
              className="bg-surface-sunken border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-48 sm:w-56 transition-colors font-sans shadow-2xs"
            />
          </div>

          {/* Smooth Academic Year Filter */}
          <SmoothYearDropdown
            value={selectedYear}
            onChange={onYearChange}
            allowAll
            allLabel="Select Year"
          />

          {/* Smooth Status Filter */}
          <SmoothLeadStatusDropdown
            value={selectedStatus}
            onChange={onStatusChange}
            allowAll
            allLabel="All Statuses"
          />

          {/* Smooth Month Filter */}
          <SmoothMonthDropdown
            value={selectedMonth}
            onChange={onMonthChange}
            allowAll
            allLabel="All Followup Months"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Export Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet size={14} strokeWidth={2} />
            <span>{isExporting ? 'Exporting…' : 'Export Excel'}</span>
          </button>

          {/* Bulk Paste */}
          <button
            type="button"
            onClick={onOpenBulkPasteModal}
            className="px-3.5 py-1.5 bg-blue-50 dark:bg-sky-950/60 hover:bg-blue-100 dark:hover:bg-sky-900/60 text-blue-800 dark:text-sky-300 border border-blue-300 dark:border-sky-500/50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ring-1 ring-blue-400/30 dark:ring-sky-400/30"
          >
            <ClipboardList size={14} strokeWidth={2.2} className="text-blue-700 dark:text-sky-400" />
            <span>Bulk Paste</span>
          </button>

          {/* Add Single Lead */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>
    </header>
  );
}
