'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Calendar, Search, Building2, User, Phone, Mail, FileText, CheckCircle2, ChevronDown, Trophy, ArrowRightCircle, Check, Filter } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { DailyLeadRow, CollegeOption } from './LeadsTable';
import { useToast } from '@/components/ui/Toast';

import { getCoordinatorSelectedColleges } from '@/lib/collegeSession';

interface Props {
  selectedDate: string;
  onDateChange: (d: string) => void;
  colleges: CollegeOption[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onUpdateRow: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
}

export function MyPositivesTab({
  selectedDate,
  onDateChange,
  colleges = [],
  searchQuery,
  onSearchChange,
  onUpdateRow,
}: Props) {
  const { toast } = useToast();
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('all');
  const [leads, setLeads] = useState<DailyLeadRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState<string>('');

  // Filter colleges to only show user's focus colleges
  const focusColleges = useMemo(() => {
    const focusIds = getCoordinatorSelectedColleges();
    if (focusIds.length === 0) return colleges;
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

  // Fetch Positives for the selected date & college
  const loadMyPositives = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        lead_type: 'positive',
      });
      if (selectedCollegeId !== 'all') {
        params.set('college_id', selectedCollegeId);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await apiFetch(`/daily-leads?${params.toString()}`);
      if (res.success && res.data) {
        const rawLeads: DailyLeadRow[] = (res.data as any).leads || [];
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
    } catch (err) {
      console.error('Failed to load my positives:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedCollegeId, searchQuery, focusColleges]);

  useEffect(() => {
    loadMyPositives();
  }, [loadMyPositives]);

  // Statistics calculation for the active selection
  const stats = useMemo(() => {
    const todayPositivesCount = leads.length;
    const uniqueCollegesCount = new Set(
      leads.map((l) => (typeof l.college_id === 'object' ? l.college_id?._id : l.college_id)).filter(Boolean)
    ).size;

    return {
      todayPositivesCount,
      uniqueCollegesCount,
    };
  }, [leads]);

  // Save Inline Email Edit
  const handleSaveEmail = async (rowId: string) => {
    try {
      await onUpdateRow(rowId, { remarks: emailValue ? `Email: ${emailValue}` : undefined });
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
          {/* Section 1: Today's Positives */}
          <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 w-full h-11">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Trophy size={15} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider truncate">
                Today's Positives Logged
              </p>
              <p className="text-sm font-black text-emerald-900 dark:text-emerald-100 tabular-nums leading-tight">
                {stats.todayPositivesCount}
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
                {selectedCollegeId === 'all' ? stats.uniqueCollegesCount : 1}
              </p>
            </div>
          </div>

          {/* Section 3: Selected Date */}
          <div className="flex items-center gap-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 w-full h-11">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Calendar size={15} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider truncate">
                Selected Date
              </p>
              <p className="text-xs font-bold text-purple-900 dark:text-purple-100 leading-tight truncate">
                {selectedDate === 'all' ? 'All Dates' : selectedDate}
              </p>
            </div>
          </div>

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
            Loading positive logs for selected college date...
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-sunken border border-border text-fg-subtle flex items-center justify-center mb-3">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm font-bold text-fg">No Positive Leads Found</h3>
            <p className="text-xs text-fg-subtle max-w-sm mt-1">
              No positive outcomes or invite emails recorded for this college on the selected date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-surface-sunken/80 text-fg-muted font-bold border-b border-border uppercase tracking-wider text-[10px] select-none">
                  <th className="py-3 px-4 w-12 text-center">S.No</th>
                  <th className="py-3 px-4 w-28 text-center">Time</th>
                  <th className="py-3 px-4 w-28 text-center">College</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Job Role</th>
                  <th className="py-3 px-4 w-28 text-center">CTC</th>
                  <th className="py-3 px-4">Coordinator / HR Details</th>
                  <th className="py-3 px-4">Email ID (Maintain Log)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {leads.map((row, idx) => {
                  const collegeCode =
                    typeof row.college_id === 'object'
                      ? row.college_id?.college_code || row.college_id?.college_name
                      : 'COLLEGE';
                  const coordinatorName = row.coordinator_id?.full_name || 'Placement Team';

                  return (
                    <tr key={row._id} className="hover:bg-surface-sunken/50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-fg-muted tabular-nums">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-fg-subtle">
                        {row.event_time || '10:00 AM'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          {collegeCode}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-extrabold text-fg text-sm">
                        {row.company_name}
                      </td>

                      <td className="py-3 px-4 font-medium text-fg">
                        {row.job_role || 'Graduate Trainee'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {row.ctc ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                            {row.ctc}
                          </span>
                        ) : (
                          <span className="text-fg-subtle italic text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="font-bold text-fg">{coordinatorName}</div>
                      </td>

                      <td className="py-3 px-4">
                        {editingEmailId === row._id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="email"
                              value={emailValue}
                              onChange={(e) => setEmailValue(e.target.value)}
                              placeholder="enter HR email..."
                              className="h-7 px-2 bg-surface-sunken border border-primary text-xs rounded-lg outline-none w-48"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEmail(row._id)}
                              className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingEmailId(row._id);
                              setEmailValue(row.remarks?.includes('Email:') ? row.remarks.replace('Email:', '').trim() : '');
                            }}
                            className="group flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors text-fg-subtle"
                            title="Click to maintain/update email ID"
                          >
                            <Mail size={13} className="text-fg-subtle group-hover:text-primary shrink-0" />
                            <span className="text-xs font-medium underline decoration-dashed underline-offset-2">
                              {row.remarks?.includes('Email:') ? row.remarks.replace('Email:', '').trim() : 'Click to add email'}
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
  const selectedLabel = selectedCollegeId === 'all' ? 'All Focus Colleges' : selectedColObj?.college_code || selectedColObj?.college_name || 'College';

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
                <Building2 size={13} /> Filter Focus College
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
                  <span>All Focus Colleges</span>
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
