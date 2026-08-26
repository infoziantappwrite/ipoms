'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, Check } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface Props {
  value?: string | null;
  onChange: (month: string) => void;
  disabled?: boolean;
}

export function RowMonthDropdown({ value, onChange, disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (month: string) => {
    triggerHaptic('selection');
    onChange(month);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    triggerHaptic('light');
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      {/* ── Trigger Button ─────────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 pl-3 pr-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all select-none shadow-2xs ${
          disabled
            ? 'bg-surface-sunken/40 border-border/40 text-fg-disabled/50 cursor-not-allowed'
            : value
            ? 'bg-warning-subtle/50 border-warning/70 text-warning-strong cursor-pointer active:scale-[0.98]'
            : 'bg-amber-500/10 border-amber-500/70 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 font-semibold cursor-pointer active:scale-[0.98]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar size={12} className={disabled ? 'text-fg-disabled/40 shrink-0' : 'text-warning-strong shrink-0'} />
          <span className="truncate text-xs">
            {disabled ? '—' : (value || 'Select Month *')}
          </span>
        </div>
        <ChevronDown
          size={12}
          className={`text-fg-subtle shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            disabled ? 'opacity-20' : isOpen ? 'rotate-180 text-warning' : ''
          }`}
        />
      </button>

      {/* ── Smooth Dropdown Popover ───────────────────────────────────── */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1 w-44 bg-surface/98 backdrop-blur-md border border-border rounded-2xl shadow-3 z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-fg select-none origin-top-left max-h-56 overflow-y-auto custom-scrollbar"
        >
          <div className="text-[10px] font-bold text-fg-subtle uppercase px-2 py-1 tracking-wider border-b border-border/40 mb-0.5">
            Follow Up Month
          </div>
          {MONTHS.map((m) => {
            const isSelected = value === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelect(m)}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected
                    ? 'bg-warning/15 text-warning-strong font-bold shadow-2xs'
                    : 'hover:bg-surface-raised text-fg'
                }`}
              >
                <span>{m}</span>
                {isSelected && <Check size={12} className="text-warning-strong shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
