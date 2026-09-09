'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Unlock,
  KeyRound,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
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
  online_status?: 'online' | 'away' | 'offline' | 'on_leave' | 'partial_working';
  online_status_label?: string;
  active_college?: { college_id?: string; college_code?: string; college_name?: string; location?: string } | null;
  last_active_at?: string | null;
}

interface CriticalAlertsData {
  unassigned_colleges_count: number;
  unassigned_colleges: Array<{ college_id: string; college_name: string; college_code: string }>;
  locked_accounts_count: number;
  locked_accounts: Array<{ user_id: string; name: string; email: string; reason: string }>;
  stale_pipeline_count: number;
  missing_mobiles_count: number;
  missing_emails_count: number;
}

interface Props {
  alerts: CriticalAlertsData;
  coordinators: CoordinatorInfo[];
  onRefresh?: () => void;
}

export function AdminAccountResolutionCenter({ alerts, coordinators = [], onRefresh }: Props) {
  const { toast } = useToast();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'away' | 'offline'>('all');

  const lockedAccounts = alerts?.locked_accounts || [];
  const unassignedColleges = alerts?.unassigned_colleges || [];

  const handleUnlockUser = async (userId: string, userName: string) => {
    setUnlockingId(userId);
    try {
      const res = await apiFetch(`/users/${userId}/unlock-profile`, { method: 'PATCH' });
      if (res.success) {
        toast(`Account & profile for ${userName} unlocked successfully!`, 'success');
        if (onRefresh) onRefresh();
      } else {
        toast(res.error?.message || 'Failed to unlock user account.', 'error');
      }
    } catch {
      toast('Network error unlocking user account.', 'error');
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 space-y-5 shadow-3">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <UserCheck size={18} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-fg">Account Governance & Problem Resolution Center</h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Instant 1-click account unlocks, 3-strike lockout releases, password reset assistance, and college staffing
            </p>
          </div>
        </div>

        <Link
          href="/settings?tab=users"
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          Full User Management & RBAC <ExternalLink size={12} />
        </Link>
      </div>

      {/* ── 1. Immediate Locked Accounts Action Strip ── */}
      {lockedAccounts.length > 0 ? (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 space-y-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-danger animate-pulse" />
              <h4 className="text-xs font-bold text-fg">
                {lockedAccounts.length} Staff {lockedAccounts.length === 1 ? 'Account' : 'Accounts'} Currently Locked Out
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-danger uppercase bg-danger/20 px-2 py-0.5 rounded">
              High Priority Resolution
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {lockedAccounts.map((account) => (
              <div
                key={account.user_id}
                className="p-3 bg-surface rounded-xl border border-danger/20 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-xs text-fg block truncate">{account.name}</span>
                  <span className="text-[10px] text-fg-subtle block font-mono truncate">{account.email}</span>
                  <span className="text-[9px] font-semibold text-danger mt-0.5 inline-block">
                    Reason: {account.reason}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleUnlockUser(account.user_id, account.name)}
                  disabled={unlockingId === account.user_id}
                  className="px-3 py-1.5 bg-danger hover:bg-danger/90 text-white rounded-lg text-micro font-bold shadow-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Unlock size={12} />
                  {unlockingId === account.user_id ? 'Unlocking...' : 'Unlock Account'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={15} /> All staff accounts are active — zero lockouts detected.
          </div>
          <span className="text-[10px] text-fg-subtle font-mono">3-Strike & Reset Policy Enforced</span>
        </div>
      )}

      {/* ── 2. Unassigned Partner Colleges Action Strip ── */}
      {unassignedColleges.length > 0 && (
        <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Building2 size={16} />
            </span>
            <div>
              <h4 className="text-xs font-bold text-fg">
                {unassignedColleges.length} Partner {unassignedColleges.length === 1 ? 'College Has' : 'Colleges Have'} No Assigned Coordinator
              </h4>
              <p className="text-micro text-fg-subtle mt-0.5">
                {unassignedColleges.map((c) => `[${c.college_code}] ${c.college_name}`).join(', ')}
              </p>
            </div>
          </div>

          <Link
            href="/settings?tab=users"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-micro font-bold shadow-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            Assign Staff in User Management <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── 3. Staff Accounts & College Workload Balance Table ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
              Placement Coordinators & Live Activity Roster
            </span>
            <p className="text-micro text-fg-subtle">
              Real-time telemetry showing active college deployment, 1-hour away status, and workload allocation
            </p>
          </div>

          {/* Presence Filter Badges */}
          <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg border border-border text-micro">
            <button
              type="button"
              onClick={() => setPresenceFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                presenceFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              All ({coordinators.length})
            </button>
            <button
              type="button"
              onClick={() => setPresenceFilter('online')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                presenceFilter === 'online'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Online ({coordinators.filter((c) => c.online_status === 'online').length})
            </button>
            <button
              type="button"
              onClick={() => setPresenceFilter('away')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                presenceFilter === 'away'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Away ({coordinators.filter((c) => c.online_status === 'away').length})
            </button>
            <button
              type="button"
              onClick={() => setPresenceFilter('offline')}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                presenceFilter === 'offline'
                  ? 'bg-zinc-600 text-white shadow-xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              Offline ({coordinators.filter((c) => !c.online_status || c.online_status === 'offline').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-surface-sunken text-fg-subtle font-bold border-b border-border text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Staff Profile</th>
                <th className="py-2.5 px-3">Currently Active In (College)</th>
                <th className="py-2.5 px-3 text-center">College Allocation</th>
                <th className="py-2.5 px-3 text-center">Calls Lifetime</th>
                <th className="py-2.5 px-3 text-center">Workload Health</th>
                <th className="py-2.5 px-3.5 text-center">Account Status</th>
                <th className="py-2.5 px-3.5 text-center">Quick Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {coordinators
                .filter((c) => {
                  if (presenceFilter === 'online') return c.online_status === 'online';
                  if (presenceFilter === 'away') return c.online_status === 'away';
                  if (presenceFilter === 'offline') return !c.online_status || c.online_status === 'offline';
                  return true;
                })
                .map((c) => {
                  const isOnline = c.online_status === 'online';
                  const isAway = c.online_status === 'away';

                  return (
                    <tr key={c.coordinator_id} className="hover:bg-surface-sunken/40 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            {c.profile_photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.profile_photo_url}
                                alt={c.name}
                                className="h-8 w-8 rounded-full object-cover ring-1 ring-border shadow-xs"
                              />
                            ) : (
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold ring-1 ring-primary/20">
                                {initialsFor(c.name)}
                              </span>
                            )}
                            {/* Live Presence Dot Badge */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                                isOnline
                                  ? 'bg-emerald-500'
                                  : isAway
                                  ? 'bg-amber-400'
                                  : 'bg-zinc-400 dark:bg-zinc-600'
                              }`}
                              title={c.online_status_label || (isOnline ? 'Online' : isAway ? 'Away' : 'Offline')}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-fg flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {isOnline && (
                                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-fg-subtle block font-mono">{c.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Currently Active In (College) */}
                      <td className="py-2.5 px-3">
                        {isOnline ? (
                          c.active_college ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="font-mono text-xs">
                                [{c.active_college.college_code || c.active_college.college_name}]
                              </span>
                              {c.active_college.location && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                                  {c.active_college.location}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-micro border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Online (Main Portal)
                            </div>
                          )
                        ) : isAway ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-micro border border-amber-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              {c.online_status_label || 'Away'}
                            </div>
                            {c.active_college && (
                              <span className="text-[10px] text-fg-subtle font-mono pl-1">
                                Last: [{c.active_college.college_code || c.active_college.college_name}]
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-fg-subtle text-micro font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                            Offline
                          </span>
                        )}
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
                        {c.calls_logged}
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
                            <ShieldAlert size={10} /> Locked Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        {c.is_locked ? (
                          <button
                            type="button"
                            onClick={() => handleUnlockUser(c.coordinator_id, c.name)}
                            disabled={unlockingId === c.coordinator_id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-bold bg-danger text-white hover:bg-danger/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Unlock size={11} /> {unlockingId === c.coordinator_id ? 'Unlocking...' : 'Unlock'}
                          </button>
                        ) : (
                          <Link
                            href={`/settings?tab=users`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-semibold bg-surface-sunken hover:bg-surface-raised border border-border text-fg-muted hover:text-fg transition-colors"
                          >
                            <KeyRound size={11} /> Manage
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
