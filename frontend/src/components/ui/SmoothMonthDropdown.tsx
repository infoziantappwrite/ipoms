'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Calendar } from 'lucide-react';

export const MONTHS_LIST = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type MonthOption = (typeof MONTHS_LIST)[number] | '';

interface Props {
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  className?: string;
}

export function SmoothMonthDropdown({
  value,
  onChange,
  disabled = false,
  allowAll = false,
  allLabel = 'All Followup Months',
  placeholder = 'Select Month',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  if (disabled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-fg-disabled bg-surface-sunken/60 border border-border/40 opacity-60 cursor-not-allowed select-none">
        <span>—</span>
      </div>
    );
  }

  const isAll = value === 'all' || (!value && allowAll);
  const displayLabel = isAll ? allLabel : value || placeholder;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-raised text-fg border border-border transition-all cursor-pointer shadow-2xs active:scale-95 select-none whitespace-nowrap w-full"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <Calendar size={13} className="text-amber-500 shrink-0" />
          <span className="whitespace-nowrap">{displayLabel}</span>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`ml-1 opacity-70 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Smooth Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl bg-surface border border-border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto text-fg no-scrollbar">
          <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1 tracking-wider sticky top-0 bg-surface/95 backdrop-blur-xs border-b border-border/40 mb-1">
            Followup Month
          </div>

          {allowAll && (
            <button
              type="button"
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                isAll
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
              }`}
            >
              <span>{allLabel}</span>
              {isAll && <Check size={14} className="text-primary shrink-0 ml-1" />}
            </button>
          )}

          {MONTHS_LIST.map((m) => {
            const isSelected = value === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(m);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                }`}
              >
                <span>{m}</span>
                {isSelected && <Check size={14} className="text-primary shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
