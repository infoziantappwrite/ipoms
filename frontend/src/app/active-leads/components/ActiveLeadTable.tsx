'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Building2,
  IndianRupee,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { SmoothLeadStatusDropdown, LeadStatus } from '@/components/ui/SmoothLeadStatusDropdown';
import { SmoothMonthDropdown } from '@/components/ui/SmoothMonthDropdown';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';

export interface ActiveLeadItem {
  _id: string;
  company_name: string;
  role: string;
  ctc: string;
  status: LeadStatus;
  followup_month: string;
  academic_year: string;
  created_at?: string;
  coordinator_id?: {
    full_name?: string;
  };
}

interface Props {
  leads: ActiveLeadItem[];
  loading: boolean;
  onUpdateLead: (id: string, updates: Partial<ActiveLeadItem>) => Promise<boolean>;
  isDeleteMode?: boolean;
  selectedIds?: string[];
  onToggleSelectLead?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

// Auto-wrapping, auto-resizing text cell that centers text and wraps long values without clipping
function AutoWrapCell({
  initialValue,
  onSave,
  placeholder = '',
  isBold = false,
}: {
  initialValue: string;
  onSave: (val: string) => void;
  placeholder?: string;
  isBold?: boolean;
}) {
  const [val, setVal] = useState(initialValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(26, textareaRef.current.scrollHeight)}px`;
    }
  };

  useLayoutEffect(() => {
    adjustHeight();
  }, [val]);

  return (
    <div className="flex items-center justify-center w-full">
      <textarea
        ref={textareaRef}
        rows={1}
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          adjustHeight();
        }}
        onBlur={() => {
          if (val !== initialValue) {
            onSave(val);
          }
        }}
        placeholder={placeholder}
        className={`w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-2 py-1 rounded text-xs text-fg outline-none transition-all text-center resize-none leading-relaxed overflow-hidden whitespace-normal break-words shadow-2xs ${
          isBold ? 'font-bold' : 'font-semibold'
        }`}
      />
    </div>
  );
}

// Helper to parse CTC number and unit (LPA vs / month)
function parseCtc(rawCtc: string) {
  if (!rawCtc || !rawCtc.trim()) {
    return { value: '', unit: 'LPA' as 'LPA' | 'Month' };
  }
  const str = rawCtc.trim();
  const lower = str.toLowerCase();

  if (
    lower.includes('month') ||
    lower.includes('/ mo') ||
    lower.includes('pm') ||
    lower.includes('per mo') ||
    lower.includes('intern')
  ) {
    const val = str
      .replace(/(?:\/|\bper\b)?\s*(?:month|mo|pm)\b/gi, '')
      .replace(/^₹\s*/, '')
      .trim();
    return { value: val || str, unit: 'Month' as const };
  } else if (lower.includes('lpa')) {
    const val = str.replace(/\bLPA\b/gi, '').replace(/^₹\s*/, '').trim();
    return { value: val || str, unit: 'LPA' as const };
  }

  return { value: str, unit: 'LPA' as const };
}

// Inline CTC Editor centered with unit toggle (LPA vs / month)
function CtcTableCell({
  ctc,
  leadId,
  onSave,
}: {
  ctc: string;
  leadId: string;
  onSave: (id: string, field: 'ctc', value: string) => void;
}) {
  const parsed = parseCtc(ctc);
  const [val, setVal] = useState(parsed.value);
  const [unit, setUnit] = useState<'LPA' | 'Month'>(parsed.unit);

  useEffect(() => {
    const p = parseCtc(ctc);
    setVal(p.value);
    setUnit(p.unit);
  }, [ctc]);

  const commitValue = (nextVal: string, nextUnit: 'LPA' | 'Month') => {
    const trimmed = nextVal.trim();
    if (!trimmed) {
      if (ctc !== '') onSave(leadId, 'ctc', '');
      return;
    }

    if (
      trimmed.toLowerCase().includes('lpa') ||
      trimmed.toLowerCase().includes('month') ||
      trimmed.toLowerCase().includes('best')
    ) {
      if (trimmed !== ctc) onSave(leadId, 'ctc', trimmed);
      return;
    }

    const formatted = nextUnit === 'LPA' ? `${trimmed} LPA` : `₹${trimmed} / month`;
    if (formatted !== ctc) {
      onSave(leadId, 'ctc', formatted);
    }
  };

  const handleBlur = () => {
    commitValue(val, unit);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const toggleUnit = () => {
    const nextUnit = unit === 'LPA' ? 'Month' : 'LPA';
    setUnit(nextUnit);
    commitValue(val, nextUnit);
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mx-auto">
      <IndianRupee size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 opacity-80" />
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={unit === 'LPA' ? 'e.g. 6.5' : 'e.g. 25,000'}
        className="bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-1.5 py-0.5 rounded text-xs font-bold text-fg outline-none w-16 sm:w-20 transition-all font-mono text-center shadow-2xs"
      />
      {/* Unit switch button: LPA vs / month */}
      <button
        type="button"
        onClick={toggleUnit}
        title="Click to toggle unit between LPA (Full-time) and / month (Internship)"
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer select-none active:scale-90 shrink-0 ${
          unit === 'LPA'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
        }`}
      >
        {unit === 'LPA' ? 'LPA' : '/ month'}
      </button>
    </div>
  );
}

