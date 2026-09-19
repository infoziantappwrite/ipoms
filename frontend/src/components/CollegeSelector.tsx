'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Search, Check, Building2, Globe, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  setActiveCollege,
  getCoordinatorSelectedColleges,
  sortCollegesWithPriority,
  getCachedColleges,
  fetchAllCollegesCached,
} from '@/lib/collegeSession';
import { triggerHaptic } from '@/lib/haptics';

export interface College {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
  logo_url?: string;
  college_website?: string;
  tpo_name?: string;
  tpo_email?: string;
  tpo_contact_mobile?: string;
  tpo_designation?: string;
  tpo_alternate_mobile?: string;
  tpo_alternate_email?: string;
  departments?: string[];
  student_strength?: number;
  nirf_ranking?: string;
  highest_package_lpa?: string;
  average_package_lpa?: string;
  lowest_package_lpa?: string;
  established_year?: string | number;
  landmarks?: string;
  address?: string;
  map_location?: string;
  accreditations?: string;
  placement_notes?: string;
  status?: string;
}

interface Props {
  selectedCollegeId: string;
  onSelect: (id: string, name: string) => void;
  onSelectCollege?: (col: College | null) => void;
  allowAll?: boolean;
  allLabel?: string;
  label?: string;
  placeholder?: string;
  align?: 'left' | 'right';
}

