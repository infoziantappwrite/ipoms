'use client';

export type NotificationFilterTab = 'all' | 'unread' | 'announcement' | 'meeting' | 'assignment';

interface Props {
  activeTab: NotificationFilterTab;
  onTabChange: (tab: NotificationFilterTab) => void;
  unreadCount: number;
}

export function NotificationsTabBar({ activeTab, onTabChange, unreadCount }: Props) {
  const tabs = [
    { id: 'all' as NotificationFilterTab, label: 'All Notifications', icon: '📬' },
    {
      id: 'unread' as NotificationFilterTab,
      label: 'Unread Alerts',
      icon: '🔔',
      badge: unreadCount > 0 ? unreadCount : null,
    },
    { id: 'announcement' as NotificationFilterTab, label: 'Announcements', icon: '📢' },
    { id: 'meeting' as NotificationFilterTab, label: 'Meetings & Events', icon: '📅' },
    { id: 'assignment' as NotificationFilterTab, label: 'Task Alerts', icon: '📝' },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-800 px-6 pt-2 bg-slate-900/40 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative select-none border-b-2 whitespace-nowrap
                      ${
                        activeTab === t.id
                          ? 'text-white border-blue-500 bg-slate-900/80'
                          : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/20'
                      }`}
        >
          <span className="text-sm">{t.icon}</span>
          <span>{t.label}</span>
          {t.badge !== null && (
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.2 rounded-full font-bold">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
