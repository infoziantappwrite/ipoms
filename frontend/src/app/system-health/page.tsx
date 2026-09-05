'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SystemInfoTab } from '@/app/settings/components/SystemInfoTab';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { apiFetch } from '@/lib/api';

export default function SystemHealthPage() {
  const [systemSummary, setSystemSummary] = useState<any | null>(null);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [dataQuality, setDataQuality] = useState<any | null>(null);
  const [organizationSnapshot, setOrganizationSnapshot] = useState<any | null>(null);
  const [storageSummary, setStorageSummary] = useState<any | null>(null);
  const [databaseGrowth, setDatabaseGrowth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/settings');
      if (res.success && res.data) {
        const d = res.data as any;
        setSystemSummary(d.system_summary);
        setSystemHealth(d.system_health);
        setDataQuality(d.data_quality);
        setOrganizationSnapshot(d.organization_snapshot);
        setStorageSummary(d.storage_summary);
        setDatabaseGrowth(d.database_growth);
      }
    } catch (err) {
      console.error('Failed to load system health telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* ── Top Header Bar (Frozen / Sticky at top) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <ShieldCheck size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <span>System Health & Module Operations</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            Real-time database connectivity, Master Metadata hygiene score, organizational headcount, and database storage telemetry
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
            Loading live system telemetry & health checks…
          </div>
        ) : (
          <SystemInfoTab
            summaryData={systemSummary}
            systemHealth={systemHealth}
            dataQuality={dataQuality}
            organizationSnapshot={organizationSnapshot}
            storageSummary={storageSummary}
            databaseGrowth={databaseGrowth}
          />
        )}
      </div>
    </div>
  );
}
