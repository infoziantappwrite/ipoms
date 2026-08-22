'use client';

import { Bell, Calendar, ClipboardList, Inbox, Megaphone } from 'lucide-react';

export type NotificationFilterTab = 'all' | 'unread' | 'announcement' | 'meeting' | 'assignment';

interface Props {
  activeTab: NotificationFilterTab;
  onTabChange: (tab: NotificationFilterTab) => void;
  unreadCount: number;
}

export function NotificationsTabBar({ activeTab, onTabChange, unreadCount }: Props) {
  const tabs = [
    {
      id: 'all' as NotificationFilterTab,
      label: 'All Notifications',
      Icon: Inbox,
    },
    {
      id: 'unread' as NotificationFilterTab,
      label: 'Unread Alerts',
      Icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      id: 'announcement' as NotificationFilterTab,
      label: 'Announcements',
      Icon: Megaphone,
    },
    {
      id: 'meeting' as NotificationFilterTab,
      label: 'Meetings & Events',
      Icon: Calendar,
    },
    {
      id: 'assignment' as NotificationFilterTab,
      label: 'Task Alerts',
      Icon: ClipboardList,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border px-6 pt-2 bg-background/50 overflow-x-auto no-scrollbar">
      {tabs.map((t) => {
        const IconComponent = t.Icon;
        const isActive = activeTab === t.id;
        const showBadge = typeof t.badge === 'number' && t.badge > 0;

        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all relative select-none border-b-2 whitespace-nowrap cursor-pointer
                        ${
                          isActive
                            ? 'text-primary border-primary bg-primary-subtle/80 font-bold'
                            : 'text-fg-subtle hover:text-fg border-transparent hover:bg-surface/50'
                        }`}
          >
            <IconComponent
              size={15}
              strokeWidth={isActive ? 2.25 : 1.75}
              className={isActive ? 'text-primary' : 'text-fg-subtle'}
            />
            <span>{t.label}</span>
            {showBadge && (
              <span className="text-micro bg-destructive/15 text-destructive border border-destructive/30 px-1.5 py-0.5 rounded-full font-bold leading-none">
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
