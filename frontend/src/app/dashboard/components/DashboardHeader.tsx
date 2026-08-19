'use client';
import { NotificationBellDropdown } from '@/components/NotificationBellDropdown';

export type DashboardRole = 'coordinator' | 'team_leader' | 'admin';

interface Props {
  role: DashboardRole;
  onRoleChange: (role: DashboardRole) => void;
  greetingData?: {
    greeting: string;
    icon: string;
    subtext: string;
  };
}

export function DashboardHeader({ role, onRoleChange, greetingData }: Props) {
  const roles = [
    { id: 'coordinator' as DashboardRole, label: 'Placement Coordinator', icon: '🎧', badge: 'Daily Workspace' },
    { id: 'team_leader' as DashboardRole, label: 'Team Leader', icon: '👔', badge: 'Team Matrix' },
    { id: 'admin' as DashboardRole, label: 'Executive Admin', icon: '👑', badge: 'Organization BI' },
  ];

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

      {/* Role Switcher Pill Bar + Notification Bell */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-background/80 border border-border p-1.5 rounded-xl">
          <span className="text-micro font-semibold text-fg-subtle px-2 uppercase tracking-wider hidden sm:inline">
            View As:
          </span>
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => onRoleChange(r.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                role === r.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-fg-subtle hover:text-fg hover:bg-surface/60'
              }`}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        {/* Global Notification Bell */}
        <NotificationBellDropdown />
      </div>
    </div>
  );
}
