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
  placeholder = 'Select Month',
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
    const popoverHeight = 270;
    const popoverWidth = Math.max(rect.width, 192);
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
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-fg-disabled bg-surface-sunken/60 border border-border/40 opacity-60 cursor-not-allowed select-none">
        <span>—</span>
      </div>
    );
  }

  const isAll = value === 'all' || (!value && allowAll);
  const displayLabel = isAll ? allLabel : value || placeholder;

  return (
    <div className={`relative inline-block text-left w-full ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center justify-between gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-raised text-fg border border-border transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.992] select-none whitespace-nowrap w-full"
      >
        <div className="flex items-center gap-1.5 shrink-0 truncate">
          <Calendar size={13} className="text-amber-500 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`ml-1 text-fg-subtle transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`}
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
              width: '192px',
            }}
            className="rounded-xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 max-h-[220px] overflow-y-auto text-fg no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1.5 tracking-wider sticky top-0 bg-slate-50 dark:bg-[#1A2234] border-b border-border/60 rounded-lg mb-1">
              Followup Month
            </div>

            {allowAll && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('selection');
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left select-none ${
                  isAll
                    ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'text-fg hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <span>{allLabel}</span>
                {isAll && <Check size={14} strokeWidth={2.5} className="text-primary shrink-0 ml-1" />}
              </button>
            )}

            {MONTHS_LIST.map((month) => {
              const isSelected = value === month;
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
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-fg hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span>{month}</span>
                  {isSelected && <Check size={14} strokeWidth={2.5} className="text-primary shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
