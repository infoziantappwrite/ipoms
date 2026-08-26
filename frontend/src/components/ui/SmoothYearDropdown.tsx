'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, GraduationCap } from 'lucide-react';

export const YEAR_OPTIONS = [
  '2026',
  '2027',
  '2028',
  '2029',
  '2030',
  '2031',
  '2032',
  '2033',
  '2034',
  '2035',
] as const;

interface Props {
  value: string;
  onChange: (year: string) => void;
  disabled?: boolean;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  className?: string;
}

export function SmoothYearDropdown({
  value,
  onChange,
  disabled = false,
  allowAll = false,
  allLabel = 'Select Year',
  placeholder = 'Select Year',
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

  const displayLabel =
    value === 'all' || !value
      ? allowAll
        ? allLabel
        : placeholder
      : `${value} Graduating`;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-surface hover:bg-surface-raised text-fg border border-border transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 select-none whitespace-nowrap w-full"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <GraduationCap size={13} className="text-primary dark:text-sky-400 shrink-0" />
          <span className="font-mono whitespace-nowrap">{displayLabel}</span>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`ml-1 opacity-70 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Smooth Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl bg-surface border border-border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto text-fg no-scrollbar">
          <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1 tracking-wider sticky top-0 bg-surface/95 backdrop-blur-xs border-b border-border/40 mb-1">
            Academic Year
          </div>

          {allowAll && (
            <button
              type="button"
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                value === 'all'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
              }`}
            >
              <span>{allLabel}</span>
              {value === 'all' && <Check size={14} className="text-primary shrink-0 ml-1.5" />}
            </button>
          )}

          {YEAR_OPTIONS.map((yr) => {
            const isSelected = value === yr;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  onChange(yr);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                }`}
              >
                <span className="font-mono">{yr} Graduating</span>
                {isSelected && <Check size={14} className="text-primary shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
