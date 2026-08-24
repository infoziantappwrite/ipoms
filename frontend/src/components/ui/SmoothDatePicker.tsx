'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { SmoothCalendar, CalendarTheme } from './SmoothCalendar';

export interface SmoothDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  theme?: CalendarTheme;
  highlightedDates?: string[];
  placeholder?: string;
  className?: string;
}

export function SmoothDatePicker({
  value,
  onChange,
  label,
  theme = 'navy',
  highlightedDates,
  placeholder = 'Select date',
  className = '',
}: SmoothDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
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

  // Keyboard: open on Enter/Space/ArrowDown, close on Escape and return focus to trigger
  const triggerRef = useRef<HTMLButtonElement>(null);
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };
  useEffect(() => {
    if (!isOpen) triggerRef.current?.focus();
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-semibold text-fg-subtle mb-1 tracking-tight">
          {label}
        </label>
      )}

      {/* ── Trigger Button ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label ? `${label}: ${formattedDisplay}` : `Select date, currently ${formattedDisplay}`}
        className="flex items-center gap-2 bg-surface border border-border hover:border-border-strong text-fg rounded-full px-3.5 py-1.5 shadow-xs hover:shadow-sm transition-all text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-[0.98]"
      >
        <CalendarDays size={14} className="text-fg-subtle shrink-0" aria-hidden />
        <span className="truncate">{formattedDisplay}</span>
        <ChevronDown size={13} className={`text-fg-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {/* ── Popover Calendar ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={label ? `${label} calendar` : 'Choose a date'}
          className="absolute left-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
        >
          <SmoothCalendar
            mode="single"
            value={value}
            theme={theme}
            highlightedDates={highlightedDates}
            onChangeSingle={(newDate) => {
              onChange(newDate);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
