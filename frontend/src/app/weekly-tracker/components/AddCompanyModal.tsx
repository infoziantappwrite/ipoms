'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Building2, Briefcase, Layers, GraduationCap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { SmoothSelect } from '@/components/ui/SmoothSelect';

const BATCH_YEARS = ['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];

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
          eligible_batch: eligibleBatch,
          pipeline_section: pipelineSection,
          current_status_text: currentStatusText.trim(),
          follow_up_date: followUpDate || undefined,
        }),
      });

      if (res.success) {
        onAdded();
        onClose();
      } else {
        alert(res.message || 'Failed to add company');
      }
    } catch (err: any) {
      console.error('Add company error:', err);
      alert('Network error while saving company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      {/* Themed Modal Card */}
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-fg">

        {/* ── Modern Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-sunken shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg tracking-tight">
                Add Company Details
              </h2>
              <p className="text-xs text-fg-subtle font-medium mt-0.5">
                Direct entry for LinkedIn, WhatsApp, or College TPO leads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Form Body ──────────────────── */}
        <form id="add-company-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar bg-surface">

          {/* Company Name with live suggestions */}
          <div className="relative">
            <label className="block text-fg font-semibold mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. TCS, Cognizant, Zoho..."
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border/60">
                {suggestions.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => {
                      setCompanyName(s.company_name);
                      if (s.company_type) setCompanyType(s.company_type);
                      setShowSuggestions(false);
                    }}
                    className="px-3.5 py-2.5 hover:bg-surface-raised cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-fg">{s.company_name}</span>
                    <span className="text-micro bg-surface-sunken px-2 py-0.5 rounded-full text-fg-muted font-medium border border-border">
                      {s.company_type || 'Corporate'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role(s) */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">
              Job Role(s) <span className="text-fg-subtle font-normal">(comma-separated for multi-roles)</span>
            </label>
            <input
              type="text"
              required
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Software Engineer, Data Analyst, AI Engineer"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
            />
          </div>

          {/* CTC Offered with Integrated Unit Switcher */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">CTC Offered</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ctcValue}
                onChange={(e) => setCtcValue(e.target.value)}
                placeholder={ctcUnit === 'LPA' ? 'e.g. 5 or 6.5 or 5 - 8' : 'e.g. 10,000 or 12,000 or 15k'}
                className="flex-1 bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
              />
              <div className="flex bg-surface-sunken p-1 rounded-xl border border-border shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setCtcUnit('LPA')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    ctcUnit === 'LPA'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-fg-muted hover:text-fg hover:bg-surface-raised'
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
                      : 'text-fg-muted hover:text-fg hover:bg-surface-raised'
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
              <label className="block text-fg font-semibold mb-1.5">Company Type</label>
              <SmoothSelect
                value={companyType}
                onChange={setCompanyType}
                icon={Briefcase}
                title="Company Industry Type"
                options={COMPANY_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </div>

            {/* Target Section */}
            <div>
              <label className="block text-fg font-semibold mb-1.5">Target Section</label>
              <SmoothSelect
                value={pipelineSection}
                onChange={setPipelineSection}
                icon={Layers}
                title="Placement Section"
                options={SECTIONS.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
          </div>

          <div className={`grid gap-3.5 ${pipelineSection === 'in_progress' || pipelineSection === 'pipeline' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Eligible Batch (Year Dropdown) */}
            <div>
              <label className="block text-fg font-semibold mb-1.5">Eligible Batch (Year)</label>
              <SmoothSelect
                value={eligibleBatch}
                onChange={setEligibleBatch}
                icon={GraduationCap}
                title="Eligible Graduating Batch"
                options={BATCH_YEARS.map((year) => ({
                  value: year,
                  label: `${year} Graduating Batch`,
                  badge: year,
                }))}
              />
            </div>

            {/* Follow-up Date */}
            {(pipelineSection === 'in_progress' || pipelineSection === 'pipeline') && (
              <div>
                <SmoothDatePicker
                  label="Scheduled Follow-up Date"
                  value={followUpDate}
                  onChange={setFollowUpDate}
                  minDate={(() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                  })()}
                  variant="input"
                  fullWidth
                  usePortal
                  clearable
                  placeholder="dd-mm-yyyy"
                />
              </div>
            )}
          </div>

          {/* Status Remarks */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">Current Status Remarks</label>
            <textarea
              rows={2}
              value={currentStatusText}
              onChange={(e) => setCurrentStatusText(e.target.value)}
              placeholder="e.g. Invite email sent, awaiting JD from HR"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
            />
          </div>

        </form>

        {/* ── Sticky Footer ──────────────────────────────────── */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-surface-sunken shrink-0">
          <button
            type="submit"
            form="add-company-form"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 hover:shadow-md hover:shadow-primary/25"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{loading ? 'Adding…' : 'Add'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
