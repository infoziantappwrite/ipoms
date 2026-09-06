'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2, Search } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { COMPANY_TYPES } from '../constants/companyTypes';

interface CompanyTypeDropdownProps {
  value?: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

export function CompanyTypeDropdown({
  value,
  onChange,
  disabled = false,
}: CompanyTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const displayValue = value && value.trim() ? value.trim() : 'Select Sector';
  const isPlaceholder = !value || !value.trim();

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 270;
      const popoverWidth = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      if (left < 12) left = 12;

      setCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left,
        placeAbove,
      });
    }

    setSearchFilter('');
    triggerHaptic('light');
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(item);
    triggerHaptic('selection');
    setIsOpen(false);
  };

  const filteredOptions = searchFilter.trim()
    ? COMPANY_TYPES.filter((t) => t.toLowerCase().includes(searchFilter.toLowerCase().trim()))
    : COMPANY_TYPES;

  return (
    <div className="relative inline-block w-full max-w-[210px]" onClick={(e) => e.stopPropagation()}>
      {/* ── Minimal SaaS Trigger Pill / Button ─────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        title={value || 'Select Company Type'}
        className={`w-full min-h-[30px] px-2.5 py-1 rounded-lg border text-left flex items-center justify-between gap-1.5 transition-all text-xs font-medium cursor-pointer shadow-2xs ${
          isPlaceholder
            ? 'bg-surface border-border text-fg-disabled hover:border-primary/50 hover:text-fg-muted'
            : 'bg-surface-sunken/80 border-border/80 text-fg hover:border-primary/60 hover:bg-surface'
        } ${isOpen ? 'ring-1 ring-primary border-primary bg-surface' : ''}`}
      >
        <span className="truncate leading-tight text-micro block font-medium">
          {displayValue}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-fg-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* ── Fixed Position Popover with Invisible Scroller (Max 5 Visible Items ~190px) ── */}
      {isOpen && coords && (
        <div
          ref={menuRef}
          role="listbox"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: coords.placeAbove ? 'auto' : `${coords.top}px`,
            bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
            left: `${coords.left}px`,
            width: '260px',
            zIndex: 9999,
          }}
          className="bg-surface border border-border rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150 text-fg select-none overflow-hidden"
        >
          {/* Header ribbon with Search bar */}
          <div className="px-2 pt-1 pb-1.5 border-b border-border bg-surface-sunken rounded-xl flex flex-col gap-1">
            <div className="flex items-center justify-between text-micro font-bold text-fg-subtle uppercase tracking-wider px-1">
              <span className="flex items-center gap-1.5 text-primary">
                <Building2 size={12} className="shrink-0" /> Company Type
              </span>
              <span className="font-mono text-fg-disabled text-micro">
                {filteredOptions.length} of {COMPANY_TYPES.length}
              </span>
            </div>
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2 text-fg-disabled pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter sector…"
                className="w-full pl-6 pr-2 py-1 bg-surface border border-border rounded-lg text-xs text-fg outline-none focus:border-primary placeholder:text-fg-disabled"
              />
            </div>
          </div>

          {/* Listing: Exactly ~5 items visible with invisible scroller */}
          <div
            className="overflow-y-auto pr-0.5 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: '185px' }} // Exactly 5 rows (~37px each)
          >
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-fg-disabled italic">
                No matching sectors found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.toLowerCase() === (value || '').toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => handleSelect(opt, e)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-micro leading-snug flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                        : 'text-fg hover:bg-surface-sunken hover:text-primary'
                    }`}
                  >
                    <span className="truncate whitespace-normal break-words">{opt}</span>
                    {isSelected && (
                      <Check size={13} strokeWidth={2.5} className="text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
