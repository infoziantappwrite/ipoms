'use client';

import React, { useState } from 'react';
import {
  Trash2,
  Building2,
  Briefcase,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
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
  onDeleteLead: (id: string) => Promise<boolean>;
}

export function ActiveLeadTable({
  leads,
  loading,
  onUpdateLead,
  onDeleteLead,
}: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

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
          No active company leads match your filter. Click <strong>Add Lead</strong> or <strong>Bulk Paste</strong> to populate corporate leads for campus placement.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden text-fg">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="bg-surface-sunken border-b border-border text-fg-subtle font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4 w-12 text-center">S.No</th>
              <th className="py-3.5 px-4 min-w-[200px]">Company Name</th>
              <th className="py-3.5 px-4 min-w-[160px]">Role / Designation</th>
              <th className="py-3.5 px-4 min-w-[140px]">CTC / Package</th>
              <th className="py-3.5 px-4 min-w-[130px]">Status</th>
              <th className="py-3.5 px-4 min-w-[140px]">Followup Month</th>
              <th className="py-3.5 px-4 min-w-[130px]">Academic Year</th>
              <th className="py-3.5 px-4 w-20 text-center">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border/60">
            {leads.map((lead, idx) => {
              const isFollowUp = lead.status === 'Follow Up';
              const isSaving = savingId === lead._id;
              const isSaved = savedSuccessId === lead._id;

              return (
                <tr
                  key={lead._id}
                  className="hover:bg-surface-raised/50 transition-colors group"
                >
                  {/* 1. S.No */}
                  <td className="py-3 px-4 text-center font-mono font-bold text-fg-subtle">
                    {idx + 1}
                  </td>

                  {/* 2. Company Name (In-place editable) */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-primary dark:text-sky-400 shrink-0 opacity-70" />
                      <input
                        type="text"
                        defaultValue={lead.company_name}
                        onBlur={(e) => {
                          if (e.target.value !== lead.company_name) {
                            handleFieldChange(lead._id, 'company_name', e.target.value);
                          }
                        }}
                        className="bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-1.5 py-0.5 rounded text-xs font-bold text-fg outline-none w-full transition-colors"
                      />
                    </div>
                  </td>

                  {/* 3. Role */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={13} className="text-fg-subtle shrink-0" />
                      <input
                        type="text"
                        defaultValue={lead.role}
                        onBlur={(e) => {
                          if (e.target.value !== lead.role) {
                            handleFieldChange(lead._id, 'role', e.target.value);
                          }
                        }}
                        placeholder="e.g. Software Engineer"
                        className="bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-1.5 py-0.5 rounded text-xs font-semibold text-fg outline-none w-full transition-colors"
                      />
                    </div>
                  </td>

                  {/* 4. CTC */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <input
                        type="text"
                        defaultValue={lead.ctc}
                        onBlur={(e) => {
                          if (e.target.value !== lead.ctc) {
                            handleFieldChange(lead._id, 'ctc', e.target.value);
                          }
                        }}
                        placeholder="e.g. 6.5 LPA"
                        className="bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-1.5 py-0.5 rounded text-xs font-semibold text-fg outline-none w-full transition-colors"
                      />
                    </div>
                  </td>

                  {/* 5. Status (Smooth Dropdown: Hiring / Not Hiring / Follow Up) */}
                  <td className="py-3 px-4">
                    <SmoothLeadStatusDropdown
                      value={lead.status}
                      onChange={(newStatus) => {
                        handleFieldChange(lead._id, 'status', newStatus);
                      }}
                    />
                  </td>

                  {/* 6. Followup Month (Smooth Dropdown: enabled on Follow Up, disabled otherwise) */}
                  <td className="py-3 px-4">
                    <SmoothMonthDropdown
                      value={lead.followup_month || ''}
                      onChange={(newMonth) => {
                        handleFieldChange(lead._id, 'followup_month', newMonth);
                      }}
                      disabled={!isFollowUp}
                      placeholder="Pick Month"
                    />
                  </td>

                  {/* 7. Academic Year (Smooth Dropdown: 2026 to 2035) */}
                  <td className="py-3 px-4">
                    <SmoothYearDropdown
                      value={lead.academic_year || '2026'}
                      onChange={(newYear) => {
                        handleFieldChange(lead._id, 'academic_year', newYear);
                      }}
                    />
                  </td>

                  {/* 8. Actions (Auto-save Indicator & Delete) */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Live Auto-save feedback */}
                      {isSaving && (
                        <Loader2 size={14} className="animate-spin text-primary" title="Saving changes…" />
                      )}
                      {isSaved && !isSaving && (
                        <CheckCircle2 size={14} className="text-emerald-500" title="Auto-saved" />
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteLead(lead._id)}
                        className="w-7 h-7 rounded-lg text-fg-subtle hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                        title="Delete Lead"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
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
