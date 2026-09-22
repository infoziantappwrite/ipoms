'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Filter } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export type CallOutcome =
  | 'jd_received'
  | 'hiring'
  | 'drive_completed'
  | 'invite_mail'
  | 'in_connect'
  | 'follow_up'
  | 'call_back'
  | 'hiring_completed'
  | 'hiring_freezed'
  | 'not_hiring'
  | 'no_response'
  | 'invalid';

export interface OutcomeOption {
  value: CallOutcome | 'all';
  label: string;
  dotColor: string;
  badgeClass?: string;
  category?: string;
}

export const CALL_OUTCOME_OPTIONS: OutcomeOption[] = [
  { value: 'all', label: 'All Call Statuses', dotColor: 'bg-primary' },
  { value: 'invite_mail', label: 'Invite Mail', dotColor: 'bg-sky-500', category: 'Positive' },
  { value: 'jd_received', label: 'JD Received', dotColor: 'bg-blue-500', category: 'JD Received' },
  { value: 'hiring', label: 'Hiring', dotColor: 'bg-emerald-500', category: 'Hiring' },
  { value: 'drive_completed', label: 'Drive Completed', dotColor: 'bg-emerald-500', category: 'Conducted' },
  { value: 'in_connect', label: 'In Connect', dotColor: 'bg-indigo-500', category: 'Neutral' },
  { value: 'follow_up', label: 'Follow Up', dotColor: 'bg-amber-500', category: 'Action Req' },
  { value: 'call_back', label: 'Call Back', dotColor: 'bg-amber-500', category: 'Action Req' },
  { value: 'hiring_completed', label: 'Hiring Completed', dotColor: 'bg-cyan-500', category: 'Completed' },
  { value: 'hiring_freezed', label: 'Hiring Freezed', dotColor: 'bg-orange-500', category: 'Paused' },
  { value: 'not_hiring', label: 'Not Hiring', dotColor: 'bg-rose-500', category: 'Closed' },
  { value: 'no_response', label: 'No Response', dotColor: 'bg-rose-500', category: 'No Ans' },
  { value: 'invalid', label: 'Invalid', dotColor: 'bg-slate-500', category: 'Invalid' },
];

interface Props {
  value: CallOutcome | 'all';
  onChange: (val: CallOutcome | 'all') => void;
  className?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

export function SmoothOutcomeDropdown({
  value,
  onChange,
  className = '',
  align = 'left',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    ready: boolean;
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    ready: false,
  });

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 240;
    const popoverWidth = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = align === 'right' ? rect.right - popoverWidth : rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    return {
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left,
      placement: placeAbove ? ('top' as const) : ('bottom' as const),
      ready: true,
    };
  }, [align]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (isOpen) {
      setIsOpen(false);
      setCoords((prev) => ({ ...prev, ready: false }));
      return;
    }
    const initialCoords = calculateCoords();
    if (initialCoords) {
      setCoords(initialCoords);
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => {
      const newCoords = calculateCoords();
      if (newCoords) setCoords(newCoords);
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, calculateCoords]);

  const currentOption =
    CALL_OUTCOME_OPTIONS.find((o) => o.value === value) || CALL_OUTCOME_OPTIONS[0];

  const handleSelect = (val: CallOutcome | 'all', e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onChange(val);
    setIsOpen(false);
    setCoords((prev) => ({ ...prev, ready: false }));
  };

  return (
    <div className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* ── Trigger Button (Smooth Pill Style) ─────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-[0.992] shadow-xs cursor-pointer select-none ${
          value !== 'all'
            ? 'bg-surface-raised border-primary/40 text-fg ring-1 ring-primary/20'
            : 'bg-surface border-border text-fg hover:bg-surface-raised'
        } ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentOption.dotColor} ring-1 ring-black/10 dark:ring-white/20`}
          />
          <span className="truncate tracking-tight">{currentOption.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-fg-subtle shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* ── 100% Solid SaaS Dropdown Popover via Portal ───────────────────────── */}
      {isOpen &&
        coords.ready &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placement === 'top' ? 'auto' : `${coords.top}px`,
              bottom:
                coords.placement === 'top'
                  ? `${window.innerHeight - coords.top}px`
                  : 'auto',
              left: `${coords.left}px`,
              width: '260px',
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ease-out text-fg select-none"
          >
            {/* Header ribbon */}
            <div className="px-3.5 py-2 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] flex items-center justify-between text-micro font-bold text-fg-subtle uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Filter size={12} className="text-primary" /> Filter By Call Status
              </span>
              <span className="font-mono tabular-nums text-[10px] text-fg-disabled">{CALL_OUTCOME_OPTIONS.length}</span>
            </div>

            {/* Status List */}
            <div className="max-h-[194px] overflow-y-auto p-1.5 space-y-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white dark:bg-[#161D2E] divide-y divide-border/30">
              {CALL_OUTCOME_OPTIONS.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => handleSelect(opt.value, e)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dotColor} ring-1 ring-black/10 dark:ring-white/20 ${
                          isSelected ? 'ring-2 ring-primary/50' : ''
                        }`}
                      />
                      <span className="truncate">{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-border/60 text-fg-subtle font-medium">
                          {opt.category}
                        </span>
                      )}
                      {isSelected && <Check size={14} strokeWidth={2.5} className="text-primary shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
