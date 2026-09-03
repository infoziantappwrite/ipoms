'use client';

import React, { useState } from 'react';
import { X, Plus, Building2, Briefcase, IndianRupee, Sparkles } from 'lucide-react';
import { SmoothLeadStatusDropdown, LeadStatus } from '@/components/ui/SmoothLeadStatusDropdown';
import { SmoothMonthDropdown } from '@/components/ui/SmoothMonthDropdown';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';

type CtcUnit = 'LPA' | 'Month' | 'Both';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadData: {
    company_name: string;
    role: string;
    ctc: string;
    status: LeadStatus;
    followup_month: string;
    academic_year: string;
  }) => Promise<boolean>;
}

export function AddActiveLeadModal({ isOpen, onClose, onSubmit }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Graduate Trainee');
  const [ctcValue, setCtcValue] = useState('');
  const [ctcUnit, setCtcUnit] = useState<CtcUnit>('LPA');
  const [status, setStatus] = useState<LeadStatus>('Hiring');
  const [followupMonth, setFollowupMonth] = useState('August');
  const [academicYear, setAcademicYear] = useState('2027');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCtcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (ctcUnit === 'Both') {
      setCtcValue(raw);
    } else if (ctcUnit === 'LPA') {
      // Allow only numbers and a single decimal point or ranges (e.g. 3.5, 3.80 - 5.82)
      const sanitized = raw.replace(/[^0-9.\-\s]/g, '');
      setCtcValue(sanitized);
    } else {
      // Month: Allow numbers, k, and commas (e.g. 15k, 15000)
      const sanitized = raw.replace(/[^0-9,kK\-\s]/g, '');
      setCtcValue(sanitized);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company Name is mandatory');
      return;
    }
    if (!role.trim()) {
      setError('Role is mandatory');
      return;
    }
    if (!ctcValue.trim()) {
      setError('CTC is mandatory');
      return;
    }

    // Format CTC based on unit
    let formattedCtc = '';
    if (ctcValue.trim()) {
      if (ctcUnit === 'Both') {
        formattedCtc = ctcValue.trim();
      } else if (ctcUnit === 'LPA') {
        formattedCtc = ctcValue.toLowerCase().includes('lpa') ? ctcValue.trim() : `${ctcValue.trim()} LPA`;
      } else {
        formattedCtc = ctcValue.toLowerCase().includes('month') ? ctcValue.trim() : `${ctcValue.trim()} / month`;
      }
    }

    setSubmitting(true);
    setError('');
    const ok = await onSubmit({
      company_name: companyName.trim(),
      role: role.trim() || 'Graduate Trainee',
      ctc: formattedCtc,
      status,
      followup_month: status === 'Follow Up' ? followupMonth : '',
      academic_year: academicYear,
    });
    setSubmitting(false);

    if (ok) {
      setCompanyName('');
      setRole('Graduate Trainee');
      setCtcValue('');
      setCtcUnit('LPA');
      setStatus('Hiring');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-xl sm:max-w-2xl shadow-2xl space-y-5 text-fg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Sparkles size={16} />
            </span>
            <h2 className="text-base font-bold text-fg">Add Active Lead</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-sunken hover:bg-surface-raised text-fg-subtle hover:text-fg flex items-center justify-center border border-border transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger font-semibold">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Company Name */}
          <div>
            <label className="block text-xs font-bold text-fg mb-1">
              Company Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Zoho, Accenture, TCS, Infosys…"
                className="w-full bg-surface-sunken border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-fg placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs font-semibold"
                autoFocus
              />
            </div>
          </div>

          {/* 2. Role & CTC Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Role <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Graduate Trainee"
                  className="w-full bg-surface-sunken border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-fg placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs font-semibold"
                />
              </div>
            </div>

            {/* CTC with LPA & / Month (Internship) Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-fg">
                  CTC (₹) <span className="text-rose-500 font-bold">*</span>
                </label>
                
                {/* Unit Switch: LPA vs / Month (Internship) vs Both */}
                <div className="inline-flex items-center bg-surface-sunken border border-border p-0.5 rounded-lg text-[10px] font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCtcUnit('LPA');
                      setCtcValue('');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      ctcUnit === 'LPA'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-fg-subtle hover:text-fg'
                    }`}
                  >
                    LPA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCtcUnit('Month');
                      setCtcValue('');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      ctcUnit === 'Month'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-fg-subtle hover:text-fg'
                    }`}
                    title="Per month stipend for internships"
                  >
                    / Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCtcUnit('Both');
                      setCtcValue('');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      ctcUnit === 'Both'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-fg-subtle hover:text-fg'
                    }`}
                    title="Both Internship Stipend & Full-time LPA"
                  >
                    Both
                  </button>
                </div>
              </div>

              <div className="relative flex items-center">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  value={ctcValue}
                  onChange={handleCtcChange}
                  placeholder={
                    ctcUnit === 'Both'
                      ? 'e.g. 15k /month, 3.80 - 5.82 LPA'
                      : ctcUnit === 'LPA'
                      ? 'e.g. 3.5, 6, 12.5 (decimals allowed)'
                      : 'e.g. 15,000, 25000 (Internship stipend)'
                  }
                  className="w-full bg-surface-sunken border border-border rounded-xl pl-9 pr-20 py-2 text-xs text-fg placeholder:text-fg-disabled outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-fg-subtle bg-surface px-1.5 py-0.5 rounded-md border border-border/50 pointer-events-none select-none">
                  {ctcUnit === 'Both' ? 'Both' : ctcUnit === 'LPA' ? 'LPA' : '/ Month'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Status, Followup Month, Academic Year Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 items-start">
            {/* Status Dropdown */}
            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">Status</label>
              <SmoothLeadStatusDropdown value={status} onChange={(s) => setStatus(s as LeadStatus)} className="w-full" />
            </div>

            {/* Followup Month Dropdown */}
            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Followup Month {status === 'Follow Up' ? <span className="text-amber-500">*</span> : ''}
              </label>
              <SmoothMonthDropdown
                value={followupMonth}
                onChange={setFollowupMonth}
                disabled={status !== 'Follow Up'}
                className="w-full"
              />
            </div>

            {/* Academic Year Dropdown */}
            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Hiring Year <span className="text-fg-subtle text-[11px] font-normal">(Optional)</span>
              </label>
              <SmoothYearDropdown value={academicYear} onChange={setAcademicYear} className="w-full" />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>{submitting ? 'Saving…' : 'Add'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