export function ActiveLeadTable({
  leads,
  loading,
  onUpdateLead,
  isDeleteMode = false,
  selectedIds = [],
  onToggleSelectLead,
  onToggleSelectAll,
}: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const isAllSelected = leads.length > 0 && selectedIds.length === leads.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < leads.length;

  const handleFieldChange = async (id: string, field: keyof ActiveLeadItem, value: any) => {
    setSavingId(id);
    const ok = await onUpdateLead(id, { [field]: value });
    setSavingId(null);
    if (ok) {
      setSavedSuccessId(id);
      setTimeout(() => setSavedSuccessId(null), 1500);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center gap-3 text-fg shadow-xs">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm font-semibold text-fg-subtle">
          Loading Active Leads Directory…
        </p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center gap-3 text-center text-fg shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
          <Building2 size={26} strokeWidth={1.8} />
        </div>
        <h3 className="text-base font-bold text-fg">No Active Leads Found</h3>
        <p className="text-xs text-fg-subtle max-w-md">
          No active company leads match your filter. Click <strong>Add</strong> to populate corporate leads for campus placement.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden text-fg">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-center text-xs border-collapse border-b border-border">
          {/* Table Header - Bordered & Center Aligned */}
          <thead>
            <tr className="bg-surface-sunken/80 border-b border-border text-fg-subtle font-bold uppercase tracking-wider text-[10px]">
              {/* Checkbox Column (Only visible in Delete Mode) */}
              {isDeleteMode && (
                <th className="py-3 px-3 w-10 text-center border-r border-border/80">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 rounded border-border text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                    title="Select / Deselect all rows"
                    aria-label="Select all leads"
                  />
                </th>
              )}

              <th className="py-3 px-3 w-12 text-center border-r border-border/80">S.No</th>
              <th className="py-3 px-4 min-w-[220px] max-w-[300px] text-center border-r border-border/80">Company Name</th>
              <th className="py-3 px-4 min-w-[180px] max-w-[240px] text-center border-r border-border/80">Role</th>
              <th className="py-3 px-3.5 min-w-[150px] text-center border-r border-border/80">CTC</th>
              <th className="py-3 px-3.5 min-w-[160px] text-center border-r border-border/80">Followup Month</th>
              <th className="py-3 px-3.5 min-w-[150px] text-center border-r border-border/80">Academic Year</th>
              <th className="py-3 px-2.5 w-10 text-center"></th>
            </tr>
          </thead>

          {/* Table Body - Bordered Grid with Active Focus & Hover Highlight */}
          <tbody className="divide-y divide-border/60">
            {leads.map((lead, idx) => {
              const isSaving = savingId === lead._id;
              const isSaved = savedSuccessId === lead._id;
              const isSelected = selectedIds.includes(lead._id);

              return (
                <tr
                  key={lead._id}
                  className={`transition-colors duration-150 group border-b border-border/60 ${
                    isSelected
                      ? 'bg-rose-500/15 dark:bg-rose-950/40'
                      : 'hover:bg-blue-50/50 dark:hover:bg-blue-950/30 focus-within:bg-blue-50/80 dark:focus-within:bg-blue-950/50'
                  }`}
                >
                  {/* Checkbox (Only in Delete Mode) */}
                  {isDeleteMode && (
                    <td className="py-2.5 px-3 text-center border-r border-border/60">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectLead?.(lead._id)}
                        className="w-4 h-4 rounded border-border text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                        aria-label={`Select ${lead.company_name}`}
                      />
                    </td>
                  )}

                  {/* 1. S.No */}
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-fg-subtle border-r border-border/60">
                    {idx + 1}
                  </td>

                  {/* 2. Company Name */}
                  <td className="py-2 px-3 text-center min-w-[220px] max-w-[300px] border-r border-border/60">
                    <AutoWrapCell
                      initialValue={lead.company_name}
                      onSave={(newVal) => handleFieldChange(lead._id, 'company_name', newVal)}
                      placeholder="e.g. Zoho Corporation"
                      isBold={true}
                    />
                  </td>

                  {/* 3. Role */}
                  <td className="py-2 px-3 text-center min-w-[180px] max-w-[240px] border-r border-border/60">
                    <AutoWrapCell
                      initialValue={lead.role}
                      onSave={(newVal) => handleFieldChange(lead._id, 'role', newVal)}
                      placeholder="e.g. Software Engineer"
                      isBold={false}
                    />
                  </td>

                  {/* 4. CTC */}
                  <td className="py-2.5 px-3 text-center border-r border-border/60">
                    <CtcTableCell
                      ctc={lead.ctc}
                      leadId={lead._id}
                      onSave={handleFieldChange}
                    />
                  </td>

                  {/* 5. Followup Month */}
                  <td className="py-2.5 px-3 text-center border-r border-border/60">
                    <div className="flex justify-center items-center">
                      <SmoothMonthDropdown
                        value={lead.followup_month || ''}
                        onChange={(newMonth) => {
                          handleFieldChange(lead._id, 'followup_month', newMonth);
                        }}
                        placeholder="Pick Month"
                      />
                    </div>
                  </td>

                  {/* 6. Academic Year */}
                  <td className="py-2.5 px-3 text-center border-r border-border/60">
                    <div className="flex justify-center items-center">
                      <SmoothYearDropdown
                        value={lead.academic_year || '2027'}
                        onChange={(newYear) => {
                          handleFieldChange(lead._id, 'academic_year', newYear);
                        }}
                      />
                    </div>
                  </td>

                  {/* Auto-save Indicator */}
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center min-w-[20px]">
                      {isSaving && (
                        <span className="flex items-center text-[11px] text-primary font-bold animate-pulse" title="Saving changes…">
                          <Loader2 size={13} className="animate-spin" />
                        </span>
                      )}

                      {isSaved && (
                        <span className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in" title="Saved">
                          <CheckCircle2 size={13} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
