'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Sparkles, Zap } from 'lucide-react';

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
      <div className="glass-panel rounded-2xl w-full max-w-lg border border-border-strong shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus size={14} strokeWidth={2} aria-hidden /> Add Daily Opportunity Entry
            </h2>
            <p className="text-xs text-fg-subtle mt-0.5">
              Log phone, email, WhatsApp, or TPO opportunity
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-fg-subtle hover:text-white text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">

          {/* Type Selector: Positives vs JD Received (Spec Section 11) */}
          <div>
            <label className="block text-fg-muted font-semibold mb-1.5">Register Target</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeadType('positive')}
                className={`py-2 px-3 rounded-lg border font-semibold transition-colors flex items-center justify-center gap-1.5
                            ${
                              leadType === 'positive'
                                ? 'bg-success/30 border-success text-success'
                                : 'bg-surface border-border-strong text-fg-subtle'
                            }`}
              >
                <Sparkles size={14} strokeWidth={2} aria-hidden /> Tab 1: Positive Lead
              </button>
              <button
                type="button"
                onClick={() => setLeadType('jd_received')}
                className={`py-2 px-3 rounded-lg border font-semibold transition-colors flex items-center justify-center gap-1.5
                            ${
                              leadType === 'jd_received'
                                ? 'bg-primary/30 border-primary text-primary'
                                : 'bg-surface border-border-strong text-fg-subtle'
                            }`}
              >
                <ClipboardList size={14} strokeWidth={2} aria-hidden /> Tab 2: JD Received
              </button>
            </div>
          </div>

          {/* Copy Shortcut Header Button (Spec Section 11) */}
          <div className="flex items-center justify-between bg-background border border-border rounded-lg p-2.5">
            <span className="text-micro text-fg-subtle">
              Have you already logged this call in Daily Tracker?
            </span>
            <button
              type="button"
              onClick={handleOpenDtDrawer}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2.5 py-1 rounded text-micro font-semibold transition-colors flex items-center gap-1"
            >
              <Zap size={14} strokeWidth={2} aria-hidden /> Copy from Daily Tracker
            </button>
          </div>

          {/* Drawer for Copy shortcut */}
          {showDtDrawer && (
            <div className="bg-background/90 border border-primary/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary text-micro">Select Positive Call from Daily Tracker</span>
                <button
                  type="button"
                  onClick={() => setShowDtDrawer(false)}
                  className="text-fg-subtle hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              {dtLoading ? (
                <p className="text-fg-subtle italic py-2">Loading Daily Tracker positive calls…</p>
              ) : dtPositives.length === 0 ? (
                <p className="text-fg-subtle italic py-2">No positive calls found in Daily Tracker for {leadDate}.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {dtPositives.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleSelectDtPositive(p)}
                      className="p-2 bg-surface hover:bg-surface-raised/80 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-fg">{p.company_name}</p>
                        <p className="text-micro text-fg-subtle">
                          {p.college_id?.college_name || 'College'} • {p.contact_person_name}
                        </p>
                      </div>
                      <span className="text-micro bg-success/20 text-success px-2 py-0.5 rounded-full">
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
            <label className="block text-fg-muted font-semibold mb-1">
              Company Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. TCS, Cognizant, Infosys…"
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg placeholder-fg-subtle text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* College */}
            <div>
              <label className="block text-fg-muted font-semibold mb-1">
                College <span className="text-destructive">*</span>
              </label>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs cursor-pointer"
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
              <label className="block text-fg-muted font-semibold mb-1">Role Offered</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg placeholder-fg-subtle text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* CTC */}
            <div>
              <label className="block text-fg-muted font-semibold mb-1">CTC Offered</label>
              <input
                type="text"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
                placeholder="e.g. 5.5 - 7.5 LPA"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg placeholder-fg-subtle text-xs"
              />
            </div>

            {/* Eligible Batch */}
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Eligible Batch</label>
              <input
                type="text"
                value={eligibleBatch}
                onChange={(e) => setEligibleBatch(e.target.value)}
                placeholder="e.g. 2026 Batch"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg placeholder-fg-subtle text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Time (Separate from Date per Spec Section 10) */}
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Time Logged</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Date</label>
              <input
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Remarks & Details</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Positive response from campus HR. Assessment planned for next week."
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg placeholder-fg-subtle text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg-muted rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Saving…' : 'Save Entry →'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
