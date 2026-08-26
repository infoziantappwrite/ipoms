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

export interface College {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
  logo_url?: string;
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
    setCoordinatorSelectedIds(getCoordinatorSelectedColleges());
    const handleCollegesChange = (e: any) => {
      if (e.detail?.selectedIds) {
        setCoordinatorSelectedIds(e.detail.selectedIds);
      } else {
        setCoordinatorSelectedIds(getCoordinatorSelectedColleges());
      }
    };
    window.addEventListener('ipoms_coordinator_colleges_changed', handleCollegesChange);
    return () => window.removeEventListener('ipoms_coordinator_colleges_changed', handleCollegesChange);
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
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer select-none ${
          selected
            ? 'bg-blue-50/90 dark:bg-sky-950/60 border-blue-300 dark:border-sky-500/50 text-blue-900 dark:text-sky-200 hover:bg-blue-100 dark:hover:bg-sky-900/60 font-mono tracking-wide ring-1 ring-blue-400/30 dark:ring-sky-400/30'
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
            <span className="font-black text-blue-700 dark:text-sky-400 font-mono text-xs tracking-wider">
              [{selected.college_code}]
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
          className={`${selected ? 'text-blue-700 dark:text-sky-400' : 'text-fg-subtle'} shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Dropdown Popover (Dark Mode Compatible) ───────────────────── */}
      {isOpen && (
        <div
          className={`absolute top-full ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-84 sm:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-fadeIn text-fg`}
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-border bg-surface-sunken">
            <div className="relative flex items-center">
              <Search
                size={14}
                className="absolute left-3 text-fg-subtle pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search college code or name…"
                className="w-full bg-surface border border-border text-xs text-fg pl-9 pr-3 py-1.5 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled font-normal shadow-2xs"
              />
            </div>
          </div>

          {/* List of Colleges (Shows Full Name & Acronym) */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar bg-surface divide-y divide-border/40">
            {/* Optional All Colleges item */}
            {allowAll && (!searchTerm || 'all colleges'.includes(searchTerm.toLowerCase())) && (
              <button
                type="button"
                onClick={handleSelectAll}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isAll
                    ? 'bg-primary/15 text-primary font-bold'
                    : 'hover:bg-surface-raised text-fg font-semibold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-primary shrink-0" />
                  <span>{allLabel}</span>
                </div>
                {isAll && <Check size={14} className="text-primary shrink-0" />}
              </button>
            )}

            {prioritizedColleges.length === 0 ? (
              <div className="py-6 text-center text-xs text-fg-disabled">
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
                    onClick={() => handleSelectCollege(college)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50/90 dark:bg-sky-950/70 text-blue-950 dark:text-sky-200 font-bold'
                        : isPinned
                        ? 'bg-primary/5 hover:bg-primary/10 text-fg'
                        : 'hover:bg-surface-raised text-fg'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-blue-700 dark:text-sky-400 font-mono text-xs tracking-wider">
                          [{college.college_code}]
                        </span>
                        <span className="truncate font-medium">{college.college_name}</span>
                        {isPinned && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold tracking-tight">
                            <Sparkles size={9} /> Focus
                          </span>
                        )}
                      </div>
                      {college.location && (
                        <span className="text-micro text-fg-subtle mt-0.5">
                          {college.location}
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <Check size={14} className="text-blue-700 dark:text-sky-400 shrink-0 mt-0.5" />
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
