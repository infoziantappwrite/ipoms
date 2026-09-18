'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Briefcase, Mail, Clock, Filter, CircleDashed } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export type LeadStatus = 'Hiring' | 'Follow Up' | 'Invite Email';

interface Props {
  value?: string;
  onChange: (status: string) => void;
  disabled?: boolean;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  className?: string;
}

export const STATUS_OPTIONS: Array<{
  id: LeadStatus;
  label: string;
  icon: typeof Briefcase;
  badgeClass: string;
  dotClass: string;
}> = [
  {
    id: 'Follow Up',
    label: 'Follow Up',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40 font-bold',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'Hiring',
    label: 'Hiring',
    icon: Briefcase,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40 font-bold',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'Invite Email',
    label: 'Invite Email',
    icon: Mail,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500/40 font-bold',
    dotClass: 'bg-sky-500',
  },
];

export function SmoothLeadStatusDropdown({
  value = '',
  onChange,
  disabled = false,
  allowAll = false,
  allLabel = 'Status',
  placeholder = 'Select Status',
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
    const popoverHeight = 190;
    const popoverWidth = Math.max(rect.width, 160);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.right - popoverWidth);
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

  const currentOption = STATUS_OPTIONS.find((s) => s.id === value);
  const isAll = value === 'all' || (!value && allowAll);
  const isUnselected = !currentOption && !isAll;
  const displayLabel = isAll ? (allLabel || 'Status') : currentOption ? currentOption.label : placeholder;

  return (
    <div className={`relative inline-block text-left ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.992] disabled:opacity-50 select-none whitespace-nowrap w-full min-w-0 ${
          isAll
            ? 'bg-surface hover:bg-surface-raised text-fg border-border font-semibold'
            : currentOption
            ? currentOption.badgeClass
            : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/70 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 font-medium'
        } ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {isAll ? (
            <Filter size={12} className="text-fg-subtle shrink-0" />
          ) : currentOption ? (
            <span className={`w-2 h-2 rounded-full shrink-0 ${currentOption.dotClass}`} />
          ) : (
            <CircleDashed size={12} className="text-zinc-400 dark:text-zinc-400 shrink-0" />
          )}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={`ml-0.5 text-fg-subtle transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`}
        />
      </button>

      {/* Portal Popover (Solid Opaque Theme, Never clipped by table rows or overflow) */}
      {isOpen &&
        coords.ready &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
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
              width: '165px',
            }}
            className="rounded-xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 text-fg animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            {/* Popover Header with Reset/Clear */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] rounded-lg mb-1">
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                Status
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
                  className="text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {STATUS_OPTIONS.map((opt) => {
              const isSelected = value === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('selection');
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left select-none ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-fg hover:bg-slate-100 dark:hover:bg-slate-800/80'
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
