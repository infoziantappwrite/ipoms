'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Upload,
  Save,
  Trash2,
  Plus,
  CalendarDays,
  Copy,
  Layers,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import type { KpiData, TrackerRow, CallOutcome } from '../page';

interface Props {
  selectedCollegeId: string;
  isReadOnly?: boolean;
  selectedCount?: number;
  kpi?: KpiData | null;
  rows?: TrackerRow[];
  onLoadContacts: () => void;
  onSaveProgress: () => void;
  onAddManualRow: () => void;
  onOpenHistory: () => void;
  onCopyAll: () => void;
  onCopyBoth: () => void;
  onCopyEntireRows: () => void;
  onFilterOutcome?: (outcome: CallOutcome | 'all') => void;
  onOpenSummary?: () => void;
}

export function TrackerActionsDropdown({
  selectedCollegeId,
  isReadOnly = false,
  selectedCount = 0,
  kpi = null,
  rows = [],
  onLoadContacts,
  onSaveProgress,
  onAddManualRow,
  onOpenHistory,
  onCopyAll,
  onCopyBoth,
  onCopyEntireRows,
  onFilterOutcome,
  onOpenSummary,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'copy' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const executeAction = useCallback(
    (actionFn: () => void) => {
      triggerHaptic('selection');
      setIsOpen(false);
      setActiveSubmenu(null);
      actionFn();
    },
    []
  );

  const handleSubmenuMouseEnter = (menu: 'copy') => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
    setActiveSubmenu(menu);
  };

  const handleSubmenuMouseLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={containerRef}>
      {/* ── 3 Vertical Dots Trigger Button ── */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setIsOpen((prev) => !prev);
          setActiveSubmenu(null);
        }}
        disabled={!selectedCollegeId}
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 ${
          isOpen
            ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30'
            : 'bg-surface hover:bg-surface-sunken border border-border text-fg-subtle hover:text-fg shadow-2xs'
        } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.95]`}
        title="Actions & Settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreVertical size={16} strokeWidth={2.2} />
      </button>

      {/* ── Compact Solid Dropdown Menu (Anchored to Right Corner) ── */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-surface border border-border shadow-2xl z-50 p-1 animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-border/60 text-fg">
          {/* Section 1: Main Operations */}
          {!isReadOnly && (
            <div className="p-0.5 space-y-0.5">
              <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
                Sheet Operations
              </div>

              {/* Load Contacts */}
              <button
                type="button"
                onClick={() => executeAction(onLoadContacts)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Upload size={12} strokeWidth={2.5} />
                  </div>
                  <span>Load Contacts</span>
                </div>
                <kbd className="text-[9px] font-mono text-fg-subtle bg-surface-sunken border border-border px-1 py-0.2 rounded">
                  Shift+L
                </kbd>
              </button>

              {/* Save Progress */}
              <button
                type="button"
                onClick={() => executeAction(onSaveProgress)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Save size={12} strokeWidth={2.5} />
                  </div>
                  <span>Save Progress</span>
                </div>
                <kbd className="text-[9px] font-mono text-fg-subtle bg-surface-sunken border border-border px-1 py-0.2 rounded">
                  Ctrl+S
                </kbd>
              </button>

              {/* Add Custom Entry */}
              <button
                type="button"
                onClick={() => executeAction(onAddManualRow)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Plus size={12} strokeWidth={2.5} />
                  </div>
                  <span>Add Manual Entry</span>
                </div>
                <kbd className="text-[9px] font-mono text-fg-subtle bg-surface-sunken border border-border px-1 py-0.2 rounded">
                  Shift+A
                </kbd>
              </button>

              {/* View History */}
              <button
                type="button"
                onClick={() => executeAction(onOpenHistory)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-zinc-500/10 hover:text-fg transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <CalendarDays size={12} strokeWidth={2.2} />
                  </div>
                  <span>Call History Archive</span>
                </div>
                <kbd className="text-[9px] font-mono text-fg-subtle bg-surface-sunken border border-border px-1 py-0.2 rounded">
                  Shift+H
                </kbd>
              </button>

              {/* ── Summary Option (Opens in-app popup modal directly) ── */}
              {onOpenSummary && (
                <button
                  type="button"
                  onClick={() => executeAction(onOpenSummary)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-fg hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <BarChart3 size={12} strokeWidth={2.2} />
                    </div>
                    <span>Summary</span>
                  </div>
                  <kbd className="text-[9px] font-mono text-fg-subtle bg-surface-sunken border border-border px-1 py-0.2 rounded">
                    Shift+S
                  </kbd>
                </button>
              )}
            </div>
          )}

          {/* Section 2: Selective Copy Tools */}
          <div className="p-0.5 space-y-0.5">
            <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-subtle flex items-center justify-between">
              <span>Copy Tools</span>
              {selectedCount > 0 && (
                <span className="text-primary font-semibold lowercase">
                  {selectedCount} selected
                </span>
              )}
            </div>

            {/* Copy Sub-menu Trigger Item */}
            <div
              onMouseEnter={() => handleSubmenuMouseEnter('copy')}
              onMouseLeave={handleSubmenuMouseLeave}
              className="relative"
            >
              <button
                type="button"
                onClick={() => setActiveSubmenu((prev) => (prev === 'copy' ? null : 'copy'))}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer group ${
                  activeSubmenu === 'copy'
                    ? 'bg-primary/10 text-primary'
                    : 'text-fg hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Copy size={12} strokeWidth={2.2} />
                  </div>
                  <span>Copy Selection</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-fg-subtle">
                    {selectedCount > 0 ? `(${selectedCount})` : ''}
                  </span>
                  <ChevronLeft size={12} strokeWidth={2.5} className="text-fg-subtle" />
                </div>
              </button>

              {/* ── Sub-menu Popover (Bottom-aligned, flies out to the left) ── */}
              {activeSubmenu === 'copy' && (
                <div
                  onMouseEnter={() => handleSubmenuMouseEnter('copy')}
                  onMouseLeave={handleSubmenuMouseLeave}
                  className="absolute right-full bottom-0 mr-1.5 w-64 rounded-xl bg-surface border border-border shadow-2xl z-50 p-1 space-y-0.5 animate-in fade-in slide-in-from-right-1 duration-150 text-fg"
                >
                  <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-fg-subtle flex items-center justify-between">
                    <span>Copy Options</span>
                    {selectedCount > 0 && (
                      <span className="text-primary font-semibold lowercase">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>

                  {/* 1. Copy Both (Mobile & Email) - Purple */}
                  <button
                    type="button"
                    onClick={() => executeAction(onCopyBoth)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <Copy size={11} strokeWidth={2.2} />
                      </div>
                      <span>Copy Both</span>
                    </div>
                    <span className="text-[9.5px] font-medium text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/70 px-1.5 py-0.2 rounded border border-purple-300/60 dark:border-purple-800/50 shrink-0">
                      {selectedCount > 0 ? `(${selectedCount})` : 'Mobile + Email'}
                    </span>
                  </button>

                  {/* 2. Copy Entire Selected Rows (Ctrl+C) - Pink/Rose */}
                  <button
                    type="button"
                    onClick={() => executeAction(onCopyEntireRows)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold rounded-lg text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <FileSpreadsheet size={11} strokeWidth={2.2} />
                      </div>
                      <span>Copy Row(s)</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-pink-700 dark:text-pink-300 bg-pink-100/70 dark:bg-pink-950/70 border border-pink-300/80 dark:border-pink-700/60 px-1 py-0.2 rounded">
                      Ctrl+C
                    </kbd>
                  </button>

                  {/* 3. Copy All Rows (Ctrl+A) - Orange/Peach */}
                  <button
                    type="button"
                    onClick={() => executeAction(onCopyAll)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold rounded-lg text-orange-800 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <Layers size={11} strokeWidth={2.5} />
                      </div>
                      <span>Copy All Rows</span>
                    </div>
                    <kbd className="text-[9px] font-mono text-orange-700 dark:text-orange-300 bg-orange-100/70 dark:bg-orange-950/70 border border-orange-300/80 dark:border-orange-700/60 px-1 py-0.2 rounded">
                      Ctrl+A
                    </kbd>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
