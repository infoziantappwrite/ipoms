'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationsHeader } from './components/NotificationsHeader';
import { NotificationsTabBar, NotificationFilterTab } from './components/NotificationsTabBar';
import { NotificationCard } from './components/NotificationCard';
import { BroadcastModal } from './components/BroadcastModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<NotificationFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Default Coordinator ID (will come from JWT session)
  const USER_ID = '6a84719afa3bf51271bc1548';

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/notifications?user_id=${USER_ID}&tab=${activeTab}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unread_count);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID }),
      });
      loadNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID }),
      });
      loadNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleAcknowledge = async (id: string, response: string) => {
    try {
      const res = await fetch(`${API}/notifications/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID, response }),
      });
      const data = await res.json();
      if (data.success) {
        loadNotifications();
      }
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
      const res = await fetch(`${API}/notifications/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
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
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">

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
          <div className="p-12 text-center text-slate-500 italic text-xs">
            Loading notifications…
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center text-slate-500 space-y-2">
            <span className="text-3xl block">📬</span>
            <p className="text-xs font-semibold text-slate-400">No notifications found in this view.</p>
            <p className="text-[11px] text-slate-600">
              When management broadcasts alerts or meeting invites, they will appear here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification._id}
              notification={notification}
              currentUserId={USER_ID}
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
