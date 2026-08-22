'use client';

import { useState, useEffect, useCallback } from 'react';
import { Inbox } from 'lucide-react';
import { NotificationsHeader } from './components/NotificationsHeader';
import { NotificationsTabBar, NotificationFilterTab } from './components/NotificationsTabBar';
import { NotificationCard } from './components/NotificationCard';
import { BroadcastModal } from './components/BroadcastModal';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<NotificationFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) setUserId(user._id);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/notifications?${userId ? `user_id=${userId}&` : ''}tab=${activeTab}`;
      const res = await apiFetch(url);
      if (res.success && res.data) {
        setNotifications((res.data as any).notifications || []);
        setUnreadCount((res.data as any).unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ user_id: userId }),
      });
      loadNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/mark-all-read', {
        method: 'PATCH',
        body: JSON.stringify({ user_id: userId }),
      });
      loadNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleAcknowledge = async (id: string, response: string) => {
    try {
      const res = await apiFetch(`/notifications/${id}/acknowledge`, {
        method: 'PATCH',
        body: JSON.stringify({ user_id: userId, response }),
      });
      if (res.success) {
        loadNotifications();
      }
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
      const res = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      if (res.success) {
        loadNotifications();
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  // Filter by search query
  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      (n.sender_id?.full_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Top Header Bar ────────────────────────────────────────────────── */}
      <NotificationsHeader
        unreadCount={unreadCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenBroadcast={() => setShowBroadcastModal(true)}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* ── Tab Bar Filter ────────────────────────────────────────────────── */}
      <NotificationsTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
      />

      {/* ── Notifications Grid / Feed ─────────────────────────────────────── */}
      <div className="p-6 max-w-5xl mx-auto w-full space-y-4 flex-1">
        {loading ? (
          <div className="p-12 text-center text-fg-subtle italic text-xs">
            Loading notifications…
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center text-fg-subtle flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400">
              <Inbox size={26} strokeWidth={1.75} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No notifications found in this view</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When management broadcasts alerts, announcements, or meeting invites, they will appear here.
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification._id}
              notification={notification}
              currentUserId={userId}
              onMarkRead={handleMarkRead}
              onAcknowledge={handleAcknowledge}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <BroadcastModal
          onClose={() => setShowBroadcastModal(false)}
          onSuccess={loadNotifications}
        />
      )}

    </div>
  );
}
