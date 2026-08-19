'use client';

import Link from 'next/link';

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
    high: 'bg-red-500/10 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
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
          ? 'border-blue-500/40 bg-slate-900/90 shadow-lg ring-1 ring-blue-500/20'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl p-2 bg-slate-800 rounded-xl border border-slate-700">
            {typeIcons[n.notification_type] || '📢'}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  priorityStyles[n.priority] || priorityStyles.medium
                }`}
              >
                {n.priority} Priority
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 capitalize">
                {n.notification_type.replace('_', ' ')}
              </span>
              {n.target_college && (
                <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded-full font-mono border border-blue-800/40">
                  [{n.target_college.college_code}] {n.target_college.college_name}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white mt-1">{n.title}</h3>
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-[11px] text-slate-400 font-mono shrink-0">
          {new Date(n.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Message Body */}
      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
        {n.message}
      </p>

      {/* Sender & Live Attendance Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <span>From:</span>
          <strong className="text-slate-200">{n.sender_id?.full_name || 'Management Office'}</strong>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
            {n.sender_role}
          </span>
        </div>

        {n.notification_type === 'meeting' && (
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="text-emerald-400">✓ {n.attendees_count} Attending</span>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
        {/* Meeting Attendance or Acknowledgment Response (Spec Section 5.2.8.5) */}
        <div className="flex items-center gap-2">
          {n.notification_type === 'meeting' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAcknowledge(n._id, 'will_attend')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                  n.user_response === 'will_attend'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-emerald-950/40 hover:text-emerald-300'
                }`}
              >
                <span>✓</span> Will Attend
              </button>
              <button
                type="button"
                onClick={() => onAcknowledge(n._id, 'cannot_attend')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                  n.user_response === 'cannot_attend'
                    ? 'bg-red-600 text-white border-red-500 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-red-950/40 hover:text-red-300'
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
                  ? 'bg-blue-600 text-white border-blue-500 shadow'
                  : 'bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30'
              }`}
            >
              <span>✓</span> {n.user_response === 'acknowledged' ? 'Acknowledged ✓' : 'Acknowledge Policy'}
            </button>
          ) : null}

          {n.action_url && (
            <Link
              href={n.action_url}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
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
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
            >
              Mark Read
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(n._id)}
            className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors text-xs"
            title="Delete Notification"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
