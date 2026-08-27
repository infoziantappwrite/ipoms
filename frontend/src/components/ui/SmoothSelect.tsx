'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
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
    const popoverHeight = Math.min(options.length * 42 + (searchable ? 50 : 20), 320);
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
  }, [options.length, searchable]);

  const handleToggle = () => {
    if (disabled) return;
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
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (opt.badge && opt.badge.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div className={`relative inline-block text-left w-full ${className}`}>
      {/* ── Trigger Button (Solid Application Theme) ────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs select-none ${
          isOpen
            ? 'bg-surface border-primary ring-2 ring-primary/20 text-fg'
            : 'bg-surface-sunken hover:bg-surface border-border text-fg'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2 truncate">
          {TriggerIcon && <TriggerIcon size={15} className="text-primary shrink-0" />}
          {selectedOption ? (
            <span className="truncate text-fg font-semibold flex items-center gap-1.5">
              {selectedOption.badge && (
                <span className="font-mono text-primary font-bold">[{selectedOption.badge}]</span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-fg-subtle font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`shrink-0 text-fg-subtle transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
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
            className="rounded-2xl bg-surface border border-border shadow-2xl p-1.5 flex flex-col max-h-72 text-fg animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
          >
            {title && (
              <div className="text-[10px] font-bold text-fg-subtle uppercase px-2.5 py-1 tracking-wider border-b border-border/40 mb-1">
                {title}
              </div>
            )}

            {/* Optional Search Bar */}
            {searchable && (
              <div className="p-1.5 border-b border-border mb-1">
                <div className="relative flex items-center">
                  <Search size={13} className="absolute left-2.5 text-fg-subtle" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-surface-sunken border border-border focus:border-primary rounded-xl pl-8 pr-7 py-1.5 text-xs text-fg outline-none"
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

            {/* Option List */}
            <div className="overflow-y-auto no-scrollbar space-y-0.5 max-h-60 p-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-fg-subtle italic">
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
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left select-none ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'text-fg-muted hover:bg-surface-sunken hover:text-fg font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {OptionIcon && (
                          <OptionIcon
                            size={14}
                            className={isSelected ? 'text-primary' : 'text-fg-subtle'}
                          />
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            {opt.badge && (
                              <span className="font-mono text-primary font-bold">[{opt.badge}]</span>
                            )}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {opt.sublabel && (
                            <p className="text-[10px] text-fg-subtle font-normal truncate mt-0.5">
                              {opt.sublabel}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-primary shrink-0 ml-2" />}
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
