'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Hash, ChevronDown, Check, X, AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  fromSno: number | null;
  toSno: number | null;
  maxSno?: number;
  onApplyRange: (from: number | null, to: number | null) => void;
  onClearRange: () => void;
}

export function SnoRangeSelector({
  fromSno,
  toSno,
  maxSno = 3823,
  onApplyRange,
  onClearRange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState<string>(fromSno ? String(fromSno) : '');
  const [localTo, setLocalTo] = useState<string>(toSno ? String(toSno) : '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxSnoRef = useRef<number>(Math.max(3823, maxSno || 3823));

  useEffect(() => {
    if (maxSno && maxSno > 500 && maxSno > maxSnoRef.current) {
      maxSnoRef.current = maxSno;
    }
  }, [maxSno]);

  const effectiveMax = Math.max(maxSnoRef.current, maxSno > 500 ? maxSno : maxSnoRef.current);

  // Sync with prop changes
  useEffect(() => {
    setLocalFrom(fromSno ? String(fromSno) : '');
    setLocalTo(toSno ? String(toSno) : '');
    setErrorMessage(null);
  }, [fromSno, toSno]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isRangeActive = fromSno !== null || toSno !== null;

  // Realtime validate numbers on change
  const handleFromChange = (val: string) => {
    setLocalFrom(val);
    validateInputs(val, localTo);
  };

  const handleToChange = (val: string) => {
    setLocalTo(val);
    validateInputs(localFrom, val);
  };

  const validateInputs = (fromStr: string, toStr: string): boolean => {
    const fromVal = fromStr.trim() ? parseInt(fromStr.trim(), 10) : null;
    const toVal = toStr.trim() ? parseInt(toStr.trim(), 10) : null;

    if (fromVal !== null && fromVal < 1) {
      setErrorMessage('Start number must be greater than or equal to 1');
      return false;
    }

    if (toVal !== null && effectiveMax && toVal > effectiveMax) {
      setErrorMessage(`Limited till ${effectiveMax.toLocaleString()} (Total database records)`);
      return false;
    }

    if (fromVal !== null && toVal !== null && fromVal > toVal) {
      setErrorMessage('Start number cannot be greater than End number');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const handleApply = () => {
    const fromVal = localFrom.trim() ? parseInt(localFrom.trim(), 10) : null;
    const toVal = localTo.trim() ? parseInt(localTo.trim(), 10) : null;

    if (!validateInputs(localFrom, localTo)) {
      return;
    }

    if (fromVal === null && toVal === null) {
      onClearRange();
      setIsOpen(false);
      return;
    }

    // If only one is filled, auto-fill default bounds
    const finalFrom = fromVal ?? 1;
    const finalTo = toVal ?? effectiveMax;

    onApplyRange(finalFrom, finalTo);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLocalFrom('');
    setLocalTo('');
    setErrorMessage(null);
    onClearRange();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* ── Trigger Button ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer select-none ${
          isRangeActive
            ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20 font-bold'
            : 'bg-surface border-border text-fg hover:bg-surface-raised'
        }`}
        title={isRangeActive ? `Filtered: S.No ${fromSno} to ${toSno}` : 'Filter by S.No Range'}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Hash
            size={13}
            strokeWidth={2.25}
            className={isRangeActive ? 'text-primary' : 'text-fg-subtle'}
          />
          <span>
            {isRangeActive
              ? `S.No: ${fromSno ?? 1} – ${toSno ?? maxSno}`
              : 'S.No Range'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isRangeActive && (
            <span
              onClick={handleClear}
              title="Clear S.No Range"
              className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center text-primary transition-colors cursor-pointer"
            >
              <X size={11} strokeWidth={2.5} />
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2.2}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
              isRangeActive ? 'text-primary' : 'text-fg-subtle'
            }`}
          />
        </div>
      </button>

      {/* ── Dropdown Popover ───────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-surface border border-border rounded-2xl shadow-2xl z-50 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-fg select-none">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <div className="flex items-center gap-1.5 text-xs font-bold text-fg">
              <Hash size={14} className="text-primary" strokeWidth={2.5} />
              <span>Select S.No Range</span>
            </div>
            <span className="text-[10px] font-semibold text-fg-subtle bg-surface-sunken px-2 py-0.5 rounded-md border border-border">
              Total: {effectiveMax.toLocaleString()}
            </span>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-fg-muted mb-1">
                Start (≥ 1)
              </label>
              <input
                type="number"
                min="1"
                max={effectiveMax}
                placeholder="1"
                value={localFrom}
                onChange={(e) => handleFromChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-fg placeholder:text-fg-disabled outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-fg-muted mb-1">
                End (≤ {effectiveMax.toLocaleString()})
              </label>
              <input
                type="number"
                min="1"
                max={effectiveMax}
                placeholder={String(effectiveMax)}
                value={localTo}
                onChange={(e) => handleToChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-fg placeholder:text-fg-disabled outline-none transition-all"
              />
            </div>
          </div>

          {/* Inline Validation Warning Message */}
          {errorMessage && (
            <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium leading-tight">
              <AlertTriangle size={13} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
            {isRangeActive ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1.5 text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                Clear Range
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-fg-subtle hover:text-fg rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 ml-auto"
            >
              <span>Apply Range</span>
              <ArrowRight size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
