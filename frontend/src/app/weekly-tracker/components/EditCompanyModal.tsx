'use client';

import { useState } from 'react';
import { Pencil, X, Building2, Trash2, CheckCircle2, Briefcase, Layers, GraduationCap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import { SmoothSelect } from '@/components/ui/SmoothSelect';
import { WeeklyRow } from './WeeklyTable';

const BATCH_YEARS = ['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];

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
  { value: 'completed', label: '1. Companies Completed' },
  { value: 'in_drive', label: '2. Companies in Drive' },
  { value: 'in_progress', label: '3. Companies In Progress' },
  { value: 'pipeline', label: '4. Companies In Pipeline' },
  { value: 'top_companies', label: '5. Top Companies' },
  { value: 'rejected_companies', label: '6. Rejected Companies' },
  { value: 'on_hold_by_college', label: '7. Companies On Hold By College' },
  { value: 'on_hold_by_hr', label: '8. Companies On Hold By HR' },
];

interface Props {
  row: WeeklyRow;
  onClose: () => void;
  onUpdated: (rowId: string, patch: Partial<WeeklyRow>) => Promise<void>;
  onDeleted?: (rowId: string) => Promise<void>;
}

export function EditCompanyModal({
  row,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [companyName, setCompanyName] = useState(row.company_name || '');
  const [jobRole, setJobRole] = useState(row.job_role || '');
  const [companyType, setCompanyType] = useState(row.company_type || 'Software / IT');
  const [ctcValue, setCtcValue] = useState(() => {
    if (!row.ctc_lpa) return '';
    return row.ctc_lpa.replace(/LPA|\/ Month/gi, '').trim();
  });
  const [ctcUnit, setCtcUnit] = useState<'LPA' | '/ Month'>(() => {
    if (row.ctc_lpa && row.ctc_lpa.toLowerCase().includes('month')) return '/ Month';
    return 'LPA';
  });
  const [eligibleBatch, setEligibleBatch] = useState(row.eligible_batch || '2026');
  const [pipelineSection, setPipelineSection] = useState(row.pipeline_section || 'pipeline');
  const [followUpDate, setFollowUpDate] = useState(() => {
    if (!row.follow_up_date) return '';
    try {
      return new Date(row.follow_up_date).toISOString().split('T')[0];
    } catch {
      return '';
    }
  });
  const [driveDate, setDriveDate] = useState(() => {
    if (!row.drive_date) return '';
    try {
      return new Date(row.drive_date).toISOString().split('T')[0];
    } catch {
      return '';
    }
  });
  const [currentStatusText, setCurrentStatusText] = useState(row.current_status_text || '');
  const [selectedCount, setSelectedCount] = useState<number>(row.selected_count || 0);
  const [shortlistedCount, setShortlistedCount] = useState<number>(row.shortlisted_count || 0);
  const [registeredCount, setRegisteredCount] = useState<number>(row.registered_count || 0);
  const [isPinnedTop, setIsPinnedTop] = useState(row.is_pinned_top || false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Company Name is mandatory.');
      return;
    }
    if (!jobRole.trim()) {
      alert('Job Role is mandatory.');
      return;
    }
    if (!ctcValue.trim()) {
      alert('CTC is mandatory.');
      return;
    }
    if (!currentStatusText.trim()) {
      alert('Current Status Remarks & Notes is mandatory.');
      return;
    }

    const formattedCtc = ctcValue.includes('LPA') || ctcValue.toLowerCase().includes('month')
      ? ctcValue.trim()
      : `${ctcValue.trim()} ${ctcUnit}`;

    setLoading(true);
    triggerHaptic('medium');
    try {
      const patch: Partial<WeeklyRow> = {
        company_name: companyName.trim(),
        job_role: jobRole.trim(),
        company_type: companyType,
        ctc_lpa: formattedCtc,
        eligible_batch: eligibleBatch,
        pipeline_section: pipelineSection,
        current_status_text: currentStatusText.trim(),
        follow_up_date: followUpDate || undefined,
        drive_date: driveDate || undefined,
        selected_count: selectedCount,
        shortlisted_count: shortlistedCount,
        registered_count: registeredCount,
        is_pinned_top: isPinnedTop,
      };

      await onUpdated(row._id, patch);
      onClose();
    } catch (err: any) {
      console.error('Update company error:', err);
      alert('Failed to update company record');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${row.company_name}" from Weekly Tracker?`)) return;
    setDeleting(true);
    triggerHaptic('heavy');
    try {
      if (onDeleted) {
        await onDeleted(row._id);
      } else {
        await apiFetch(`/weekly-tracker/${row._id}`, { method: 'DELETE' });
      }
      onClose();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Error deleting row');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Modal Card */}
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-fg">

        {/* ── Modern Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-sunken shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-xs">
              <Pencil size={17} strokeWidth={2.25} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg tracking-tight flex items-center gap-2">
                Edit Company Record
              </h2>
              <p className="text-xs text-fg-subtle font-medium mt-0.5">
                Update role, CTC, spelling, status notes, and student metrics
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
        <form id="edit-company-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar bg-surface">

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
              placeholder="e.g. TCS, Cognizant, NVIDIA..."
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-semibold"
            />
          </div>

          {/* Job Role(s) */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">
              Job Role(s) <span className="text-rose-500">*</span> <span className="text-fg-subtle font-normal">(comma-separated for multi-roles)</span>
            </label>
            <input
              type="text"
              required
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Graduate Trainee, Software Engineer, Data Analyst"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
            />
          </div>

          {/* CTC Offered with Unit Switcher */}
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
                placeholder={ctcUnit === 'LPA' ? 'e.g. 6.5 or 5 - 8' : 'e.g. 15,000 or 25k'}
                className="flex-1 bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-mono"
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

          {/* Company Type & Pipeline Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-fg font-semibold mb-1.5">Company Type / Domain</label>
              <SmoothSelect
                value={companyType}
                onChange={setCompanyType}
                icon={Briefcase}
                title="Company Industry Type"
                options={COMPANY_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </div>

            <div>
              <label className="block text-fg font-semibold mb-1.5">Pipeline Section</label>
              <SmoothSelect
                value={pipelineSection}
                onChange={setPipelineSection}
                icon={Layers}
                title="Placement Section"
                options={SECTIONS.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
          </div>

          {/* Batch & Follow Up Date */}
          <div className={`grid gap-3.5 ${pipelineSection === 'in_progress' || pipelineSection === 'pipeline' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-fg font-semibold mb-1.5">Eligible Batch</label>
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

          {/* Student Candidate Counts (if in progress or completed) */}
          <div className="grid grid-cols-3 gap-3 bg-surface-sunken/60 p-3 rounded-xl border border-border/80">
            <div>
              <label className="block text-[11px] font-semibold text-fg-subtle mb-1">Registered</label>
              <input
                type="number"
                min="0"
                value={registeredCount}
                onChange={(e) => setRegisteredCount(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-fg text-center outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-fg-subtle mb-1">Shortlisted</label>
              <input
                type="number"
                min="0"
                value={shortlistedCount}
                onChange={(e) => setShortlistedCount(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-fg text-center outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Offers / Selected</label>
              <input
                type="number"
                min="0"
                value={selectedCount}
                onChange={(e) => setSelectedCount(Number(e.target.value))}
                className="w-full bg-surface border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-lg px-2 py-1.5 text-xs text-center outline-none font-mono font-bold"
              />
            </div>
          </div>

          {/* Current Status Remarks */}
          <div>
            <label className="block text-fg font-semibold mb-1.5">
              Current Status Remarks & Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={currentStatusText}
              onChange={(e) => setCurrentStatusText(e.target.value)}
              placeholder="e.g. Invite email sent (invite mail), awaiting JD from HR, drive scheduled for next Monday"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none leading-relaxed"
            />
          </div>

          {/* Pin Top Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-fg">
              <input
                type="checkbox"
                checked={isPinnedTop}
                onChange={(e) => setIsPinnedTop(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-0 cursor-pointer accent-primary"
              />
              <span>Pin this company to the top of section</span>
            </label>
          </div>

        </form>

        {/* ── Sticky Footer ──────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-surface-sunken shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <Trash2 size={14} />
            <span>{deleting ? 'Deleting…' : 'Delete Row'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              form="edit-company-form"
              disabled={loading}
              className="px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 hover:shadow-md hover:shadow-primary/25"
            >
              <CheckCircle2 size={15} />
              <span>{loading ? 'Saving Changes…' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
