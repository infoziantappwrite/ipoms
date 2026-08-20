'use client';
import { NotificationBellDropdown } from '@/components/NotificationBellDropdown';

export type DashboardRole = 'coordinator' | 'team_leader' | 'admin';

interface Props {
  greetingData?: {
    greeting: string;
    icon: string;
    subtext: string;
  };
}

export function DashboardHeader({ greetingData }: Props) {
  return (
    <div className="glass-panel border-b border-border px-6 py-5 flex items-center justify-between flex-wrap gap-4">
      {/* Time-Aware Greeting (Spec Section 7.1) */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{greetingData?.icon || '👋'}</span>
          <span>{greetingData?.greeting || 'Welcome to iPOMS Operations'}</span>
        </h1>
        <p className="text-xs text-fg-subtle mt-1">
          {greetingData?.subtext || 'Central Operational Command Center & Intelligent Workflow Navigation'}
        </p>
      </div>

      {/* Global Notification Bell */}
      <NotificationBellDropdown />
    </div>
  );
}
