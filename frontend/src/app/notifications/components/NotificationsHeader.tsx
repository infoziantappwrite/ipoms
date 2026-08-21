'use client';

import { Bell, Plus, Search } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
interface Props {
  unreadCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenBroadcast: () => void;
  onMarkAllRead: () => void;
}

export function NotificationsHeader({
  unreadCount,
  searchQuery,
  onSearchChange,
  onOpenBroadcast,
  onMarkAllRead,
}: Props) {
  return (
    <header className="glass-panel border-b border-border px-6 py-4 space-y-3">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bell size={18} strokeWidth={2} className="text-primary" /> Notifications & Alerts
            </h1>
            <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-semibold">
              Broadcast Engine
            </span>
          </div>
          <p className="text-xs text-fg-subtle mt-0.5">
            Executive Announcements, Meeting Invitations, Operational Deadlines & Policy Circulars
          </p>
        </div>

        {/* Pin Sign Out to Absolute Top Right */}
        <div className="shrink-0">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Bottom Controls Row: Search & Actions ─────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
        {/* Search */}
        <div className="relative">
          <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search alerts by title or sender…"
            className="bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-fg w-56 sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-3 py-2 bg-background hover:bg-surface text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-colors"
            >
              Mark All as Read ({unreadCount})
            </button>
          )}

          <button
            onClick={onOpenBroadcast}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} strokeWidth={2} /> Broadcast Announcement
          </button>
        </div>
      </div>
    </header>
  );
}
