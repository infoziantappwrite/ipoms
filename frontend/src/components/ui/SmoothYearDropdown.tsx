'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, GraduationCap, X } from 'lucide-react';

export const YEAR_OPTIONS = [
  '2025',
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

/** Parses raw string into clean array of selected 4-digit years */
function parseSelectedYears(raw: string): string[] {
  if (!raw || raw === 'all') return [];
  // Match all 4-digit years like 2025, 2026, 2027
  const matches = raw.match(/\b(20\d{2})\b/g);
  if (!matches) return [];
  // Deduplicate and sort numerically
  const unique = Array.from(new Set(matches));
  return unique.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

export function SmoothYearDropdown({
  value,
  onChange,
  disabled = false,
  allowAll = false,
  allLabel = 'Year',
  placeholder = 'Batch',
  className = '',
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

  const selectedYears = parseSelectedYears(value);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 280;
    const popoverWidth = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
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
  }, []);

  const handleToggle = () => {
    if (disabled) return;
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

  // Toggle year selection for multiple year support
  const handleToggleYear = (year: string) => {
    if (allowAll) {
      onChange(year);
      setIsOpen(false);
      return;
    }
    let nextList: string[];
    if (selectedYears.includes(year)) {
      nextList = selectedYears.filter((y) => y !== year);
    } else {
      nextList = [...selectedYears, year].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }
    const formatted = nextList.join(', ');
    onChange(formatted);
  };

  // Format trigger display: Just clean year numbers
  const displayLabel =
    value === 'all'
      ? allLabel
      : selectedYears.length > 0
      ? selectedYears.join(', ')
      : placeholder;

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        title={selectedYears.length > 0 ? `Batch: ${selectedYears.join(', ')}` : placeholder}
        className="inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-surface hover:bg-surface-raised text-fg border border-border transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 select-none whitespace-nowrap min-w-[100px] max-w-[160px]"
      >
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <GraduationCap size={13} className="text-primary dark:text-sky-400 shrink-0" />
          <span className="font-mono truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`ml-1 opacity-70 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Portal Popover (Multi-Select Support) */}
      {isOpen &&
        coords.ready &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.placement === 'top' ? 'auto' : `${coords.top}px`,
              bottom:
                coords.placement === 'top'
                  ? `${window.innerHeight - coords.top}px`
                  : 'auto',
              left: `${coords.left}px`,
              zIndex: 99999,
              width: '210px',
            }}
            className="rounded-2xl bg-surface border border-border shadow-2xl p-2 max-h-72 flex flex-col text-fg no-scrollbar animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-border/60 mb-1.5">
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                Select Batch Years
              </span>
              {selectedYears.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable Year Options */}
            <div className="overflow-y-auto max-h-48 space-y-0.5 no-scrollbar pr-0.5">
              {allowAll && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('all');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                    value === 'all'
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                  }`}
                >
                  <span>{allLabel}</span>
                  {value === 'all' && <Check size={14} className="text-primary shrink-0" />}
                </button>
              )}

              {YEAR_OPTIONS.map((yr) => {
                const isSelected = selectedYears.includes(yr);
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleToggleYear(yr)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left group ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold">{yr}</span>
                    <div
                      className={`w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all shadow-xs shrink-0 ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground ring-2 ring-primary/25'
                          : 'border-slate-500 dark:border-slate-400 bg-white dark:bg-slate-900 group-hover:border-primary dark:group-hover:border-primary'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3.5} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer / Done Button */}
            <div className="pt-2 mt-1.5 border-t border-border/60 flex items-center justify-between gap-1.5">
              <span className="text-[10px] text-fg-subtle font-mono">
                {selectedYears.length === 0
                  ? 'None selected'
                  : `${selectedYears.length} year${selectedYears.length > 1 ? 's' : ''}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setCoords((prev) => ({ ...prev, ready: false }));
                }}
                className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
