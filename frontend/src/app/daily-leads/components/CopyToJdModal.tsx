'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Copy, CheckCircle2, Building2, Check, Search, ChevronDown } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { getCoordinatorSelectedColleges } from '@/lib/collegeSession';
import type { DailyLeadRow, CollegeOption } from './LeadsTable';

interface Props {
  selectedDate: string;
  colleges: CollegeOption[];
  positiveLeads: DailyLeadRow[];
  onClose: () => void;
  onCopied: () => void;
}

export function CopyToJdModal({
  selectedDate,
  colleges,
  positiveLeads,
  onClose,
  onCopied,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState('');

  // Coordinator's focused colleges (maximum 4 selected on dashboard)
  const focusedColleges = useMemo(() => {
    const focusedIds = getCoordinatorSelectedColleges();
    if (focusedIds && focusedIds.length > 0) {
      const matched = colleges.filter((c) => focusedIds.includes(c._id));
      if (matched.length > 0) return matched;
    }
    return colleges.slice(0, 4);
  }, [colleges]);

  // 1. Unique positive companies list for selection
  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, DailyLeadRow>();
    for (const lead of positiveLeads) {
      const key = lead.company_name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, lead);
      }
    }
    return Array.from(map.values());
  }, [positiveLeads]);

  // Selected company state (defaults to first positive company)
  const [selectedLeadId, setSelectedLeadId] = useState<string>(() => {
    return uniqueCompanies.length > 0 ? uniqueCompanies[0]._id : '';
  });

  const selectedLead = useMemo(() => {
    return (
      positiveLeads.find((l) => l._id === selectedLeadId) ||
      uniqueCompanies[0] ||
      null
    );
  }, [selectedLeadId, positiveLeads, uniqueCompanies]);

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Close company dropdown on outside click
  useEffect(() => {
    if (!isCompanyDropdownOpen) return;
    function handleCompanyClickOutside(e: MouseEvent) {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleCompanyClickOutside);
    return () => document.removeEventListener('mousedown', handleCompanyClickOutside);
  }, [isCompanyDropdownOpen]);

  // Filter companies by search
  const filteredUniqueCompanies = useMemo(() => {
    if (!companySearchTerm.trim()) return uniqueCompanies;
    const q = companySearchTerm.toLowerCase();
    return uniqueCompanies.filter((c) => {
      const name = c.company_name.toLowerCase();
      const role = (c.job_role || '').toLowerCase();
      const code = typeof c.college_id === 'object' && (c.college_id as any)?.college_code ? (c.college_id as any).college_code.toLowerCase() : '';
      return name.includes(q) || role.includes(q) || code.includes(q);
    });
  }, [uniqueCompanies, companySearchTerm]);

  // Originating college for the selected positive lead
  const originatingCollegeId = useMemo(() => {
    if (!selectedLead) return '';
    return typeof selectedLead.college_id === 'object' && (selectedLead.college_id as any)?._id
      ? (selectedLead.college_id as any)._id
      : (selectedLead.college_id as unknown as string) || '';
  }, [selectedLead]);

  // Originating college code
  const originatingCollegeCode = useMemo(() => {
    if (!selectedLead) return '';
    return typeof selectedLead.college_id === 'object' && (selectedLead.college_id as any)?.college_code
      ? (selectedLead.college_id as any).college_code
      : '';
  }, [selectedLead]);

  // 2. Selected Target Colleges State
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);

  // When selected company changes, pre-check its originating college
  useEffect(() => {
    if (originatingCollegeId) {
      setSelectedCollegeIds((prev) => {
        if (prev.length === 0) return [originatingCollegeId];
        return prev.includes(originatingCollegeId) ? prev : [originatingCollegeId, ...prev];
      });
    }
  }, [originatingCollegeId]);

  const isAllSelected = focusedColleges.length > 0 && selectedCollegeIds.length === focusedColleges.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCollegeIds([]);
    } else {
      setSelectedCollegeIds(focusedColleges.map((c) => c._id));
    }
  };

  const handleToggleCollege = (collegeId: string) => {
    setSelectedCollegeIds((prev) =>
      prev.includes(collegeId) ? prev.filter((id) => id !== collegeId) : [...prev, collegeId]
    );
  };

  // Filter colleges by search within focused colleges
  const filteredColleges = useMemo(() => {
    if (!collegeSearch.trim()) return focusedColleges;
    const q = collegeSearch.toLowerCase();
    return focusedColleges.filter(
      (c) => c.college_code.toLowerCase().includes(q) || c.college_name.toLowerCase().includes(q)
    );
  }, [focusedColleges, collegeSearch]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isCompanyDropdownOpen) {
          setIsCompanyDropdownOpen(false);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCompanyDropdownOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) {
      toast('Please select a positive company to copy', 'warning');
      return;
    }
    if (selectedCollegeIds.length === 0) {
      toast('Please select at least 1 target college where JD is received', 'warning');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        date: selectedDate,
        company_name: selectedLead.company_name,
        lead_id: selectedLead._id,
        college_ids: selectedCollegeIds,
        job_role: selectedLead.job_role,
        ctc: selectedLead.ctc,
        eligible_batch: selectedLead.eligible_batch,
        event_time: selectedLead.event_time,
      };

      const res = await apiFetch('/daily-leads/copy-to-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.success) {
        toast((res as any).message || `Successfully copied "${selectedLead.company_name}" to JD Received!`, 'success');
        onCopied();
        onClose();
      } else {
        toast((res as any)?.error?.message || 'Failed to copy to JD Received', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'An error occurred while copying to JD Received', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = useMemo(() => {
    if (!selectedDate) return 'Today';
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ── Modal Header (Compact & Smooth) ───────────────────────── */}
        <div className="px-6 py-3.5 border-b border-border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shadow-xs shrink-0">
              <Copy size={16} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-fg tracking-tight">
              Copy to JD Received
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-raised border border-border/80 hover:border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Modal Body (Compact, Proportional Spacing) ─────────────── */}
        <form
          id="copy-to-jd-form"
          onSubmit={handleSubmit}
          className="px-6 pt-5 pb-5 space-y-4 text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Step 1: Company Selection with Smooth Floating Dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-fg flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">1</span>
                <span>Select Positive Company to Copy</span>
              </label>
              <span className="text-[11px] font-semibold text-fg-subtle">
                {uniqueCompanies.length} Positive Compan{uniqueCompanies.length === 1 ? 'y' : 'ies'}
              </span>
            </div>

            {uniqueCompanies.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                No positive companies found for {selectedDate}. Please add or sync positives first.
              </div>
            ) : (
              <div className="relative" ref={companyDropdownRef}>
                {/* Smooth Trigger Card */}
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                  className={`w-full text-left rounded-xl border transition-all cursor-pointer shadow-2xs p-2.5 flex items-center justify-between gap-2.5 group select-none ${
                    isCompanyDropdownOpen
                      ? 'border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                      : 'border-border bg-surface-sunken hover:bg-surface hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold shadow-2xs">
                      <Building2 size={14} />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-fg truncate">
                          {selectedLead?.company_name || 'Select a positive company'}
                        </span>
                        {originatingCollegeCode && (
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-md bg-blue-600/10 text-blue-700 dark:text-sky-300 border border-blue-600/20">
                            [{originatingCollegeCode}]
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle flex-wrap">
                        <span>Role: <strong className="text-fg font-medium">{selectedLead?.job_role || 'General'}</strong></span>
                        <span>•</span>
                        <span>CTC: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{selectedLead?.ctc || '—'}</strong></span>
                        <span>•</span>
                        <span>Batch: <strong className="text-fg font-medium">{selectedLead?.eligible_batch || '2026 Batch'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface border border-border text-fg-subtle">
                      {uniqueCompanies.length} available
                    </span>
                    <div className="w-6 h-6 rounded-md bg-surface border border-border flex items-center justify-center text-fg-subtle group-hover:text-fg shadow-2xs">
                      <ChevronDown
                        size={12}
                        strokeWidth={2.5}
                        className={`transition-transform duration-200 ${isCompanyDropdownOpen ? 'rotate-180 text-amber-600' : ''}`}
                      />
                    </div>
                  </div>
                </button>

                {/* Floating Smooth Popover */}
                {isCompanyDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
                    {/* Search inside Popover if multiple companies */}
                    {uniqueCompanies.length > 2 && (
                      <div className="p-2 border-b border-border bg-surface-sunken/60">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-disabled" />
                          <input
                            type="text"
                            placeholder="Search company or role…"
                            value={companySearchTerm}
                            onChange={(e) => setCompanySearchTerm(e.target.value)}
                            autoFocus
                            className="w-full bg-surface border border-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-lg pl-7 pr-2.5 py-1 text-xs text-fg placeholder:text-fg-disabled outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Options List */}
                    <div className="max-h-52 overflow-y-auto divide-y divide-border/40 p-1 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {filteredUniqueCompanies.length === 0 ? (
                        <div className="p-3 text-center text-fg-disabled text-xs">
                          No matching positive companies
                        </div>
                      ) : (
                        filteredUniqueCompanies.map((c) => {
                          const isSelected = c._id === selectedLeadId;
                          const code = typeof c.college_id === 'object' && (c.college_id as any)?.college_code ? (c.college_id as any).college_code : '';
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => {
                                setSelectedLeadId(c._id);
                                setIsCompanyDropdownOpen(false);
                                setCompanySearchTerm('');
                              }}
                              className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                                isSelected
                                  ? 'bg-amber-500/10 border-amber-500/30 text-fg shadow-2xs font-semibold'
                                  : 'border-transparent hover:bg-surface-sunken text-fg-muted hover:text-fg'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                  isSelected ? 'bg-amber-500 text-white' : 'bg-surface-sunken text-fg-subtle border border-border'
                                }`}>
                                  <Building2 size={10} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-fg truncate">{c.company_name}</span>
                                    {code && (
                                      <span className="font-mono font-bold text-[10px] px-1 py-0.2 rounded bg-blue-600/10 text-blue-700 dark:text-sky-300 border border-blue-600/20">
                                        [{code}]
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-fg-subtle mt-0.2">
                                    <span>{c.job_role || 'General'}</span>
                                    {c.ctc && (
                                      <>
                                        <span>•</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{c.ctc}</span>
                                      </>
                                    )}
                                    {c.eligible_batch && (
                                      <>
                                        <span>•</span>
                                        <span>{c.eligible_batch}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Target College Selection (4 in 1 Row with Acronyms) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-fg flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">2</span>
                <span>Select Focused Colleges where JD is Received</span>
              </label>
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-fg text-[11px] hover:text-amber-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-border text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer align-middle"
                  />
                  <span>Select All</span>
                </label>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {selectedCollegeIds.length} of {focusedColleges.length} Selected
                </span>
              </div>
            </div>

            {/* 4 Colleges in 1 Single Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {focusedColleges.map((c) => {
                const isSelected = selectedCollegeIds.includes(c._id);
                const isOrigin = c._id === originatingCollegeId;
                return (
                  <label
                    key={c._id}
                    title={c.college_name}
                    className={`flex items-center justify-between py-2 px-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 text-fg shadow-2xs font-bold'
                        : 'bg-surface-sunken hover:bg-surface border-border text-fg-muted hover:text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCollege(c._id)}
                        className="rounded border-border text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="font-mono font-bold text-xs tracking-wide truncate">
                        {c.college_code}
                      </span>
                    </div>

                    {isOrigin && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-600/15 text-blue-700 dark:text-sky-300 border border-blue-600/25 shrink-0 ml-1">
                        Origin
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        {/* ── Sticky Footer (Compact & Smooth) ───────────────────────── */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-border bg-surface-sunken/60 shrink-0">
          <button
            type="submit"
            form="copy-to-jd-form"
            disabled={loading || !selectedLead || selectedCollegeIds.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Copy size={14} strokeWidth={2.5} />
            <span>{loading ? 'Copying…' : `Copy to JD (${selectedCollegeIds.length} Colleges)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
