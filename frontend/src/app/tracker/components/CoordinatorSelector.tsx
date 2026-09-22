'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, User, Users, Check, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';

import { College } from '@/components/CollegeSelector';

export interface CoordinatorItem {
  _id: string;
  full_name: string;
  official_email?: string;
  primary_mobile?: string;
  presence_status?: string;
  focus_colleges?: College[];
  focus_college_ids?: string[];
}

interface Props {
  currentUserId: string;
  selectedCoordinatorId: string;
  onSelectCoordinator: (id: string, name: string, focusColleges?: College[]) => void;
}

export function CoordinatorSelector({
  currentUserId,
  selectedCoordinatorId,
  onSelectCoordinator,
}: Props) {
  const [coordinators, setCoordinators] = useState<CoordinatorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    apiFetch('/coordinators')
      .then((res) => {
        if (isMounted && res.success && Array.isArray((res.data as any)?.coordinators)) {
          setCoordinators((res.data as any).coordinators);
        }
      })
      .catch((err) => console.error('[CoordinatorSelector] Fetch failed', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
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

  const isViewingSelf = !selectedCoordinatorId || selectedCoordinatorId === currentUserId;
  const isViewingAll = selectedCoordinatorId === 'all';
  const currentSelectedCoord = coordinators.find((c) => c._id === selectedCoordinatorId);

  const filteredCoordinators = coordinators.filter((c) => {
    const nameLower = (c.full_name || '').toLowerCase().trim();
    if (nameLower === 'administrator' || nameLower === 'admin' || c.official_email?.toLowerCase().startsWith('admin@')) {
      return false;
    }
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      nameLower.includes(q) ||
      (c.official_email && c.official_email.toLowerCase().includes(q))
    );
  });

  const getLabel = () => {
    if (isViewingSelf) return 'My Calling Sheet';
    if (isViewingAll) return 'All Coordinators';
    if (currentSelectedCoord) return currentSelectedCoord.full_name;
    return 'Select User';
  };

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        onClick={() => {
          triggerHaptic('light');
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 shadow-2xs cursor-pointer select-none active:scale-[0.99] ${
          isViewingSelf
            ? 'bg-surface hover:bg-surface-raised border-border text-fg'
            : isViewingAll
            ? 'bg-purple-500/10 dark:bg-purple-400/15 border-purple-400/30 text-purple-700 dark:text-purple-300 font-bold'
            : 'bg-amber-500/10 dark:bg-amber-400/15 border-amber-400/30 text-amber-800 dark:text-amber-300 font-bold ring-1 ring-amber-400/20'
        }`}
        title={
          isViewingSelf
            ? 'Viewing your own live calling sheet (Edit Mode)'
            : `Viewing ${getLabel()} in Read-Only Mode`
        }
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {isViewingAll ? (
            <Users size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
          ) : (
            <User size={13} className={isViewingSelf ? 'text-primary' : 'text-amber-600 dark:text-amber-400'} />
          )}
          <span className="font-semibold">{getLabel()}</span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-60 bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-fg select-none">
          {/* Search Box */}
          <div className="p-2 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234]">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-fg-subtle pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search coordinator…"
                className="w-full bg-surface border border-border text-xs text-fg pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 placeholder:text-fg-disabled font-normal shadow-2xs"
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-0.5 no-scrollbar divide-y divide-border/30 bg-surface">
            {/* My Sheet (Live / Edit Mode) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onSelectCoordinator(currentUserId, 'My Calling Sheet');
                setIsOpen(false);
                setSearch('');
              }}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                isViewingSelf
                  ? 'bg-primary/10 dark:bg-sky-400/15 text-primary dark:text-sky-300 font-bold border border-primary/20'
                  : 'hover:bg-surface-raised text-fg font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                  ME
                </div>
                <div className="font-semibold">My Calling Sheet</div>
              </div>
              {isViewingSelf && <Check size={14} strokeWidth={2.5} className="text-primary shrink-0" />}
            </button>

            {/* All Coordinators Overview */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onSelectCoordinator('all', 'All Coordinators');
                setIsOpen(false);
                setSearch('');
              }}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                isViewingAll
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-400/30'
                  : 'hover:bg-surface-raised text-fg font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Users size={11} />
                </div>
                <div className="font-semibold">All Coordinators</div>
              </div>
              {isViewingAll && <Check size={14} strokeWidth={2.5} className="text-purple-600 shrink-0" />}
            </button>

            {/* Other Coordinators */}
            {filteredCoordinators
              .filter((c) => c._id !== currentUserId)
              .map((coord) => {
                const isSelected = selectedCoordinatorId === coord._id;
                const initials = coord.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'PC';

                return (
                  <button
                    key={coord._id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectCoordinator(coord._id, coord.full_name, coord.focus_colleges);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold border border-amber-400/30'
                        : 'hover:bg-surface-raised text-fg font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-5 h-5 rounded-full bg-surface-sunken border border-border text-fg-muted flex items-center justify-center font-bold text-[9px] shrink-0">
                        {initials}
                      </div>
                      <div className="font-semibold text-fg truncate">
                        {coord.full_name}
                      </div>
                    </div>
                    {isSelected && <Check size={14} strokeWidth={2.5} className="text-amber-600 shrink-0" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
