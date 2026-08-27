'use client';

import React from 'react';
import {
  Sparkles,
  Search,
  Plus,
  FileSpreadsheet,
  Trash2,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';
import { SmoothLeadStatusDropdown } from '@/components/ui/SmoothLeadStatusDropdown';
import { SmoothMonthDropdown } from '@/components/ui/SmoothMonthDropdown';

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
  isExporting: boolean;
  onSyncTracker: () => void;
  isSyncing: boolean;
  isDeleteMode: boolean;
  onToggleDeleteMode: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  isDeletingSelected?: boolean;
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
  isExporting,
  onSyncTracker,
  isSyncing,
  isDeleteMode,
  onToggleDeleteMode,
  selectedCount,
  onDeleteSelected,
  isDeletingSelected = false,
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
          {/* Total Companies */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-surface-sunken border border-border shadow-2xs">
            <span className="text-[11px] font-semibold text-fg-subtle">Total:</span>
            <span className="font-mono font-bold text-primary text-xs">{stats.total}</span>
          </div>

          <div className="ml-2 shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar (Single Row) ────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/40 overflow-x-auto no-scrollbar flex-nowrap">
        {/* Left Side: Search & Filter Dropdowns */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Search */}
          <div className="relative shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search company, role, CTC…"
              className="bg-surface-sunken border border-border rounded-xl pl-7 pr-2.5 py-1.5 text-xs text-fg placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-36 sm:w-44 lg:w-52 transition-colors font-sans shadow-2xs shrink-0"
            />
          </div>

          {/* Smooth Academic Year Filter */}
          <SmoothYearDropdown
            value={selectedYear}
            onChange={onYearChange}
            allowAll
            allLabel="Year"
            placeholder="Year"
            className="shrink-0"
          />

          {/* Smooth Month Filter */}
          <SmoothMonthDropdown
            value={selectedMonth}
            onChange={onMonthChange}
            allowAll
            allLabel="Follow Up Month"
            placeholder="Follow Up Month"
            className="shrink-0"
          />
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sync Button with Hover Tooltip */}
          <div className="relative group/sync shrink-0">
            <button
              type="button"
              onClick={onSyncTracker}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 ring-1 ring-indigo-400/30 dark:ring-indigo-400/20 whitespace-nowrap"
              title="Datas will be synced from the daily tracker for the status follow, hiring and invite email"
              aria-label="Sync leads from Daily Tracker"
            >
              <RefreshCw
                size={13}
                strokeWidth={2.2}
                className={`text-indigo-600 dark:text-indigo-400 transition-transform duration-500 shrink-0 ${
                  isSyncing ? 'animate-spin' : 'group-hover/sync:rotate-180'
                }`}
              />
              <span>{isSyncing ? 'Syncing…' : 'Sync'}</span>
            </button>

            {/* Custom Interactive Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover/sync:flex flex-col items-center z-50 w-72 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-slate-800 rotate-45 -mb-1 border-t border-l border-slate-700/50" />
              <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-[11px] font-medium leading-relaxed px-3 py-2 rounded-xl shadow-2xl border border-slate-700/60 text-center">
                Datas will be synced from the daily tracker for the status follow, hiring and invite email
              </div>
            </div>
          </div>

          {/* Export Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet size={13} strokeWidth={2} className="shrink-0" />
            <span>{isExporting ? 'Exporting…' : 'Export Excel'}</span>
          </button>

          {/* Delete Mode Toggle / Delete Selected Actions */}
          {!isDeleteMode ? (
            <button
              type="button"
              onClick={onToggleDeleteMode}
              className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ring-1 ring-rose-400/30 dark:ring-rose-400/30 whitespace-nowrap shrink-0"
              title="Enter Delete mode to select and delete leads"
            >
              <Trash2 size={13} strokeWidth={2.2} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Delete</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
              {/* Delete Selected Button */}
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={selectedCount === 0 || isDeletingSelected}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
              >
                {isDeletingSelected ? (
                  <Loader2 size={13} className="animate-spin shrink-0" />
                ) : (
                  <Trash2 size={13} strokeWidth={2.2} className="shrink-0" />
                )}
                <span>
                  {selectedCount > 0
                    ? `Delete Selected (${selectedCount})`
                    : 'Delete Selected'}
                </span>
              </button>

              {/* Exit Delete Button */}
              <button
                type="button"
                onClick={onToggleDeleteMode}
                className="px-3 py-1.5 bg-surface-sunken hover:bg-surface border border-border text-fg-subtle hover:text-fg rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
              >
                <X size={13} strokeWidth={2.5} className="shrink-0" />
                <span>Exit Delete</span>
              </button>
            </div>
          )}

          {/* Add Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus size={13} strokeWidth={2.5} className="shrink-0" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </header>
  );
}
