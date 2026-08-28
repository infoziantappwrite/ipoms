'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2, Layers } from 'lucide-react';

export interface IndustryOption {
  id: string;
  label: string;
  dotColor?: string;
}

export const COMPANY_INDUSTRIES: IndustryOption[] = [
  { id: 'all', label: 'All Industries', dotColor: 'bg-primary' },
  { id: 'software', label: 'Software', dotColor: 'bg-blue-500' },
  { id: 'ai', label: 'AI & Data', dotColor: 'bg-indigo-500' },
  { id: 'bpo', label: 'BPO / BPM', dotColor: 'bg-purple-500' },
  { id: 'banking', label: 'Banking', dotColor: 'bg-emerald-500' },
  { id: 'education', label: 'Education', dotColor: 'bg-amber-500' },
  { id: 'finance', label: 'Finance', dotColor: 'bg-teal-500' },
  { id: 'core_engineering', label: 'Core Engineering', dotColor: 'bg-orange-500' },
  { id: 'product', label: 'Product', dotColor: 'bg-sky-500' },
  { id: 'consulting', label: 'Consulting', dotColor: 'bg-rose-500' },
  { id: 'other', label: 'Other', dotColor: 'bg-slate-400' },
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

export function SmoothIndustryDropdown({
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
    COMPANY_INDUSTRIES.find((o) => o.id === value) || COMPANY_INDUSTRIES[0];

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* ── Trigger Button (Smooth Pill Style) ─────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer select-none min-w-[150px] ${
          value !== 'all'
            ? 'bg-blue-50/90 dark:bg-sky-950/60 border-blue-300 dark:border-sky-500/50 text-blue-900 dark:text-sky-200 ring-1 ring-blue-400/30 dark:ring-sky-400/30'
            : 'bg-surface border-border text-fg hover:bg-surface-raised'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${currentOption.dotColor || 'bg-primary'} ring-1 ring-black/10 dark:ring-white/20`}
          />
          <span className="truncate">{currentOption.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`${value !== 'all' ? 'text-blue-700 dark:text-sky-400' : 'text-fg-subtle'} shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Smooth Dropdown Popover ───────────────────────────────────── */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-60 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-fg select-none`}
        >
          {/* Header ribbon */}
          <div className="px-3.5 py-2.5 border-b border-border bg-surface-sunken flex items-center justify-between text-micro font-bold text-fg-subtle uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Layers size={12} className="text-primary" /> Filter by Industry
            </span>
            <span className="font-mono text-[10px] text-fg-disabled">{COMPANY_INDUSTRIES.length}</span>
          </div>

          {/* Industry Options List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar bg-surface divide-y divide-border/30">
            {COMPANY_INDUSTRIES.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-sky-950/70 text-blue-950 dark:text-sky-200 font-bold shadow-2xs'
                      : 'hover:bg-surface-raised text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${opt.dotColor || 'bg-primary'} ring-1 ring-black/10 dark:ring-white/20 ${
                        isSelected ? 'ring-2 ring-primary/60' : ''
                      }`}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-blue-700 dark:text-sky-400 shrink-0" />
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
