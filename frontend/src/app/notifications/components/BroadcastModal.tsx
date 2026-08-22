'use client';

import { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function BroadcastModal({ onClose, onSuccess }: Props) {
  const [colleges, setColleges] = useState<any[]>([]);

  const [notificationType, setNotificationType] = useState('announcement');
  const [audienceType, setAudienceType] = useState('everyone');
  const [targetCollegeId, setTargetCollegeId] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [actionUrl, setActionUrl] = useState('');
  const [requiresAck, setRequiresAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [senderId, setSenderId] = useState<string>('6a84719afa3bf51271bc1545');

  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) setSenderId(user._id);

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
      alert('Title and message body are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          notification_type: notificationType,
          sender_id: senderId,
          sender_role: 'team_leader',
          audience_type: audienceType,
          target_college_id: targetCollegeId !== 'all' ? targetCollegeId : null,
          title: title.trim(),
          message: message.trim(),
          priority,
          action_url: actionUrl.trim() || null,
          requires_acknowledgment: requiresAck,
        }),
      });
      if (res.success) {
        alert('Notification broadcast dispatched successfully!');
        onSuccess();
        onClose();
      } else {
        alert(res.error?.message || 'Failed to dispatch broadcast');
      }
    } catch (err) {
      console.error('Broadcast error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">

        {/* ── Fixed Modal Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone size={16} strokeWidth={2.5} className="text-primary" />
              <span>Dispatch Broadcast Alert / Meeting</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Send organizational announcements, meetings, or task alerts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable Form Body ──────────────────────────────────────── */}
        <form id="broadcast-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar">

          {/* Type & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Notification Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 text-xs cursor-pointer shadow-xs"
              >
                <option value="announcement">Announcement / Policy</option>
                <option value="meeting">Meeting Invitation</option>
                <option value="reminder">Operational Reminder</option>
                <option value="system_alert">System Alert</option>
                <option value="assignment">Task Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 text-xs cursor-pointer shadow-xs"
              >
                <option value="high">High Priority (Immediate Notice)</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Audience Targeting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Audience <span className="text-rose-500">*</span></label>
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 text-xs cursor-pointer shadow-xs"
              >
                <option value="everyone">Everyone (All Staff & Leads)</option>
                <option value="coordinators_only">Placement Coordinators Only</option>
                <option value="leads_only">Team Leaders Only</option>
                <option value="directors_only">Directors & Leadership Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target College Scope</label>
              <select
                value={targetCollegeId}
                onChange={(e) => setTargetCollegeId(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 text-xs cursor-pointer shadow-xs"
              >
                <option value="all">All Assigned Colleges</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    [{c.college_code}] {c.college_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Broadcast Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Urgent: Update CDC references before 5:00 PM"
              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Message Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the full broadcast notice, agenda items, or specific instructions here…"
              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
            />
          </div>

          {/* Action Link & Acknowledgment Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Deep Link / Action URL</label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="e.g. /weekly-tracker or https://meet.google.com/…"
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 text-xs transition-colors shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="requires-ack"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <label htmlFor="requires-ack" className="text-xs text-slate-700 font-semibold cursor-pointer">
                Require Mandatory User Acknowledgment
              </label>
            </div>
          </div>

        </form>

        {/* ── Fixed Footer Actions ──────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="broadcast-form"
            disabled={loading}
            className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Broadcasting…' : 'Dispatch Broadcast →'}
          </button>
        </div>

      </div>
    </div>
  );
}
