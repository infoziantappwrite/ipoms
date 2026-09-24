'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { triggerHaptic } from '@/lib/haptics';

interface CtcInlineEditorProps {
  value?: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

type UnitType = 'LPA' | 'Stipend' | 'Both';

interface ParsedCtc {
  unit: UnitType;
  lpaAmount: string;
  stipendAmount: string;
}

function parseCurrentCtc(raw: string): ParsedCtc {
  const trimmed = (raw || '').replace(/\u00a0/g, ' ').trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'not mentioned' || trimmed.toLowerCase() === 'competitive') {
    return { unit: 'LPA', lpaAmount: '', stipendAmount: '' };
  }

  const hasStipend = /stipend|month|pm|\/m\b/i.test(trimmed);
  const hasLpa = /lpa|full\s*time|ft\b|per\s*annum/i.test(trimmed) || (!hasStipend && /\d/.test(trimmed));

  if (hasStipend && hasLpa) {
    // Both are present e.g. "8 - 12k Stipend and 3 - 5 Full time" or "8 - 12k Stipend & 3 - 5 LPA"
    const parts = trimmed.split(/\s*(?:&|\band\b|\+|\/|;|,)\s*/i);
    let stAmt = '';
    let lpAmt = '';

    parts.forEach((p) => {
      if (/stipend|month|pm|\/m\b/i.test(p)) {
        stAmt = p.replace(/stipend|\/month|\/m\b|per\s*month|month/gi, '').trim();
      } else if (/lpa|full\s*time|ft\b/i.test(p)) {
        lpAmt = p.replace(/lpa|full\s*time|ft\b/gi, '').trim();
      } else if (!stAmt && /\d.*k\b/i.test(p)) {
        stAmt = p.trim();
      } else if (!lpAmt) {
        lpAmt = p.trim();
      }
    });

    if (!stAmt || !lpAmt) {
      const stMatch = trimmed.match(/([\d\.\s\-kK]+)\s*(?:stipend|\/month|month)/i);
      const lpMatch = trimmed.match(/([\d\.\s\-]+)\s*(?:lpa|full\s*time)/i);
      if (stMatch) stAmt = stMatch[1].trim();
      if (lpMatch) lpAmt = lpMatch[1].trim();
    }

    return {
      unit: 'Both',
      stipendAmount: stAmt || '',
      lpaAmount: lpAmt || '',
    };
  }

  if (hasStipend) {
    const amount = trimmed
      .replace(/stipend|\/month|\/m\b|per\s*month|month/gi, '')
      .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
      .replace(/\s+/g, ' ')
      .trim();
    return { unit: 'Stipend', lpaAmount: '', stipendAmount: amount };
  }

  // Default LPA
  const amount = trimmed
    .replace(/LPA|lpa/gi, '')
    .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
    .replace(/\s+/g, ' ')
    .trim();
  return { unit: 'LPA', lpaAmount: amount, stipendAmount: '' };
}

