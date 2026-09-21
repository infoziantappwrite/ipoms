'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  ChevronDown,
  Search,
  Check,
  Building2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { useToast } from '@/components/ui/Toast';
import { setActiveCollege } from '@/lib/collegeSession';
import { useUndoRedo } from '@/hooks/useUndoRedo';

interface AvailableCollege {
  college_id: string;
  college_name: string;
  college_code: string;
  logo_url?: string;
  due_now_count: number;
  overdue_count: number;
  total_count: number;
}

interface FollowUpLead {
  _id: string;
  company_name: string;
  job_role: string;
  ctc_lpa?: string;
  company_type?: string;
  phone_number: string;
  mobile_numbers?: string[];
  email_id: string;
  email_ids?: string[];
  college_id: string;
  college_name: string;
  college_code: string;
  college_logo?: string;
  pipeline_section: string;
  pipeline_section_label: string;
  follow_up_date: string;
  follow_up_date_raw?: string;
  comments: string;
  coordinator_name?: string;
  urgency: 'due_now' | 'overdue' | 'upcoming';
}

interface Props {
  selectedCollegeIds: string[];
}

function formatFollowUpDateDisplay(dateStr: string, urgency: string): { label: string; subText?: string } {
  if (!dateStr) return { label: 'No date scheduled' };
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formatted = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.round((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));

      if (urgency === 'due_now') {
        return { label: `Today, ${formatted}` };
      }
      if (urgency === 'overdue') {
        return {
          label: formatted,
          subText: diffDays > 0 ? `${diffDays} ${diffDays === 1 ? 'day' : 'days'} overdue` : 'Overdue',
        };
      }
      return { label: formatted };
    }
  } catch {}
  return { label: dateStr };
}

