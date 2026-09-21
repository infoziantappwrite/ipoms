'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Landmark,
  Search,
  Users,
  Award,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
  Database,
  ExternalLink,
  Clock,
  Timer,
  Zap,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { AdminAccountResolutionCenter } from './AdminAccountResolutionCenter';
import { AdminSystemHealthWidget } from './AdminSystemHealthWidget';
import { AdminAuditTrailWidget } from './AdminAuditTrailWidget';

interface Props {
  data: any;
  onRefresh?: () => void;
}

export function AdminDashboard({ data, onRefresh }: Props) {
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState<'all' | 'with_offers' | 'with_drives' | 'active_pipeline'>('all');

  // Live polling every 15s to keep coordinator presence and telemetry fresh
  useEffect(() => {
    if (!onRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  if (!data) return null;

  const {
    macro_kpis,
    leaderboard = [],
    workforce_snapshot,
    global_calling_duration,
    coordinator_duration_leaderboard = [],
    critical_alerts,
    system_telemetry,
    audit_logs = [],
  } = data;

  const lockedCount = critical_alerts?.locked_accounts_count || 0;
  const unassignedCount = critical_alerts?.unassigned_colleges_count || 0;

  // Filtered leaderboard
  const filteredLeaderboard = leaderboard.filter((c: any) => {
    const matchesSearch =
      c.college_name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
      c.college_code.toLowerCase().includes(collegeSearch.toLowerCase()) ||
      (c.tpo_name && c.tpo_name.toLowerCase().includes(collegeSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (collegeFilter === 'with_offers') return c.total_offers > 0;
    if (collegeFilter === 'with_drives') return c.drives_completed > 0;
    if (collegeFilter === 'active_pipeline') return c.active_pipeline > 0;

    return true;
  });

  return (
    <div className="p-6 space-y-7 max-w-7xl mx-auto">
      {/* ── 1. Administrator Governance & System Health KPI Grid ── */}
      {macro_kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Card 1: Partner Colleges */}
          <div className="glass-card rounded-xl p-3.5 border border-border flex flex-col justify-between hover:shadow-2 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider">Institutions</span>
              <Landmark size={13} className="text-primary/70" />
            </div>
            <p className="text-2xl font-bold text-primary mt-1.5 tabular-nums tracking-tight">
              {macro_kpis.active_partner_colleges}
            </p>
            <p className="text-micro text-fg-subtle mt-0.5 font-medium">Partner Colleges</p>
          </div>

          {/* Card 2: Calling Staff */}
          <div className="glass-card rounded-xl p-3.5 border border-border flex flex-col justify-between hover:shadow-2 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider">Staff Roster</span>
              <Users size={13} className="text-primary/70" />
            </div>
            <p className="text-2xl font-bold text-fg mt-1.5 tabular-nums tracking-tight">
              {workforce_snapshot?.total_coordinators || macro_kpis.portal_users}
            </p>
            <p className="text-micro text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              {workforce_snapshot?.active_today || 0} Active Today
            </p>
          </div>

          {/* Card 3: Outreach Duration Today (Highlighted Clock Feature) */}
          <div className="glass-card rounded-xl p-3.5 border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 flex flex-col justify-between hover:shadow-2 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider font-mono">
                Calling Time
              </span>
              <Clock size={13} className="text-indigo-500 dark:text-indigo-400 animate-pulse" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-300 mt-1.5 tabular-nums tracking-tight font-mono">
              {global_calling_duration?.today_formatted || workforce_snapshot?.total_calling_duration_formatted || '00m 00s'}
            </p>
            <p className="text-micro text-fg-subtle mt-0.5 font-medium">
              {global_calling_duration?.active_calling_coordinators || workforce_snapshot?.active_today || 0} Calling Today
            </p>
          </div>

          {/* Card 4: Account Lockouts */}
          <div className={`glass-card rounded-xl p-3.5 border flex flex-col justify-between hover:shadow-2 transition-shadow ${lockedCount > 0 ? 'border-danger/40 bg-danger/5' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider">Lockouts</span>
              <ShieldAlert size={13} className={lockedCount > 0 ? 'text-danger' : 'text-fg-subtle'} />
            </div>
            <p className={`text-2xl font-bold mt-1.5 tabular-nums tracking-tight ${lockedCount > 0 ? 'text-danger' : 'text-fg-muted'}`}>
              {lockedCount}
            </p>
            <p className={`text-micro mt-0.5 font-medium ${lockedCount > 0 ? 'text-danger' : 'text-fg-subtle'}`}>
              {lockedCount > 0 ? 'Action Required' : 'Zero Lockouts'}
            </p>
          </div>

          {/* Card 5: Unassigned Colleges */}
          <div className={`glass-card rounded-xl p-3.5 border flex flex-col justify-between hover:shadow-2 transition-shadow ${unassignedCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider">Unassigned</span>
              <ShieldCheck size={13} className={unassignedCount > 0 ? 'text-amber-500' : 'text-emerald-500'} />
            </div>
            <p className={`text-2xl font-bold mt-1.5 tabular-nums tracking-tight ${unassignedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-fg'}`}>
              {unassignedCount}
            </p>
            <p className="text-micro text-fg-subtle mt-0.5 font-medium">
              {unassignedCount > 0 ? 'Colleges Need Staff' : 'All Staffed'}
            </p>
          </div>

          {/* Card 6: Offers Secured */}
          <div className="glass-card rounded-xl p-3.5 border border-border flex flex-col justify-between hover:shadow-2 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider">Total Offers</span>
              <Award size={13} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums tracking-tight">
              {macro_kpis.total_offers_placed}
            </p>
            <p className="text-micro text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-medium">Placed Students</p>
          </div>

          {/* Card 7: Drives Conducted */}
          <div className="glass-card rounded-xl p-3.5 border border-border flex flex-col justify-between hover:shadow-2 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider">Drives Done</span>
              <CheckCircle2 size={13} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1.5 tabular-nums tracking-tight">
              {macro_kpis.drives_conducted}
            </p>
            <p className="text-micro text-purple-600/80 dark:text-purple-400/80 mt-0.5 font-medium">Campus Drives</p>
          </div>

          {/* Card 8: Data Quality Index */}
          <div className="glass-card rounded-xl p-3.5 border border-border flex flex-col justify-between hover:shadow-2 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider">Data Hygiene</span>
              <Database size={13} className="text-cyan-500" />
            </div>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1.5 tabular-nums tracking-tight">
              {macro_kpis.metadata_quality_pct || 94}%
            </p>
            <p className="text-micro text-cyan-600/80 dark:text-cyan-400/80 mt-0.5 font-medium">Metadata Index</p>
          </div>
        </div>
      )}

      {/* ── 2. Account Governance, Lockout Resolution & Staffing Center ── */}
      <AdminAccountResolutionCenter
        alerts={critical_alerts}
        coordinators={workforce_snapshot?.coordinators || []}
        onRefresh={onRefresh}
      />

      {/* ── 3. Module 10 System Telemetry, Metadata Quality & Maintenance Controls ── */}
      {system_telemetry && (
        <AdminSystemHealthWidget
          telemetry={system_telemetry}
          metadataQualityPct={macro_kpis?.metadata_quality_pct || 94}
          missingMobilesCount={critical_alerts?.missing_mobiles_count || 0}
          missingEmailsCount={critical_alerts?.missing_emails_count || 0}
          onRefresh={onRefresh}
        />
      )}

      {/* ── 4. Coordinator Call Durations & Outreach Rankings (Synchronous Calling Telemetry) ── */}
      {coordinator_duration_leaderboard && coordinator_duration_leaderboard.length > 0 && (
        <div className="glass-panel rounded-2xl border border-indigo-500/20 overflow-hidden shadow-4 space-y-0">
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-slate-900/5 via-indigo-900/5 to-transparent flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-xs font-bold text-fg flex items-center gap-2">
                <Clock size={15} className="text-indigo-500 animate-pulse" aria-hidden /> Coordinator Call Durations & Outreach Leaderboard
              </h3>
              <p className="text-micro text-fg-subtle mt-0.5">
                Real-time tracking of dedicated calling hours, minutes, and seconds logged today across institutional operations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                Total Team Time: {global_calling_duration?.today_formatted || workforce_snapshot?.total_calling_duration_formatted || '00m 00s'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-sunken text-fg-subtle font-bold border-b border-border text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Rank & Coordinator</th>
                  <th className="py-3 px-3">Active Campus</th>
                  <th className="py-3 px-3 text-center min-w-[140px]">Calling Time Today</th>
                  <th className="py-3 px-3 text-center">Calls Logged</th>
                  <th className="py-3 px-3 text-center">Positive Leads</th>
                  <th className="py-3 px-3 text-center">Assigned Colleges</th>
                  <th className="py-3 px-4 text-center">Presence Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {coordinator_duration_leaderboard.map((coord: any, idx: number) => {
                  const isTop = idx === 0 && (coord.today_call_duration_seconds || 0) > 0;
                  return (
                    <tr key={coord.coordinator_id || coord.id} className="hover:bg-surface-sunken/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isTop
                              ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                              : 'bg-surface-sunken text-fg-subtle border border-border'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-fg flex items-center gap-1.5">
                              <span>{coord.name}</span>
                              {isTop && <Sparkles size={12} className="text-amber-500" />}
                            </div>
                            <span className="text-[10px] text-fg-subtle block font-mono">
                              {coord.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {coord.active_college ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {coord.active_college.college_code || coord.active_college_code || 'Active'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-fg-subtle italic">General Focus</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-bold text-xs shadow-2xs border ${
                          (coord.today_call_duration_seconds || 0) > 0
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                            : 'bg-surface-sunken border-border text-fg-subtle'
                        }`}>
                          <Clock size={12} className="text-indigo-500 shrink-0" />
                          {coord.today_call_duration_formatted || coord.duration_formatted || '00m 00s'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-primary text-sm">
                        {coord.calls_today || 0}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {coord.positives_secured || coord.positives_today || 0}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-fg-muted">
                        {coord.assigned_colleges_count || coord.assigned_colleges?.length || 0}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          coord.online_status === 'online'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : coord.online_status === 'away'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            coord.online_status === 'online' ? 'bg-emerald-500 animate-pulse' : coord.online_status === 'away' ? 'bg-amber-500' : 'bg-zinc-400'
                          }`} />
                          {coord.online_status_label || (coord.online_status === 'online' ? 'Online' : 'Offline')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Institutional Placement Oversight & Leaderboard ── */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-4 space-y-0">
        {/* Table Header & Controls */}
        <div className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xs font-bold text-fg flex items-center gap-2">
              <Landmark size={15} className="text-primary" aria-hidden /> Institutional Placement Oversight Leaderboard
            </h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Consolidated placement drives, coordinator assignments, and student offer yields across all partner institutions
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Bar */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              <input
                type="text"
                placeholder="Search college or code..."
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg bg-surface-sunken border border-border focus:border-primary focus:outline-none w-48 text-fg"
              />
            </div>

            {/* Quick Filter */}
            <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg border border-border text-micro">
              <button
                type="button"
                onClick={() => setCollegeFilter('all')}
                className={`px-2 py-0.8 rounded-md font-semibold cursor-pointer transition-colors ${
                  collegeFilter === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                All ({leaderboard.length})
              </button>
              <button
                type="button"
                onClick={() => setCollegeFilter('with_offers')}
                className={`px-2 py-0.8 rounded-md font-semibold cursor-pointer transition-colors ${
                  collegeFilter === 'with_offers' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                With Offers
              </button>
              <button
                type="button"
                onClick={() => setCollegeFilter('with_drives')}
                className={`px-2 py-0.8 rounded-md font-semibold cursor-pointer transition-colors ${
                  collegeFilter === 'with_drives' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                With Drives
              </button>
            </div>

            <Link
              href="/reports"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 ml-2"
            >
              Report Builder <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-surface-sunken text-fg-subtle font-bold border-b border-border text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">Institution Details</th>
                <th className="py-3 px-3">Assigned Coordinators</th>
                <th className="py-3 px-3 text-center">Calls Logged</th>
                <th className="py-3 px-3 text-center">Positive Leads</th>
                <th className="py-3 px-3 text-center">Active Pipeline</th>
                <th className="py-3 px-3 text-center">Drives Done</th>
                <th className="py-3 px-3 text-center">Offers Placed</th>
                <th className="py-3 px-3 text-center">Top CTC</th>
                <th className="py-3 px-4 text-center">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-fg-subtle">
                    No partner institutions match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLeaderboard.map((c: any) => (
                  <tr key={c.college_id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-fg flex items-center gap-1.5">
                        <span className="text-primary font-mono text-[11px] font-semibold">[{c.college_code}]</span>
                        <span className="truncate max-w-xs">{c.college_name}</span>
                      </div>
                      <span className="text-[10px] text-fg-subtle block mt-0.5">
                        TPO: {c.tpo_name} {c.tpo_contact_mobile ? `• ${c.tpo_contact_mobile}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.assigned_coordinators && c.assigned_coordinators.length > 0 ? (
                          c.assigned_coordinators.map((coord: any) => (
                            <span
                              key={coord.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-sunken text-fg border border-border"
                              title={coord.email}
                            >
                              {coord.name.split(' ')[0]}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-primary">
                      {c.calls}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {c.positives}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-fg-muted font-semibold">
                      {c.active_pipeline || 0}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                      {c.drives_completed}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {c.total_offers}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-xs font-semibold text-fg-muted">
                      {c.top_ctc_lpa ? `${c.top_ctc_lpa} LPA` : '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/reports?college_id=${c.college_id}`}
                        className="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-lg text-micro font-semibold transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet size={11} /> Audit Report
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. System Security & Audit Trail Feed ── */}
      {audit_logs && audit_logs.length > 0 && (
        <AdminAuditTrailWidget auditLogs={audit_logs} />
      )}
    </div>
  );
}
