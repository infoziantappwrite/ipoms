'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sliders } from 'lucide-react';
import { SystemConfigTab } from '@/app/settings/components/SystemConfigTab';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { apiFetch } from '@/lib/api';

export default function SystemSettingsPage() {
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
            Global academic season, active year, system announcements broadcast, and scheduled maintenance controls
          </p>
        </div>

        {/* User Presence & Sign Out */}
        <div className="shrink-0 flex items-center gap-3">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        {loading ? (
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
