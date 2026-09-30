'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Download,
  ChevronDown,
  Check,
  Layers,
  Trash2,
  X,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';
import { SmoothMonthDropdown } from '@/components/ui/SmoothMonthDropdown';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';
import { triggerHaptic } from '@/lib/haptics';

export type JdSection = 'all' | 'in_progress' | 'upcoming_drive' | 'drive_in_progress' | 'completed';

export interface JdSectionCounts {
  all: number;
  in_progress: number;
  upcoming_drive: number;
  drive_in_progress: number;
  completed: number;
}

// Collapses the 5 JD stage sub-tabs into one dropdown (user decision, 20 Sep
// 2026) — same 5 stages, same counts, same colors, just one control instead
// of a whole second toolbar row. Colors mirror the sub-tabs they replace.
const STAGE_OPTIONS: { key: JdSection; label: string; onClass: string; onCountClass: string; dotClass: string }[] = [
  { key: 'all', label: 'All', onClass: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100', onCountClass: 'bg-white/90 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600', dotClass: 'bg-zinc-400' },
  { key: 'in_progress', label: 'In Progress', onClass: 'bg-blue-600 text-white', onCountClass: 'bg-blue-700/80 text-white', dotClass: 'bg-blue-600' },
  { key: 'upcoming_drive', label: 'Upcoming Drive', onClass: 'bg-purple-600 text-white', onCountClass: 'bg-purple-700/80 text-white', dotClass: 'bg-purple-600' },
  { key: 'drive_in_progress', label: 'Drive in Progress', onClass: 'bg-amber-600 text-white', onCountClass: 'bg-amber-700/80 text-white', dotClass: 'bg-amber-600' },
  { key: 'completed', label: 'Companies Completed', onClass: 'bg-emerald-600 text-white', onCountClass: 'bg-emerald-700/80 text-white', dotClass: 'bg-emerald-600' },
];

interface StageDropdownProps {
  value: JdSection;
  counts?: JdSectionCounts;
  fallbackTotal: number;
  onChange: (section: JdSection) => void;
}

function StageDropdown({ value, counts, fallbackTotal, onChange }: StageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; ready: boolean }>({ top: 0, left: 0, ready: false });

  const active = STAGE_OPTIONS.find((s) => s.key === value) || STAGE_OPTIONS[0];
  const activeCount = counts ? counts[value] : fallbackTotal;

  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, ready: true });
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        className={`flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none shadow-xs whitespace-nowrap ${active.onClass}`}
      >
        <Layers size={12} strokeWidth={2.4} className="opacity-80 shrink-0" />
        <span className="hidden sm:inline">Stage:</span>
        <span>{active.label}</span>
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${active.onCountClass}`}>
          {activeCount}
        </span>
        <ChevronDown size={12} strokeWidth={2.5} className={`opacity-80 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && coords.ready && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          role="listbox"
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 99999 }}
          className="w-56 bg-surface border border-border rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
        >
          {STAGE_OPTIONS.map((opt) => {
            const isSelected = opt.key === value;
            const count = counts ? counts[opt.key] : opt.key === 'all' ? fallbackTotal : 0;
            return (
              <button
                key={opt.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-surface-sunken' : 'hover:bg-surface-sunken'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} />
                <span className="flex-1 text-fg">{opt.label}</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-surface-sunken border border-border text-fg-subtle">
                  {count}
                </span>
                {isSelected && <Check size={13} strokeWidth={2.5} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

interface Stats {
  total: number;
  hiring?: number;
  follow_up?: number;
  invite_email?: number;
}

interface Props {
  activeTab: 'pipeline' | 'jd_received';
  onTabChange: (tab: 'pipeline' | 'jd_received') => void;
  selectedSection?: JdSection;
  onSectionChange?: (sec: JdSection) => void;
  tabCounts: {
    pipeline: number;
    jd_received: number;
  };
  jdSectionCounts?: JdSectionCounts;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedYear: string;
  onYearChange: (y: string) => void;
  selectedStatus?: string;
  onStatusChange?: (s: string) => void;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  stats?: Stats;
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
  activeTab,
  onTabChange,
  selectedSection = 'all',
  onSectionChange,
  tabCounts,
  jdSectionCounts,
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
      {/* ── Top Row: Title & Subtitle on Left, Top Pagination & User on Right ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-900/25 shrink-0"
            style={{ background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' }}
          >
            <Sparkles size={17} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-fg tracking-tight leading-tight">
            Active Leads Management
          </h1>
        </div>

        {/* ── Top Pagination & Sign Out ── */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
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

          <div className="ml-1 flex items-center gap-2 shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Controls Toolbar: Segmented Tabs on Left, Filters in Middle, Actions on Right ── */}
      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/40 overflow-x-auto no-scrollbar flex-nowrap">
        {/* Left Side: Segmented Tab Switcher (No emojis) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Left Side: Segmented Tab Switcher (White Card Pill with Blue & Green Accents) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-zinc-900/90 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs shrink-0 select-none">
            {/* Positives Tab */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onTabChange('pipeline');
              }}
              className={`flex items-center justify-center gap-2 px-3 py-1 text-xs transition-all duration-150 cursor-pointer select-none rounded-lg ${
                activeTab === 'pipeline'
                  ? 'bg-white dark:bg-zinc-800 border-2 border-blue-400 dark:border-blue-500 shadow-xs'
                  : 'border-2 border-transparent hover:bg-white/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className={`tracking-wide uppercase text-xs ${
                activeTab === 'pipeline'
                  ? 'text-blue-900 dark:text-blue-300 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
              }`}>
                Positives
              </span>
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md transition-colors duration-150 tabular-nums min-w-[20px] text-center ${
                  activeTab === 'pipeline'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold'
                }`}
              >
                {tabCounts.pipeline}
              </span>
            </button>

            {/* JD Received Tab */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onTabChange('jd_received');
              }}
              className={`flex items-center justify-center gap-2 px-3 py-1 text-xs transition-all duration-150 cursor-pointer select-none rounded-lg ${
                activeTab === 'jd_received'
                  ? 'bg-white dark:bg-zinc-800 border-2 border-emerald-500 dark:border-emerald-400 shadow-xs'
                  : 'border-2 border-transparent hover:bg-white/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className={`tracking-wide uppercase text-xs ${
                activeTab === 'jd_received'
                  ? 'text-emerald-800 dark:text-emerald-300 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
              }`}>
                JD Received
              </span>
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md transition-colors duration-150 tabular-nums min-w-[20px] text-center ${
                  activeTab === 'jd_received'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold'
                }`}
              >
                {tabCounts.jd_received}
              </span>
            </button>
          </div>

          <div className="h-5 w-px bg-border/60 shrink-0" />

          {/* Stage Dropdown — replaces the old 5-button sub-tab row (JD tab only) */}
          {activeTab === 'jd_received' && onSectionChange && (
            <>
              <StageDropdown
                value={selectedSection}
                counts={jdSectionCounts}
                fallbackTotal={tabCounts.jd_received}
                onChange={onSectionChange}
              />
              <div className="h-5 w-px bg-border/60 shrink-0" />
            </>
          )}

          {/* Search & Filters */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Search */}
            <div className="relative shrink-0 w-44 sm:w-56">
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
              allLabel="All Years"
              placeholder="Academic Year"
              className="w-[125px] sm:w-[130px] shrink-0"
            />

            {/* Smooth Month Filter (Only for In Pipeline tab) */}
            {activeTab === 'pipeline' && (
              <SmoothMonthDropdown
                value={selectedMonth}
                onChange={onMonthChange}
                allowAll
                allLabel="All Months"
                placeholder="Follow Up Month"
                className="w-[125px] sm:w-[130px] shrink-0"
              />
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons with Clean Divider */}
        <div className="flex items-center gap-2 shrink-0 ml-auto pl-2 border-l border-border/60">
          {/* Sync Button (Icon Only with Interactive Tooltip) */}
          <div className="relative group/sync shrink-0">
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncTracker}
              style={{ background: 'linear-gradient(180deg, #FFC53D 0%, #FF9500 50%, #FF5E00 100%)' }}
              className="w-8 h-8 disabled:opacity-50 text-white rounded-xl shadow-md shadow-orange-500/25 hover:brightness-110 transition-all flex items-center justify-center cursor-pointer active:scale-[0.992] shrink-0"
              title="Sync leads from Weekly Tracker (Pipeline & JD Received)"
              aria-label="Sync leads from Weekly Tracker"
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
                Sync leads from Weekly Tracker (Pipeline & JD Received)
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
              className="w-8 h-8 text-white rounded-xl transition-all shadow-md shadow-red-600/25 flex items-center justify-center cursor-pointer hover:brightness-110 active:scale-[0.95] shrink-0"
              style={{ background: 'linear-gradient(180deg, #E60000 0%, #C80000 50%, #990000 100%)' }}
              title="Delete mode — select and delete leads"
              aria-label="Delete leads"
            >
              <Trash2 size={14} strokeWidth={2.2} className="text-white shrink-0" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
              {/* Delete Selected Button */}
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={selectedCount === 0 || isDeletingSelected}
                className="h-8 px-2.5 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/25 flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-[0.95] whitespace-nowrap shrink-0"
                style={{ background: 'linear-gradient(180deg, #E60000 0%, #C80000 50%, #990000 100%)' }}
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
