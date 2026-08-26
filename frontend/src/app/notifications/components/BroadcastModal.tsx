'use client';

import { useState, useEffect } from 'react';
import { Megaphone, X, Send, AlertCircle, Info, Calendar, Bell, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Props {
  onClose: () => void;
  onSent: () => void;
}

export function BroadcastModal({ onClose, onSent }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('announcement');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [audienceType, setAudienceType] = useState('everyone');
  const [targetCollegeId, setTargetCollegeId] = useState('all');
  const [actionUrl, setActionUrl] = useState('');
  const [requiresAck, setRequiresAck] = useState(false);

  const [colleges, setColleges] = useState<{ _id: string; college_name: string; college_code: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          setColleges((data.data as any).colleges);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please provide a title and message body for the broadcast.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          notification_type: notificationType,
          priority,
          audience_type: audienceType,
          target_college_id: targetCollegeId === 'all' ? undefined : targetCollegeId,
          action_url: actionUrl.trim() || undefined,
          requires_ack: requiresAck,
        }),
      });

      if (res.success) {
        onSent();
        onClose();
      } else {
        setError(res.message || 'Failed to dispatch broadcast.');
      }
    } catch (err: any) {
      console.error('Broadcast dispatch error:', err);
      setError('Network error while dispatching broadcast notice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      {/* Themed Modal Card */}
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-fg">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-sunken shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
              <Megaphone size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fg tracking-tight">
                Send Operational Broadcast
              </h2>
              <p className="text-xs text-fg-subtle font-medium mt-0.5">
                Dispatch urgent announcements, task alerts, or reminders to staff
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

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Scrollable Form Body ──────────────────────────────────────── */}
        <form id="broadcast-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar bg-surface">

          {/* Type & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg font-semibold mb-1">
                Notification Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-fg text-xs cursor-pointer shadow-xs outline-none"
              >
                <option value="announcement" className="bg-surface text-fg">Announcement / Policy</option>
                <option value="meeting" className="bg-surface text-fg">Meeting Invitation</option>
                <option value="reminder" className="bg-surface text-fg">Operational Reminder</option>
                <option value="system_alert" className="bg-surface text-fg">System Alert</option>
                <option value="assignment" className="bg-surface text-fg">Task Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-fg font-semibold mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-fg text-xs cursor-pointer shadow-xs outline-none"
              >
                <option value="high" className="bg-surface text-fg">High Priority (Immediate Notice)</option>
                <option value="medium" className="bg-surface text-fg">Medium Priority</option>
                <option value="low" className="bg-surface text-fg">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Audience Targeting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg font-semibold mb-1">Target Audience <span className="text-rose-500">*</span></label>
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value)}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-fg text-xs cursor-pointer shadow-xs outline-none"
              >
                <option value="everyone" className="bg-surface text-fg">Everyone (All Staff & Leads)</option>
                <option value="coordinators_only" className="bg-surface text-fg">Placement Coordinators Only</option>
                <option value="leads_only" className="bg-surface text-fg">Team Leaders Only</option>
                <option value="directors_only" className="bg-surface text-fg">Directors & Leadership Only</option>
              </select>
            </div>

            <div>
              <label className="block text-fg font-semibold mb-1">Target College Scope</label>
              <select
                value={targetCollegeId}
                onChange={(e) => setTargetCollegeId(e.target.value)}
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-fg text-xs cursor-pointer shadow-xs outline-none"
              >
                <option value="all" className="bg-surface text-fg">All Assigned Colleges</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id} className="bg-surface text-fg">
                    [{c.college_code}] {c.college_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-fg font-semibold mb-1">
              Broadcast Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Urgent: Update tracker records before 5:00 PM"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-fg placeholder:text-fg-disabled text-xs transition-colors shadow-xs outline-none"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-fg font-semibold mb-1">
              Message Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the full broadcast notice, agenda items, or specific instructions here…"
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-fg placeholder:text-fg-disabled text-xs transition-colors shadow-xs outline-none"
            />
          </div>

          {/* Action Link & Acknowledgment Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg font-semibold mb-1">Deep Link / Action URL</label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="e.g. /weekly-tracker or https://meet.google.com/…"
                className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2 text-fg placeholder:text-fg-disabled text-xs transition-colors shadow-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="requires-ack"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <label htmlFor="requires-ack" className="text-xs text-fg font-semibold cursor-pointer">
                Require Mandatory User Acknowledgment
              </label>
            </div>
          </div>

        </form>

        {/* ── Fixed Footer Actions ──────────────────────────────────────── */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-border bg-surface-sunken shrink-0">
          <button
            type="submit"
            form="broadcast-form"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center cursor-pointer"
          >
            {loading ? 'Broadcasting…' : 'Dispatch Broadcast'}
          </button>
        </div>

      </div>
    </div>
  );
}
