'use client';

import Link from 'next/link';
import { Users, PhoneCall, Target, ShieldAlert, Award, AlertTriangle, ExternalLink } from 'lucide-react';
import { initialsFor } from '@/lib/initials';

interface CoordinatorInfo {
  coordinator_id: string;
  name: string;
  email: string;
  mobile: string;
  profile_photo_url: string | null;
  assigned_colleges_count: number;
  calls_logged: number;
  positives_secured: number;
  is_active: boolean;
  is_locked: boolean;
  is_overloaded: boolean;
  is_unassigned: boolean;
}

interface Props {
  workforceData: {
    total_coordinators: number;
    active_today: number;
    coordinators: CoordinatorInfo[];
  };
}

export function AdminWorkforceWidget({ workforceData }: Props) {
  if (!workforceData) return null;

  const { total_coordinators, active_today, coordinators = [] } = workforceData;

  // Find top performers
  const sortedByCalls = [...coordinators].sort((a, b) => b.calls_logged - a.calls_logged);
  const topPerformer = sortedByCalls[0];

  const overloadedCount = coordinators.filter((c) => c.is_overloaded).length;
  const unassignedCount = coordinators.filter((c) => c.is_unassigned).length;
  const lockedCount = coordinators.filter((c) => c.is_locked).length;

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 space-y-5 shadow-3">
      {/* Header Strip */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-xs font-bold text-fg flex items-center gap-2">
            <Users size={15} className="text-primary" aria-hidden /> Placement Workforce & Coordinator Load Balance
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Operational capacity, institution workload distribution, and active calling velocity
          </p>
        </div>

        <Link
          href="/settings?tab=users"
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          Manage Staff & RBAC <ExternalLink size={12} />
        </Link>
      </div>

      {/* Workforce Telemetry Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface-sunken/60 rounded-xl border border-border/80">
          <span className="text-[10px] font-bold uppercase text-fg-subtle">Calling Staff</span>
          <p className="text-xl font-bold text-fg mt-1 tabular-nums">{total_coordinators}</p>
          <span className="text-micro text-emerald-600 dark:text-emerald-400 font-medium">
            {active_today} active today
          </span>
        </div>

        <div className="p-3 bg-surface-sunken/60 rounded-xl border border-border/80">
          <span className="text-[10px] font-bold uppercase text-fg-subtle">Target Ratio</span>
          <p className="text-xl font-bold text-primary mt-1">3–4</p>
          <span className="text-micro text-fg-subtle font-medium">Colleges / Coordinator</span>
        </div>

        <div className="p-3 bg-surface-sunken/60 rounded-xl border border-border/80">
          <span className="text-[10px] font-bold uppercase text-fg-subtle">Load Anomalies</span>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {overloadedCount + unassignedCount}
          </p>
          <span className="text-micro text-amber-600/80 dark:text-amber-400/80 font-medium">
            {overloadedCount > 0 ? `${overloadedCount} > 4 colleges` : `${unassignedCount} unassigned`}
          </span>
        </div>

        <div className="p-3 bg-surface-sunken/60 rounded-xl border border-border/80">
          <span className="text-[10px] font-bold uppercase text-fg-subtle">Locked Profiles</span>
          <p className={`text-xl font-bold mt-1 tabular-nums ${lockedCount > 0 ? 'text-danger' : 'text-fg-muted'}`}>
            {lockedCount}
          </p>
          <span className={`text-micro font-medium ${lockedCount > 0 ? 'text-danger' : 'text-fg-subtle'}`}>
            {lockedCount > 0 ? 'Requires admin unlock' : 'All accounts active'}
          </span>
        </div>
      </div>

      {/* Coordinator Table & Performance Cards */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-surface-sunken text-fg-subtle font-bold border-b border-border text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3.5">Coordinator Name</th>
              <th className="py-2.5 px-3 text-center">Assigned Colleges</th>
              <th className="py-2.5 px-3 text-center">Calls Logged</th>
              <th className="py-2.5 px-3 text-center">Positive Leads</th>
              <th className="py-2.5 px-3 text-center">Workload Status</th>
              <th className="py-2.5 px-3.5 text-center">Account State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {coordinators.map((c) => {
              const isTop = topPerformer && topPerformer.coordinator_id === c.coordinator_id && c.calls_logged > 0;

              return (
                <tr key={c.coordinator_id} className="hover:bg-surface-sunken/40 transition-colors">
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2.5">
                      {c.profile_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.profile_photo_url}
                          alt={c.name}
                          className="h-7 w-7 rounded-full object-cover ring-1 ring-border shadow-xs shrink-0"
                        />
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold ring-1 ring-primary/20 shrink-0">
                          {initialsFor(c.name)}
                        </span>
                      )}
                      <div>
                        <span className="font-bold text-fg flex items-center gap-1.5">
                          {c.name}
                          {isTop && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-semibold">
                              <Award size={9} /> Top Caller
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-fg-subtle block font-mono">{c.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                        c.is_overloaded
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                          : c.is_unassigned
                          ? 'bg-danger/10 text-danger border border-danger/30'
                          : 'bg-surface-sunken text-fg font-semibold'
                      }`}
                    >
                      {c.assigned_colleges_count} {c.assigned_colleges_count === 1 ? 'College' : 'Colleges'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center font-mono font-bold text-primary">
                    <span className="inline-flex items-center gap-1">
                      <PhoneCall size={11} className="text-primary/70" />
                      {c.calls_logged}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <Target size={11} className="text-emerald-500/70" />
                      {c.positives_secured}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {c.is_overloaded ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <AlertTriangle size={10} /> Overloaded (&gt;4)
                      </span>
                    ) : c.is_unassigned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-danger/10 text-danger border border-danger/20">
                        Unassigned (0)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Optimal (3–4)
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3.5 text-center">
                    {c.is_locked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger border border-danger/30">
                        <ShieldAlert size={10} /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
