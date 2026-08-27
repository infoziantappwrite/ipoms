'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, GraduationCap } from 'lucide-react';

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

export function SmoothYearDropdown({
  value,
  onChange,
  disabled = false,
  allowAll = false,
  allLabel = 'Year',
  placeholder = 'Year',
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
    const popoverHeight = 240;
    const popoverWidth = 208;
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

  const displayLabel =
    value === 'all' || !value
      ? allowAll
        ? allLabel
        : placeholder
      : `${value} Graduating`;

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
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
              width: '208px',
            }}
            className="rounded-2xl bg-surface border border-border shadow-2xl p-1.5 max-h-60 overflow-y-auto text-fg no-scrollbar animate-in fade-in zoom-in-95 duration-100"
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}
