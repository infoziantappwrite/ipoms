'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { triggerHaptic } from '@/lib/haptics';

interface CtcInlineEditorProps {
  value?: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

export function CtcInlineEditor({
  value = '',
  onChange,
  disabled = false,
}: CtcInlineEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);

  // Parse initial unit & numeric value from current value
  const parseCurrent = (raw: string) => {
    const trimmed = (raw || '').replace(/\u00a0/g, ' ').trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'not mentioned' || trimmed.toLowerCase() === 'competitive') {
      return { amount: '', unit: 'LPA' as 'LPA' | '/ Month' };
    }
    const isMonth = /month|stipend|pm|\/m\b/i.test(trimmed);
    const unit: 'LPA' | '/ Month' = isMonth ? '/ Month' : 'LPA';
    let amount = trimmed
      .replace(/LPA|lpa|\/ Month|\/Month|\/month|\/m\b|per\s*month|stipend/gi, '')
      .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
      .replace(/\s+/g, ' ')
      .trim();
    return { amount, unit };
  };

  const initial = parseCurrent(value);
  const [unit, setUnit] = useState<'LPA' | '/ Month'>(initial.unit);
  const [amount, setAmount] = useState(initial.amount);

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal state if value prop changes
  useEffect(() => {
    const parsed = parseCurrent(value);
    setUnit(parsed.unit);
    setAmount(parsed.amount);
  }, [value]);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 125;
    const popoverWidth = 205;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    return {
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left,
      placeAbove,
    };
  }, []);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const parsed = parseCurrent(value);
    setUnit(parsed.unit);
    setAmount(parsed.amount);

    const calculated = calculateCoords();
    if (calculated) setCoords(calculated);

    triggerHaptic('light');
    setIsOpen(true);
  };

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
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 30);
    }
  }, [isOpen]);

  const handleSave = () => {
    const cleanAmt = amount
      .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanAmt) {
      onChange('');
    } else {
      const finalCtc = `${cleanAmt} ${unit}`;
      onChange(finalCtc);
    }
    triggerHaptic('selection');
    setIsOpen(false);
  };

  const handleCancel = () => {
    const parsed = parseCurrent(value);
    setUnit(parsed.unit);
    setAmount(parsed.amount);
    triggerHaptic('light');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    triggerHaptic('medium');
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        handleSave();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, amount, unit]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleSave();
      }
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, amount, unit]);

  const cleanDisplay = (() => {
    if (!value || value === '-' || value.toLowerCase() === 'not mentioned') return '';
    return value
      .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
      .replace(/(\d+)\s*LPA/gi, '$1 LPA')
      .replace(/\/month\s*stipend/gi, ' / Month')
      .replace(/stipend\s*\/month/gi, ' / Month')
      .replace(/\/month/gi, ' / Month')
      .replace(/\/m\b/gi, ' / Month')
      .replace(/per\s*month/gi, '/ Month')
      .replace(/\s+/g, ' ')
      .trim();
  })();

  return (
    <div className="relative inline-block w-full" onClick={(e) => e.stopPropagation()}>
      {/* ── Cell Trigger ────────────────────────────────────────────── */}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        title={cleanDisplay || 'Click to edit CTC'}
        className={`w-full min-h-[28px] px-2 py-1 rounded-md text-left flex items-center justify-between gap-1 transition-all cursor-pointer select-none font-mono text-xs font-bold leading-tight truncate ${
          cleanDisplay
            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-500/30'
            : 'text-fg-disabled hover:bg-surface-raised hover:text-fg-muted'
        } ${isOpen ? 'ring-2 ring-primary/40 bg-surface shadow-xs' : ''}`}
      >
        <span className="truncate whitespace-nowrap overflow-hidden block">
          {cleanDisplay || <span className="italic font-normal">—</span>}
        </span>
      </div>

      {/* ── Fixed Position Minimal Popover via Portal ──────────────── */}
      {isOpen && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="CTC Editor"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              width: '215px',
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-xl shadow-slate-900/20 dark:shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-2 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100 ease-out text-fg select-none"
          >
            {/* Unit Selector Segmented Pill */}
            <div className="grid grid-cols-2 p-0.5 bg-surface-sunken border border-border rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setUnit('LPA');
                  triggerHaptic('light');
                }}
                className={`py-1 text-xs font-bold rounded transition-all cursor-pointer flex items-center justify-center ${
                  unit === 'LPA'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg hover:bg-surface'
                }`}
              >
                LPA
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnit('/ Month');
                  triggerHaptic('light');
                }}
                className={`py-1 text-xs font-bold rounded transition-all cursor-pointer flex items-center justify-center ${
                  unit === '/ Month'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg hover:bg-surface'
                }`}
              >
                / Month
              </button>
            </div>

            {/* Numeric Amount Input */}
            <input
              ref={inputRef}
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={unit === 'LPA' ? '3 - 5' : '20,000'}
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-fg placeholder:text-fg-disabled outline-none transition-all"
            />

            {/* Actions: Clear (left), Cancel & Save (right) */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/60">
              <button
                type="button"
                onClick={handleClear}
                className="px-1.5 py-0.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                title="Clear CTC value"
              >
                Clear
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-2 py-0.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-surface-sunken rounded transition-colors cursor-pointer"
                  title="Discard changes"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