export function CtcInlineEditor({
  value = '',
  onChange,
  disabled = false,
}: CtcInlineEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);

  const initial = parseCurrentCtc(value);
  const [unit, setUnit] = useState<UnitType>(initial.unit);
  const [lpaAmount, setLpaAmount] = useState(initial.lpaAmount);
  const [stipendAmount, setStipendAmount] = useState(initial.stipendAmount);

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal state if value prop changes
  useEffect(() => {
    const parsed = parseCurrentCtc(value);
    setUnit(parsed.unit);
    setLpaAmount(parsed.lpaAmount);
    setStipendAmount(parsed.stipendAmount);
  }, [value]);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = unit === 'Both' ? 220 : 145;
    const popoverWidth = 245;
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
  }, [unit]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const parsed = parseCurrentCtc(value);
    setUnit(parsed.unit);
    setLpaAmount(parsed.lpaAmount);
    setStipendAmount(parsed.stipendAmount);

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
    if (isOpen && primaryInputRef.current) {
      setTimeout(() => {
        if (primaryInputRef.current) {
          primaryInputRef.current.focus();
          const len = primaryInputRef.current.value.length;
          primaryInputRef.current.setSelectionRange(len, len);
        }
      }, 30);
    }
  }, [isOpen, unit]);

  const handleSave = () => {
    const cleanLpa = lpaAmount
      .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
      .replace(/LPA/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanStipend = stipendAmount
      .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
      .replace(/stipend|\/month/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    let finalCtc = '';
    if (unit === 'LPA') {
      if (cleanLpa) finalCtc = `${cleanLpa} LPA`;
    } else if (unit === 'Stipend') {
      if (cleanStipend) finalCtc = `${cleanStipend} Stipend`;
    } else if (unit === 'Both') {
      if (cleanStipend && cleanLpa) {
        finalCtc = `${cleanStipend} Stipend & ${cleanLpa} LPA`;
      } else if (cleanStipend) {
        finalCtc = `${cleanStipend} Stipend`;
      } else if (cleanLpa) {
        finalCtc = `${cleanLpa} LPA`;
      }
    }

    onChange(finalCtc);
    triggerHaptic('selection');
    setIsOpen(false);
  };

  const handleCancel = () => {
    const parsed = parseCurrentCtc(value);
    setUnit(parsed.unit);
    setLpaAmount(parsed.lpaAmount);
    setStipendAmount(parsed.stipendAmount);
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
  }, [isOpen, lpaAmount, stipendAmount, unit]);

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
  }, [isOpen, lpaAmount, stipendAmount, unit]);

  const cleanDisplay = (() => {
    if (!value || value === '-' || value.toLowerCase() === 'not mentioned') return '';
    return value
      .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
      .replace(/\s+/g, ' ')
      .trim();
  })();

  return (
    <div className="relative inline-block w-full" onClick={(e) => e.stopPropagation()}>
      {/* ── Cell Trigger (Fully wrapped without truncation) ───────── */}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        title={cleanDisplay || 'Click to enter CTC / Stipend'}
        className={`w-full min-h-[30px] px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer select-none font-mono text-xs font-bold leading-snug break-words whitespace-normal border ${
          cleanDisplay
            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30'
            : 'text-fg-disabled border-transparent hover:bg-surface-raised hover:text-fg-muted'
        } ${isOpen ? 'ring-2 ring-primary/40 bg-surface shadow-xs' : ''}`}
      >
        <span className="break-words whitespace-normal leading-snug w-full block">
          {cleanDisplay || <span className="italic font-normal text-fg-disabled">—</span>}
        </span>
      </div>

      {/* ── Fixed Position Popover via Portal ───────────────────────── */}
      {isOpen && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="CTC / Stipend Editor"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              width: '245px',
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-xl shadow-slate-900/20 dark:shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-2.5 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 ease-out text-fg select-none"
          >
            {/* 3-Way Unit Selector: LPA | Stipend | Both */}
            <div className="grid grid-cols-3 p-0.5 bg-surface-sunken border border-border rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setUnit('LPA');
                  triggerHaptic('light');
                }}
                className={`py-1 font-bold rounded transition-all cursor-pointer flex items-center justify-center ${
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
                  setUnit('Stipend');
                  triggerHaptic('light');
                }}
                className={`py-1 font-bold rounded transition-all cursor-pointer flex items-center justify-center ${
                  unit === 'Stipend'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg hover:bg-surface'
                }`}
              >
                Stipend
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnit('Both');
                  triggerHaptic('light');
                }}
                className={`py-1 font-bold rounded transition-all cursor-pointer flex items-center justify-center ${
                  unit === 'Both'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg hover:bg-surface'
                }`}
              >
                Both
              </button>
            </div>

            {/* Input fields based on selected Unit mode */}
            {unit === 'LPA' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">
                  Full-Time CTC (LPA)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    ref={primaryInputRef}
                    type="text"
                    value={lpaAmount}
                    onChange={(e) => setLpaAmount(e.target.value)}
                    placeholder="e.g. 3.5 - 6 or 4"
                    className="flex-1 bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-fg placeholder:text-fg-disabled outline-none transition-all"
                  />
                  <span className="text-xs font-bold text-fg-muted shrink-0">LPA</span>
                </div>
              </div>
            )}

            {unit === 'Stipend' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">
                  Internship Stipend
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    ref={primaryInputRef}
                    type="text"
                    value={stipendAmount}
                    onChange={(e) => setStipendAmount(e.target.value)}
                    placeholder="e.g. 8 - 12k or 15,000"
                    className="flex-1 bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-fg placeholder:text-fg-disabled outline-none transition-all"
                  />
                  <span className="text-xs font-bold text-fg-muted shrink-0">Stipend</span>
                </div>
              </div>
            )}

            {unit === 'Both' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    1. Stipend
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={primaryInputRef}
                      type="text"
                      value={stipendAmount}
                      onChange={(e) => setStipendAmount(e.target.value)}
                      placeholder="e.g. 8 - 12k"
                      className="flex-1 bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-fg placeholder:text-fg-disabled outline-none transition-all"
                    />
                    <span className="text-[11px] font-bold text-fg-muted shrink-0">Stipend</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    2. Full-Time CTC
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={lpaAmount}
                      onChange={(e) => setLpaAmount(e.target.value)}
                      placeholder="e.g. 3 - 5"
                      className="flex-1 bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-fg placeholder:text-fg-disabled outline-none transition-all"
                    />
                    <span className="text-[11px] font-bold text-fg-muted shrink-0">LPA</span>
                  </div>
                </div>

                {/* Live Preview Pill */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1 text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 break-words whitespace-normal leading-tight">
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase block">Preview:</span>
                  {(stipendAmount ? `${stipendAmount} Stipend` : '') +
                    (stipendAmount && lpaAmount ? ' & ' : '') +
                    (lpaAmount ? `${lpaAmount} LPA` : '') || '—'}
                </div>
              </div>
            )}

            {/* Actions: Clear (left), Cancel & Save (right) */}
            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/60">
              <button
                type="button"
                onClick={handleClear}
                className="px-1.5 py-0.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                title="Clear CTC value"
              >
                Clear
              </button>
              <div className="flex items-center gap-1.5">
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
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
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
