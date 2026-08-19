'use client';

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
}

export function SettingsNav({ activeSection, onSectionChange, userCount }: Props) {
  const sections = [
    { id: 'profile' as SettingsSection, label: 'My Profile & Security', icon: '👤', badge: 'Personal' },
    {
      id: 'users' as SettingsSection,
      label: 'User & Coordinator Management',
      icon: '👥',
      badge: userCount ? `${userCount} Users` : 'Admin',
    },
    { id: 'roles' as SettingsSection, label: 'Role Permissions Matrix', icon: '🛡️', badge: 'RBAC' },
    { id: 'config' as SettingsSection, label: 'Application & Season Settings', icon: '⚙️', badge: 'Global' },
    { id: 'org' as SettingsSection, label: 'Organization Branding', icon: '🏢', badge: 'Director' },
    { id: 'system_info' as SettingsSection, label: 'System Telemetry & Health', icon: 'ℹ️', badge: 'Status' },
  ];

  return (
    <div className="w-full md:w-64 glass-panel rounded-2xl border border-slate-800 p-3 flex md:flex-col gap-1.5 overflow-x-auto shrink-0">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-3 py-2 hidden md:block">
        Settings Navigation
      </span>
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onSectionChange(s.id)}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left whitespace-nowrap md:whitespace-normal w-full
            ${
              activeSection === s.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm">{s.icon}</span>
            <span>{s.label}</span>
          </div>
          {s.badge && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono hidden sm:inline ${
                activeSection === s.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {s.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
