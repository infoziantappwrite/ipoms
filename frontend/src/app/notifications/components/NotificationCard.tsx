'use client';

import Link from 'next/link';
import {
  Check,
  Megaphone,
  ClipboardList,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';

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

  const priorityStyles: Record<string, string> = {
    high: 'bg-destructive-subtle text-destructive border-destructive/30',
    medium: 'bg-warning-subtle text-warning border-warning/30',
    low: 'bg-primary-subtle text-primary border-primary/30',
  };

  const typeIcons: Record<string, any> = {
    announcement: Megaphone,
    assignment: ClipboardList,
    reminder: Clock,
    meeting: Calendar,
    system_alert: AlertTriangle,
    system_update: RefreshCw,
  };

  const IconComponent = typeIcons[n.notification_type] || Megaphone;

  return (
    <div
      className={`rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-3.5 ${
        !n.is_read
          ? 'border-primary/40 bg-white shadow-sm ring-1 ring-primary/20'
          : 'border-border bg-surface hover:border-border-strong shadow-xs'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <IconComponent size={18} strokeWidth={2} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-micro font-bold uppercase px-2 py-0.5 rounded border ${
                  priorityStyles[n.priority] || priorityStyles.medium
                }`}
              >
                {n.priority} Priority
              </span>
              <span className="text-micro bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 capitalize font-medium">
                {n.notification_type.replace('_', ' ')}
              </span>
              {n.target_college && (
                <span className="text-micro bg-primary-subtle text-primary px-2 py-0.5 rounded-full font-mono border border-primary/30 font-semibold">
                  [{n.target_college.college_code}] {n.target_college.college_name}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-fg mt-1 leading-snug">{n.title}</h3>
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
      <p className="text-xs text-fg-muted leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-border">
        {n.message}
      </p>

      {/* Sender & Live Attendance Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-fg-subtle pt-1">
        <div className="flex items-center gap-1.5">
          <span>From:</span>
          <strong className="text-fg font-semibold">{n.sender_id?.full_name || 'Management Office'}</strong>
          <span className="text-micro bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">
            {n.sender_role}
          </span>
        </div>

        {n.notification_type === 'meeting' && (
          <div className="flex items-center gap-2 text-micro font-semibold">
            <span className="text-success flex items-center gap-1">
              <Check size={14} strokeWidth={2.5} />
              <span>{n.attendees_count || 0} Attending</span>
            </span>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-3">
        {/* Meeting Attendance or Acknowledgment Response */}
        <div className="flex items-center gap-2">
          {n.notification_type === 'meeting' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAcknowledge(n._id, 'will_attend')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                  n.user_response === 'will_attend'
                    ? 'bg-success text-white border-success shadow-xs'
                    : 'bg-white text-fg-muted border-border hover:bg-success-subtle hover:text-success'
                }`}
              >
                <Check size={13} strokeWidth={2.5} /> Will Attend
              </button>
              <button
                type="button"
                onClick={() => onAcknowledge(n._id, 'cannot_attend')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                  n.user_response === 'cannot_attend'
                    ? 'bg-destructive text-white border-destructive shadow-xs'
                    : 'bg-white text-fg-muted border-border hover:bg-destructive-subtle hover:text-destructive'
                }`}
              >
                <X size={13} strokeWidth={2.5} /> Cannot Attend
              </button>
            </div>
          ) : n.requires_acknowledgment ? (
            <button
              type="button"
              onClick={() => onAcknowledge(n._id, 'acknowledged')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                n.user_response === 'acknowledged'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-primary-subtle text-primary border-primary/30 hover:bg-primary/20'
              }`}
            >
              <Check size={13} strokeWidth={2.5} />
              <span>{n.user_response === 'acknowledged' ? 'Acknowledged ✓' : 'Acknowledge Policy'}</span>
            </button>
          ) : null}

          {n.action_url && (
            <Link
              href={n.action_url}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink size={13} strokeWidth={2} />
              <span>Open Module</span>
            </Link>
          )}
        </div>

        {/* Read & Delete actions */}
        <div className="flex items-center gap-2">
          {!n.is_read && (
            <button
              type="button"
              onClick={() => onMarkRead(n._id)}
              className="text-xs text-primary hover:text-primary-hover font-semibold px-2 py-1 rounded transition-colors cursor-pointer"
            >
              Mark Read
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(n._id)}
            className="text-fg-subtle hover:text-destructive p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-xs cursor-pointer"
            title="Delete Notification"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
