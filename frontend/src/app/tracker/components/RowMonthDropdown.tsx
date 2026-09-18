'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
    const popoverHeight = 230;
    const popoverWidth = 190;
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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
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

  const handleSelect = (month: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onChange(month);
    setIsOpen(false);
    setCoords((prev) => ({ ...prev, ready: false }));
  };

  return (
    <div className="relative w-full text-left" onClick={(e) => e.stopPropagation()}>
      {/* ── Trigger Button ─────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 pl-3 pr-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all select-none shadow-2xs ${
          disabled
            ? 'bg-surface-sunken/40 border-border/40 text-fg-disabled/50 cursor-not-allowed'
            : value
            ? 'bg-warning-subtle/50 border-warning/70 text-warning-strong cursor-pointer active:scale-[0.992]'
            : 'bg-amber-500/10 border-amber-500/70 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 font-semibold cursor-pointer active:scale-[0.992]'
        } ${isOpen ? 'ring-2 ring-warning/30 border-warning' : ''}`}
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
              width: '190px',
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 flex flex-col gap-0.5 text-fg select-none max-h-[220px] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-in fade-in zoom-in-95 duration-150 ease-out"
          >
            <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1.5 tracking-wider border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] rounded-lg mb-1">
              Follow Up Month
            </div>
            {MONTHS.map((m) => {
              const isSelected = value === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={(e) => handleSelect(m, e)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-1.5 transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-warning/15 text-warning-strong font-bold shadow-2xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-fg'
                  }`}
                >
                  <span>{m}</span>
                  {isSelected && <Check size={12} className="text-warning-strong shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
