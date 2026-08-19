'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CalendarDays, Globe, Landmark, Megaphone, PenLine } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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

  // Default Sender ID (Team Leader / Director)
  const SENDER_ID = '6a84719afa3bf51271bc1545';

  useEffect(() => {
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setColleges(data.data.colleges);
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
      const res = await fetch(`${API}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_type: notificationType,
          sender_id: SENDER_ID,
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
      const data = await res.json();
      if (data.success) {
        alert('Notification broadcast dispatched successfully!');
        onSuccess();
        onClose();
      } else {
        alert(data.error?.message || 'Failed to dispatch broadcast');
      }
    } catch (err) {
      console.error('Broadcast error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-xl border border-border-strong shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Megaphone size={14} strokeWidth={2} aria-hidden /> Dispatch Broadcast Announcement / Meeting
          </h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-white text-base">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Type & Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">
                Notification Category *
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
              >
                <option value="announcement"><Megaphone size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Announcement / Policy</option>
                <option value="meeting"><CalendarDays size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Meeting Invitation</option>
                <option value="reminder">⏰ Operational Reminder</option>
                <option value="system_alert"><AlertTriangle size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}System Alert</option>
                <option value="assignment"><PenLine size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Task Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
              >
                <option value="high">🔴 High Priority (Immediate Notice)</option>
                <option value="medium">🟠 Medium Priority</option>
                <option value="low">🔵 Low Priority</option>
              </select>
            </div>
          </div>

          {/* Audience Targeting (Spec Section 5.2.8.4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Target Audience *</label>
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
              >
                <option value="everyone"><Globe size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Everyone (All Portal Users)</option>
                <option value="college_group"><Landmark size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}College Group (Assigned Coordinators)</option>
              </select>
            </div>

            {audienceType === 'college_group' && (
              <div>
                <label className="block text-fg-muted font-semibold mb-1">Select College *</label>
                <select
                  value={targetCollegeId}
                  onChange={(e) => setTargetCollegeId(e.target.value)}
                  className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
                >
                  <option value="all">Select institution</option>
                  {colleges.map((c) => (
                    <option key={c._id} value={c._id}>
                      [{c.college_code}] {c.college_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Alert Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mandatory Placement Operations Review at 5 PM"
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
              required
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Detailed Message Body *</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed description or agenda for the team..."
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
              required
            />
          </div>

          {/* Action Link & Acknowledgment checkbox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">1-Click Module Link</label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="e.g. /reports or /tracker"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiresAck}
                  onChange={(e) => setRequiresAck(e.target.checked)}
                  className="rounded bg-surface border-border-strong text-primary "
                />
                <span className="text-fg-muted font-semibold">
                  Requires User Acknowledgment
                </span>
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg-muted rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-md transition-colors"
            >
              {loading ? 'Dispatching…' : 'Send Broadcast 📢'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
