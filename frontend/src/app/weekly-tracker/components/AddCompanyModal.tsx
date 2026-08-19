'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
  { value: 'pipeline', label: 'Companies in Pipeline' },
  { value: 'in_progress', label: 'Companies In Progress' },
  { value: 'completed', label: 'Companies Completed' },
  { value: 'top_companies', label: 'Top Companies' },
  { value: 'rejected_by_hr', label: 'Rejected by HR' },
  { value: 'rejected_by_college', label: 'Rejected by College' },
];

export function AddCompanyModal({
  collegeId,
  coordinatorId,
  onClose,
  onAdded,
}: Props) {
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('Graduate Trainee');
  const [cdcReference, setCdcReference] = useState('');
  const [companyType, setCompanyType] = useState('Software / IT');
  const [ctcLpa, setCtcLpa] = useState('');
  const [eligibleBatch, setEligibleBatch] = useState('2026 Batch');
  const [pipelineSection, setPipelineSection] = useState('pipeline');
  const [followUpDate, setFollowUpDate] = useState('');
  const [currentStatusText, setCurrentStatusText] = useState('Invite email sent, awaiting JD');
  const [loading, setLoading] = useState(false);

  // Suggestions from Master Company DB
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (companyName.trim().length >= 2) {
      const timer = setTimeout(() => {
        fetch(`${API}/companies/search?q=${encodeURIComponent(companyName)}&limit=5`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              setSuggestions(data.data.companies);
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

    setLoading(true);
    try {
      const res = await fetch(`${API}/weekly-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_id: collegeId,
          coordinator_id: coordinatorId,
          company_name: companyName.trim(),
          job_role: jobRole.trim(),
          cdc_reference: cdcReference.trim(),
          company_type: companyType,
          ctc_lpa: ctcLpa.trim(),
          eligible_batch: eligibleBatch.trim(),
          pipeline_section: pipelineSection,
          follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : null,
          current_status_text: currentStatusText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onAdded();
        onClose();
      } else {
        alert(data.error?.message || 'Failed to add company');
      }
    } catch (err: any) {
      console.error('Add company error:', err);
      alert('Network error while adding company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>➕</span> Add New Recruitment Drive
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct entry for LinkedIn, WhatsApp, or College TPO leads
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Company Name with live suggestions */}
          <div className="relative">
            <label className="block text-slate-300 font-semibold mb-1">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. TCS, Cognizant, Zoho..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                {suggestions.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => {
                      setCompanyName(s.company_name);
                      if (s.company_type) setCompanyType(s.company_type);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-slate-200">{s.company_name}</span>
                    <span className="text-[10px] text-slate-400">{s.company_type || 'Corporate'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role(s) — comma-separated per Spec Section 6 */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Job Role(s) <span className="text-slate-500 font-normal">(comma-separated for multi-roles)</span>
            </label>
            <input
              type="text"
              required
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Software Engineer, Data Analyst, AI Engineer"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* CDC Reference */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">CDC Reference</label>
              <input
                type="text"
                value={cdcReference}
                onChange={(e) => setCdcReference(e.target.value)}
                placeholder="e.g. Dr. Kumar (Placement)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            {/* CTC LPA */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">CTC Offered</label>
              <input
                type="text"
                value={ctcLpa}
                onChange={(e) => setCtcLpa(e.target.value)}
                placeholder="e.g. 6.5 LPA or 5 - 8 LPA"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Company Type */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Company Type</label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
              >
                {COMPANY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Pipeline Section */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Initial Section</label>
              <select
                value={pipelineSection}
                onChange={(e) => setPipelineSection(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
              >
                {SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Scheduled Follow-up Date</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          {/* Status Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Current Status Remarks</label>
            <textarea
              rows={2}
              value={currentStatusText}
              onChange={(e) => setCurrentStatusText(e.target.value)}
              placeholder="e.g. Invite email sent, awaiting JD from HR"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Adding…' : 'Add Drive →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
