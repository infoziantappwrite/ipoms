'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Calendar } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

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
  allLabel = 'Follow Up Month',
  placeholder = 'Follow Up Month',
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

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 250;
    const popoverWidth = Math.max(rect.width, 185);
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

  if (disabled) {
    return (
      <div
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40 opacity-60 cursor-not-allowed select-none ${className}`}
        title="Status must be 'Follow Up' to select a month"
      >
        <div className="flex items-center gap-1.5 shrink-0 truncate">
          <Calendar size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span className="truncate">{placeholder || 'Pick Month'}</span>
        </div>
        <ChevronDown size={13} strokeWidth={2.2} className="ml-0.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
      </div>
    );
  }

  const isAll = value === 'all' || (!value && allowAll);
  const isSelected = Boolean(value && value !== 'all');
  const displayLabel = isAll ? (allLabel || placeholder) : value || placeholder;

  return (
    <div className={`relative inline-block text-left ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.992] select-none whitespace-nowrap w-full min-w-0 ${
          isSelected
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-500/15'
            : 'bg-surface hover:bg-surface-raised text-fg border-border'
        } ${isOpen ? 'ring-2 ring-amber-500/20 border-amber-500/50' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Calendar size={13} className="text-amber-500 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={`ml-0.5 text-fg-subtle transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${isOpen ? 'rotate-180 text-amber-500' : ''}`}
        />
      </button>

      {/* Portal Popover (100% Solid SaaS Opaque Theme, Never clipped by table rows or overflow) */}
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
              zIndex: 99999,
              width: '196px',
            }}
            className="rounded-xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-2 flex flex-col text-fg animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            {/* Solid Non-Scrolling Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] rounded-lg mb-1.5 shrink-0">
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                Followup Month
              </span>
              {value && value !== 'all' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onChange(allowAll ? 'all' : '');
                    setIsOpen(false);
                  }}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable Month Options starting directly from January */}
            <div className="overflow-y-auto max-h-[190px] space-y-0.5 pr-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {MONTHS_LIST.map((month) => {
                const isCurrentSelected = value === month;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('selection');
                      onChange(month);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left select-none ${
                      isCurrentSelected
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
                        : 'text-fg hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{month}</span>
                    {isCurrentSelected && (
                      <Check size={14} strokeWidth={2.5} className="text-amber-600 dark:text-amber-400 shrink-0 ml-1" />
                    )}
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