export function CollegeSelector({
  selectedCollegeId,
  onSelect,
  onSelectCollege,
  allowAll = false,
  allLabel = 'All Colleges',
  label = 'College:',
  placeholder = '— Select College —',
  align = 'left',
}: Props) {
  const [colleges, setColleges] = useState<College[]>(() => getCachedColleges());
  const [loading, setLoading] = useState(() => getCachedColleges().length === 0);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coordinatorSelectedIds, setCoordinatorSelectedIds] = useState<string[]>(getCoordinatorSelectedColleges);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncFocus = (e?: any) => {
      const ids = e?.detail?.selectedIds || getCoordinatorSelectedColleges();
      setCoordinatorSelectedIds(ids);
    };
    syncFocus();
    window.addEventListener('ipoms_coordinator_colleges_changed', syncFocus);
    window.addEventListener('ipoms_focus_updated', syncFocus);
    return () => {
      window.removeEventListener('ipoms_coordinator_colleges_changed', syncFocus);
      window.removeEventListener('ipoms_focus_updated', syncFocus);
    };
  }, []);

  // Listen to global colleges cache updates
  useEffect(() => {
    const handleCollegesLoaded = (e: any) => {
      if (Array.isArray(e.detail?.colleges) && e.detail.colleges.length > 0) {
        setColleges(e.detail.colleges);
        setLoading(false);
      }
    };
    window.addEventListener('ipoms_colleges_loaded', handleCollegesLoaded);
    return () => window.removeEventListener('ipoms_colleges_loaded', handleCollegesLoaded);
  }, []);

  // Listen to active college change
  useEffect(() => {
    const handleActiveCollegeChange = (e: any) => {
      if (e.detail?.id && e.detail.id !== selectedCollegeId) {
        onSelect(e.detail.id, e.detail.name || '');
        if (onSelectCollege) onSelectCollege(e.detail.obj || null);
      }
    };
    window.addEventListener('ipoms_college_change', handleActiveCollegeChange);
    return () => window.removeEventListener('ipoms_college_change', handleActiveCollegeChange);
  }, [selectedCollegeId, onSelect, onSelectCollege]);

  useEffect(() => {
    fetchAllCollegesCached()
      .then((list) => {
        if (list.length > 0) {
          setColleges(list);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isAll = allowAll && selectedCollegeId === 'all';
  const selected = colleges.find(
    (c) => c._id === selectedCollegeId || c.college_code === selectedCollegeId || c.college_name === selectedCollegeId
  );

  const rawFiltered = colleges.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.college_code.toLowerCase().includes(q) ||
      c.college_name.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q))
    );
  });

  const prioritizedColleges = sortCollegesWithPriority(rawFiltered, coordinatorSelectedIds);

  const handleSelectCollege = (college: College) => {
    setActiveCollege(college._id, college.college_name, college);
    onSelect(college._id, college.college_name);
    if (onSelectCollege) onSelectCollege(college);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSelectAll = () => {
    onSelect('all', allLabel);
    if (onSelectCollege) onSelectCollege(null);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative flex items-center gap-2" ref={containerRef}>
      {label && (
        <span className="text-xs text-fg-subtle font-semibold whitespace-nowrap">
          {label}
        </span>
      )}

      {/* ── Trigger Button (Shrinks to Acronym when selected) ─────────── */}
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          triggerHaptic('light');
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 shadow-2xs cursor-pointer select-none active:scale-[0.992] ${
          selected
            ? 'bg-primary/10 dark:bg-sky-400/15 border-primary/40 dark:border-sky-400/35 text-primary dark:text-sky-300 hover:bg-primary/15 dark:hover:bg-sky-400/20 font-mono tracking-wide ring-1 ring-primary/20 dark:ring-sky-400/20'
            : isAll
            ? 'bg-surface-sunken border-border text-fg hover:bg-surface-raised'
            : 'bg-surface border-border text-fg-muted hover:bg-surface-raised min-w-[160px]'
        }`}
        title={
          selected
            ? `${selected.college_name} (${selected.college_code})`
            : isAll
            ? allLabel
            : 'Select College'
        }
      >
        <div className="flex items-center gap-1.5 truncate">
          {selected ? (
            <span className="font-bold text-primary dark:text-sky-300 font-mono text-xs tracking-wider">
              {selected.college_code}
            </span>
          ) : isAll ? (
            <span className="font-semibold text-fg text-xs">
              {allLabel}
            </span>
          ) : (
            <span className="text-fg-subtle font-normal">
              {loading ? 'Loading colleges…' : placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`${selected ? 'text-primary dark:text-sky-300' : 'text-fg-subtle'} shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Dropdown Popover (Dark Mode Compatible) ───────────────────── */}
      {isOpen && (
        <div
          className={`absolute top-full ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          } mt-1.5 w-52 sm:w-60 bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ease-out text-fg select-none`}
        >
          {/* Search Box */}
          <div className="p-2 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234]">
            <div className="relative flex items-center">
              <Search
                size={14}
                className="absolute left-2.5 text-fg-subtle pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search college…"
                className="w-full bg-surface border border-border text-xs text-fg pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-primary dark:focus:border-sky-400 focus:ring-1 focus:ring-primary/30 dark:focus:ring-sky-400/30 placeholder:text-fg-disabled font-normal shadow-2xs"
              />
            </div>
          </div>

          {/* List of Colleges (Shows 4 to 5 colleges with invisible smooth scroller) */}
          <div className="max-h-[175px] overflow-y-auto overscroll-contain p-1.5 space-y-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-surface divide-y divide-border/30">
            {/* Optional All Colleges item */}
            {allowAll && (!searchTerm || 'all colleges'.includes(searchTerm.toLowerCase())) && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  handleSelectAll();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                  isAll
                    ? 'bg-primary/10 dark:bg-sky-400/15 text-primary dark:text-sky-300 font-bold shadow-2xs border border-primary/20 dark:border-sky-400/30'
                    : 'hover:bg-surface-raised text-fg font-semibold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-primary dark:text-sky-400 shrink-0" />
                  <span>{allLabel}</span>
                </div>
                {isAll && <Check size={14} strokeWidth={2.5} className="text-primary dark:text-sky-300 shrink-0" />}
              </button>
            )}

            {prioritizedColleges.length === 0 ? (
              <div className="py-6 text-center text-xs text-fg-disabled italic">
                No matching colleges found
              </div>
            ) : (
              prioritizedColleges.map((college) => {
                const isCurrent = college._id === selectedCollegeId;
                const isPinned = (college as any).isPinned;
                return (
                  <button
                    key={college._id}
                    type="button"
                    aria-label={`Select ${college.college_name}, code ${college.college_code}${isPinned ? ', Assigned Focus Institution' : ''}${isCurrent ? ', currently active' : ''}`}
                    onClick={() => {
                      triggerHaptic('selection');
                      handleSelectCollege(college);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                      isCurrent
                        ? 'bg-primary/10 dark:bg-sky-400/15 border border-primary/25 dark:border-sky-400/35 text-fg dark:text-white font-bold shadow-2xs'
                        : isPinned
                        ? 'bg-primary/5 dark:bg-sky-400/5 hover:bg-primary/10 dark:hover:bg-sky-400/10 text-fg'
                        : 'hover:bg-surface-raised text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-2">
                      <span className={`font-bold font-mono text-xs tracking-wider ${
                        isCurrent
                          ? 'text-primary dark:text-sky-300'
                          : 'text-primary dark:text-sky-400'
                      }`}>
                        {college.college_code}
                      </span>
                      {isPinned && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/15 dark:bg-amber-400/15 text-amber-600 dark:text-amber-300 text-[9px] font-bold tracking-tight shrink-0 border border-amber-500/20 dark:border-amber-400/30" title="Assigned focus institution for your account">
                          <Sparkles size={8} className="text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" /> Focus
                          <span className="sr-only">(Assigned focus institution)</span>
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <Check size={14} strokeWidth={2.5} className="text-primary dark:text-sky-300 shrink-0" aria-hidden="true" />
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
