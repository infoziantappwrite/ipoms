'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setColleges(data.data.colleges);
          if (!collegeId && data.data.colleges.length > 0) {
            setCollegeId(data.data.colleges[0]._id);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Daily Tracker positives for Copy Shortcut
  const handleOpenDtDrawer = () => {
    setShowDtDrawer(true);
    setDtLoading(true);
    fetch(`${API}/daily-leads/daily-tracker-positives?date=${leadDate}&coordinator_id=${coordinatorId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setDtPositives(data.data.positives);
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
      const res = await fetch(`${API}/daily-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const data = await res.json();
      if (data.success) {
        onAdded();
        onClose();
      } else {
        alert(data.error?.message || 'Failed to create daily lead');
      }
    } catch (err: any) {
      console.error('Submit lead error:', err);
      alert('Network error while saving lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>➕</span> Add Daily Opportunity Entry
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log phone, email, WhatsApp, or TPO opportunity
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

          {/* Type Selector: Positives vs JD Received (Spec Section 11) */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Register Target</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeadType('positive')}
                className={`py-2 px-3 rounded-lg border font-semibold transition-colors flex items-center justify-center gap-1.5
                            ${
                              leadType === 'positive'
                                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
              >
                <span>✨</span> Tab 1: Positive Lead
              </button>
              <button
                type="button"
                onClick={() => setLeadType('jd_received')}
                className={`py-2 px-3 rounded-lg border font-semibold transition-colors flex items-center justify-center gap-1.5
                            ${
                              leadType === 'jd_received'
                                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
              >
                <span>📋</span> Tab 2: JD Received
              </button>
            </div>
          </div>

          {/* Copy Shortcut Header Button (Spec Section 11) */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[11px] text-slate-400">
              Have you already logged this call in Daily Tracker?
            </span>
            <button
              type="button"
              onClick={handleOpenDtDrawer}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <span>⚡</span> Copy from Daily Tracker
            </button>
          </div>

          {/* Drawer for Copy shortcut */}
          {showDtDrawer && (
            <div className="bg-slate-900/90 border border-blue-500/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-300 text-[11px]">Select Positive Call from Daily Tracker</span>
                <button
                  type="button"
                  onClick={() => setShowDtDrawer(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              {dtLoading ? (
                <p className="text-slate-500 italic py-2">Loading Daily Tracker positive calls…</p>
              ) : dtPositives.length === 0 ? (
                <p className="text-slate-500 italic py-2">No positive calls found in Daily Tracker for {leadDate}.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {dtPositives.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleSelectDtPositive(p)}
                      className="p-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{p.company_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {p.college_id?.college_name || 'College'} • {p.contact_person_name}
                        </p>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
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
            <label className="block text-slate-300 font-semibold mb-1">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. TCS, Cognizant, Infosys…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* College */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                College <span className="text-red-400">*</span>
              </label>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
              >
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    [{c.college_code}] {c.college_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Offered */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Role Offered</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* CTC */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">CTC Offered</label>
              <input
                type="text"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
                placeholder="e.g. 5.5 - 7.5 LPA"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            {/* Eligible Batch */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Eligible Batch</label>
              <input
                type="text"
                value={eligibleBatch}
                onChange={(e) => setEligibleBatch(e.target.value)}
                placeholder="e.g. 2026 Batch"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Time (Separate from Date per Spec Section 10) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Time Logged</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Date</label>
              <input
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Remarks & Details</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Positive response from campus HR. Assessment planned for next week."
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
              {loading ? 'Saving…' : 'Save Entry →'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
