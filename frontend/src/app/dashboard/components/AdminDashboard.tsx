'use client';

import { useState } from 'react';
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

  if (!data) return null;

  const {
    macro_kpis,
    leaderboard = [],
    workforce_snapshot,
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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

          {/* Card 3: Account Lockouts */}
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

          {/* Card 4: Unassigned Colleges */}
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

          {/* Card 5: Offers Secured */}
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

          {/* Card 6: Drives Conducted */}
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

          {/* Card 7: Data Quality Index */}
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

      {/* ── 4. Institutional Placement Oversight & Leaderboard ── */}
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
