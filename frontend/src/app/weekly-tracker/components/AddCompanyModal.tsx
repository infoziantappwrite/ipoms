'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Building2, Briefcase, Layers, GraduationCap, Trophy, Phone, Mail, Calendar, Database, Info, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { SmoothSelect } from '@/components/ui/SmoothSelect';
import { useToast } from '@/components/ui/Toast';
import { validateAndNormalizeIndianMobile, validateAndNormalizeEmail } from '@/lib/contactValidation';

const BATCH_YEARS = ['2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];

import { COMPANY_TYPES } from '../constants/companyTypes';
import { ForeignCollegeWarningModal } from './ForeignCollegeWarningModal';

interface Props {
  collegeId: string;
  coordinatorId: string;
  onClose: () => void;
  onAdded: () => void;
  /** True when collegeId isn't one of the acting coordinator's assigned colleges. */
  isForeignCollege?: boolean;
  collegeName?: string;
  initialDraft?: any;
}

const SECTIONS = [
  { value: 'completed', label: '1. Companies Completed' },
  { value: 'drive_in_progress', label: '2. Drive in Progress' },
  { value: 'in_drive', label: '3. Upcoming Drives' },
  { value: 'in_progress', label: '4. Companies In Progress' },
  { value: 'pipeline', label: '5. Companies In Pipeline' },
  { value: 'top_companies', label: '6. Top Companies' },
  { value: 'rejected_companies', label: '7. Rejected Companies' },
  { value: 'on_hold_by_college', label: '8. Companies On Hold By College' },
  { value: 'on_hold_by_hr', label: '9. Companies On Hold By HR' },
];

export function AddCompanyModal({
  collegeId,
  coordinatorId,
  onClose,
  onAdded,
  isForeignCollege,
  collegeName,
  initialDraft,
}: Props) {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState(initialDraft?.companyName || '');
  const [contactNumber, setContactNumber] = useState(initialDraft?.contactNumber || '');
  const [emailId, setEmailId] = useState(initialDraft?.emailId || '');
  const [jdReceivedDate, setJdReceivedDate] = useState(initialDraft?.jdReceivedDate || '');
  const [dbSharedDate, setDbSharedDate] = useState(initialDraft?.dbSharedDate || '');
  const [jobRole, setJobRole] = useState(initialDraft?.jobRole || 'Graduate Trainee');
  const [companyType, setCompanyType] = useState(initialDraft?.companyType || 'IT / Software & Technology');
  const [ctcValue, setCtcValue] = useState(initialDraft?.ctcValue || '');
  const [ctcUnit, setCtcUnit] = useState<'LPA' | '/ Month'>(initialDraft?.ctcUnit || 'LPA');
  const [eligibleBatch, setEligibleBatch] = useState(initialDraft?.eligibleBatch || '2027');
  const [pipelineSection, setPipelineSection] = useState(initialDraft?.pipelineSection || 'pipeline');
  const [offersReceived, setOffersReceived] = useState<string>(initialDraft?.offersReceived !== undefined ? String(initialDraft.offersReceived) : '0');
  const [followUpDate, setFollowUpDate] = useState(initialDraft?.followUpDate || '');
  const [currentStatusText, setCurrentStatusText] = useState(initialDraft?.currentStatusText || 'Drive confirmed and scheduled');
  const [loading, setLoading] = useState(false);
  const [showForeignWarning, setShowForeignWarning] = useState(false);
  const [showNotInMetaModal, setShowNotInMetaModal] = useState(false);
  const [isRestoredDraft, setIsRestoredDraft] = useState(Boolean(initialDraft?.companyName));

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

  const handleRedirectToMetadata = () => {
    if (typeof window !== 'undefined') {
      const draft = {
        companyName: companyName.trim(),
        contactNumber: contactNumber.trim(),
        emailId: emailId.trim(),
        jdReceivedDate,
        dbSharedDate,
        jobRole: jobRole.trim(),
        companyType,
        ctcValue: ctcValue.trim(),
        ctcUnit,
        eligibleBatch,
        pipelineSection,
        offersReceived,
        followUpDate,
        currentStatusText: currentStatusText.trim(),
        collegeId,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('ipoms_weekly_add_company_draft', JSON.stringify(draft));

      const params = new URLSearchParams({
        add: 'true',
        company_name: companyName.trim(),
        primary_mobile: contactNumber.trim(),
        primary_email: emailId.trim(),
        company_type: companyType,
        return_to: `/weekly-tracker?college_id=${encodeURIComponent(collegeId)}`,
      });
      window.location.href = `/metadata?${params.toString()}`;
    }
  };

  const handleSubmit = async (e?: React.FormEvent, bypassForeignCheck = false) => {
    if (e) e.preventDefault();
    if (!companyName.trim()) {
      toast('Company Name is mandatory.', 'warning');
      return;
    }
    if (!jobRole.trim()) {
      toast('Job Role is mandatory.', 'warning');
      return;
    }
    if (!ctcValue.trim()) {
      toast('CTC is mandatory.', 'warning');
      return;
    }
    if (!currentStatusText.trim()) {
      toast('Current Status Remarks is mandatory.', 'warning');
      return;
    }

    let normalizedContact = '';
    if (contactNumber.trim()) {
      const res = validateAndNormalizeIndianMobile(contactNumber.trim());
      if (!res.valid) {
        toast(res.error || 'Invalid Indian mobile number', 'warning');
        return;
      }
      normalizedContact = res.normalized;
    }

    let normalizedEmail = '';
    if (emailId.trim()) {
      const res = validateAndNormalizeEmail(emailId.trim());
      if (!res.valid) {
        toast(res.error || 'Invalid email address', 'warning');
        return;
      }
      normalizedEmail = res.normalized;
    }

    if (followUpDate) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (followUpDate < todayStr) {
        toast('Follow-up date cannot be in the past. Please select today or an upcoming date.', 'warning');
        return;
      }
    }

    if (isForeignCollege && !bypassForeignCheck) {
      setShowForeignWarning(true);
      return;
    }

    let finalOffersCount = 0;
    if (pipelineSection === 'completed') {
      if (offersReceived === '' || offersReceived === undefined || offersReceived === null) {
        toast('Offers Received is mandatory for Completed companies.', 'warning');
        return;
      }
      const num = parseInt(offersReceived, 10);
      if (isNaN(num) || num < 0 || num > 50 || String(offersReceived).includes('.')) {
        toast('Offers Received must be a whole number between 0 and 50.', 'warning');
        return;
      }
      finalOffersCount = num;
    }

    const formattedCtc = ctcValue.includes('LPA') || ctcValue.toLowerCase().includes('month')
      ? ctcValue.trim()
      : `${ctcValue.trim()} ${ctcUnit}`;

    setLoading(true);
    try {
      const res = await apiFetch<any>('/weekly-tracker', {
        method: 'POST',
        body: JSON.stringify({
          college_id: collegeId,
          coordinator_id: coordinatorId,
          company_name: companyName.trim(),
          contact_number: normalizedContact || undefined,
          mobile_numbers: normalizedContact ? [normalizedContact] : [],
          email_id: normalizedEmail || undefined,
          email_ids: normalizedEmail ? [normalizedEmail] : [],
          jd_received_date: jdReceivedDate || undefined,
          db_shared_date: dbSharedDate || undefined,
          job_role: jobRole.trim(),
          cdc_reference: '',
          company_type: companyType,
          ctc_lpa: formattedCtc,
          eligible_batch: eligibleBatch,
          pipeline_section: pipelineSection,
          current_status_text: currentStatusText.trim(),
          follow_up_date: followUpDate || undefined,
          selected_count: finalOffersCount,
          offers_received: finalOffersCount,
        }),
      });

      if (res.success) {
        toast(`"${companyName.trim()}" added to Weekly Tracker.`, 'success');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ipoms_weekly_add_company_draft');
        }
        onAdded();
        onClose();
      } else {
        if (
          res.error?.code === 'COMPANY_NOT_IN_METADATA' ||
          (typeof res.error?.message === 'string' && res.error.message.includes('not in the Metadata database')) ||
          (typeof res.message === 'string' && res.message.includes('not in the Metadata database'))
        ) {
          setShowNotInMetaModal(true);
        } else {
          toast(res.message || res.error?.message || 'Failed to add company', 'error');
        }
      }
    } catch (err: any) {
      console.error('Add company error:', err);
      toast('Network error while saving company', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(e as any);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

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

          {/* Restored Draft Alert Banner */}
          {isRestoredDraft && (
            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles size={14} className="text-emerald-500 shrink-0" />
                <span>Metadata saved! All your details are restored. Simply click <strong>Add</strong> to place in pipeline.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoredDraft(false)}
                className="text-micro hover:underline font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

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
                      if (s.primary_mobile || (s.mobile_numbers && s.mobile_numbers[0])) {
                        setContactNumber(s.primary_mobile || s.mobile_numbers[0]);
                      }
                      if (s.primary_email || (s.email_ids && s.email_ids[0])) {
                        setEmailId(s.primary_email || s.email_ids[0]);
                      }
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

          {/* Contact Number & Email ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-fg font-semibold mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-blue-600 dark:text-blue-400" />
                <span>Contact Number</span>
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-surface-sunken border border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-fg font-semibold mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span>Email ID</span>
              </label>
              <input
                type="email"
                value={emailId}
                onChange={(e) => setEmailId(e.target.value)}
                placeholder="e.g. hr@company.com"
                className="w-full bg-surface-sunken border border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
              />
            </div>
          </div>

          {/* JD Received Date & DB Shared Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <SmoothDatePicker
                label="JD Received Date"
                value={jdReceivedDate}
                onChange={setJdReceivedDate}
                variant="input"
                fullWidth
                usePortal
                clearable
                placeholder="dd-mm-yyyy"
              />
            </div>

            <div>
              <SmoothDatePicker
                label="Database Shared Date"
                value={dbSharedDate}
                onChange={setDbSharedDate}
                variant="input"
                fullWidth
                usePortal
                clearable
                placeholder="dd-mm-yyyy"
              />
            </div>
          </div>

          {/* Role(s) */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">
              Job Role(s) <span className="text-rose-500">*</span> <span className="text-fg-subtle font-normal">(comma-separated for multi-roles)</span>
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
            <label className="block text-fg font-semibold mb-1.5">
              CTC Offered <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
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
                      ? 'bg-primary text-primary-foreground shadow-xs'
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
                      ? 'bg-primary text-primary-foreground shadow-xs'
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

          <div className={`grid gap-3.5 ${pipelineSection === 'completed' || pipelineSection === 'in_progress' || pipelineSection === 'pipeline' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
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
                  label: year,
                }))}
              />
            </div>

            {/* Offers Received (Visible only when Target Section is Companies Completed) */}
            {pipelineSection === 'completed' && (
              <div className="animate-fadeIn">
                <label className="block text-fg font-semibold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Trophy size={13} className="text-emerald-600 dark:text-emerald-400" />
                    Offers Received <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-micro font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 font-bold shadow-2xs">
                    0 – 50 only
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    required
                    value={offersReceived}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setOffersReceived('');
                        return;
                      }
                      // Allow only non-negative digits
                      const clean = raw.replace(/[^0-9]/g, '');
                      if (clean === '') {
                        setOffersReceived('');
                        return;
                      }
                      const num = parseInt(clean, 10);
                      if (isNaN(num)) return;
                      if (num < 0) {
                        setOffersReceived('0');
                      } else if (num > 50) {
                        setOffersReceived('50');
                        toast('Offers received cannot exceed 50.', 'warning');
                      } else {
                        setOffersReceived(String(num));
                      }
                    }}
                    onKeyDown={(e) => {
                      // Block negative, decimal, plus, e/E
                      if (['-', '+', '.', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onBlur={() => {
                      if (offersReceived === '' || isNaN(parseInt(offersReceived, 10))) {
                        setOffersReceived('0');
                      } else {
                        const num = parseInt(offersReceived, 10);
                        if (num < 0) setOffersReceived('0');
                        else if (num > 50) setOffersReceived('50');
                      }
                    }}
                    placeholder="e.g. 12 (Max 50)"
                    className="w-full bg-surface-sunken border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-fg font-bold text-xs transition-all outline-none font-mono"
                  />
                </div>
              </div>
            )}

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
            <label className="block text-fg font-semibold mb-1.5">
              Current Status Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
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
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.992] hover:shadow-md hover:shadow-primary/25"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{loading ? 'Adding…' : 'Add'}</span>
          </button>
        </div>

      </div>

      {/* ── Foreign College Warning In-App Modal ─────────────────────────── */}
      <ForeignCollegeWarningModal
        isOpen={showForeignWarning}
        collegeName={collegeName || 'This Institution'}
        actionText="add company"
        onClose={() => setShowForeignWarning(false)}
        onConfirm={() => {
          setShowForeignWarning(false);
          handleSubmit(undefined, true);
        }}
      />

      {/* ── Interactive Modal: Company Not in Metadata Database ── */}
      {showNotInMetaModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface text-fg rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-border pb-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center shrink-0 shadow-xs">
                <Database size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">Company Not in Metadata Database</h3>
                <p className="text-micro text-fg-subtle">Master Company Directory Sync</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-fg-muted leading-relaxed">
              <p>
                The company <strong className="text-fg font-semibold">&ldquo;{companyName.trim()}&rdquo;</strong> is not registered in the Master Metadata Database.
              </p>
              <div className="p-3.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl space-y-1.5 text-[11.5px]">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  <Info size={14} />
                  Do you want to add this company to the Metadata Database?
                </p>
                <p className="text-fg-subtle leading-normal">
                  Adding it to Metadata permanently registers this company in the master directory. Once saved, you will automatically return right here with all your entered details intact so you can complete adding it to your college pipeline.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowNotInMetaModal(false)}
                className="px-5 py-2 bg-surface-sunken hover:bg-surface-raised border border-border text-fg rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.992]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRedirectToMetadata}
                className="px-6 py-2 bg-primary hover:bg-blue-700 text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer hover:scale-[1.02] active:scale-[0.992]"
              >
                Yes, Add to Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
