'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Building2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const BATCH_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'];

interface Props {
  collegeId: string;
  coordinatorId: string;
  onClose: () => void;
  onAdded: () => void;
}

const COMPANY_TYPES = [
  'Software / IT',
  'Software / Product',
  'Core / Engineering',
  'Banking / Finance',
  'Healthcare / Pharma',
  'EdTech / Education',
  'Consulting',
  'BPO / KPO',
];

const SECTIONS = [
  { value: 'completed', label: 'Companies Completed' },
  { value: 'in_progress', label: 'Companies In Progress' },
  { value: 'pipeline', label: 'Companies in Pipeline' },
  { value: 'top_companies', label: 'Top Companies' },
  { value: 'rejected_by_hr', label: 'Companies Rejected by HR' },
  { value: 'rejected_by_college', label: 'Companies Rejected by TPO' },
];

export function AddCompanyModal({
  collegeId,
  coordinatorId,
  onClose,
  onAdded,
}: Props) {
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('Graduate Trainee');
  const [companyType, setCompanyType] = useState('Software / IT');
  const [ctcValue, setCtcValue] = useState('');
  const [ctcUnit, setCtcUnit] = useState<'LPA' | '/ Month'>('LPA');
  const [eligibleBatch, setEligibleBatch] = useState('2026');
  const [pipelineSection, setPipelineSection] = useState('completed');
  const [followUpDate, setFollowUpDate] = useState('');
  const [currentStatusText, setCurrentStatusText] = useState('Drive confirmed and scheduled');
  const [loading, setLoading] = useState(false);

  // Suggestions from Master Company DB
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (companyName.trim().length >= 2) {
      const timer = setTimeout(() => {
        apiFetch(`/companies/search?q=${encodeURIComponent(companyName)}&limit=5`)
          .then((data) => {
            if (data.success && (data.data as any)?.companies) {
              setSuggestions((data.data as any).companies);
              setShowSuggestions(true);
            }
          })
          .catch(console.error);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [companyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Company Name is required');
      return;
    }

    const formattedCtc = ctcValue.trim()
      ? (ctcValue.includes('LPA') || ctcValue.toLowerCase().includes('month')
          ? ctcValue.trim()
          : `${ctcValue.trim()} ${ctcUnit}`)
      : '';

    setLoading(true);
    try {
      const res = await apiFetch('/weekly-tracker', {
        method: 'POST',
        body: JSON.stringify({
          college_id: collegeId,
          coordinator_id: coordinatorId,
          company_name: companyName.trim(),
          job_role: jobRole.trim(),
          cdc_reference: '',
          company_type: companyType,
          ctc_lpa: formattedCtc,
          eligible_batch: eligibleBatch.trim(),
          pipeline_section: pipelineSection,
          follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : null,
          current_status_text: currentStatusText.trim(),
        }),
      });
      if (res.success) {
        onAdded();
        onClose();
      } else {
        alert(res.error?.message || 'Failed to add company');
      }
    } catch (err: any) {
      console.error('Add company error:', err);
      alert('Network error while adding company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      {/* Modern Flat 2.0 Clean Modal Card */}
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Modern Flat Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/75 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary border border-blue-200 flex items-center justify-center">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Add Company Details
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Direct entry for LinkedIn, WhatsApp, or College TPO leads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Modern Flat Form Body (Clean flat inputs) ──────────────────── */}
        <form id="add-company-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar bg-white">

          {/* Company Name with live suggestions */}
          <div className="relative">
            <label className="block text-slate-700 font-semibold mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. TCS, Cognizant, Zoho..."
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 text-xs transition-all outline-none"
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100">
                {suggestions.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => {
                      setCompanyName(s.company_name);
                      if (s.company_type) setCompanyType(s.company_type);
                      setShowSuggestions(false);
                    }}
                    className="px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{s.company_name}</span>
                    <span className="text-micro bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">
                      {s.company_type || 'Corporate'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role(s) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Job Role(s) <span className="text-slate-400 font-normal">(comma-separated for multi-roles)</span>
            </label>
            <input
              type="text"
              required
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Software Engineer, Data Analyst, AI Engineer"
              className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 text-xs transition-all outline-none"
            />
          </div>

          {/* CTC Offered with Integrated Unit Switcher */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">CTC Offered</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ctcValue}
                onChange={(e) => setCtcValue(e.target.value)}
                placeholder={ctcUnit === 'LPA' ? 'e.g. 5 or 6.5 or 5 - 8' : 'e.g. 10,000 or 12,000 or 15k'}
                className="flex-1 bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 text-xs transition-all outline-none"
              />
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-300 shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setCtcUnit('LPA')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    ctcUnit === 'LPA'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  LPA
                </button>
                <button
                  type="button"
                  onClick={() => setCtcUnit('/ Month')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    ctcUnit === '/ Month'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  / Month
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Company Type */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Company Type</label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs transition-all cursor-pointer outline-none font-medium"
              >
                {COMPANY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Target Section */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Target Section</label>
              <select
                value={pipelineSection}
                onChange={(e) => setPipelineSection(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs transition-all cursor-pointer outline-none font-medium"
              >
                {SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Follow-up Date */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Scheduled Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs transition-all cursor-pointer outline-none"
              />
            </div>

            {/* Eligible Batch (Year Dropdown) */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Eligible Batch (Year)</label>
              <select
                value={eligibleBatch}
                onChange={(e) => setEligibleBatch(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs transition-all cursor-pointer outline-none font-medium"
              >
                {BATCH_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Remarks */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Current Status Remarks</label>
            <textarea
              rows={2}
              value={currentStatusText}
              onChange={(e) => setCurrentStatusText(e.target.value)}
              placeholder="e.g. Invite email sent, awaiting JD from HR"
              className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 text-xs transition-all outline-none"
            />
          </div>

        </form>

        {/* ── Modern Flat Sticky Footer ──────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300 transition-colors cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-company-form"
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          >
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>

      </div>
    </div>
  );
}
