'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Sparkles, Zap, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const BATCH_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'];

interface College {
  _id: string;
  college_name: string;
  college_code: string;
}

interface Props {
  initialLeadType: 'positive' | 'jd_received';
  initialCollegeId: string;
  initialDate: string;
  coordinatorId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddLeadModal({
  initialLeadType,
  initialCollegeId,
  initialDate,
  coordinatorId,
  onClose,
  onAdded,
}: Props) {
  const [leadType, setLeadType] = useState<'positive' | 'jd_received'>(initialLeadType);
  const [collegeId, setCollegeId] = useState(initialCollegeId !== 'all' ? initialCollegeId : '');
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('Graduate Trainee');
  const [ctc, setCtc] = useState('');
  const [ctcUnit, setCtcUnit] = useState<'LPA' | '/ Month'>('LPA');
  const [eligibleBatch, setEligibleBatch] = useState('2026');
  const [eventTime, setEventTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [leadDate, setLeadDate] = useState(initialDate);
  const [remarks, setRemarks] = useState('');
  const [dailyTrackerId, setDailyTrackerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Colleges list
  const [colleges, setColleges] = useState<College[]>([]);

  // "Copy from Daily Tracker" shortcut drawer
  const [showDtDrawer, setShowDtDrawer] = useState(false);
  const [dtPositives, setDtPositives] = useState<any[]>([]);
  const [dtLoading, setDtLoading] = useState(false);

  useEffect(() => {
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          const list = (data.data as any).colleges;
          setColleges(list);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Daily Tracker positives for Copy Shortcut
  const handleOpenDtDrawer = () => {
    setShowDtDrawer(true);
    setDtLoading(true);
    apiFetch(`/daily-leads/daily-tracker-positives?date=${leadDate}&coordinator_id=${coordinatorId}`)
      .then((data) => {
        if (data.success && (data.data as any)?.positives) {
          setDtPositives((data.data as any).positives);
        }
      })
      .catch(console.error)
      .finally(() => setDtLoading(false));
  };

  // Copy selected Daily Tracker call data
  const handleSelectDtPositive = (p: any) => {
    setCompanyName(p.company_name);
    setCollegeId(p.college_id?._id || p.college_id);
    if (p.notes_remarks) setRemarks(`From DT Call: ${p.notes_remarks}`);
    setDailyTrackerId(p._id);
    setShowDtDrawer(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Company Name is required');
      return;
    }
    if (!collegeId) {
      alert('Please select a college to proceed.');
      return;
    }

    const formattedCtc = ctc.trim()
      ? (ctc.includes('LPA') || ctc.toLowerCase().includes('month')
          ? ctc.trim()
          : `${ctc.trim()} ${ctcUnit}`)
      : '';

    setLoading(true);
    try {
      const res = await apiFetch('/daily-leads', {
        method: 'POST',
        body: JSON.stringify({
          lead_type: leadType,
          college_id: collegeId,
          coordinator_id: coordinatorId,
          daily_tracker_id: dailyTrackerId,
          company_name: companyName.trim(),
          job_role: jobRole.trim(),
          ctc: formattedCtc,
          eligible_batch: eligibleBatch.trim(),
          event_time: eventTime.trim(),
          lead_date: leadDate,
          remarks: remarks.trim(),
        }),
      });
      if (res.success) {
        onAdded();
        onClose();
      } else {
        alert(res.error?.message || 'Failed to create daily lead');
      }
    } catch (err: any) {
      console.error('Submit lead error:', err);
      alert('Network error while saving lead');
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
                Add Daily Opportunity Entry
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Log phone, email, WhatsApp, or TPO opportunity
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
        <form id="add-lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar bg-white">

          {/* Type Selector: Positives vs JD Received */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Register Target</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLeadType('positive')}
                className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                            ${
                              leadType === 'positive'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
              >
                <Sparkles size={14} strokeWidth={2.5} className={leadType === 'positive' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Positive Lead</span>
              </button>
              <button
                type="button"
                onClick={() => setLeadType('jd_received')}
                className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                            ${
                              leadType === 'jd_received'
                                ? 'bg-blue-50 border-blue-400 text-blue-800'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
              >
                <ClipboardList size={14} strokeWidth={2.5} className={leadType === 'jd_received' ? 'text-blue-600' : 'text-slate-400'} />
                <span>JD Received</span>
              </button>
            </div>
          </div>

          {/* Copy Shortcut Header Button */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-micro text-slate-600 font-medium">
              Have you already logged this call in Daily Tracker?
            </span>
            <button
              type="button"
              onClick={handleOpenDtDrawer}
              className="bg-white hover:bg-blue-50 text-primary border border-blue-200 px-3 py-1.5 rounded-lg text-micro font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={13} strokeWidth={2.5} />
              <span>Copy from Daily Tracker</span>
            </button>
          </div>

          {/* Drawer for Copy shortcut */}
          {showDtDrawer && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 text-micro">Select Positive Call from Daily Tracker</span>
                <button
                  type="button"
                  onClick={() => setShowDtDrawer(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs p-1"
                >
                  ✕
                </button>
              </div>
              {dtLoading ? (
                <p className="text-slate-500 italic py-2">Loading Daily Tracker positive calls…</p>
              ) : dtPositives.length === 0 ? (
                <p className="text-slate-500 italic py-2">No positive calls found in Daily Tracker for {leadDate}.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {dtPositives.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleSelectDtPositive(p)}
                      className="p-2.5 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl cursor-pointer flex items-center justify-between transition-colors shadow-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{p.company_name}</p>
                        <p className="text-micro text-slate-500">
                          {p.college_id?.college_name || 'College'} • {p.contact_person_name}
                        </p>
                      </div>
                      <span className="text-micro bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        {p.outcome_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. TCS, Cognizant, Infosys…"
              className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 text-xs transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* College */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                College <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className={`w-full bg-white border ${
                  !collegeId ? 'border-amber-400' : 'border-slate-300'
                } focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs transition-all cursor-pointer outline-none font-medium`}
              >
                <option value="">— Select College (Required) —</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    [{c.college_code}] {c.college_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Offered */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Role Offered</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 text-xs transition-all outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* CTC */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">CTC Offered</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={ctc}
                  onChange={(e) => setCtc(e.target.value)}
                  placeholder={ctcUnit === 'LPA' ? 'e.g. 5 or 6.5' : 'e.g. 10,000 or 12k'}
                  className="flex-1 min-w-0 bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 text-xs transition-all outline-none"
                />
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-300 shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setCtcUnit('LPA')}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
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
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      ctcUnit === '/ Month'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    / Mo
                  </button>
                </div>
              </div>
            </div>

            {/* Eligible Batch */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Time */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Time Logged</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs transition-all outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Date</label>
              <input
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs transition-all cursor-pointer outline-none"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Remarks & Details</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Positive response from campus HR. Assessment planned for next week."
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
            form="add-lead-form"
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          >
            {loading ? 'Saving…' : 'Save Entry'}
          </button>
        </div>

      </div>
    </div>
  );
}
