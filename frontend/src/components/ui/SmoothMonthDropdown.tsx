'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
    const popoverHeight = 250;
    const popoverWidth = 192;
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
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
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

      {/* Portal Popover (Never clipped by table rows or overflow) */}
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
              width: '192px',
            }}
            className="rounded-2xl bg-surface border border-border shadow-2xl p-1.5 max-h-60 overflow-y-auto text-fg no-scrollbar animate-in fade-in zoom-in-95 duration-100"
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}
