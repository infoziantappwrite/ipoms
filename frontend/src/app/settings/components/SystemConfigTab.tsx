'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  CalendarDays,
  Settings,
  Wrench,
  ShieldCheck,
  Clock,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { SmoothSelect } from '@/components/ui/SmoothSelect';

interface Props {
  settingsData: any;
  onUpdateSettings: (settings: any) => void;
}

export function SystemConfigTab({ settingsData, onUpdateSettings }: Props) {
  const [academicYear, setAcademicYear] = useState(settingsData?.academic_year || '2026-2027');
  const [seasonName, setSeasonName] = useState(settingsData?.season_name || 'Campus Recruitment Season 2026-27');
  const [dailyTarget, setDailyTarget] = useState(settingsData?.daily_calling_target || 30);
  const [orgName, setOrgName] = useState(settingsData?.org_name || 'Infoziant Placement Operations');
  const [supportEmail, setSupportEmail] = useState(settingsData?.org_support_email || 'support@infoziant.com');
  const [supportPhone, setSupportPhone] = useState(settingsData?.org_support_phone || '+91 98401 23456');

  // Maintenance Mode State (Item #6)
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(settingsData?.maintenance_mode_enabled ?? false);
  const [maintenanceReason, setMaintenanceReason] = useState(settingsData?.maintenance_reason || '');
  const [affectedRoles, setAffectedRoles] = useState<string[]>(
    settingsData?.maintenance_affected_roles || ['PLACEMENT_COORDINATOR', 'TEAM_LEADER']
  );
  const [maintenanceStartTime, setMaintenanceStartTime] = useState(
    settingsData?.maintenance_start_time ? new Date(settingsData.maintenance_start_time).toISOString().slice(0, 16) : ''
  );
  const [maintenanceEndTime, setMaintenanceEndTime] = useState(
    settingsData?.maintenance_end_time ? new Date(settingsData.maintenance_end_time).toISOString().slice(0, 16) : ''
  );

  useEffect(() => {
    if (settingsData) {
      setAcademicYear(settingsData.academic_year || '2026-2027');
      setSeasonName(settingsData.season_name || 'Campus Recruitment Season 2026-27');
      setDailyTarget(settingsData.daily_calling_target || 30);
      setOrgName(settingsData.org_name || 'Infoziant Placement Operations');
      setSupportEmail(settingsData.org_support_email || 'support@infoziant.com');
      setSupportPhone(settingsData.org_support_phone || '+91 98401 23456');

      setMaintenanceEnabled(settingsData.maintenance_mode_enabled ?? false);
      setMaintenanceReason(settingsData.maintenance_reason || '');
      setAffectedRoles(settingsData.maintenance_affected_roles || ['PLACEMENT_COORDINATOR', 'TEAM_LEADER']);
      setMaintenanceStartTime(
        settingsData.maintenance_start_time ? new Date(settingsData.maintenance_start_time).toISOString().slice(0, 16) : ''
      );
      setMaintenanceEndTime(
        settingsData.maintenance_end_time ? new Date(settingsData.maintenance_end_time).toISOString().slice(0, 16) : ''
      );
    }
  }, [settingsData]);

  const handleToggleRole = (roleCode: string) => {
    if (affectedRoles.includes(roleCode)) {
      setAffectedRoles(affectedRoles.filter((r) => r !== roleCode));
    } else {
      setAffectedRoles([...affectedRoles, roleCode]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      academic_year: academicYear.trim(),
      season_name: seasonName.trim(),
      daily_calling_target: Number(dailyTarget),
      org_name: orgName.trim(),
      org_support_email: supportEmail.trim(),
      org_support_phone: supportPhone.trim(),
      maintenance_mode_enabled: maintenanceEnabled,
      maintenance_affected_roles: affectedRoles,
      maintenance_reason: maintenanceReason.trim(),
      maintenance_start_time: maintenanceStartTime ? new Date(maintenanceStartTime).toISOString() : null,
      maintenance_end_time: maintenanceEndTime ? new Date(maintenanceEndTime).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-xs max-w-4xl mx-auto w-full">
      {/* ── 1. Maintenance Mode Controller (Module 10 §6) ── */}
      <div className={`glass-panel rounded-2xl border p-6 space-y-4 shadow-4 transition-colors ${maintenanceEnabled ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}>
        <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold text-fg flex items-center gap-2">
              <Wrench size={15} className={maintenanceEnabled ? 'text-amber-500' : 'text-primary'} /> System Maintenance Mode Controller
            </h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Temporarily restrict access for operational staff during database upgrades or migrations
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={maintenanceEnabled}
              onChange={(e) => setMaintenanceEnabled(e.target.checked)}
              className="rounded bg-surface border-border-strong text-amber-500 h-4 w-4"
            />
            <span className={`text-xs font-bold ${maintenanceEnabled ? 'text-amber-600 dark:text-amber-400' : 'text-fg-subtle'}`}>
              {maintenanceEnabled ? 'Maintenance Enabled' : 'Maintenance Disabled'}
            </span>
          </label>
        </div>

        {maintenanceEnabled && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-micro text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>Administrator accounts remain strictly exempt and can log in at any time to administer the platform.</span>
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Maintenance Reason (Shown to Users)</label>
              <input
                type="text"
                placeholder="e.g. Scheduled database optimization and quarterly index rebalancing."
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-fg text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-fg-muted font-semibold mb-1">Window Start (Date & Time)</label>
                <input
                  type="datetime-local"
                  value={maintenanceStartTime}
                  onChange={(e) => setMaintenanceStartTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-1.5 text-fg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-fg-muted font-semibold mb-1">Window End (Expected Completion)</label>
                <input
                  type="datetime-local"
                  value={maintenanceEndTime}
                  onChange={(e) => setMaintenanceEndTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-1.5 text-fg text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1.5">Affected User Roles</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-micro text-fg">
                  <input
                    type="checkbox"
                    checked={affectedRoles.includes('PLACEMENT_COORDINATOR')}
                    onChange={() => handleToggleRole('PLACEMENT_COORDINATOR')}
                    className="rounded bg-surface border-border-strong text-primary"
                  />
                  <span>Placement Coordinators</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-micro text-fg">
                  <input
                    type="checkbox"
                    checked={affectedRoles.includes('TEAM_LEADER')}
                    onChange={() => handleToggleRole('TEAM_LEADER')}
                    className="rounded bg-surface border-border-strong text-primary"
                  />
                  <span>Team Leaders</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Season & Daily Target Configuration ── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
            <CalendarDays size={14} strokeWidth={2} aria-hidden /> Placement Season & Operational Targets
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Configure active academic year and daily baseline targets for coordinators
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-fg font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Season Name</label>
            <input
              type="text"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-fg text-xs"
            />
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Daily Calling Target (Calls)</label>
            <input
              type="number"
              min={10}
              max={100}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Number(e.target.value))}
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-fg font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── 4. Organization Branding & Support ── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
            <Building2 size={14} strokeWidth={2} aria-hidden /> Organization Branding & Support
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Default company brand name and support contacts for exported reports
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-fg text-xs"
            />
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-fg font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Support Phone</label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-fg font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── Save Settings Button ── */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 bg-primary hover:bg-primary text-primary-foreground rounded-xl font-bold shadow-3 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Settings size={14} strokeWidth={2.2} aria-hidden /> Save System Configuration
        </button>
      </div>
    </form>
  );
}
