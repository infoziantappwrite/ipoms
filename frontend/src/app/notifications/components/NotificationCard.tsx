'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

interface Props {
  notification: any;
  currentUserId: string;
  onMarkRead: (id: string) => void;
  onAcknowledge: (id: string, response: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationCard({
  notification,
  currentUserId,
  onMarkRead,
  onAcknowledge,
  onDelete,
}: Props) {
  const n = notification;

  const priorityStyles: any = {
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    medium: 'bg-warning/10 text-warning border-warning/30',
    low: 'bg-primary/10 text-primary border-primary/30',
  };

  const typeIcons: any = {
    announcement: '📢',
    assignment: '📝',
    reminder: '⏰',
    meeting: '📅',
    system_alert: '⚠️',
    system_update: '🔄',
  };

  return (
    <div
      className={`glass-panel rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-3.5 ${
        !n.is_read
          ? 'border-primary/40 bg-background/90 shadow-lg ring-1 ring-ring/20'
          : 'border-border bg-background/50 hover:border-border-strong'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl p-2 bg-surface rounded-xl border border-border-strong">
            {typeIcons[n.notification_type] || '📢'}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-micro font-bold uppercase px-2 py-0.5 rounded border ${
                  priorityStyles[n.priority] || priorityStyles.medium
                }`}
              >
                {n.priority} Priority
              </span>
              <span className="text-micro bg-surface text-fg-subtle px-2 py-0.5 rounded-full border border-border-strong capitalize">
                {n.notification_type.replace('_', ' ')}
              </span>
              {n.target_college && (
                <span className="text-micro bg-primary text-primary px-2 py-0.5 rounded-full font-mono border border-primary/40">
                  [{n.target_college.college_code}] {n.target_college.college_name}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white mt-1">{n.title}</h3>
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-micro text-fg-subtle font-mono shrink-0">
          {new Date(n.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Message Body */}
      <p className="text-xs text-fg-muted leading-relaxed bg-background/40 p-3 rounded-xl border border-border/60">
        {n.message}
      </p>

      {/* Sender & Live Attendance Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-fg-subtle pt-1">
        <div className="flex items-center gap-1.5">
          <span>From:</span>
          <strong className="text-fg">{n.sender_id?.full_name || 'Management Office'}</strong>
          <span className="text-micro bg-surface text-fg-subtle px-1.5 py-0.5 rounded font-mono uppercase">
            {n.sender_role}
          </span>
        </div>

        {n.notification_type === 'meeting' && (
          <div className="flex items-center gap-2 text-micro font-semibold">
            <span className="text-success"><Check size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{n.attendees_count} Attending</span>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-3">
        {/* Meeting Attendance or Acknowledgment Response (Spec Section 5.2.8.5) */}
        <div className="flex items-center gap-2">
          {n.notification_type === 'meeting' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAcknowledge(n._id, 'will_attend')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                  n.user_response === 'will_attend'
                    ? 'bg-success text-white border-success shadow'
                    : 'bg-surface text-fg-muted border-border-strong hover:bg-success/40 hover:text-success'
                }`}
              >
                <Check size={14} strokeWidth={2} aria-hidden /> Will Attend
              </button>
              <button
                type="button"
                onClick={() => onAcknowledge(n._id, 'cannot_attend')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                  n.user_response === 'cannot_attend'
                    ? 'bg-destructive text-white border-destructive shadow'
                    : 'bg-surface text-fg-muted border-border-strong hover:bg-destructive/40 hover:text-destructive'
                }`}
              >
                <span>✗</span> Cannot Attend
              </button>
            </div>
          ) : n.requires_acknowledgment ? (
            <button
              type="button"
              onClick={() => onAcknowledge(n._id, 'acknowledged')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                n.user_response === 'acknowledged'
                  ? 'bg-primary text-white border-primary shadow'
                  : 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
              }`}
            >
              <Check size={14} strokeWidth={2} aria-hidden /> {n.user_response === 'acknowledged' ? 'Acknowledged ✓' : 'Acknowledge Policy'}
            </button>
          ) : null}

          {n.action_url && (
            <Link
              href={n.action_url}
              className="px-3 py-1.5 bg-surface hover:bg-surface-raised text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <span>🔗</span> Open Module
            </Link>
          )}
        </div>

        {/* Read & Delete actions */}
        <div className="flex items-center gap-2">
          {!n.is_read && (
            <button
              type="button"
              onClick={() => onMarkRead(n._id)}
              className="text-xs text-fg-subtle hover:text-white px-2 py-1 rounded"
            >
              Mark Read
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(n._id)}
            className="text-fg-subtle hover:text-destructive p-1.5 rounded transition-colors text-xs"
            title="Delete Notification"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
