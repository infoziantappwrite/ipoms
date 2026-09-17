'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Briefcase, Mail, Clock, Filter } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

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
    const popoverWidth = Math.max(rect.width, 176);
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

  const currentOption =
    STATUS_OPTIONS.find((s) => s.id === value) ||
    (value === 'Not Hiring' ? STATUS_OPTIONS.find((s) => s.id === 'Invite Email') : undefined);
  const isAll = value === 'all' || (!currentOption && allowAll);

  return (
    <div className={`relative inline-block text-left w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.992] disabled:opacity-50 select-none whitespace-nowrap w-full ${
          isAll
            ? 'bg-surface hover:bg-surface-raised text-fg border-border'
            : currentOption?.badgeClass || 'bg-surface text-fg border-border'
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0 truncate">
          {isAll ? (
            <Filter size={13} className="text-fg-subtle shrink-0" />
          ) : (
            <span className={`w-2 h-2 rounded-full shrink-0 ${currentOption?.dotClass}`} />
          )}
          <span className="truncate">{isAll ? allLabel : currentOption?.label}</span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`ml-1 text-fg-subtle transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`}
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
              width: '180px',
            }}
            className="rounded-xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 text-fg animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1.5 tracking-wider border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] rounded-lg mb-1">
              Status
            </div>

            {allowAll && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left select-none ${
                  isAll
                    ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'text-fg hover:bg-surface-raised'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Filter size={13} className="text-fg-subtle" />
                  <span>{allLabel}</span>
                </div>
                {isAll && <Check size={14} strokeWidth={2.5} className="text-primary shrink-0 ml-1" />}
              </button>
            )}

            {STATUS_OPTIONS.map((opt) => {
              const isSelected = value === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left select-none ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-fg hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} />
                    <span>{opt.label}</span>
                  </div>
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
