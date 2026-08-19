'use client';

import { AlertTriangle, Bell, CalendarDays, Check, Megaphone } from 'lucide-react';

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
        className="relative p-2 rounded-xl bg-surface-sunken border border-border hover:bg-surface-sunken/80 text-fg-muted hover:text-fg transition-all cursor-pointer"
        title="Notifications & Alerts"
      >
        <Bell size={18} strokeWidth={2} aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-white text-micro font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Top 100 Bell Dropdown Panel (Spec Section 5.2.8.5) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-border shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-border bg-background flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-fg">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-micro bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-micro text-primary hover:text-primary font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List (Top 100 max) */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-fg-subtle italic text-xs">
                No active notifications
              </div>
            ) : (
              notifications.slice(0, 100).map((n) => (
                <div
                  key={n._id}
                  className={`p-3.5 hover:bg-background transition-colors space-y-1.5 ${
                    !n.is_read ? 'bg-primary-subtle/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {n.notification_type === 'meeting'
                          ? <CalendarDays size={14} strokeWidth={2} aria-hidden />
                          : n.priority === 'high'
                            ? <AlertTriangle size={14} strokeWidth={2} className="text-destructive" aria-hidden />
                            : <Megaphone size={14} strokeWidth={2} aria-hidden />}
                      </span>
                      <span className="text-xs font-bold text-fg line-clamp-1">{n.title}</span>
                    </div>
                    <span className="text-micro text-fg-subtle font-mono shrink-0">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-micro text-fg-muted line-clamp-2 leading-relaxed font-normal">
                    {n.message}
                  </p>

                  {/* Meeting or Acknowledgment Responses */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    {n.notification_type === 'meeting' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcknowledge(n._id, 'will_attend')}
                          className={`px-2 py-0.5 rounded text-micro font-bold border transition-colors ${
                            n.user_response === 'will_attend'
                              ? 'bg-success-subtle text-success border-success'
                              : 'bg-surface-sunken text-fg-muted border-border hover:bg-success-subtle hover:text-success'
                          }`}
                        >
                          <Check size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Will Attend
                        </button>
                        <button
                          onClick={() => handleAcknowledge(n._id, 'cannot_attend')}
                          className={`px-2 py-0.5 rounded text-micro font-bold border transition-colors ${
                            n.user_response === 'cannot_attend'
                              ? 'bg-destructive-subtle text-destructive border-destructive'
                              : 'bg-surface-sunken text-fg-muted border-border hover:bg-destructive-subtle hover:text-destructive'
                          }`}
                        >
                          ✗ Cannot
                        </button>
                      </div>
                    ) : n.requires_acknowledgment && !n.is_read ? (
                      <button
                        onClick={() => handleMarkRead(n._id)}
                        className="px-2 py-0.5 bg-primary-subtle hover:bg-primary-subtle text-primary border border-primary-subtle rounded text-micro font-semibold transition-colors"
                      >
                        <Check size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Acknowledge
                      </button>
                    ) : null}

                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        onClick={() => setIsOpen(false)}
                        className="text-micro text-primary hover:underline font-semibold ml-auto"
                      >
                        View Details →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All */}
          <div className="p-2.5 bg-background border-t border-border text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-fg-muted hover:text-primary font-bold block"
            >
              Open Full Notifications Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
