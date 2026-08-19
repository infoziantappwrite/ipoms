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
    <div className="flex items-center gap-1 border-b border-border px-6 pt-2 bg-background/40 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative select-none border-b-2 whitespace-nowrap
                      ${
                        activeTab === t.id
                          ? 'text-primary border-primary bg-primary-subtle'
                          : 'text-fg-subtle hover:text-fg border-transparent hover:bg-background/20'
                      }`}
        >
          <span className="text-sm">{t.icon}</span>
          <span>{t.label}</span>
          {t.badge !== null && (
            <span className="text-micro bg-destructive/20 text-destructive border border-destructive/30 px-2 py-0.2 rounded-full font-bold">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
