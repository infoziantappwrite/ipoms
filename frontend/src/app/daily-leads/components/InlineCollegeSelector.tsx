'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import type { CollegeOption } from './LeadsTable';

interface Props {
  value?: string;
  currentCollegeId?: string;
  collegeObj?: {
    _id?: string;
    college_name?: string;
    college_code?: string;
  };
  colleges: CollegeOption[];
  onChange?: (collegeId: string) => void;
  onSelect?: (collegeId: string) => void;
  disabled?: boolean;
}

export function InlineCollegeSelector({
  value,
  currentCollegeId,
  collegeObj,
  colleges,
  onChange,
  onSelect,
  disabled = false,
}: Props) {
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

  const effectiveId = value || currentCollegeId || collegeObj?._id || '';
  const selectedCollege =
    colleges.find(
      (c) =>
        c._id === effectiveId ||
        c.college_code === effectiveId ||
        c.college_name === effectiveId
    ) ||
    (collegeObj?.college_code
      ? {
          _id: collegeObj._id || '',
          college_name: collegeObj.college_name || '',
          college_code: collegeObj.college_code,
        }
      : undefined);

  // Position calculation relative to viewport
  const calculateCoords = useCallback(() => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 240;
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
    if (disabled) return;
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
        setSearch('');
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
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

  const handleSelectCollege = (collegeId: string) => {
    if (onChange) onChange(collegeId);
    if (onSelect) onSelect(collegeId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative inline-block text-left">
      {/* ── Trigger Button: Shows ONLY the Acronym ────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs border select-none group active:scale-[0.992] ${
          selectedCollege
            ? 'bg-primary/10 dark:bg-sky-400/15 text-primary dark:text-sky-300 border-primary/40 dark:border-sky-400/35 hover:bg-primary/15 dark:hover:bg-sky-400/20 ring-1 ring-primary/20 dark:ring-sky-400/20'
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
          className={`transition-transform duration-200 ${
            selectedCollege ? 'text-primary dark:text-sky-300' : 'opacity-70 group-hover:opacity-100'
          } ${isOpen ? 'rotate-180' : ''}`}
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
              zIndex: 999999,
              width: '320px',
            }}
            className="rounded-2xl bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 shadow-2xl p-2 flex flex-col text-fg animate-in fade-in zoom-in-95 duration-100 overflow-hidden select-none"
          >
            {/* Search Input */}
            <div className="relative mb-2 shrink-0">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-disabled pointer-events-none"
              />
              <input
                type="text"
                autoFocus
                placeholder="Search college or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-surface-sunken border border-border text-fg placeholder:text-fg-disabled outline-none focus:border-primary dark:focus:border-sky-400 focus:ring-1 focus:ring-primary/20 dark:focus:ring-sky-400/30 transition-all font-sans"
              />
            </div>

            {/* College List (Shows 4 to 5 colleges with invisible smooth scroller) */}
            <div className="overflow-y-auto overscroll-contain max-h-[175px] space-y-1 pr-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
              {filteredColleges.length === 0 ? (
                <div className="py-4 text-center text-xs text-fg-disabled italic">
                  No college found
                </div>
              ) : (
                filteredColleges.map((c) => {
                  const isSelected = selectedCollege?._id === c._id || selectedCollege?.college_code === c.college_code;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => handleSelectCollege(c._id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-sky-400/15 text-fg dark:text-white font-bold border border-primary/25 dark:border-sky-400/35 shadow-2xs'
                          : 'hover:bg-surface-sunken text-fg-muted hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center min-w-0 pr-2">
                        <span className={`text-xs font-mono font-bold tracking-wider ${
                          isSelected ? 'text-primary dark:text-sky-300' : 'text-primary dark:text-sky-400'
                        }`}>
                          [{c.college_code}]
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={14} strokeWidth={2.5} className="text-primary dark:text-sky-300 shrink-0 ml-1.5" />
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
