'use client';

import { useState, useEffect } from 'react';
import {
  Pencil,
  X,
  Trash2,
  Building2,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Lock,
} from 'lucide-react';
import type { TrackerRow, CallOutcome } from '../page';
import { triggerHaptic } from '@/lib/haptics';
import { ROW_OUTCOMES } from './RowOutcomeDropdown';
import { MONTHS } from './TrackerRow';

interface Props {
  row: TrackerRow;
  onClose: () => void;
  onSave: (rowId: string, patch: Partial<TrackerRow>) => Promise<void>;
  onDelete?: (rowId: string) => Promise<void>;
}

export function EditTrackerRowModal({ row, onClose, onSave, onDelete }: Props) {
  const [companyName, setCompanyName] = useState(row.company_name || '');
  const [hrName, setHrName] = useState(row.hr_name || '');
  const [mobileNumber, setMobileNumber] = useState(row.mobile_number || '');
  const [emailId, setEmailId] = useState(row.email_id || '');
  const [outcomeStatus, setOutcomeStatus] = useState<CallOutcome | ''>(row.outcome_status || '');
  const [followUpMonth, setFollowUpMonth] = useState<string>(row.follow_up_month || '');
  const [comments, setComments] = useState(row.comments || '');
  const [loading, setLoading] = useState(false);

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
      alert('Company Name is required.');
      return;
    }

    try {
      setLoading(true);
      triggerHaptic('medium');

      const patch: Partial<TrackerRow> = {
        company_name: companyName.trim(),
        hr_name: hrName.trim(),
        mobile_number: mobileNumber.trim(),
        email_id: emailId.trim(),
        comments: comments.trim().slice(0, 200),
      };

      if (outcomeStatus) {
        patch.outcome_status = outcomeStatus as CallOutcome;
        if (outcomeStatus === 'follow_up') {
          patch.follow_up_month = followUpMonth || null;
        } else {
          patch.follow_up_month = null;
        }
      }

      await onSave(row._id, patch);
      onClose();
    } catch (err: any) {
      console.error('Update tracker row failed:', err);
      alert(err?.message || 'Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    triggerHaptic('heavy');
    onClose();
    await onDelete(row._id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* ── Modal Header (iPOMS Standard Solid Tone) ────────────────── */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-border bg-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Pencil size={15} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-fg tracking-tight">
                  Edit Calling Entry
                </h2>
                <span className="text-micro font-mono font-bold px-2 py-0.5 rounded bg-surface-sunken border border-border text-fg-subtle">
                  #{row.serial_no}
                </span>
              </div>
              <p className="text-micro text-fg-subtle">
                Update company name, contact person, phone, email, status, and remarks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-7 h-7 rounded-lg hover:bg-surface-raised flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer border border-transparent hover:border-border"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Form Body (Seamless Semantic Theme & Invisible Scrollbar) ─ */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-3.5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-surface text-xs"
        >
          {/* Section 1: Company Name */}
          <div>
            <label className="block text-[11px] font-bold text-fg uppercase tracking-wider mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Infosys Ltd"
                className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* Section 2: HR Name & Mobile Number (2-column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-fg uppercase tracking-wider mb-1">
                HR / Contact Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <input
                  type="text"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar (HR Lead)"
                  className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-fg uppercase tracking-wider mb-1">
                Primary Contact Number
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Email ID */}
          <div>
            <label className="block text-[11px] font-bold text-fg uppercase tracking-wider mb-1">
              Email ID <span className="text-fg-disabled text-micro font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              <input
                type="email"
                value={emailId}
                onChange={(e) => setEmailId(e.target.value)}
                placeholder="e.g. hr@company.com"
                className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Section 4: Call Status & Follow Up Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-fg uppercase tracking-wider mb-1">
                Call Outcome Status
              </label>
              <select
                value={outcomeStatus}
                onChange={(e) => setOutcomeStatus(e.target.value as CallOutcome)}
                className="w-full bg-surface-sunken border border-border text-xs text-fg px-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs font-medium cursor-pointer"
              >
                <option value="">— Select Call Status —</option>
                {ROW_OUTCOMES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-fg uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Follow Up Month</span>
                {outcomeStatus !== 'follow_up' && <Lock size={10} className="text-fg-disabled" />}
              </label>
              <select
                disabled={outcomeStatus !== 'follow_up'}
                value={followUpMonth}
                onChange={(e) => setFollowUpMonth(e.target.value)}
                className="w-full bg-surface-sunken border border-border text-xs text-fg px-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">— Select Month —</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 5: Notes / Comments */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-fg uppercase tracking-wider">
                Comments &amp; Operational Notes
              </label>
              <span className="text-micro text-fg-subtle font-mono">
                {comments.length}/200
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={200}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add key talking points, hiring requirements, callback dates, or student profile requests..."
              className="w-full bg-surface-sunken border border-border text-xs text-fg p-3 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Trash2 size={13} strokeWidth={2} />
                Delete Row
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-surface-sunken hover:bg-surface-raised border border-border text-fg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-primary-foreground text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 size={14} strokeWidth={2} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
