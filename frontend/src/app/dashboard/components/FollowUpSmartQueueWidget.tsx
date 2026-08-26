'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Phone,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { RowOutcomeDropdown } from '@/app/tracker/components/RowOutcomeDropdown';
import { CallOutcome } from '@/app/tracker/page';

interface FollowUpLead {
  _id: string;
  company_name: string;
  hr_name: string;
  phone_number: string;
  email_id: string;
  college_id: string;
  college_name: string;
  college_code: string;
  college_logo?: string;
  follow_up_month: string;
  comments: string;
  session_date?: string;
  last_called_at?: string;
  urgency: 'due_now' | 'overdue' | 'upcoming';
}

interface Props {
  selectedCollegeIds: string[];
}

export function FollowUpSmartQueueWidget({ selectedCollegeIds }: Props) {
  const [leads, setLeads] = useState<FollowUpLead[]>([]);
  const [currentMonth, setCurrentMonth] = useState('');
  const [dueNowCount, setDueNowCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'due_now' | 'overdue' | 'upcoming'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const collegeParam = selectedCollegeIds.length > 0 ? selectedCollegeIds.join(',') : '';
      const res = await apiFetch(`/daily-tracker/pending-followups?college_ids=${collegeParam}`);
      if (res.success && res.data) {
        const data = res.data as any;
        setLeads(data.follow_ups || []);
        setCurrentMonth(data.current_month || '');
        setDueNowCount(data.due_now_count || 0);
        setOverdueCount(data.overdue_count || 0);
        setUpcomingCount(data.upcoming_count || 0);
      }
    } catch (e) {
      console.error('[SmartQueue] Load failed', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCollegeIds]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const handleOutcomeChange = async (rowId: string, newOutcome: CallOutcome) => {
    if (newOutcome === 'follow_up') return;
    triggerHaptic('medium');
    setUpdatingRowId(rowId);
    try {
      const res = await apiFetch(`/daily-tracker/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          outcome_status: newOutcome,
          follow_up_month: null,
        }),
      });
      if (res.success) {
        // Automatically clear from queue
        setLeads((prev) => prev.filter((l) => l._id !== rowId));
        if (dueNowCount > 0) setDueNowCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Update outcome failed', err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (activeTab === 'all') return true;
    return l.urgency === activeTab;
  });

  return (
    <div className="rounded-2xl bg-surface border border-border shadow-xs">
      {/* ── Widget Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-sunken rounded-t-2xl flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shadow-xs">
            <Flame size={20} className="animate-pulse text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-fg tracking-tight">
                Hot Follow-Ups Due — Smart Queue
              </h2>
              {dueNowCount > 0 && (
                <span className="text-micro font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-2xs animate-bounce">
                  {dueNowCount} Due This Month
                </span>
              )}
            </div>
            <p className="text-xs text-fg-subtle font-medium mt-0.5">
              Automated reminders for warm corporate leads scheduled for re-contact
            </p>
          </div>
        </div>

        {/* Filter Pills & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface p-1 rounded-xl border border-border text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              All ({leads.length})
            </button>
            <button
              onClick={() => setActiveTab('due_now')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'due_now'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              <span>🔥 Due Now</span>
              <span>({dueNowCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'overdue'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-600 hover:text-amber-700'
              }`}
            >
              Overdue ({overdueCount})
            </button>
          </div>

          <button
            onClick={loadFollowUps}
            title="Refresh Smart Queue"
            className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Leads List ────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 bg-surface">
        {filteredLeads.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-bold text-fg">
              No Pending Follow-Ups in this View!
            </p>
            <p className="text-xs text-fg-subtle max-w-sm">
              All scheduled company calls for your focused colleges are up to date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead) => (
              <div
                key={lead._id}
                className={`rounded-xl border p-4 transition-all flex flex-col justify-between relative shadow-xs ${
                  lead.urgency === 'due_now'
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60 hover:border-rose-400'
                    : lead.urgency === 'overdue'
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 hover:border-amber-400'
                    : 'bg-surface-sunken border-border hover:border-primary/40'
                }`}
              >
                <div>
                  {/* Top Bar: College Badge & Urgency Pill */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-micro font-bold bg-surface border border-border px-2 py-0.5 rounded-md text-fg font-mono">
                      {lead.college_code || 'COLLEGE'}
                    </span>
                    <span
                      className={`text-micro font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        lead.urgency === 'due_now'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : lead.urgency === 'overdue'
                          ? 'bg-amber-500 text-white'
                          : 'bg-surface border border-border text-fg-subtle'
                      }`}
                    >
                      <Clock size={11} />
                      <span>{lead.follow_up_month}</span>
                    </span>
                  </div>

                  {/* Company & HR Name */}
                  <h3 className="text-sm font-bold text-fg tracking-tight">
                    {lead.company_name}
                  </h3>
                  <p className="text-xs text-fg-subtle font-medium mt-0.5">
                    {lead.hr_name || 'HR Recruitment Team'}
                  </p>

                  {/* Phone & Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/60">
                    <a
                      href={`tel:${lead.phone_number}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 text-xs font-bold transition-colors cursor-pointer"
                      title="Call HR"
                    >
                      <Phone size={12} strokeWidth={2.5} />
                      <span>{lead.phone_number || 'No phone'}</span>
                    </a>
                    {lead.phone_number && (
                      <WhatsAppButton
                        phoneNumber={lead.phone_number}
                        hrName={lead.hr_name}
                        companyName={lead.company_name}
                      />
                    )}
                  </div>

                  {/* Previous Notes */}
                  {lead.comments && (
                    <div className="mt-2.5 p-2 rounded-lg bg-surface border border-border/80 text-micro text-fg-muted italic leading-relaxed">
                      "{lead.comments}"
                    </div>
                  )}
                </div>

                {/* Bottom: Quick Outcome Logger */}
                <div className="mt-3.5 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-fg-subtle">
                    Update Outcome:
                  </span>
                  <div className="w-36">
                    <RowOutcomeDropdown
                      value="follow_up"
                      placement="top"
                      onChange={(val) => {
                        handleOutcomeChange(lead._id, val as CallOutcome);
                      }}
                      disabled={updatingRowId === lead._id}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
