'use client';

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
    <div className="glass-panel border-b border-slate-800 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>🔔</span> Enterprise Notifications & Alerts Center
          </h1>
          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
            Module 08 • Broadcast Engine
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Executive Announcements, Meeting Invitations, Operational Deadlines & Policy Circulars
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search alerts by title or sender…"
            className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-56 sm:w-64"
          />
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors"
          >
            Mark All as Read ({unreadCount})
          </button>
        )}

        <button
          onClick={onOpenBroadcast}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center gap-1.5"
        >
          <span>➕</span> Broadcast Announcement
        </button>
      </div>
    </div>
  );
}
