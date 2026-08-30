'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Database,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wrench,
  ExternalLink,
  Save,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface SystemTelemetry {
  db_status: string;
  db_name: string;
  total_collections: number;
  total_records: {
    companies: number;
    calls: number;
    weekly_pipeline: number;
    daily_leads: number;
    colleges: number;
    users: number;
    assigned_work: number;
  };
  midnight_cron_active: boolean;
  last_sync: string;
  maintenance_mode_enabled: boolean;
  maintenance_reason: string;
  academic_year: string;
  season_name: string;
}

interface Props {
  telemetry: SystemTelemetry;
  metadataQualityPct: number;
  missingMobilesCount: number;
  missingEmailsCount: number;
  onRefresh?: () => void;
}

export function AdminSystemHealthWidget({
  telemetry,
  metadataQualityPct,
  missingMobilesCount,
  missingEmailsCount,
  onRefresh,
}: Props) {
  const { toast } = useToast();

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(telemetry?.maintenance_mode_enabled || false);
  const [maintenanceReason, setMaintenanceReason] = useState(telemetry?.maintenance_reason || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!telemetry) return null;

  const handleSaveControls = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          maintenance_mode_enabled: maintenanceEnabled,
          maintenance_reason: maintenanceReason,
        }),
      });

      if (res.success) {
        toast('System configuration updated successfully.', 'success');
        if (onRefresh) onRefresh();
      } else {
        toast(res.error?.message || 'Failed to update system settings.', 'error');
      }
    } catch {
      toast('Network error updating system settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 space-y-5 shadow-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
            <Activity size={15} className="text-primary" aria-hidden /> System Telemetry & Module 10 Operations
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Operational database health, metadata hygiene index, and the maintenance switch
          </p>
        </div>

        <Link
          href="/settings?tab=system_info"
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
        >
          Full System Specs <ExternalLink size={12} />
        </Link>
      </div>

      {/* Grid of 4 Health & Metric Telemetry Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Database Connection & Collections */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-sunken/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-fg-subtle">Database Core</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={10} /> {telemetry.db_status === 'connected' ? 'Connected' : 'Live'}
            </span>
          </div>
          <p className="text-base font-bold text-fg font-mono">
            {telemetry.db_name}
          </p>
          <p className="text-micro text-fg-subtle">
            {telemetry.total_collections} Live Schema Collections
          </p>
        </div>

        {/* 2. Metadata Data Hygiene Index */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-sunken/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-fg-subtle">Metadata Hygiene</span>
            <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {metadataQualityPct}% Integrity
            </span>
          </div>
          <p className="text-base font-bold text-primary font-mono">
            {telemetry.total_records.companies.toLocaleString('en-IN')} Companies
          </p>
          <p className="text-micro text-fg-subtle">
            {missingMobilesCount} Missing Mobile • {missingEmailsCount} Missing Email
          </p>
        </div>

        {/* 3. Operational Cron Heartbeat */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-sunken/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-fg-subtle">Scheduler Cron</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
              <Clock size={10} /> Active
            </span>
          </div>
          <p className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono">
            23:59:59 IST
          </p>
          <p className="text-micro text-fg-subtle">
            Daily Finalization & Roll-over
          </p>
        </div>

        {/* 4. Active Season Metadata */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-sunken/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-fg-subtle">Academic Season</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              <ShieldCheck size={10} /> {telemetry.academic_year}
            </span>
          </div>
          <p className="text-base font-bold text-fg truncate" title={telemetry.season_name}>
            {telemetry.season_name}
          </p>
          <p className="text-micro text-fg-subtle font-mono">
            Last Sync: {new Date(telemetry.last_sync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Executive Fast Controls: Maintenance Switch */}
      <div className="grid grid-cols-1 gap-3.5 pt-2 border-t border-border/80">
        {/* Maintenance Mode Fast Switch */}
        <div className="p-4 rounded-xl border border-border bg-surface-sunken/30 space-y-2.5 max-w-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Wrench size={13} className={maintenanceEnabled ? 'text-danger' : 'text-fg-subtle'} /> Maintenance Mode Switch
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={(e) => setMaintenanceEnabled(e.target.checked)}
                className="rounded border-border text-danger focus:ring-danger h-4 w-4 cursor-pointer"
              />
              <span className={`text-[10px] font-bold uppercase ${maintenanceEnabled ? 'text-danger' : 'text-fg-subtle'}`}>
                {maintenanceEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </label>
          </div>

          <input
            type="text"
            value={maintenanceReason}
            onChange={(e) => setMaintenanceReason(e.target.value)}
            placeholder="Reason (e.g. 'Scheduled database optimization until 11:00 PM')"
            disabled={!maintenanceEnabled}
            className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border focus:border-primary focus:outline-none text-fg disabled:opacity-50"
          />
        </div>
      </div>

      {/* Save Trigger Button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSaveControls}
          disabled={isSaving}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-1 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save size={13} /> {isSaving ? 'Synchronizing...' : 'Save System Controls'}
        </button>
      </div>
    </div>
  );
}
