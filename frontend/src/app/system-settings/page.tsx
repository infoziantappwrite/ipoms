'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sliders, Building2, Wrench, ShieldAlert } from 'lucide-react';
import { SystemConfigTab } from '@/app/settings/components/SystemConfigTab';
import { CollegeRosterTab } from '@/app/settings/components/CollegeRosterTab';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf } from '@/lib/session';

export default function SystemSettingsPage() {
  const router = useRouter();
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'system' | 'colleges'>('colleges');
  const [userRole, setUserRole] = useState<'admin' | 'team_leader' | 'coordinator'>('admin');

  useEffect(() => {
    const session = readSessionUser();
    const role = roleOf(session);
    setUserRole(role);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/settings');
      if (res.success && res.data) {
        setSettingsData((res.data as any).settings);
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const res = await apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify(newSettings),
      });
      if (res.success) {
        setSettingsData(res.data);
      }
    } catch (err) {
      console.error('Update settings error:', err);
    }
  };

  if (userRole === 'coordinator') {
    return (
      <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
              <Sliders size={18} strokeWidth={2} className="text-primary" aria-hidden />
              <span>Season & System Settings</span>
            </h1>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <UserSignOutButton />
          </div>
        </div>

        <div className="p-8 max-w-xl mx-auto my-auto text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-sm">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-bold text-fg">Leadership Access Required</h2>
          <p className="text-xs text-fg-subtle leading-relaxed">
            Institutional Roster Management and System Configuration are strictly restricted to <strong>Administrators</strong> and <strong>Team Leaders</strong>. Placement Coordinators cannot modify institutional activation statuses.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition shadow-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">
      {/* ── Top Header Bar (Frozen / Sticky at top) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <Sliders size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <span>Season & System Settings</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            Partner institutions roster management, global academic season, active year, and maintenance controls
          </p>
        </div>

        {/* User Presence & Sign Out */}
        <div className="shrink-0 flex items-center gap-3">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Tab Switcher Bar ── */}
      <div className="bg-surface border-b border-border px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('colleges')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'colleges'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-subtle hover:text-fg'
            }`}
          >
            <Building2 size={16} />
            <span>Partner Institutions & Roster</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-600 font-semibold">
              21 Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'system'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-subtle hover:text-fg'
            }`}
          >
            <Wrench size={16} />
            <span>Academic Season & System Config</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        {activeTab === 'colleges' ? (
          <CollegeRosterTab />
        ) : loading ? (
          <div className="p-12 text-center text-fg-subtle italic text-xs">
            Loading system configuration…
          </div>
        ) : (
          <SystemConfigTab
            settingsData={settingsData}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </div>
    </div>
  );
}
