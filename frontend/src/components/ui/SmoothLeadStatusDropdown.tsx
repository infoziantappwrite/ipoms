'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Briefcase, XCircle, Clock, Filter } from 'lucide-react';

export type LeadStatus = 'Hiring' | 'Not Hiring' | 'Follow Up';

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
    id: 'Not Hiring',
    label: 'Not Hiring',
    icon: XCircle,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/40',
    dotClass: 'bg-rose-500',
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const currentOption = STATUS_OPTIONS.find((s) => s.id === value);
  const isAll = value === 'all' || (!currentOption && allowAll);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
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

      {/* Smooth Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-44 rounded-2xl bg-surface border border-border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-fg">
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
            const Icon = opt.icon;

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
        </div>
      )}
    </div>
  );
}
