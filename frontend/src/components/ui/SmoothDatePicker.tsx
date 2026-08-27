'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { SmoothCalendar, CalendarTheme } from './SmoothCalendar';

export interface SmoothDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  theme?: CalendarTheme;
  minDate?: string;
  maxDate?: string;
  highlightedDates?: string[];
  placeholder?: string;
  className?: string;
  variant?: 'pill' | 'input';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  clearable?: boolean;
  usePortal?: boolean;
  disabled?: boolean;
}

export function SmoothDatePicker({
  value,
  onChange,
  label,
  theme = 'navy',
  minDate,
  maxDate,
  highlightedDates,
  placeholder = 'Select date',
  className = '',
  variant = 'pill',
  size = 'md',
  fullWidth = false,
  clearable = false,
  usePortal = false,
  disabled = false,
}: SmoothDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    ready: boolean;
  }>({ top: 0, left: 0, placement: 'bottom', ready: false });

  // Calculate viewport coordinates for portal rendering
  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 320;
    const popoverWidth = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    return {
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left,
      placement: placeAbove ? ('top' as const) : ('bottom' as const),
      ready: true,
    };
  }, []);

  const updateCoords = useCallback(() => {
    if (!usePortal) return;
    const newCoords = calculateCoords();
    if (newCoords) {
      setCoords(newCoords);
    }
  }, [calculateCoords, usePortal]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setCoords((prev) => ({ ...prev, ready: false }));
      return;
    }

    if (usePortal) {
      const initialCoords = calculateCoords();
      if (initialCoords) {
        setCoords(initialCoords);
      }
    }
    setIsOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keep portal coords updated on scroll / resize
  useLayoutEffect(() => {
    if (!isOpen || !usePortal) return;
    updateCoords();

    function handleScrollOrResize() {
      updateCoords();
    }

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, usePortal, updateCoords]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Format date display (e.g., "24 Aug 2026")
  const formattedDisplay = React.useMemo(() => {
    if (!value || value === 'all') return placeholder;
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return value;

    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return dateObj.toLocaleDateString('en-GB', opt);
  }, [value, placeholder]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Keyboard navigation
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  const calendarPopoverContent = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={label ? `${label} calendar` : 'Choose a date'}
      style={
        usePortal
          ? {
              position: 'fixed',
              top: coords.placement === 'top' ? 'auto' : `${coords.top}px`,
              bottom:
                coords.placement === 'top'
                  ? `${window.innerHeight - coords.top}px`
                  : 'auto',
              left: `${coords.left}px`,
              zIndex: 99999,
            }
          : undefined
      }
      className={
        usePortal
          ? 'shadow-2xl rounded-2xl overflow-hidden'
          : 'absolute left-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-left shadow-2xl rounded-2xl overflow-hidden'
      }
    >
      <SmoothCalendar
        mode="single"
        value={value}
        theme={theme}
        minDate={minDate}
        maxDate={maxDate}
        highlightedDates={highlightedDates}
        onChangeSingle={(newDate) => {
          onChange(newDate);
          setIsOpen(false);
          setCoords((prev) => ({ ...prev, ready: false }));
        }}
      />
    </div>
  );

  return (
    <div
      className={`relative ${fullWidth ? 'w-full block' : 'inline-block'} ${className}`}
      ref={containerRef}
    >
      {label && (
        <label className="block text-xs font-semibold text-fg mb-1">
          {label}
        </label>
      )}

      {/* ── Trigger Button ── */}
      {variant === 'pill' ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={label ? `${label}: ${formattedDisplay}` : `Select date, currently ${formattedDisplay}`}
          className={`flex items-center transition-all font-semibold focus:outline-none cursor-pointer ${
            size === 'sm'
              ? 'gap-1.5 bg-surface-sunken hover:bg-surface border border-border hover:border-primary text-fg rounded-lg px-2 py-1 text-[11px] shadow-2xs hover:shadow-xs font-mono focus:ring-1 focus:ring-primary/30 active:scale-[0.98]'
              : 'gap-2 bg-surface border border-border hover:border-border-strong text-fg rounded-full px-3.5 py-1.5 shadow-xs hover:shadow-sm text-xs focus:ring-2 focus:ring-primary/30 active:scale-[0.98]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <CalendarDays
            size={size === 'sm' ? 12 : 14}
            className={`shrink-0 ${size === 'sm' ? 'text-primary' : 'text-fg-subtle'}`}
            aria-hidden
          />
          <span className="truncate">{formattedDisplay}</span>
          <ChevronDown
            size={size === 'sm' ? 11 : 13}
            className={`text-fg-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      ) : (
        /* Form Input Variant */
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={label ? `${label}: ${formattedDisplay}` : `Select date, currently ${formattedDisplay}`}
          className={`w-full px-3 py-2 text-xs bg-surface-sunken border border-border rounded-lg text-fg hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary flex items-center justify-between transition-all cursor-pointer select-none group ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span className={value ? 'text-fg font-medium' : 'text-fg-disabled'}>
            {formattedDisplay}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {clearable && value && !disabled && (
              <span
                role="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-surface-raised rounded text-fg-subtle hover:text-rose-500 transition-colors"
                title="Clear date"
              >
                <X size={12} strokeWidth={2.5} />
              </span>
            )}
            <CalendarDays
              size={14}
              className={`text-fg-subtle group-hover:text-primary transition-colors ${
                isOpen ? 'text-primary' : ''
              }`}
              aria-hidden
            />
          </div>
        </button>
      )}

      {/* ── Popover Calendar ── */}
      {isOpen &&
        (!usePortal
          ? calendarPopoverContent
          : coords.ready &&
            typeof document !== 'undefined' &&
            createPortal(calendarPopoverContent, document.body))}
    </div>
  );
}
