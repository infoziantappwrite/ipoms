'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Calendar, Search, Building2, User, Phone, Mail, FileText, CheckCircle2, ChevronDown, Trophy, ArrowRightCircle, Check, Filter, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { DailyLeadRow, CollegeOption } from './LeadsTable';
import { useToast } from '@/components/ui/Toast';
import { readSessionUser } from '@/lib/session';
import { validateAndNormalizeMultiEmail } from '@/lib/contactValidation';
import { getCoordinatorSelectedColleges, getDefaultOfficialCollegeIdsForUser } from '@/lib/collegeSession';

interface Props {
  selectedDate: string;
  onDateChange: (d: string) => void;
  colleges: CollegeOption[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  /** 'positive' = My Positives (default), 'jd_received' = My JD - same all-time, focus-college view. */
  leadType?: 'positive' | 'jd_received';
  /** Bumped by the page after Sync, so emails filled in from the Daily Tracker show up straight away. */
  refreshToken?: number;
}

function formatLeadDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

/** The HR email of a lead: its own email field, else the older "Email: x" text that used to be kept in remarks. */
function emailOf(row: DailyLeadRow): string {
  if (row.email_id && row.email_id.trim()) return row.email_id.trim();
  return row.remarks?.includes('Email:') ? row.remarks.replace('Email:', '').trim() : '';
}

export function MyPositivesTab({
  selectedDate,
  onDateChange,
  colleges = [],
  searchQuery,
  onSearchChange,
  onUpdateRow,
  leadType = 'positive',
  refreshToken = 0,
}: Props) {
  const { toast } = useToast();
  const isJd = leadType === 'jd_received';
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all' = All Time / All Dates
  const [leads, setLeads] = useState<DailyLeadRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState<string>('');

  // Filter colleges to only show user's focus/handled colleges
  const focusColleges = useMemo(() => {
    const user = readSessionUser();
    const isAdminOrLeader =
      Boolean((user as any)?.has_all_colleges_access) ||
      (user as any)?.role_codes?.includes('ADMINISTRATOR') ||
      (user as any)?.role_codes?.includes('ADMIN') ||
      (user as any)?.role === 'admin';

    const focusIds = getCoordinatorSelectedColleges();
    if (focusIds.length === 0) {
      if (isAdminOrLeader) return colleges;
      const defaultIds = getDefaultOfficialCollegeIdsForUser(user);
      if (defaultIds.length > 0) {
        const filtered = colleges.filter((c) =>
          defaultIds.some(
            (fid) =>
              fid === c._id ||
              fid === c.college_code ||
              fid.toUpperCase() === (c.college_code || '').toUpperCase()
          )
        );
        if (filtered.length > 0) return filtered;
      }
      return colleges;
    }
    const filtered = colleges.filter((c) =>
      focusIds.some(
        (fid) =>
          fid === c._id ||
          fid === c.college_code ||
          fid.toUpperCase() === (c.college_code || '').toUpperCase()
      )
    );
    return filtered.length > 0 ? filtered : colleges;
  }, [colleges]);

  // Fetch Positives for the selected college and date filter (defaults to all-time cumulative)
  const loadMyPositives = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lead_type: leadType,
      });
      if (dateFilter !== 'all') {
        params.set('date', dateFilter);
      }
      if (selectedCollegeId !== 'all') {
        params.set('college_id', selectedCollegeId);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await apiFetch(`/daily-leads?${params.toString()}`);
      if (res.success && res.data) {
        const rawLeads: DailyLeadRow[] = (res.data as any).leads || [];
        const user = readSessionUser();
        const isAdminOrLeader =
          Boolean((user as any)?.has_all_colleges_access) ||
          (user as any)?.role_codes?.includes('ADMINISTRATOR') ||
          (user as any)?.role_codes?.includes('ADMIN') ||
          (user as any)?.role === 'admin';

        if (isAdminOrLeader && selectedCollegeId === 'all') {
          setLeads(rawLeads);
        } else {
          const focusIds = new Set(focusColleges.map((fc) => String(fc._id)));
          const focusCodes = new Set(focusColleges.map((fc) => (fc.college_code || '').toUpperCase()).filter(Boolean));

          const filteredByFocus = rawLeads.filter((l) => {
            const colObj = typeof l.college_id === 'object' ? l.college_id : null;
            const colId = colObj ? String(colObj._id) : String(l.college_id || '');
            const colCode = (colObj?.college_code || '').toUpperCase();

            return focusIds.has(colId) || (colCode && focusCodes.has(colCode));
          });

          setLeads(filteredByFocus);
        }
      }
    } catch (err) {
      console.error('Failed to load my positives:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, selectedCollegeId, searchQuery, focusColleges, leadType]);

  useEffect(() => {
    loadMyPositives();
  }, [loadMyPositives, refreshToken]);

  // Statistics calculation for the active selection
  const stats = useMemo(() => {
    const totalPositivesCount = leads.length;
    const uniqueCollegesCount = new Set(
      leads.map((l) => (typeof l.college_id === 'object' ? l.college_id?._id : l.college_id)).filter(Boolean)
    ).size;

    return {
      totalPositivesCount,
      uniqueCollegesCount,
    };
  }, [leads]);

  // Save Inline Email Edit
  const handleSaveEmail = async (rowId: string) => {
    try {
      const typed = emailValue.trim();
      if (typed) {
        const v = validateAndNormalizeMultiEmail(typed);
        if (!v.valid) {
          toast(v.error || 'Please enter a valid email address', 'warning');
          return;
        }
      }
      // saved in the lead's own email field (not in remarks, which also feeds the Weekly Tracker status)
      await onUpdateRow(rowId, { email_id: typed });
      toast('Email updated successfully', 'success');
      setEditingEmailId(null);
      loadMyPositives();
    } catch (err) {
      toast('Failed to update email', 'error');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Single Unified Header & Filter Control Bar ────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border p-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
          {/* Section 1: Total Positives Logged */}
          <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 w-full h-11">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Trophy size={15} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider truncate">
                {isJd ? 'Total JDs Received' : 'Total Positives Logged'}
              </p>
              <p className="text-sm font-black text-emerald-900 dark:text-emerald-100 tabular-nums leading-tight">
                {stats.totalPositivesCount}
              </p>
            </div>
          </div>

          {/* Section 2: Colleges Handled */}
          <div className="flex items-center gap-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 w-full h-11">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 size={15} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider truncate">
                Focus Colleges Handled
              </p>
              <p className="text-sm font-black text-indigo-900 dark:text-indigo-100 tabular-nums leading-tight">
                {selectedCollegeId === 'all' ? (stats.uniqueCollegesCount || focusColleges.length) : 1}
              </p>
            </div>
          </div>

          {/* Section 3: Date Filter Dropdown Selector (All Dates vs Selected Date) */}
          <DateFilterCustomDropdown
            dateFilter={dateFilter}
            onSelectDateFilter={setDateFilter}
            selectedDate={selectedDate}
          />

          {/* Section 4: Focus College Custom Soft Solid Dropdown Selector */}
          <FocusCollegeCustomDropdown
            selectedCollegeId={selectedCollegeId}
            onSelect={setSelectedCollegeId}
            colleges={focusColleges}
          />
        </div>
      </div>

      {/* ── Table Workspace ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden bg-surface rounded-2xl border border-border shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-fg-subtle text-xs font-medium">
            {isJd ? 'Loading JD history for your colleges...' : 'Loading positive leads history for your colleges...'}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-sunken border border-border text-fg-subtle flex items-center justify-center mb-3">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm font-bold text-fg">{isJd ? "No JDs Received Found" : "No Positive Leads Found"}</h3>
            <p className="text-xs text-fg-subtle max-w-sm mt-1">
              {dateFilter === 'all'
                ? (isJd
                    ? 'No JDs recorded as received for the selected colleges yet.'
                    : 'No positive outcomes or invite emails recorded for the selected colleges yet.')
                : `No ${isJd ? 'JDs received' : 'positive outcomes or invite emails'} recorded on ${dateFilter}. Try selecting "All Dates (All-Time)".`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-medium text-left border-collapse">
              <thead>
                <tr className="bg-surface-sunken/80 text-fg-muted font-bold border-b border-border uppercase tracking-wider text-[12px] select-none">
                  <th className="py-3 px-4 w-12 text-center">S.No</th>
                  <th className="py-3 px-4 w-28 text-center">Date</th>
                  <th className="py-3 px-4 w-24 text-center">Time</th>
                  <th className="py-3 px-4 w-28 text-center">College</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Job Role</th>
                  <th className="py-3 px-4 w-28 text-center">CTC</th>
                  <th className="py-3 px-4">Email ID (Maintain Log)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {leads.map((row, idx) => {
                  const collegeCode =
                    typeof row.college_id === 'object'
                      ? row.college_id?.college_code || row.college_id?.college_name
                      : 'COLLEGE';

                  return (
                    <tr key={row._id} className="hover:bg-surface-sunken/50 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-fg-muted tabular-nums">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                        {formatLeadDate(row.lead_date)}
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-fg-subtle whitespace-nowrap">
                        {row.event_time || '10:00 AM'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          {collegeCode}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-fg text-[10px]">
                        {row.company_name}
                      </td>

                      <td className="py-3 px-4 font-medium text-fg text-[10px]">
                        {row.job_role || 'Graduate Trainee'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {row.ctc ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                            {row.ctc}
                          </span>
                        ) : (
                          <span className="text-fg-subtle italic text-[10px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {editingEmailId === row._id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="email"
                              value={emailValue}
                              onChange={(e) => setEmailValue(e.target.value)}
                              placeholder="enter HR email..."
                              className="h-7 px-2 bg-surface-sunken border border-primary text-[10px] font-medium rounded-lg outline-none w-48"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEmail(row._id)}
                              className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-medium rounded-lg cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingEmailId(row._id);
                              setEmailValue(emailOf(row));
                            }}
                            className="group flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-fg-subtle"
                            title="Click to maintain/update email ID"
                          >
                            <Mail size={13} className="text-fg-subtle group-hover:text-primary shrink-0" />
                            <span className="text-[10px] font-medium underline decoration-dashed underline-offset-2">
                              {emailOf(row) || 'Click to add email'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface DateDropdownProps {
  dateFilter: string;
  onSelectDateFilter: (d: string) => void;
  selectedDate: string;
}

function DateFilterCustomDropdown({ dateFilter, onSelectDateFilter, selectedDate }: DateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; ready: boolean }>({
    top: 0,
    left: 0,
    width: 200,
    ready: false,
  });

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
      ready: true,
    });
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    updateCoords();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const label = dateFilter === 'all' ? 'All Dates (All-Time)' : `Date: ${dateFilter}`;

  return (
    <div className="relative w-full h-11">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`w-full h-11 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer select-none ${
          dateFilter !== 'all'
            ? 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/20'
            : 'bg-purple-500/10 border-purple-500/20 text-purple-900 dark:text-purple-100 hover:bg-purple-500/15'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-purple-600 dark:text-purple-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        coords.ready &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#161D2E] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-fg select-none"
          >
            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between text-[11px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Timeline View
              </span>
            </div>

            <div className="p-1.5 space-y-1 bg-white dark:bg-[#161D2E]">
              {/* All Dates Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectDateFilter('all');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between font-bold transition-colors cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-extrabold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span>All Dates (All-Time)</span>
                </div>
                {dateFilter === 'all' && <Check size={14} className="text-purple-600 dark:text-purple-400" />}
              </button>

              {/* Selected Date Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectDateFilter(selectedDate);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between font-bold transition-colors cursor-pointer ${
                  dateFilter === selectedDate
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-extrabold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span>Selected Date ({selectedDate})</span>
                </div>
                {dateFilter === selectedDate && <Check size={14} className="text-purple-600 dark:text-purple-400" />}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

interface DropdownProps {
  selectedCollegeId: string;
  onSelect: (id: string) => void;
  colleges: CollegeOption[];
}

function FocusCollegeCustomDropdown({ selectedCollegeId, onSelect, colleges }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; ready: boolean }>({
    top: 0,
    left: 0,
    width: 200,
    ready: false,
  });

  const selectedColObj = colleges.find((c) => c._id === selectedCollegeId);
  const selectedLabel = selectedCollegeId === 'all' ? 'All Handled Colleges' : selectedColObj?.college_code || selectedColObj?.college_name || 'College';

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
      ready: true,
    });
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    updateCoords();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full h-11">
      {/* ── Soft Solid Button Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`w-full h-11 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer select-none ${
          selectedCollegeId !== 'all'
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-100 hover:bg-blue-500/15'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
          <span className="truncate">{selectedLabel}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-blue-600 dark:text-blue-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Soft Solid Mode Popover ── */}
      {isOpen &&
        coords.ready &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#161D2E] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-fg select-none"
          >
            {/* Soft Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Building2 size={13} /> Filter Handled College
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold">
                {colleges.length}
              </span>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 bg-white dark:bg-[#161D2E]">
              {/* All Option */}
              <button
                type="button"
                onClick={() => {
                  onSelect('all');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between font-bold transition-colors cursor-pointer ${
                  selectedCollegeId === 'all'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-extrabold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>All Handled Colleges</span>
                </div>
                {selectedCollegeId === 'all' && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
              </button>

              {colleges.map((c) => {
                const isSel = selectedCollegeId === c._id;
                const acronym = c.college_code || c.college_name;

                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => {
                      onSelect(c._id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between font-bold transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-extrabold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <span className="truncate">{acronym}</span>
                    </div>
                    {isSel && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
