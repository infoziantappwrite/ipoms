'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export interface SelectOption {
  value: string;
  label?: string;
  sublabel?: string;
  badge?: string;
  isPinned?: boolean;
  icon?: React.ElementType;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  icon?: React.ElementType;
  title?: string;
  error?: boolean;
}

export function SmoothSelect({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search options…',
  className = '',
  icon: TriggerIcon,
  title,
  error = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'top' | 'bottom';
    ready: boolean;
  }>({
    top: 0,
    left: 0,
    width: 260,
    placement: 'bottom',
    ready: false,
  });

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedListHeight = Math.min(options.length * 36, 175);
    const headerHeight = title ? 30 : 0;
    const searchHeight = searchable ? 45 : 0;
    const popoverHeight = estimatedListHeight + headerHeight + searchHeight + 20;

    const popoverWidth = Math.max(rect.width, 240);
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
      width: popoverWidth,
      placement: placeAbove ? ('top' as const) : ('bottom' as const),
      ready: true,
    };
  }, [options.length, searchable, title]);

  const handleToggle = () => {
    if (disabled) return;
    triggerHaptic('light');
    if (isOpen) {
      setIsOpen(false);
      setSearchQuery('');
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
        setSearchQuery('');
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

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(
        (opt) =>
          (opt.label && opt.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (opt.badge && opt.badge.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div className={`relative inline-block text-left w-full ${className}`}>
      {/* ── Trigger Button (Solid Minimal SaaS Theme) ────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer select-none active:scale-[0.992] shadow-2xs ${
          error
            ? isOpen
              ? 'bg-surface border-rose-500 ring-2 ring-rose-500/20 text-fg shadow-xs'
              : 'bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-50/80 dark:hover:bg-rose-950/50 border-rose-500/60 ring-1 ring-rose-500/40 text-fg'
            : isOpen
            ? 'bg-surface border-primary ring-2 ring-primary/20 text-fg shadow-xs'
            : 'bg-surface hover:bg-surface-raised border-border text-fg'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2 truncate">
          {TriggerIcon && (
            <TriggerIcon
              size={14}
              className={
                error
                  ? 'text-rose-500 dark:text-rose-400 shrink-0'
                  : 'text-primary shrink-0'
              }
            />
          )}
          {selectedOption ? (
            <span className="truncate text-fg font-semibold flex items-center gap-1.5">
              {selectedOption.badge && (
                <span className={`font-mono font-bold ${error ? 'text-rose-500' : 'text-primary dark:text-sky-300'}`}>
                  [{selectedOption.badge}]
                </span>
              )}
              {selectedOption.label ? (
                <span className="truncate">{selectedOption.label}</span>
              ) : null}
            </span>
          ) : (
            <span className={error ? 'text-rose-600 dark:text-rose-300 font-normal' : 'text-fg-subtle font-normal'}>
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            error
              ? isOpen
                ? 'rotate-180 text-rose-500'
                : 'text-rose-500 dark:text-rose-400'
              : isOpen
              ? 'rotate-180 text-primary dark:text-sky-300'
              : 'text-fg-subtle'
          }`}
        />
      </button>

      {/* ── Floating Portal Popover ────────────────────────────────────── */}
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
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="rounded-xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 flex flex-col text-fg animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            {title && (
              <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1.5 tracking-wider border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] rounded-lg mb-1">
                {title}
              </div>
            )}

            {/* Optional Search Bar */}
            {searchable && (
              <div className="p-1 border-b border-border/60 mb-1">
                <div className="relative flex items-center">
                  <Search size={13} className="absolute left-2.5 text-fg-subtle" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-surface-sunken border border-border focus:border-primary dark:focus:border-sky-400 focus:ring-1 focus:ring-primary/30 dark:focus:ring-sky-400/30 rounded-lg pl-8 pr-7 py-1.5 text-xs text-fg placeholder:text-fg-disabled outline-none font-normal"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-fg-subtle hover:text-fg"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Option List (Shows 4 to 5 items with invisible smooth scroller) */}
            <div className="overflow-y-auto overscroll-contain space-y-0.5 max-h-[175px] p-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-fg-disabled italic">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value === opt.value;
                  const OptionIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left select-none ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-sky-400/15 border border-primary/25 dark:border-sky-400/35 text-fg dark:text-white font-bold shadow-2xs'
                          : opt.isPinned
                          ? 'bg-primary/5 dark:bg-sky-400/5 text-fg font-semibold hover:bg-primary/10 dark:hover:bg-sky-400/10'
                          : 'text-fg hover:bg-surface-raised font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        {OptionIcon && (
                          <OptionIcon
                            size={14}
                            className={isSelected ? 'text-primary dark:text-sky-300' : 'text-fg-subtle'}
                          />
                        )}
                        <div className="truncate flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 truncate flex-wrap">
                            {opt.badge && (
                              <span className={`font-mono font-bold ${
                                isSelected ? 'text-primary dark:text-sky-300' : 'text-primary dark:text-sky-400'
                              }`}>
                                [{opt.badge}]
                              </span>
                            )}
                            {opt.label ? (
                              <span className={`truncate ${
                                isSelected ? 'font-bold text-fg dark:text-white' : 'font-medium text-fg dark:text-slate-100'
                              }`}>
                                {opt.label}
                              </span>
                            ) : null}
                            {opt.isPinned && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/15 dark:bg-amber-400/15 text-amber-600 dark:text-amber-300 font-bold text-[9px] tracking-tight shrink-0 border border-amber-500/20 dark:border-amber-400/30">
                                <Sparkles size={8} className="text-amber-500 dark:text-amber-400 shrink-0" /> Focus
                              </span>
                            )}
                          </div>
                          {opt.sublabel && (
                            <p className="text-[10px] text-fg-subtle font-normal truncate mt-0.5">
                              {opt.sublabel}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check size={14} strokeWidth={2.5} className="text-primary dark:text-sky-300 shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
