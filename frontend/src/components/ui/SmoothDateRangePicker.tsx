'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, Check } from 'lucide-react';
import { SmoothCalendar, CalendarTheme } from './SmoothCalendar';

export interface SmoothDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChangeRange: (start: string, end: string) => void;
  label?: string;
  theme?: CalendarTheme;
  placeholder?: string;
  className?: string;
}

export function SmoothDateRangePicker({
  startDate,
  endDate,
  onChangeRange,
  label,
  theme = 'navy',
  placeholder = 'Select date range',
  className = '',
}: SmoothDateRangePickerProps) {
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

  const formatDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return dStr;
    return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const displayText = React.useMemo(() => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} – ${formatDate(endDate)}, ${startDate.split('-')[0]}`;
    }
    if (startDate && !endDate) {
      return `${formatDate(startDate)} – Select end date`;
    }
    return placeholder;
  }, [startDate, endDate, placeholder]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-500 mb-1 tracking-tight">
          {label}
        </label>
      )}

      {/* ── Trigger Pill Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full px-4 py-2 shadow-xs hover:shadow-sm transition-all text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400/20 active:scale-[0.98]"
      >
        <CalendarDays size={15} className="text-slate-400 shrink-0" />
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Popover Calendar Dropdown ── */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          <SmoothCalendar
            mode="range"
            startDate={startDate}
            endDate={endDate}
            theme={theme}
            onChangeRange={(s, e) => {
              onChangeRange(s, e);
              if (s && e) {
                // Range complete, close smoothly after short delay for user feedback
                setTimeout(() => setIsOpen(false), 220);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
