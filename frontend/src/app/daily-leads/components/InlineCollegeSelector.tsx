'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import type { CollegeOption } from './LeadsTable';

interface Props {
  value: string;
  colleges: CollegeOption[];
  onChange: (collegeId: string) => void;
  disabled?: boolean;
}

export function InlineCollegeSelector({ value, colleges, onChange, disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    ready: boolean;
  }>({ top: 0, left: 0, placement: 'bottom', ready: false });

  const selectedCollege = colleges.find((c) => c._id === value);

  // Position calculation relative to viewport
  const calculateCoords = useCallback(() => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const dropdownWidth = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
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
    const newCoords = calculateCoords();
    if (newCoords) {
      setCoords(newCoords);
    }
  }, [calculateCoords]);

  // Synchronous positioning before display on toggle
  const handleToggle = () => {
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

  // Keep coordinates updated during scroll or window resize
  useLayoutEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, updateCoords]);

  // Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setCoords((prev) => ({ ...prev, ready: false }));
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredColleges = search.trim()
    ? colleges.filter(
        (c) =>
          c.college_code.toLowerCase().includes(search.toLowerCase()) ||
          c.college_name.toLowerCase().includes(search.toLowerCase())
      )
    : colleges;

  return (
    <div className="relative inline-block text-left">
      {/* ── Trigger Button: Shows ONLY the Acronym ────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs border select-none group active:scale-95 ${
          selectedCollege
            ? 'bg-blue-50/90 dark:bg-blue-950/40 text-primary dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100/80 dark:hover:bg-blue-950/70 hover:border-blue-300'
            : 'bg-surface-sunken hover:bg-surface text-fg-disabled border-border hover:border-border-strong font-sans'
        }`}
        title={
          selectedCollege
            ? `${selectedCollege.college_name} (${selectedCollege.college_code})`
            : 'Click to select college'
        }
      >
        <span>{selectedCollege ? selectedCollege.college_code : '— Select —'}</span>
        <ChevronDown
          size={12}
          strokeWidth={2.5}
          className={`transition-transform duration-200 opacity-70 group-hover:opacity-100 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* ── Floating Portal Popover: Renders right at the button position ── */}
      {isOpen &&
        coords.ready &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.placement === 'top' ? 'auto' : `${coords.top}px`,
              bottom:
                coords.placement === 'top'
                  ? `${window.innerHeight - coords.top}px`
                  : 'auto',
              left: `${coords.left}px`,
              zIndex: 99999,
              width: '320px',
              maxWidth: 'calc(100vw - 32px)',
            }}
            className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-opacity duration-100"
          >
            {/* Quick Search Header */}
            {colleges.length > 4 && (
              <div className="p-2.5 border-b border-border/80 bg-surface-sunken/80">
                <div className="relative">
                  <Search
                    size={12}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-disabled"
                  />
                  <input
                    type="text"
                    placeholder="Search college or acronym…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-fg-disabled outline-none font-sans"
                  />
                </div>
              </div>
            )}

            {/* List of Colleges with Acronym Badge and Full Name */}
            <div className="max-h-60 overflow-y-auto divide-y divide-border/40 p-1.5 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filteredColleges.length === 0 ? (
                <div className="p-4 text-center text-fg-disabled text-xs font-medium">
                  No matching colleges
                </div>
              ) : (
                filteredColleges.map((c) => {
                  const isSelected = c._id === value;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        onChange(c._id);
                        setIsOpen(false);
                        setSearch('');
                        setCoords((prev) => ({ ...prev, ready: false }));
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-left rounded-xl transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'hover:bg-surface-sunken text-fg-muted hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono font-bold text-micro shrink-0">
                          {c.college_code}
                        </span>
                        <span className="text-xs truncate font-medium text-fg">
                          {c.college_name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="text-primary shrink-0"
                        />
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
