'use client';

import { useState } from 'react';
import { Plus, X, Building2, User, Phone, Mail, Clock, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';
import type { CallOutcome, TrackerRow } from '../page';
import { MONTHS } from './TrackerRow';

const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'jd_received', label: 'JD Received' },
  { value: 'hiring_freezed', label: 'Hiring Freezed' },
  { value: 'hiring_completed', label: 'Hiring Completed' },
  { value: 'call_back', label: 'Call Back' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'invite_mail', label: 'Invite Mail' },
  { value: 'not_hiring', label: 'Not Hiring' },
  { value: 'no_response', label: 'No Response' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'in_connect', label: 'In Connect' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'drive_completed', label: 'Drive Completed' },
];

interface Props {
  coordinatorId: string;
  collegeId: string;
  sessionDate?: string;
  onClose: () => void;
  onRowAdded: (newRow: TrackerRow) => void;
}

export function ManualAddRowModal({
  coordinatorId,
  collegeId,
  sessionDate,
  onClose,
  onRowAdded,
}: Props) {
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [hrName, setHrName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailId, setEmailId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [followUpMonth, setFollowUpMonth] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSetCurrentTime = () => {
    triggerHaptic('light');
    const now = new Date();
    const formatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    setStartTime(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast('Company name is required', 'warning');
      return;
    }
    if (!mobileNumber.trim()) {
      toast('Mobile number is required', 'warning');
      return;
    }
    if (!outcome) {
      toast('Call Status is mandatory to log this entry', 'warning');
      return;
    }
    if (outcome === 'follow_up' && !followUpMonth) {
      toast('Follow Up Month is mandatory when Call Status is Follow Up', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      triggerHaptic('medium');

      let callStartTimeISO: string | undefined = undefined;
      if (startTime.trim()) {
        const now = new Date();
        callStartTimeISO = now.toISOString();
      }

      const payload = {
        coordinator_id: coordinatorId,
        college_id: collegeId,
        company_name: companyName.trim(),
        hr_name: hrName.trim() || 'HR Contact',
        mobile_number: mobileNumber.trim(),
        email_id: emailId.trim().toLowerCase(),
        call_start_time: callStartTimeISO,
        outcome_status: outcome,
        follow_up_month: outcome === 'follow_up' ? followUpMonth : null,
        comments: comments.trim(),
        session_date: sessionDate,
      };

      const res = await apiFetch('/daily-tracker/manual-row', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && (res.data as any)?.row) {
        toast('New entry added to tracker', 'success');
        onRowAdded((res.data as any).row);
        onClose();
      } else {
        toast(res.error?.message || 'Failed to add entry', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Server error adding entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-surface via-surface to-surface-sunken/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">Add Contact Entry</h2>
              <p className="text-xs text-fg-subtle">Manually add a row into today&apos;s daily tracker</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-raised flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google India, Infosys, Zoho…"
                className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* HR Name & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                HR / Contact Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <input
                  type="text"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <input
                  type="text"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Email ID */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1.5">
              Email ID <span className="text-fg-disabled text-micro">(Optional)</span>
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              <input
                type="email"
                value={emailId}
                onChange={(e) => setEmailId(e.target.value)}
                placeholder="e.g. hr@company.com"
                className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Start Time & Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-fg">Start Time</label>
                <button
                  type="button"
                  onClick={handleSetCurrentTime}
                  className="text-micro text-primary hover:underline cursor-pointer font-medium"
                >
                  Current Time
                </button>
              </div>
              <div className="relative">
                <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 10:30 AM"
                  className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Call Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as CallOutcome)}
                className="w-full bg-surface-sunken border border-border text-xs text-fg px-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer"
              >
                <option value="">— Select Status —</option>
                {OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Follow Up Month (Conditional) */}
          {outcome === 'follow_up' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                Follow Up Month <span className="text-rose-500">*</span>
              </label>
              <select
                value={followUpMonth}
                onChange={(e) => setFollowUpMonth(e.target.value)}
                className="w-full bg-surface-sunken border border-amber-400/40 text-xs text-fg px-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs cursor-pointer"
              >
                <option value="">— Select Follow Up Month —</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1.5">
              Comments / Notes
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add call notes, conversation summary, requirements…"
                className="w-full bg-surface-sunken border border-border text-xs text-fg p-3 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-primary hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Adding…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
