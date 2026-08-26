'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, Pencil, Trash2, Building2, Sparkles, ClipboardList } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { DailyLeadRow, CollegeOption } from './LeadsTable';

const BATCH_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'];

interface Props {
  lead: DailyLeadRow;
  colleges: CollegeOption[];
  onClose: () => void;
  onSave: (rowId: string, patch: Partial<DailyLeadRow>) => Promise<void>;
  onDelete?: (rowId: string) => Promise<void>;
}

export function EditLeadModal({ lead, colleges, onClose, onSave, onDelete }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [leadType, setLeadType] = useState<'positive' | 'jd_received'>(lead.lead_type);
  const [companyName, setCompanyName] = useState(lead.company_name || '');
  const [jobRole, setJobRole] = useState(lead.job_role || 'Graduate Trainee');
  const [eligibleBatch, setEligibleBatch] = useState(lead.eligible_batch || '2026');
  const [eventTime, setEventTime] = useState(lead.event_time || '');
  const [remarks, setRemarks] = useState(lead.remarks || '');

  // Format initial date for input[type="date"]
  const initialDateStr = lead.lead_date
    ? new Date(lead.lead_date).toISOString().split('T')[0]
    : '';
  const [leadDate, setLeadDate] = useState(initialDateStr);

  // College ID
  const initialCollegeId =
    typeof lead.college_id === 'object' && lead.college_id?._id
      ? lead.college_id._id
      : (lead.college_id as unknown as string) || '';
  const [collegeId, setCollegeId] = useState(initialCollegeId);

  // Parse CTC
  const [ctc, setCtc] = useState(() => {
    if (!lead.ctc) return '';
    return lead.ctc.replace(/[^0-9.]/g, '').trim();
  });
  const [ctcUnit, setCtcUnit] = useState<'LPA' | '/ Month'>(() => {
    return lead.ctc?.includes('/ Month') ? '/ Month' : 'LPA';
  });

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast('Please enter a company name', 'warning');
      return;
    }

    try {
      setLoading(true);
      const fullCtc = ctc.trim() ? `${ctc.trim()} ${ctcUnit}` : '';

      await onSave(lead._id, {
        lead_type: leadType,
        company_name: companyName.trim(),
        college_id: (collegeId || null) as any,
        job_role: jobRole.trim(),
        ctc: fullCtc,
        eligible_batch: eligibleBatch,
        event_time: eventTime.trim(),
        lead_date: leadDate,
        remarks: remarks.trim(),
      });

      toast('Lead updated successfully!', 'success');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to update lead', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Are you sure you want to delete "${lead.company_name}"?`)) return;

    try {
      setDeleting(true);
      await onDelete(lead._id);
      toast('Lead deleted', 'success');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to delete lead', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-surface border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ── Modal Header (Compact & Smooth) ───────────────────────── */}
        <div className="px-6 py-3.5 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shadow-xs shrink-0">
              <Pencil size={15} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-fg tracking-tight">
                Edit Lead Details
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-raised border border-border/80 hover:border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Modal Body ────────────────────────────────────────────── */}
        <form
          id="edit-lead-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto px-6 py-4 space-y-3.5 text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Section: Lead Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLeadType('positive')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                leadType === 'positive'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 shadow-2xs'
                  : 'bg-surface border-border text-fg-muted hover:bg-surface-sunken'
              }`}
            >
              <Sparkles
                size={13}
                className={leadType === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg-subtle'}
              />
              <span>Positive Lead</span>
            </button>
            <button
              type="button"
              onClick={() => setLeadType('jd_received')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                leadType === 'jd_received'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-800 dark:text-blue-200 shadow-2xs'
                  : 'bg-surface border-border text-fg-muted hover:bg-surface-sunken'
              }`}
            >
              <ClipboardList
                size={13}
                className={leadType === 'jd_received' ? 'text-blue-600 dark:text-blue-400' : 'text-fg-subtle'}
              />
              <span>JD Received</span>
            </button>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-fg font-semibold mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. TCS, Zoho, Accenture"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-bold"
            />
          </div>

          {/* College & Eligible Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg font-semibold mb-1">College</label>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg text-xs transition-all outline-none cursor-pointer"
              >
                <option value="">— No Specific College —</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    [{c.college_code}] {c.college_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-fg font-semibold mb-1">Eligible Batch</label>
              <select
                value={eligibleBatch}
                onChange={(e) => setEligibleBatch(e.target.value)}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg text-xs transition-all outline-none cursor-pointer"
              >
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y} Batch
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Job Role & CTC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg font-semibold mb-1">Job Role</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Graduate Trainee, Software Engineer"
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-fg font-semibold mb-1">CTC Package</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ctc}
                  onChange={(e) => setCtc(e.target.value)}
                  placeholder="e.g. 4.5"
                  className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-mono"
                />
                <select
                  value={ctcUnit}
                  onChange={(e) => setCtcUnit(e.target.value as any)}
                  className="bg-surface-sunken border border-border focus:border-primary rounded-xl px-2.5 py-2 text-fg text-xs outline-none cursor-pointer shrink-0 font-medium"
                >
                  <option value="LPA">LPA</option>
                  <option value="/ Month">/ Month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg font-semibold mb-1">Date</label>
              <input
                type="date"
                required
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg text-xs transition-all outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-fg font-semibold mb-1">Time Stamp</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 10:30 am"
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-mono"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-fg font-semibold mb-1">Remarks (Optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Assessment planned for next week, HR confirmed via email"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none"
            />
          </div>
        </form>

        {/* ── Sticky Footer (Compact & Smooth) ───────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-surface-sunken/60 shrink-0">
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <Trash2 size={13} />
              <span>{deleting ? 'Deleting…' : 'Delete'}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            form="edit-lead-form"
            disabled={loading || deleting}
            className="px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <CheckCircle2 size={14} />
            <span>{loading ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
