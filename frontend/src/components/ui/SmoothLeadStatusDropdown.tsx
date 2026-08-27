'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Briefcase, Mail, Clock, Filter } from 'lucide-react';

export type LeadStatus = 'Hiring' | 'Follow Up' | 'Invite Email';

interface Props {
  value: string;
  onChange: (status: string) => void;
  disabled?: boolean;
  allowAll?: boolean;
  allLabel?: string;
  className?: string;
}

const STATUS_OPTIONS: Array<{
  id: LeadStatus;
  label: string;
  icon: typeof Briefcase;
  badgeClass: string;
  dotClass: string;
}> = [
  {
    id: 'Hiring',
    label: 'Hiring',
    icon: Briefcase,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'Follow Up',
    label: 'Follow Up',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'Invite Email',
    label: 'Invite Email',
    icon: Mail,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500/40',
    dotClass: 'bg-sky-500',
  },
];

export function SmoothLeadStatusDropdown({
  value,
  onChange,
  disabled = false,
  allowAll = false,
  allLabel = 'All Statuses',
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
    const popoverHeight = 180;
    const popoverWidth = 176;
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

  const currentOption =
    STATUS_OPTIONS.find((s) => s.id === value) ||
    (value === 'Not Hiring' ? STATUS_OPTIONS.find((s) => s.id === 'Invite Email') : undefined);
  const isAll = value === 'all' || (!currentOption && allowAll);

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 select-none whitespace-nowrap w-full ${
          isAll
            ? 'bg-surface hover:bg-surface-raised text-fg border-border'
            : currentOption?.badgeClass || 'bg-surface text-fg border-border'
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          {isAll ? (
            <Filter size={13} className="text-fg-subtle shrink-0" />
          ) : (
            <span className={`w-2 h-2 rounded-full shrink-0 ${currentOption?.dotClass}`} />
          )}
          <span className="whitespace-nowrap">{isAll ? allLabel : currentOption?.label}</span>
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
              width: '176px',
            }}
            className="rounded-2xl bg-surface border border-border shadow-2xl p-1.5 text-fg animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1 tracking-wider border-b border-border/40 mb-1">
              Status
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
                <div className="flex items-center gap-2">
                  <Filter size={13} className="text-fg-subtle" />
                  <span>{allLabel}</span>
                </div>
                {isAll && <Check size={14} className="text-primary shrink-0 ml-1" />}
              </button>
            )}

            {STATUS_OPTIONS.map((opt) => {
              const isSelected = value === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} />
                    <span>{opt.label}</span>
                  </div>
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
