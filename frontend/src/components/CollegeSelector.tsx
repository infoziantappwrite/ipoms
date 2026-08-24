'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Search, Check, Building2, Globe } from 'lucide-react';
import { apiFetch } from '@/lib/api';

import { setActiveCollege } from '@/lib/collegeSession';

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
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          setColleges((data.data as any).colleges);
        }
      })
      .catch(console.error)
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
  const selected = colleges.find((c) => c._id === selectedCollegeId);

  const filteredColleges = colleges.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.college_code.toLowerCase().includes(q) ||
      c.college_name.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q))
    );
  });

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
        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
          {label}
        </span>
      )}

      {/* ── Trigger Button (Shrinks to Acronym when selected) ─────────── */}
      <button
        type="button"
        disabled={loading}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
          selected
            ? 'bg-blue-50/90 border-blue-200 text-blue-900 hover:bg-blue-100 font-mono tracking-wide'
            : isAll
            ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 min-w-[160px]'
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
            <span className="font-bold text-primary font-mono text-xs">
              [{selected.college_code}]
            </span>
          ) : isAll ? (
            <span className="font-semibold text-slate-800 text-xs">
              {allLabel}
            </span>
          ) : (
            <span className="text-slate-500 font-normal">
              {loading ? 'Loading colleges…' : placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Dropdown Popover ──────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={`absolute top-full ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-84 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-fadeIn`}
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/75">
            <div className="relative flex items-center">
              <Search
                size={14}
                className="absolute left-3 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search college code or name…"
                className="w-full bg-white border border-slate-200 text-xs text-slate-800 pl-9 pr-3 py-1.5 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 font-normal shadow-2xs"
              />
            </div>
          </div>

          {/* List of Colleges (Shows Full Name & Acronym) */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {/* Optional All Colleges item */}
            {allowAll && (!searchTerm || 'all colleges'.includes(searchTerm.toLowerCase())) && (
              <button
                type="button"
                onClick={handleSelectAll}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isAll
                    ? 'bg-blue-50 text-blue-950 font-bold'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-primary shrink-0" />
                  <span>{allLabel}</span>
                </div>
                {isAll && <Check size={14} className="text-primary shrink-0" />}
              </button>
            )}

            {filteredColleges.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching colleges found
              </div>
            ) : (
              filteredColleges.map((college) => {
                const isCurrent = college._id === selectedCollegeId;
                return (
                  <button
                    key={college._id}
                    type="button"
                    onClick={() => handleSelectCollege(college)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50 text-blue-950 font-semibold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-primary font-mono text-xs">
                          [{college.college_code}]
                        </span>
                        <span className="truncate font-medium">{college.college_name}</span>
                      </div>
                      {college.location && (
                        <span className="text-micro text-slate-400 mt-0.5">
                          {college.location}
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <Check size={14} className="text-primary shrink-0 mt-0.5" />
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
