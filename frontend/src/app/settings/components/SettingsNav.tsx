'use client';

import { User, Users, ShieldCheck, Sliders, Building2, Activity } from 'lucide-react';

export type SettingsSection =
  | 'profile'
  | 'users'
  | 'roles'
  | 'config'
  | 'org'
  | 'system_info';

interface Props {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  userCount?: number;
  userRole?: string;
}

export function SettingsNav({ activeSection, onSectionChange, userCount, userRole = 'COORDINATOR' }: Props) {
  const role = userRole.toUpperCase();
  const isCoordinator = role.includes('COORDINATOR');
  // Team Leader has real backend permission for User Management
  // (POST/PATCH /users is TL_ADMIN in routePolicy.ts) but not for Role
  // Matrix, System Config, or System Info — those stay Administrator-only.
  const isTeamLeader = role.includes('TEAM_LEAD');

  const allSections = [
    { id: 'profile' as SettingsSection, label: 'My Profile & Security', Icon: User, badge: 'Personal', visible: 'all' as const },
    {
      id: 'users' as SettingsSection,
      label: 'User Management',
      Icon: Users,
      badge: userCount ? `${userCount} Users` : 'Admin',
      visible: 'staff' as const,
    },
    { id: 'roles' as SettingsSection, label: 'Role Permissions Matrix', Icon: ShieldCheck, badge: 'RBAC', visible: 'admin' as const },
    { id: 'config' as SettingsSection, label: 'Season & System Settings', Icon: Sliders, badge: 'Global', visible: 'admin' as const },
    { id: 'org' as SettingsSection, label: 'Organization Branding', Icon: Building2, badge: 'Director', visible: 'admin' as const },
    { id: 'system_info' as SettingsSection, label: 'System Health & Modules', Icon: Activity, badge: 'Status', visible: 'admin' as const },
  ];

  const sections = allSections.filter((s) => {
    if (s.visible === 'all') return true;
    if (s.visible === 'staff') return !isCoordinator; // Team Leader or Administrator
    return !isCoordinator && !isTeamLeader; // 'admin' — Administrator only
  });

  return (
    <div className="w-full md:w-64 bg-surface rounded-2xl border border-border p-3 flex md:flex-col gap-1.5 overflow-x-auto shrink-0 shadow-xs">
      <span className="text-micro text-fg-subtle font-bold uppercase tracking-wider px-3 py-2 hidden md:block">
        Settings Navigation
      </span>
      {sections.map((s) => {
        const IconComponent = s.Icon;
        const isActive = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left whitespace-nowrap md:whitespace-normal w-full cursor-pointer
              ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-fg-subtle hover:text-fg hover:bg-slate-50'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <IconComponent size={15} strokeWidth={isActive ? 2.25 : 1.75} className={isActive ? 'text-white' : 'text-slate-500'} />
              <span>{s.label}</span>
            </div>
            {s.badge && (
              <span
                className={`text-micro px-1.5 py-0.5 rounded font-mono hidden sm:inline ${
                  isActive
                    ? 'bg-white/20 text-white font-bold'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
