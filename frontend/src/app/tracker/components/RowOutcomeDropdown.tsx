'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { CallOutcome } from '../page';
import { triggerHaptic } from '@/lib/haptics';

export interface RowOutcomeOption {
  value: CallOutcome;
  label: string;
  dotColor: string;
  textColor: string;
}

export const ROW_OUTCOMES: RowOutcomeOption[] = [
  { value: 'jd_received', label: 'JD Received', dotColor: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  { value: 'hiring', label: 'Hiring', dotColor: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'drive_completed', label: 'Drive Completed', dotColor: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'invite_mail', label: 'Invite Mail', dotColor: 'bg-sky-500', textColor: 'text-sky-600 dark:text-sky-400' },
  { value: 'in_connect', label: 'In Connect', dotColor: 'bg-indigo-500', textColor: 'text-indigo-600 dark:text-indigo-400' },
  { value: 'follow_up', label: 'Follow Up', dotColor: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400 font-semibold' },
  { value: 'call_back', label: 'Call Back', dotColor: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
  { value: 'hiring_completed', label: 'Hiring Completed', dotColor: 'bg-cyan-500', textColor: 'text-cyan-600 dark:text-cyan-400' },
  { value: 'hiring_freezed', label: 'Hiring Freezed', dotColor: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' },
  { value: 'not_hiring', label: 'Not Hiring', dotColor: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400 font-semibold' },
  { value: 'no_response', label: 'No Response', dotColor: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400' },
  { value: 'invalid', label: 'Invalid', dotColor: 'bg-slate-500', textColor: 'text-slate-400 dark:text-slate-500' },
];

interface Props {
  value?: CallOutcome | null;
  onChange: (val: string) => void;
  disabled?: boolean;
  placement?: 'bottom' | 'top';
}

export function RowOutcomeDropdown({ value, onChange, disabled = false, placement = 'bottom' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentOption = ROW_OUTCOMES.find((o) => o.value === value);

  const handleSelect = (val: string) => {
    triggerHaptic('selection');
    onChange(val);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    triggerHaptic('light');
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      {/* ── Trigger Button (Smooth Row Pill) ─────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-1.5 pl-2.5 pr-2 py-1 rounded-xl border text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer select-none shadow-2xs ${
          currentOption
            ? 'bg-surface border-border-strong text-fg hover:border-primary/40'
            : 'bg-surface/80 border-border text-fg-subtle hover:border-border-strong hover:text-fg'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {currentOption ? (
            <>
              <span className={`w-2 h-2 rounded-full shrink-0 ${currentOption.dotColor} ring-1 ring-black/5 dark:ring-white/10`} />
              <span className={`truncate text-xs ${currentOption.textColor}`}>
                {currentOption.label}
              </span>
            </>
          ) : (
            <span className="truncate text-xs text-fg-subtle">
              — Status —
            </span>
          )}
        </div>
        <ChevronDown
          size={12}
          className={`text-fg-subtle shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* ── Smooth Dropdown Popover ───────────────────────────────────── */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${
            placement === 'top'
              ? 'left-0 bottom-full mb-1 origin-bottom-left'
              : 'left-0 top-full mt-1 origin-top-left'
          } w-52 bg-surface/98 backdrop-blur-md border border-border rounded-2xl shadow-2xl z-[100] p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-fg select-none max-h-64 overflow-y-auto custom-scrollbar`}
        >
          {ROW_OUTCOMES.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected
                    ? 'bg-primary/15 font-bold shadow-2xs'
                    : 'hover:bg-surface-raised text-fg'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                  <span className={`truncate ${opt.textColor}`}>
                    {opt.label}
                  </span>
                </div>
                {isSelected && <Check size={13} className="text-primary shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
