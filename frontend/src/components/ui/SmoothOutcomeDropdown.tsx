'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Filter } from 'lucide-react';
import { CallOutcome } from '@/types/tracker';
import { triggerHaptic } from '@/lib/haptics';

export interface OutcomeOption {
  value: CallOutcome | 'all';
  label: string;
  dotColor: string;
  badgeClass?: string;
  category?: string;
}

export const CALL_OUTCOME_OPTIONS: OutcomeOption[] = [
  { value: 'all', label: 'All Call Statuses', dotColor: 'bg-primary' },
  { value: 'jd_received', label: 'JD Received', dotColor: 'bg-blue-500', category: 'Positive' },
  { value: 'hiring', label: 'Hiring', dotColor: 'bg-emerald-500', category: 'Positive' },
  { value: 'drive_completed', label: 'Drive Completed', dotColor: 'bg-emerald-500', category: 'Positive' },
  { value: 'invite_mail', label: 'Invite Mail', dotColor: 'bg-sky-500', category: 'Positive' },
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentOption =
    CALL_OUTCOME_OPTIONS.find((o) => o.value === value) || CALL_OUTCOME_OPTIONS[0];

  const handleSelect = (val: CallOutcome | 'all') => {
    triggerHaptic('selection');
    onChange(val);
    setIsOpen(false);
  };

  const handleToggle = () => {
    triggerHaptic('light');
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* ── Trigger Button (Smooth Pill Style) ─────────────────────────── */}
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer select-none ${
          value !== 'all'
            ? 'bg-surface-raised border-primary/40 text-fg ring-1 ring-primary/20'
            : 'bg-surface border-border text-fg hover:bg-surface-raised'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentOption.dotColor} ${
              value !== 'all' ? 'shadow-[0_0_8px_currentColor] animate-pulse' : ''
            }`}
          />
          <span className="truncate tracking-tight">{currentOption.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-fg-subtle shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Origin-Anchored Dropdown Popover ───────────────────────────── */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          } mt-1.5 w-64 bg-surface/98 backdrop-blur-md border border-border rounded-2xl shadow-3 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-fg select-none`}
        >
          {/* Header ribbon */}
          <div className="px-3.5 py-2.5 border-b border-border bg-surface-sunken/80 flex items-center justify-between text-micro font-bold text-fg-subtle uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Filter size={12} className="text-primary" /> Filter By Call Status
            </span>
            <span className="font-mono tabular-nums text-[10px] text-fg-disabled">{CALL_OUTCOME_OPTIONS.length} statuses</span>
          </div>

          {/* Status List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar bg-surface divide-y divide-border/30">
            {CALL_OUTCOME_OPTIONS.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-all active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                      : 'hover:bg-surface-raised text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dotColor} ${
                        isSelected ? 'ring-2 ring-primary/40' : ''
                      }`}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {opt.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-sunken border border-border text-fg-subtle font-medium">
                        {opt.category}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

