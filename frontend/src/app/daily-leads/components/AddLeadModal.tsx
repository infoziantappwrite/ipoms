'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Sparkles, Zap, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

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
  const [eligibleBatch, setEligibleBatch] = useState('2026 Batch');
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
          if (!collegeId && list.length > 0) {
            setCollegeId(list[0]._id);
          }
        }
      })
      .catch(console.error);
  }, [collegeId]);

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
      alert('Please select a college');
      return;
    }

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
          ctc: ctc.trim(),
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">

        {/* ── Fixed Modal Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus size={16} strokeWidth={2.5} className="text-primary" />
              <span>Add Daily Opportunity Entry</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Log phone, email, WhatsApp, or TPO opportunity
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable Form Body (Invisible scrollbar) ───────────────── */}
        <form id="add-lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar">

          {/* Type Selector: Positives vs JD Received (Spec Section 11) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Register Target</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLeadType('positive')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer
                            ${
                              leadType === 'positive'
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-1 ring-emerald-400/30'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
              >
                <Sparkles size={14} strokeWidth={2} className={leadType === 'positive' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Tab 1: Positive Lead</span>
              </button>
              <button
                type="button"
                onClick={() => setLeadType('jd_received')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer
                            ${
                              leadType === 'jd_received'
                                ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs ring-1 ring-blue-400/30'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
              >
                <ClipboardList size={14} strokeWidth={2} className={leadType === 'jd_received' ? 'text-blue-600' : 'text-slate-400'} />
                <span>Tab 2: JD Received</span>
              </button>
            </div>
          </div>

          {/* Copy Shortcut Header Button (Spec Section 11) */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <span className="text-micro text-slate-600">
              Have you already logged this call in Daily Tracker?
            </span>
            <button
              type="button"
              onClick={handleOpenDtDrawer}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-micro font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Zap size={13} strokeWidth={2} />
              <span>Copy from Daily Tracker</span>
            </button>
          </div>

          {/* Drawer for Copy shortcut */}
          {showDtDrawer && (
            <div className="bg-slate-50 border border-blue-200 rounded-xl p-3 space-y-2">
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
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {dtPositives.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleSelectDtPositive(p)}
                      className="p-2 bg-white hover:bg-blue-50/70 border border-slate-200 rounded-lg cursor-pointer flex items-center justify-between transition-colors shadow-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{p.company_name}</p>
                        <p className="text-micro text-slate-500">
                          {p.college_id?.college_name || 'College'} • {p.contact_person_name}
                        </p>
                      </div>
                      <span className="text-micro bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
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
            <label className="block text-slate-700 font-semibold mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. TCS, Cognizant, Infosys…"
              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* College */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                College <span className="text-rose-500">*</span>
              </label>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 text-xs cursor-pointer shadow-xs"
              >
                <option value="">— Select College —</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    [{c.college_code}] {c.college_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Offered */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Role Offered</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* CTC */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">CTC Offered</label>
              <input
                type="text"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
                placeholder="e.g. 5.5 - 7.5 LPA"
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
              />
            </div>

            {/* Eligible Batch */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Eligible Batch</label>
              <input
                type="text"
                value={eligibleBatch}
                onChange={(e) => setEligibleBatch(e.target.value)}
                placeholder="e.g. 2026 Batch"
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Time (Separate from Date per Spec Section 10) */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Time Logged</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 text-xs transition-colors shadow-xs"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Date</label>
              <input
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 text-xs transition-colors shadow-xs"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Remarks & Details</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Positive response from campus HR. Assessment planned for next week."
              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
            />
          </div>

        </form>

        {/* ── Fixed Sticky Actions Footer ───────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-lead-form"
            disabled={loading}
            className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Saving…' : 'Save Entry →'}
          </button>
        </div>

      </div>
    </div>
  );
}
