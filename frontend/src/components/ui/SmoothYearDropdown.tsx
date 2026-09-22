'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, GraduationCap } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export const YEAR_OPTIONS = [
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
  const matches = raw.match(/\b(20\d{2})\b/g);
  if (!matches) return [];
  const unique = Array.from(new Set(matches));
  return unique.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

export function SmoothYearDropdown({
  value,
  onChange,
  disabled = false,
  allowAll = false,
  allLabel = 'All Years',
  placeholder = 'Academic Year',
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
    const popoverHeight = 240;
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
    triggerHaptic('selection');
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

  const isAll = value === 'all' || (!value && allowAll);
  const isSelected = Boolean(selectedYears.length > 0 && !isAll);

  // Format trigger display: Clean year numbers or clear naming conventions
  const displayLabel = isAll
    ? (allLabel || 'All Years')
    : selectedYears.length > 0
    ? selectedYears.join(', ')
    : placeholder || 'Academic Year';

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        title={selectedYears.length > 0 ? `Batch: ${selectedYears.join(', ')}` : displayLabel}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.992] disabled:opacity-50 select-none whitespace-nowrap w-full min-w-0 ${
          isSelected
            ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-500/15'
            : 'bg-surface hover:bg-surface-raised text-fg border-border'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500/50' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <GraduationCap
            size={13.5}
            className={`shrink-0 ${
              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-primary'
            }`}
          />
          <span
            className={`truncate ${
              isSelected ? 'font-mono font-bold' : 'font-medium'
            }`}
          >
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={`ml-0.5 text-fg-subtle transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
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
              width: '215px',
            }}
            className="rounded-xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-2 flex flex-col text-fg animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] rounded-lg mb-1.5">
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                Select Batch Years
              </span>
              {selectedYears.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onChange('');
                  }}
                  className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable Year Options */}
            <div className="overflow-y-auto max-h-[194px] space-y-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5">
              {allowAll && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    onChange('all');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                    value === 'all'
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-fg hover:bg-surface-raised'
                  }`}
                >
                  <span>{allLabel}</span>
                  {value === 'all' && <Check size={14} strokeWidth={2.5} className="text-primary shrink-0" />}
                </button>
              )}

              {YEAR_OPTIONS.map((yr) => {
                const isSelected = selectedYears.includes(yr);
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleToggleYear(yr)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left select-none group ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'text-fg hover:bg-surface-raised'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold">{yr}</span>
                    <div
                      className={`w-[17px] h-[17px] min-w-[17px] min-h-[17px] rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground ring-1 ring-primary/30'
                          : 'border-border bg-surface-sunken group-hover:border-primary/50'
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3.5} className="text-primary-foreground" />}
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
                  : `${selectedYears.length} batch${selectedYears.length > 1 ? 'es' : ''}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsOpen(false);
                  setCoords((prev) => ({ ...prev, ready: false }));
                }}
                className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold shadow-xs transition-colors cursor-pointer active:scale-[0.992]"
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
