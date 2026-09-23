'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Layers, Search, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export interface IndustryOption {
  id: string;
  label: string;
  dotColor?: string;
}

export const COMPANY_INDUSTRIES: IndustryOption[] = [
  { id: 'all', label: 'All Industries', dotColor: 'bg-primary' },
  { id: 'IT Services & Consulting', label: 'IT Services & Consulting', dotColor: 'bg-blue-500' },
  { id: 'Software & Technology', label: 'Software & Technology', dotColor: 'bg-indigo-500' },
  { id: 'Banking & Financial Services', label: 'Banking & Financial Services', dotColor: 'bg-emerald-500' },
  { id: 'Healthcare & Life Sciences', label: 'Healthcare & Life Sciences', dotColor: 'bg-teal-500' },
  { id: 'Manufacturing & Automotive', label: 'Manufacturing & Automotive', dotColor: 'bg-amber-500' },
  { id: 'E-commerce & Retail', label: 'E-commerce & Retail', dotColor: 'bg-orange-500' },
  { id: 'Telecommunications', label: 'Telecommunications', dotColor: 'bg-sky-500' },
  { id: 'Education & EdTech', label: 'Education & EdTech', dotColor: 'bg-purple-500' },
  { id: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain', dotColor: 'bg-rose-500' },
  { id: 'Media & Entertainment', label: 'Media & Entertainment', dotColor: 'bg-pink-500' },
  { id: 'Energy & Utilities', label: 'Energy & Utilities', dotColor: 'bg-lime-500' },
  { id: 'Construction & Real Estate', label: 'Construction & Real Estate', dotColor: 'bg-cyan-500' },
  { id: 'Hospitality & Tourism', label: 'Hospitality & Tourism', dotColor: 'bg-violet-500' },
  { id: 'Others', label: 'Others', dotColor: 'bg-slate-500' },
];

interface Props {
  value: string;
  onChange: (industry: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

export function SmoothIndustryDropdown({
  value,
  onChange,
  className = '',
  align = 'left',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredIndustries = searchQuery.trim()
    ? COMPANY_INDUSTRIES.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : COMPANY_INDUSTRIES;
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
    const popoverWidth = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = align === 'right' ? rect.right - popoverWidth : rect.left;
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
  }, [align]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    COMPANY_INDUSTRIES.find((opt) => opt.id === value) || COMPANY_INDUSTRIES[0];

  const handleSelect = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onChange(val);
    setIsOpen(false);
    setCoords((prev) => ({ ...prev, ready: false }));
  };

  return (
    <div className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* ── Trigger Button (Smooth Pill Style) ─────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-[0.992] shadow-xs cursor-pointer select-none min-w-[150px] ${
          value !== 'all'
            ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20'
            : 'bg-surface border-border text-fg hover:bg-surface-raised'
        } ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${currentOption.dotColor || 'bg-primary'} ring-1 ring-black/10 dark:ring-white/20`}
          />
          <span className="truncate">{currentOption.label}</span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            value !== 'all' ? 'text-primary' : 'text-fg-subtle'
          } ${isOpen ? 'rotate-180 text-primary' : ''}`}
        />
      </button>

      {/* ── 100% Solid SaaS Dropdown Popover via Portal ───────────────────────────────────── */}
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
              width: '260px',
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ease-out text-fg select-none"
          >
            {/* Header ribbon */}
            <div className="px-3.5 py-2 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234] flex items-center justify-between text-micro font-bold text-fg-subtle uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers size={12} className="text-primary" /> Filter by Industry
              </span>
              <span className="font-mono text-[10px] text-fg-disabled">{filteredIndustries.length}</span>
            </div>

            {/* Quick Search Bar */}
            <div className="p-1 border-b border-border/60 bg-surface-sunken">
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2.5 text-fg-subtle pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search industry…"
                  className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg pl-7 pr-6 py-1 text-xs text-fg placeholder:text-fg-subtle outline-none font-normal"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-fg-subtle hover:text-fg cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Industry Options List */}
            <div className="max-h-[194px] overflow-y-auto p-1.5 space-y-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white dark:bg-[#161D2E] divide-y divide-border/30">
              {filteredIndustries.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-fg-subtle italic">
                  No matching industry found
                </div>
              ) : (
                filteredIndustries.map((opt) => {
                  const isSelected = opt.id === value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={(e) => {
                        handleSelect(opt.id, e);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${opt.dotColor || 'bg-primary'} ring-1 ring-black/10 dark:ring-white/20 ${
                            isSelected ? 'ring-2 ring-primary/60' : ''
                          }`}
                        />
                        <span className="truncate">{opt.label}</span>
                      </div>

                      {isSelected && (
                        <Check size={14} strokeWidth={2.5} className="text-primary shrink-0" />
                      )}
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
