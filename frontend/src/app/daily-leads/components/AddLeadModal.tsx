'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Plus, Sparkles, Zap, X, CheckCircle2, Building2, GraduationCap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { sortCollegesWithPriority, getCoordinatorSelectedColleges } from '@/lib/collegeSession';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { SmoothSelect } from '@/components/ui/SmoothSelect';
import { SmoothYearDropdown } from '@/components/ui/SmoothYearDropdown';

const BATCH_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];

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

  const prioritizedColleges = useMemo(() => {
    const coordinatorSelectedIds = getCoordinatorSelectedColleges();
    const focusedIdsFromColleges = (colleges as any[]).filter((c) => c.is_selected_by_me).map((c) => c._id);
    const activeFocusIds = Array.from(new Set([...coordinatorSelectedIds, ...focusedIdsFromColleges]));
    return sortCollegesWithPriority(colleges as any[], activeFocusIds);
  }, [colleges]);

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
      ? ctc.toLowerCase().includes('lpa') || ctc.toLowerCase().includes('/ mo')
        ? ctc.trim()
        : `${ctc.trim()} ${ctcUnit}`
      : '';

    setLoading(true);
    try {
      const resolvedCoordId = coordinatorId || readSessionUser()?._id;
      const payload: any = {
        lead_type: leadType,
        college_id: collegeId,
        coordinator_id: resolvedCoordId,
        company_name: companyName.trim(),
        job_role: jobRole.trim(),
        ctc: formattedCtc,
        eligible_batch: eligibleBatch,
        event_time: eventTime,
        lead_date: leadDate,
        remarks: remarks.trim(),
      };

      if (dailyTrackerId) payload.daily_tracker_id = dailyTrackerId;

      const res = await apiFetch('/daily-leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        onAdded();
        onClose();
      } else {
        alert(res.error?.message || res.message || 'Failed to save lead');
      }
    } catch (err: any) {
      console.error('Submit lead error:', err);
      alert('Network error while saving lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      {/* Clean Themed Modal Card */}
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-fg">

        {/* ── Modern Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-sunken shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg tracking-tight">
                Add Daily Opportunity Entry
              </h2>
              <p className="text-xs text-fg-subtle font-medium mt-0.5">
                Log phone, email, WhatsApp, or TPO opportunity
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
        <form id="add-lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar bg-surface">

          {/* Type Selector: Positives vs JD Received */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">Register Target</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLeadType('positive')}
                className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                            ${
                              leadType === 'positive'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                                : 'bg-surface border-border text-fg-muted hover:bg-surface-sunken'
                            }`}
              >
                <Sparkles size={14} strokeWidth={2.5} className={leadType === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg-subtle'} />
                <span>Positive Lead</span>
              </button>
              <button
                type="button"
                onClick={() => setLeadType('jd_received')}
                className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                            ${
                              leadType === 'jd_received'
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                                : 'bg-surface border-border text-fg-muted hover:bg-surface-sunken'
                            }`}
              >
                <ClipboardList size={14} strokeWidth={2.5} className={leadType === 'jd_received' ? 'text-blue-600 dark:text-blue-400' : 'text-fg-subtle'} />
                <span>JD Received</span>
              </button>
            </div>
          </div>

          {/* Copy Shortcut Header Button */}
          <div className="flex items-center justify-between bg-surface-sunken border border-border rounded-xl p-3">
            <span className="text-micro text-fg-muted font-medium">
              Have you already logged this call in Daily Tracker?
            </span>
            <button
              type="button"
              onClick={handleOpenDtDrawer}
              className="bg-surface hover:bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-micro font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={13} strokeWidth={2.5} />
              <span>Copy from Daily Tracker</span>
            </button>
          </div>

          {/* Drawer for Copy shortcut */}
          {showDtDrawer && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary text-micro">Select Positive Call from Daily Tracker</span>
                <button
                  type="button"
                  onClick={() => setShowDtDrawer(false)}
                  aria-label="Close"
                  className="text-fg-subtle hover:text-fg p-1"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
              {dtLoading ? (
                <p className="text-fg-subtle italic py-2">Loading Daily Tracker positive calls…</p>
              ) : dtPositives.length === 0 ? (
                <p className="text-fg-subtle italic py-2">No positive calls found in Daily Tracker for {leadDate}.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {dtPositives.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleSelectDtPositive(p)}
                      className="p-2.5 bg-surface hover:bg-surface-raised border border-border rounded-xl cursor-pointer flex items-center justify-between transition-colors shadow-xs"
                    >
                      <div>
                        <p className="font-bold text-fg">{p.company_name}</p>
                        <p className="text-micro text-fg-subtle">
                          {p.college_id?.college_name || 'College'} • {p.contact_person_name}
                        </p>
                      </div>
                      <span className="text-micro bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold">
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
            <label className="block text-fg font-semibold mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. TCS, Cognizant, Infosys…"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* College */}
            <div>
              <label className="block text-fg font-semibold mb-1.5">
                College <span className="text-rose-500">*</span>
              </label>
              <SmoothSelect
                value={collegeId}
                onChange={setCollegeId}
                searchable={true}
                searchPlaceholder="Search institution name or code…"
                icon={Building2}
                title="Select Associated Institution"
                options={[
                  { value: '', label: '— Select College (Required) —' },
                  ...prioritizedColleges.map((c: any) => ({
                    value: c._id,
                    label: c.college_name,
                    badge: c.college_code,
                    sublabel: c.location,
                    isPinned: Boolean(c.isPinned || c.is_selected_by_me),
                  })),
                ]}
              />
            </div>

            {/* Role Offered */}
            <div>
              <label className="block text-fg font-semibold mb-1.5">Role Offered</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* CTC */}
            <div>
              <label className="block text-fg font-semibold mb-1.5">CTC Offered</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={ctc}
                  onChange={(e) => setCtc(e.target.value)}
                  placeholder={ctcUnit === 'LPA' ? 'e.g. 5 or 6.5' : 'e.g. 10,000 or 12k'}
                  className="flex-1 min-w-0 bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
                />
                <div className="flex bg-surface-sunken p-0.5 rounded-xl border border-border shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setCtcUnit('LPA')}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      ctcUnit === 'LPA'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-fg-muted hover:text-fg hover:bg-surface-raised'
                    }`}
                  >
                    LPA
                  </button>
                  <button
                    type="button"
                    onClick={() => setCtcUnit('/ Month')}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      ctcUnit === '/ Month'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-fg-muted hover:text-fg hover:bg-surface-raised'
                    }`}
                  >
                    / Mo
                  </button>
                </div>
              </div>
            </div>

            {/* Eligible Batch */}
            <div>
              <label className="block text-fg font-semibold mb-1.5">Eligible Batch (Year)</label>
              <SmoothYearDropdown
                value={eligibleBatch}
                onChange={setEligibleBatch}
                placeholder="Select Batch Year(s)"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Time */}
            <div>
              <label className="block text-fg font-semibold mb-1.5">Time Logged</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <SmoothDatePicker
                label="Date"
                value={leadDate}
                onChange={setLeadDate}
                variant="input"
                fullWidth
                usePortal
                placeholder="dd-mm-yyyy"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">Remarks & Details</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Positive response from campus HR. Assessment planned for next week."
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
            />
          </div>

        </form>

        {/* ── Sticky Footer ──────────────────────────────────── */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-surface-sunken shrink-0">
          <button
            type="submit"
            form="add-lead-form"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 hover:shadow-md hover:shadow-primary/25"
          >
            <CheckCircle2 size={15} />
            <span>{loading ? 'Saving…' : 'Save Entry'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
