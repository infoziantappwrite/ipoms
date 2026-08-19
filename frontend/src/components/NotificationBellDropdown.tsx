'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Props {
  userId?: string;
}

export function NotificationBellDropdown({ userId = '6a84719afa3bf51271bc1548' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications?user_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unread_count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications for bell:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // 45-second polling (Spec Section 5.2.8.5)
    return () => clearInterval(interval);
  }, [userId]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      fetchNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      fetchNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleAcknowledge = async (id: string, response: string) => {
    try {
      await fetch(`${API}/notifications/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, response }),
      });
      fetchNotifications();
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
        title="Notifications & Alerts"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Top 100 Bell Dropdown Panel (Spec Section 5.2.8.5) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl border border-slate-700 shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List (Top 100 max) */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 italic text-xs">
                No active notifications
              </div>
            ) : (
              notifications.slice(0, 100).map((n) => (
                <div
                  key={n._id}
                  className={`p-3.5 hover:bg-slate-800/40 transition-colors space-y-1.5 ${
                    !n.is_read ? 'bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {n.notification_type === 'meeting' ? '📅' : n.priority === 'high' ? '🚨' : '📢'}
                      </span>
                      <span className="text-xs font-bold text-white line-clamp-1">{n.title}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono shrink-0">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>

                  {/* Meeting or Acknowledgment Responses */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    {n.notification_type === 'meeting' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcknowledge(n._id, 'will_attend')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            n.user_response === 'will_attend'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-emerald-950/40 hover:text-emerald-400'
                          }`}
                        >
                          ✓ Will Attend
                        </button>
                        <button
                          onClick={() => handleAcknowledge(n._id, 'cannot_attend')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            n.user_response === 'cannot_attend'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-red-950/40 hover:text-red-400'
                          }`}
                        >
                          ✗ Cannot
                        </button>
                      </div>
                    ) : n.requires_acknowledgment && !n.user_response ? (
                      <button
                        onClick={() => handleAcknowledge(n._id, 'acknowledged')}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/40"
                      >
                        ✓ Acknowledge
                      </button>
                    ) : null}

                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n._id)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 ml-auto"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All Link */}
          <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open Full Notifications Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
