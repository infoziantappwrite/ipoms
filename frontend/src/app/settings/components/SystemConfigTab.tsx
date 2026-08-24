'use client';

import { useState, useEffect } from 'react';
import { Building2, CalendarDays, Settings } from 'lucide-react';

interface Props {
  settingsData: any;
  onUpdateSettings: (settings: any) => void;
}

export function SystemConfigTab({ settingsData, onUpdateSettings }: Props) {
  const [academicYear, setAcademicYear] = useState(settingsData?.academic_year || '2025-2026');
  const [seasonName, setSeasonName] = useState(settingsData?.season_name || 'Campus Recruitment Season 2025-26');
  const [dailyTarget, setDailyTarget] = useState(settingsData?.daily_calling_target || 30);
  const [orgName, setOrgName] = useState(settingsData?.org_name || 'Infoziant Placement Operations');
  const [supportEmail, setSupportEmail] = useState(settingsData?.org_support_email || 'support@infoziant.com');
  const [supportPhone, setSupportPhone] = useState(settingsData?.org_support_phone || '+91 98401 23456');
  const [themeDefault, setThemeDefault] = useState(settingsData?.theme_default || 'dark');
  const [landingPage, setLandingPage] = useState(settingsData?.default_landing_page || '/dashboard');
  const [emailNotifs, setEmailNotifs] = useState(settingsData?.enable_email_notifications ?? true);
  const [systemNotifs, setSystemNotifs] = useState(settingsData?.enable_system_notifications ?? true);
  const [dashboardPopups, setDashboardPopups] = useState(settingsData?.enable_dashboard_popups ?? true);
  const [banner, setBanner] = useState(settingsData?.system_announcement_banner || '');

  useEffect(() => {
    if (settingsData) {
      setAcademicYear(settingsData.academic_year || '2025-2026');
      setSeasonName(settingsData.season_name || 'Campus Recruitment Season 2025-26');
      setDailyTarget(settingsData.daily_calling_target || 30);
      setOrgName(settingsData.org_name || 'Infoziant Placement Operations');
      setSupportEmail(settingsData.org_support_email || 'support@infoziant.com');
      setSupportPhone(settingsData.org_support_phone || '+91 98401 23456');
      setThemeDefault(settingsData.theme_default || 'dark');
      setLandingPage(settingsData.default_landing_page || '/dashboard');
      setEmailNotifs(settingsData.enable_email_notifications ?? true);
      setSystemNotifs(settingsData.enable_system_notifications ?? true);
      setDashboardPopups(settingsData.enable_dashboard_popups ?? true);
      setBanner(settingsData.system_announcement_banner || '');
    }
  }, [settingsData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      academic_year: academicYear.trim(),
      season_name: seasonName.trim(),
      daily_calling_target: Number(dailyTarget),
      org_name: orgName.trim(),
      org_support_email: supportEmail.trim(),
      org_support_phone: supportPhone.trim(),
      theme_default: themeDefault,
      default_landing_page: landingPage,
      enable_email_notifications: emailNotifs,
      enable_system_notifications: systemNotifs,
      enable_dashboard_popups: dashboardPopups,
      system_announcement_banner: banner.trim(),
    });
    alert('Global System Settings updated successfully! ⚙️');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-xs max-w-4xl">

      {/* Season & Daily Target Configuration (Spec Section 2) */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
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
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
            />
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Season Name</label>
            <input
              type="text"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg "
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
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
            />
          </div>
        </div>
      </div>

      {/* Organization Branding & Support (Spec Section 12) */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
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
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg "
            />
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
            />
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Support Phone</label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
            />
          </div>
        </div>
      </div>

      {/* Preferences & Notifications (Spec Section 10 & 11) */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Settings size={14} strokeWidth={2} aria-hidden /> Application Delivery & Preferences
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Default landing page, UI theme, and notification delivery channels
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Default Landing Screen</label>
            <select
              value={landingPage}
              onChange={(e) => setLandingPage(e.target.value)}
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
            >
              <option value="/dashboard">Role-Based Dashboard (/dashboard)</option>
              <option value="/tracker">Daily Call Tracker (/tracker)</option>
              <option value="/weekly-tracker">Weekly Tracker Board (/weekly-tracker)</option>
              <option value="/daily-leads">Daily Leads Register (/daily-leads)</option>
              <option value="/pending-tasks">Pending Task Register (/pending-tasks)</option>
              <option value="/reports">Reports & Analytics (/reports)</option>
            </select>
          </div>

          <div>
            <label className="block text-fg-muted font-semibold mb-1">Default Theme Style</label>
            <select
              value={themeDefault}
              onChange={(e) => setThemeDefault(e.target.value)}
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
            >
              <option value="dark">Dark Theme (Standard Executive Slate)</option>
              <option value="light">Light Theme</option>
              <option value="system">System Default</option>
            </select>
          </div>
        </div>

        {/* Notification Switches */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/80">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="rounded bg-surface border-border-strong text-primary "
            />
            <span className="text-fg-muted font-semibold">Email Alerts Active</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={systemNotifs}
              onChange={(e) => setSystemNotifs(e.target.checked)}
              className="rounded bg-surface border-border-strong text-primary "
            />
            <span className="text-fg-muted font-semibold">In-App Notifications</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dashboardPopups}
              onChange={(e) => setDashboardPopups(e.target.checked)}
              className="rounded bg-surface border-border-strong text-primary "
            />
            <span className="text-fg-muted font-semibold">Dashboard Popups</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-3 transition-colors text-xs"
        >
          Save System Configuration ⚙️
        </button>
      </div>

    </form>
  );
}
