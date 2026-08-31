'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowRightLeft,
  Trophy,
  Rocket,
  Inbox,
  Star,
  XCircle,
  Clock,
  Check,
  ChevronDown,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export interface MoveSectionOption {
  key: string;
  label: string;
  Icon: React.ElementType;
  colorClass: string;
  activeBgClass: string;
}

export const WEEKLY_PIPELINE_SECTIONS: MoveSectionOption[] = [
  {
    key: 'completed',
    label: 'Companies Completed',
    Icon: Trophy,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    activeBgClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold',
  },
  {
    key: 'in_progress',
    label: 'Companies In Progress',
    Icon: Rocket,
    colorClass: 'text-blue-600 dark:text-blue-400',
    activeBgClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold',
  },
  {
    key: 'pipeline',
    label: 'Companies in Pipeline',
    Icon: Inbox,
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    activeBgClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold',
  },
  {
    key: 'top_companies',
    label: 'Top Companies',
    Icon: Star,
    colorClass: 'text-purple-600 dark:text-purple-400',
    activeBgClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold',
  },
  {
    key: 'rejected_by_hr',
    label: 'Rejected by HR',
    Icon: XCircle,
    colorClass: 'text-rose-600 dark:text-rose-400',
    activeBgClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold',
  },
  {
    key: 'on_hold_by_college',
    label: 'On Hold by College (TPO)',
    Icon: Clock,
    colorClass: 'text-orange-600 dark:text-orange-400',
    activeBgClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold',
  },
  {
    key: 'on_hold_by_hr',
    label: 'On Hold by HR',
    Icon: Clock,
    colorClass: 'text-slate-600 dark:text-slate-400',
    activeBgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold',
  },
];

interface Props {
  currentSection: string;
  companyName: string;
  onMoveSection: (targetSection: string) => Promise<void> | void;
  align?: 'left' | 'right';
}

export function MoveSectionDropdown({
  currentSection,
  companyName,
  onMoveSection,
  align = 'right',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Normalize current section key to match options
  const normalizedCurrent =
    currentSection === 'rejected_companies'
      ? 'rejected_by_hr'
      : currentSection === 'rejected_by_college'
      ? 'on_hold_by_college'
      : currentSection;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 310;
      const popoverWidth = 230;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

      let left = align === 'right' ? rect.right - popoverWidth : rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      if (left < 12) left = 12;

      setDropdownCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left,
        placeAbove,
      });
    }

    triggerHaptic('light');
    setIsOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = async (targetKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetKey === normalizedCurrent) {
      setIsOpen(false);
      return;
    }

    setIsMoving(true);
    triggerHaptic('selection');
    try {
      await onMoveSection(targetKey);
    } catch (err) {
      console.error('Failed to move company:', err);
    } finally {
      setIsMoving(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      {/* ── Bidirectional Arrow Trigger Button ─────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={isMoving}
        title={`Move ${companyName} to another section`}
        className="p-1.5 rounded-lg text-fg-subtle hover:text-primary hover:bg-primary/10 transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs active:scale-95 disabled:opacity-50"
      >
        <ArrowUpDown size={13} strokeWidth={2.25} className="shrink-0 text-primary" />
      </button>

      {/* ── Solid Minimal SaaS Popover Menu ────────────────────────────── */}
      {isOpen && dropdownCoords && (
        <div
          ref={menuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: dropdownCoords.placeAbove ? 'auto' : `${dropdownCoords.top}px`,
            bottom: dropdownCoords.placeAbove ? `${window.innerHeight - dropdownCoords.top}px` : 'auto',
            left: `${dropdownCoords.left}px`,
            width: '230px',
            zIndex: 9999,
          }}
          className="bg-surface border border-border rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 text-fg select-none overflow-hidden"
        >
          {/* Header ribbon */}
          <div className="px-3 py-1.5 border-b border-border bg-surface-sunken rounded-xl flex items-center justify-between text-[10.5px] font-bold text-fg-subtle uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft size={12} className="text-primary" /> Move Company To
            </span>
            <span className="text-[10px] font-mono text-fg-disabled">7 Sections</span>
          </div>

          {/* Section options */}
          <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
            {WEEKLY_PIPELINE_SECTIONS.map((sec) => {
              const isCurrent = sec.key === normalizedCurrent;
              const Icon = sec.Icon;

              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={(e) => handleSelect(sec.key, e)}
                  disabled={isMoving}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isCurrent
                      ? sec.activeBgClass
                      : 'hover:bg-surface-sunken text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={13} className={`shrink-0 ${sec.colorClass}`} />
                    <span className="truncate">{sec.label}</span>
                  </div>
                  {isCurrent ? (
                    <span className="text-[10px] uppercase font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20 shrink-0">
                      Current
                    </span>
                  ) : (
                    <ArrowRightLeft size={11} className="text-fg-disabled shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