export function FollowUpSmartQueueWidget({ selectedCollegeIds }: Props) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<FollowUpLead[]>([]);
  const [colleges, setColleges] = useState<AvailableCollege[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overdue' | 'due_now'>('overdue');
  const [loading, setLoading] = useState(true);
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [isSectionCollapsed, setIsSectionCollapsed] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [portalPos, setPortalPos] = useState<{ top: number; right: number } | null>(null);

  // Close dropdown on outside click (skip the trigger button — its onClick handles toggle)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setIsDropdownOpen(false);
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Update portal position whenever dropdown opens or window scrolls/resizes
  useEffect(() => {
    if (!isDropdownOpen) return;
    const update = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPortalPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isDropdownOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    }
    if (isDropdownOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  const filteredColleges = useMemo(() => {
    const q = dropdownSearch.toLowerCase().trim();
    if (!q) return colleges;
    return colleges.filter(
      (c) =>
        (c.college_code && c.college_code.toLowerCase().includes(q)) ||
        (c.college_name && c.college_name.toLowerCase().includes(q))
    );
  }, [colleges, dropdownSearch]);

  const handleSelectCollege = (collegeId: string) => {
    triggerHaptic('selection');
    setSelectedCollegeId(collegeId);
    setIsSectionCollapsed(false);
    setActiveTab('overdue');
    setIsDropdownOpen(false);
    setDropdownSearch('');
  };

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const collegeParam = selectedCollegeIds.length > 0 ? selectedCollegeIds.join(',') : '';
      const res = await apiFetch(`/weekly-tracker/pending-followups?college_ids=${collegeParam}`);
      if (res.success && res.data) {
        const data = res.data as any;
        setLeads(data.follow_ups || []);
        setColleges(data.available_colleges || []);
      }
    } catch (e) {
      console.error('[SmartQueue] Load failed', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCollegeIds]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  // ── Undo / Redo for follow-up date changes ──
  const { pushAction } = useUndoRedo({
    enableKeyboardShortcuts: true,
  });

  const handleReschedule = async (rowId: string, newDate: string, isUndoRedo = false) => {
    triggerHaptic('medium');
    setUpdatingRowId(rowId);

    const currentLead = leads.find((l) => l._id === rowId);
    const prevDate = currentLead?.follow_up_date || currentLead?.follow_up_date_raw || '';
    const companyName = currentLead?.company_name || 'Company';

    if (!isUndoRedo && currentLead && prevDate !== newDate) {
      pushAction({
        description: `Rescheduled "${companyName}" to ${newDate || 'None'}`,
        undo: async () => {
          await handleReschedule(rowId, prevDate, true);
        },
        redo: async () => {
          await handleReschedule(rowId, newDate, true);
        },
      });
    }

    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          follow_up_date: newDate || null,
          is_undo: isUndoRedo,
        }),
      });
      if (res.success) {
        if (!isUndoRedo) {
          toast(`Follow-up date updated for ${companyName} (Ctrl+Z to Undo)`, 'success');
        }
        await loadFollowUps();
      } else {
        toast((res as any).error?.message || (res as any).error || 'Failed to update follow-up date', 'error');
      }
    } catch (err: any) {
      console.error('Update follow-up date failed', err);
      toast('Failed to update follow-up date', 'error');
    } finally {
      setUpdatingRowId(null);
    }
  };

  // Filter leads by selected college first
  const collegeLeads = useMemo(() => {
    if (!selectedCollegeId) return [];
    return leads.filter((l) => l.college_id === selectedCollegeId);
  }, [leads, selectedCollegeId]);

  const dueNowCount = useMemo(() => collegeLeads.filter((l) => l.urgency === 'due_now').length, [collegeLeads]);
  const overdueCount = useMemo(() => collegeLeads.filter((l) => l.urgency === 'overdue').length, [collegeLeads]);
  const upcomingCount = useMemo(() => collegeLeads.filter((l) => l.urgency === 'upcoming').length, [collegeLeads]);

  const filteredLeads = useMemo(() => {
    return collegeLeads.filter((l) => l.urgency === activeTab);
  }, [collegeLeads, activeTab]);

  const selectedCollegeObj = useMemo(() => {
    return colleges.find((c) => c.college_id === selectedCollegeId);
  }, [colleges, selectedCollegeId]);

  const totalAllOverdue = useMemo(() => colleges.reduce((sum, c) => sum + (c.overdue_count || 0), 0), [colleges]);
  const totalAllDueNow = useMemo(() => colleges.reduce((sum, c) => sum + (c.due_now_count || 0), 0), [colleges]);
  const totalAllPending = totalAllOverdue + totalAllDueNow;

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  // Helper to render the floating popover dropdown via portal (escapes overflow:hidden parents)
  const renderDropdownPopover = () => {
    if (!isDropdownOpen || !portalPos) return null;
    const popover = (
      <div
        ref={dropdownRef}
        style={{ position: 'fixed', top: portalPos.top, right: portalPos.right, zIndex: 9999 }}
        className="w-56 bg-white dark:bg-[#161D2E] border border-border-strong dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ease-out origin-top-right text-fg select-none"
      >
        {/* Search Box */}
        {colleges.length > 3 && (
          <div className="p-2 border-b border-border/60 bg-slate-50 dark:bg-[#1A2234]">
            <div className="relative flex items-center">
              <Search
                size={14}
                className="absolute left-2.5 text-fg-subtle pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={dropdownSearch}
                onChange={(e) => setDropdownSearch(e.target.value)}
                placeholder="Search college…"
                className="w-full bg-surface border border-border text-xs text-fg pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-primary dark:focus:border-sky-400 focus:ring-1 focus:ring-primary/30 dark:focus:ring-sky-400/30 placeholder:text-fg-disabled font-normal shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* College List */}
        <div className="max-h-[220px] overflow-y-auto overscroll-contain p-1.5 space-y-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-surface divide-y divide-border/30">
          {/* Reset/Clear Option */}
          <button
            type="button"
            onClick={() => handleSelectCollege('')}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
              !selectedCollegeId
                ? 'bg-primary/10 dark:bg-sky-400/15 text-primary dark:text-sky-300 font-bold shadow-2xs border border-primary/20'
                : 'hover:bg-surface-raised text-fg-subtle font-medium'
            }`}
          >
            <span>— Select College to Check —</span>
            {!selectedCollegeId && (
              <Check size={14} strokeWidth={2.5} className="text-primary dark:text-sky-300 shrink-0" />
            )}
          </button>

          {filteredColleges.length === 0 ? (
            <div className="py-5 text-center text-xs text-fg-disabled italic">
              No colleges match "{dropdownSearch}"
            </div>
          ) : (
            filteredColleges.map((c) => {
              const isSelected = selectedCollegeId === c.college_id;
              const hasDue = c.due_now_count > 0;
              const hasOverdue = c.overdue_count > 0;
              const totalPending = c.due_now_count + c.overdue_count;

              return (
                <button
                  key={c.college_id}
                  type="button"
                  onClick={() => handleSelectCollege(c.college_id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-primary/10 dark:bg-sky-400/15 text-primary dark:text-sky-300 font-bold shadow-2xs border border-primary/20 dark:border-sky-400/30'
                      : 'hover:bg-surface-raised text-fg font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-fg shadow-2xs shrink-0">
                      {c.college_code || 'COLLEGE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {totalPending > 0 ? (
                      <div className="flex items-center gap-1">
                        {hasDue && (
                          <span
                            title={`${c.due_now_count} Due Today`}
                            className="text-micro font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs"
                          >
                            <Flame size={10} /> {c.due_now_count}
                          </span>
                        )}
                        {hasOverdue && (
                          <span
                            title={`${c.overdue_count} Overdue`}
                            className="text-micro font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs"
                          >
                            <AlertTriangle size={10} /> {c.overdue_count}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-micro text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-950/40">
                        0 pending
                      </span>
                    )}

                    {isSelected && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-primary dark:text-sky-300 shrink-0"
                      />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(popover, document.body);
  };

  // ── State 1: When no college is selected ──
  if (!selectedCollegeId) {
    // 1A. Static calm view when there is NO pending follow-up work
    if (totalAllPending === 0) {
      return (
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => {
              triggerHaptic('selection');
              setIsDropdownOpen((prev) => !prev);
            }}
            className="py-3.5 px-5 flex items-center justify-between gap-4 bg-surface dark:bg-[#111622] rounded-2xl border border-border dark:border-slate-800 shadow-2xs hover:border-border-strong dark:hover:border-slate-700 transition-colors cursor-pointer group flex-wrap relative select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0 z-10">
              {/* Static Clear Icon */}
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} strokeWidth={2.2} />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-fg tracking-tight flex items-center gap-1.5">
                    <span>Follow-up Queue Status</span>
                  </h4>
                  <span className="text-micro font-semibold bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    All Clear (0 Pending)
                  </span>
                </div>
                <p className="text-xs text-fg-subtle font-normal mt-0.5">
                  No scheduled follow-up drives pending for today. Select a college to review institutional records.
                </p>
              </div>
            </div>

            {/* Right Actions: Sync & Select College */}
            <div className="flex items-center gap-2 shrink-0 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setSelectedCollegeId('');
                  loadFollowUps();
                  toast('Syncing follow-up leads from Weekly Tracker…', 'info');
                }}
                title="Sync with Weekly Tracker"
                className="h-8 w-8 rounded-xl bg-surface hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>

              <div
                ref={triggerRef}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-border text-fg text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <span>Select College</span>
                <ChevronDown size={14} strokeWidth={2} className={`transition-transform duration-200 ease-out ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>

          {/* Dropdown Popover attached to the static banner */}
          {renderDropdownPopover()}
        </div>
      );
    }

    // 1B. Attention Banner when pending follow-up drives exist (> 0)
    return (
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => {
            triggerHaptic('selection');
            setIsDropdownOpen((prev) => !prev);
          }}
          className="py-4 px-5 flex items-center justify-between gap-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-primary/10 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-sky-950/40 rounded-2xl border-2 border-rose-500/30 dark:border-rose-500/40 shadow-md hover:shadow-lg transition-all cursor-pointer group flex-wrap relative overflow-hidden ring-4 ring-rose-500/10 dark:ring-rose-500/20"
        >
          {/* Continuous ambient shimmer wave */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 dark:via-white/10 to-transparent -translate-x-full animate-[indeterminate_2.5s_infinite_linear] pointer-events-none" />

          <div className="flex items-center gap-3.5 min-w-0 z-10">
            {/* Pulsing Beacon Icon */}
            <div className="relative flex items-center justify-center shrink-0">
              <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-rose-500 opacity-50" />
              <span className="animate-pulse absolute inline-flex h-12 w-12 rounded-full bg-amber-400/30" />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 via-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md relative group-hover:scale-110 transition-transform">
                <Flame size={22} className="animate-bounce" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-extrabold text-fg tracking-tight flex items-center gap-1.5">
                  <span>Action Required: Follow-up Drives Pending</span>
                  <Sparkles size={14} className="text-amber-500 animate-spin" />
                </h4>
                {totalAllOverdue > 0 && (
                  <span className="text-micro sm:text-xs font-bold bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-xs animate-pulse flex items-center gap-1">
                    <AlertTriangle size={11} strokeWidth={2.5} />
                    {totalAllOverdue} Total Overdue
                  </span>
                )}
                {totalAllDueNow > 0 && (
                  <span className="text-micro sm:text-xs font-bold bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Flame size={11} />
                    {totalAllDueNow} Due Today
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-subtle font-medium mt-1">
                Click here or choose a college to review and resolve scheduled follow-ups before proceeding with daily operations.
              </p>
            </div>
          </div>

          {/* Right Actions: Sync & Select College */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            {/* Sync Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setSelectedCollegeId('');
                loadFollowUps();
                toast('Syncing follow-up leads from Weekly Tracker…', 'info');
              }}
              title="Sync with Weekly Tracker"
              className="h-9 w-9 rounded-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 hover:from-rose-500 hover:via-orange-500 hover:to-amber-400 hover:shadow-lg hover:shadow-orange-500/35 hover:scale-105 transition-all cursor-pointer border border-white/20 active:scale-95"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Select College */}
            <div ref={triggerRef} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white text-xs font-bold shadow-md shadow-orange-500/25 group-hover:from-rose-500 group-hover:via-orange-500 group-hover:to-amber-400 group-hover:shadow-lg group-hover:shadow-orange-500/35 group-hover:scale-105 transition-all shrink-0 border border-white/20">
              <span>Select College</span>
              <ChevronDown size={16} strokeWidth={2.5} className={`transition-transform duration-200 ease-out ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* Dropdown Popover attached to the animated banner */}
        {renderDropdownPopover()}
      </div>
    );
  }

  // ── State 2: A college is selected -> Render the full widget card with its header and cards ──
  const selectedCollegePending = dueNowCount + overdueCount;

  return (
    <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
      {/* ── Widget Header ─────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-6 py-3.5 bg-surface-sunken/80 flex-wrap gap-3 transition-colors ${!isSectionCollapsed ? 'border-b border-border' : ''}`}>
        <div
          onClick={() => {
            triggerHaptic('light');
            setIsSectionCollapsed((prev) => !prev);
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          title={isSectionCollapsed ? "Click to open / pull down follow-up section" : "Click to minimize / pull up follow-up section"}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform ${
            selectedCollegePending > 0
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          }`}>
            {selectedCollegePending > 0 ? (
              <Flame size={17} className="text-rose-500" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-fg tracking-tight flex items-center gap-1.5">
              <span>Follow up Due</span>
              <span className="font-mono text-micro font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:text-sky-300 border border-primary/20">
                {selectedCollegeObj?.college_code || selectedCollegeObj?.college_name}
              </span>
            </h2>
          </div>
        </div>

        {/* Right Side: Themed College Selector Dropdown, Filter Pills & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ── Themed College Selector Popover Dropdown ── */}
          <div className="relative">
            <button
              ref={triggerRef as any}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsDropdownOpen((prev) => !prev);
              }}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 shadow-2xs cursor-pointer select-none active:scale-[0.99] bg-primary/10 dark:bg-sky-400/15 border-primary/40 dark:border-sky-400/35 text-primary dark:text-sky-300 hover:bg-primary/15 dark:hover:bg-sky-400/20 ring-1 ring-primary/20 dark:ring-sky-400/20"
              title={selectedCollegeObj ? `${selectedCollegeObj.college_name} (${selectedCollegeObj.college_code})` : 'Select College'}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-mono font-bold text-xs tracking-wider text-primary dark:text-sky-300">
                  {selectedCollegeObj?.college_code || selectedCollegeObj?.college_name || 'COLLEGE'}
                </span>
              </div>
              <ChevronDown
                size={14}
                strokeWidth={2.2}
                className={`text-primary dark:text-sky-300 shrink-0 transition-transform duration-200 ease-out ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Floating Dropdown Popover */}
            {renderDropdownPopover()}
          </div>

          <div className="flex bg-surface p-1 rounded-xl border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                if (isSectionCollapsed) setIsSectionCollapsed(false);
                setActiveTab('overdue');
              }}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-bold ${
                activeTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
              }`}
            >
              <AlertTriangle size={12} strokeWidth={2.5} />
              <span>Overdue ({overdueCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                if (isSectionCollapsed) setIsSectionCollapsed(false);
                setActiveTab('due_now');
              }}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-bold ${
                activeTab === 'due_now'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
              }`}
            >
              <Flame size={12} strokeWidth={2.5} />
              <span>Due Today ({dueNowCount})</span>
            </button>
          </div>

          {/* Single Central Tracker Button */}
          <Link
            href={`/weekly-tracker?college_id=${selectedCollegeId}`}
            onClick={() => {
              if (selectedCollegeObj) {
                setActiveCollege(selectedCollegeObj.college_id, selectedCollegeObj.college_name);
              }
            }}
            className="h-8 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
            title={`Open ${selectedCollegeObj?.college_name || 'College'} in Weekly Tracker`}
          >
            <span>Tracker</span>
            <ChevronRight size={13} strokeWidth={2.5} />
          </Link>

          {/* Sync Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setSelectedCollegeId('');
              loadFollowUps();
              toast('Syncing follow-up leads from Weekly Tracker…', 'info');
            }}
            title="Sync with Weekly Tracker"
            className={`h-8 px-3 transition-all cursor-pointer border active:scale-95 flex items-center gap-1.5 text-xs font-semibold shadow-2xs ${
              selectedCollegePending > 0
                ? 'rounded-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white font-bold shadow-md shadow-orange-500/25 hover:from-rose-500 hover:via-orange-500 hover:to-amber-400 border-white/20'
                : 'rounded-xl bg-surface hover:bg-surface-raised border-border text-fg'
            }`}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          {/* Close / Go-back-to-Select-College Arrow Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSelectedCollegeId('');
              setIsSectionCollapsed(false);
            }}
            className="h-8 w-8 rounded-full bg-surface hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Back to college selection"
          >
            <ChevronDown
              size={15}
              strokeWidth={2.4}
              className="rotate-0 text-fg-subtle"
            />
          </button>
        </div>
      </div>

      {/* ── Main Content Area (Cards) — Shutter Roll-Up/Down Animation ────────────────── */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isSectionCollapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-[3000px] opacity-100 p-4 sm:p-5 bg-surface'
        }`}
      >
        {collegeLeads.length === 0 ? (
          /* State 2b: Selected college has 0 pending follow-ups */
          <div className="py-6 px-4 text-center flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="text-xs font-semibold">
              All up to date — No pending follow-ups for {selectedCollegeObj?.college_code || selectedCollegeObj?.college_name || 'this college'}!
            </span>
          </div>
        ) : (
          /* State 2c: Display clean cards for the selected college */
          <div>
            {filteredLeads.length === 0 ? (
              <div className="py-6 text-center text-xs text-fg-subtle bg-surface-sunken/30 rounded-xl border border-border">
                No {activeTab === 'overdue' ? 'overdue' : 'due today'} follow-up drives found for this college.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map((lead) => {
                  const dateInfo = formatFollowUpDateDisplay(lead.follow_up_date, lead.urgency);
                  const isInProgress = lead.pipeline_section === 'in_progress' || lead.pipeline_section === 'companies_in_progress' || lead.pipeline_section === 'drive_in_progress';

                  return (
                    <div
                      key={lead._id}
                      className={`rounded-xl border p-4 transition-all flex flex-col justify-between relative shadow-xs hover:shadow-sm ${
                        lead.urgency === 'due_now'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 hover:border-amber-400'
                          : lead.urgency === 'overdue'
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60 hover:border-rose-400'
                          : 'bg-surface-sunken border-border hover:border-primary/40'
                      }`}
                    >
                      <div>
                        {/* Top Bar: College Badge + Pipeline Section + Date Urgency Badge */}
                        <div className="flex items-center justify-between gap-1.5 mb-2.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-micro font-bold bg-surface border border-border px-2 py-0.5 rounded-md text-fg font-mono shadow-2xs">
                              {lead.college_code || 'COLLEGE'}
                            </span>
                            <span
                              className={`text-micro font-bold px-2 py-0.5 rounded-full border ${
                                isInProgress
                                  ? 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 border-amber-300/80 dark:border-amber-800'
                                  : 'text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950/50 border-sky-300/80 dark:border-sky-800'
                              }`}
                            >
                              {isInProgress ? 'In Progress' : 'Pipeline'}
                            </span>
                          </div>

                          {/* Scheduled Date Pill */}
                          <span
                            className={`text-micro font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                              lead.urgency === 'due_now'
                                ? 'bg-amber-500 text-white animate-pulse'
                                : lead.urgency === 'overdue'
                                ? 'bg-rose-500 text-white'
                                : 'bg-surface border border-border text-fg-subtle'
                            }`}
                            title={dateInfo.subText ? `${dateInfo.label} (${dateInfo.subText})` : dateInfo.label}
                          >
                            {lead.urgency === 'due_now' ? (
                              <Flame size={11} strokeWidth={2.5} />
                            ) : lead.urgency === 'overdue' ? (
                              <AlertTriangle size={11} strokeWidth={2.5} />
                            ) : (
                              <Clock size={11} />
                            )}
                            <span>{dateInfo.label}</span>
                          </span>
                        </div>

                        {/* Company Name */}
                        <h3 className="text-sm font-bold text-fg tracking-tight leading-snug">
                          {lead.company_name}
                        </h3>
                      </div>

                      {/* Bottom: Inline Date Rescheduler */}
                      <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-fg-subtle">
                            Reschedule:
                          </span>
                          <SmoothDatePicker
                            value={lead.follow_up_date || ''}
                            onChange={(newDate) => handleReschedule(lead._id, newDate)}
                            minDate={todayStr}
                            placeholder="Reschedule"
                            usePortal
                            clearable={false}
                            variant="pill"
                            size="sm"
                            theme={lead.urgency === 'due_now' ? 'amber' : 'navy'}
                            disabled={updatingRowId === lead._id}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
