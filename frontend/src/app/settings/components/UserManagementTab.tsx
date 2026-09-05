'use client';

import { useState } from 'react';
import {
  Pencil,
  Plus,
  Search,
  Lock,
  AlertTriangle,
  Unlock,
  Ban,
  Shield,
  RotateCcw,
  Clock,
  CheckCircle2,
  X,
  UserX,
} from 'lucide-react';
import { SmoothSelect } from '@/components/ui/SmoothSelect';

interface Props {
  users: any[];
  onOpenAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeactivateUser: (id: string, name: string) => Promise<void> | void;
  onRestoreUser?: (id: string, name: string) => Promise<void> | void;
  onUnlockProfile?: (id: string, name: string) => void;
}

export function UserManagementTab({
  users,
  onOpenAddUser,
  onEditUser,
  onDeactivateUser,
  onRestoreUser,
  onUnlockProfile,
}: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Deactivation confirmation modal state
  const [deactivatingUser, setDeactivatingUser] = useState<any | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.official_email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'COORDINATOR' &&
        (u.role_id?.role_code === 'COORDINATOR' ||
          u.role_id?.role_code === 'PLACEMENT_COORDINATOR' ||
          u.role === 'COORDINATOR' ||
          u.role === 'PLACEMENT_COORDINATOR')) ||
      (roleFilter === 'TEAM_LEADER' &&
        (u.role_id?.role_code === 'TEAM_LEADER' || u.role === 'TEAM_LEADER')) ||
      (roleFilter === 'ADMINISTRATOR' &&
        (u.role_id?.role_code === 'ADMINISTRATOR' || u.role === 'ADMINISTRATOR'));

    return matchesSearch && matchesRole;
  });

  const formatRoleLabel = (role: string) => {
    const r = (role || '').toUpperCase();
    if (r.includes('ADMIN')) return 'Administrator';
    if (r.includes('LEADER')) return 'Team Leader';
    if (r.includes('COORDINATOR')) return 'Placement Coordinator';
    return role.replace(/_/g, ' ');
  };

  const getRoleBadgeStyle = (role: string) => {
    const r = (role || '').toUpperCase();
    if (r.includes('ADMIN')) {
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-2xs';
    }
    if (r.includes('LEADER')) {
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-2xs';
    }
    return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 shadow-2xs';
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingUser) return;
    setIsSubmittingDeactivate(true);
    try {
      await onDeactivateUser(deactivatingUser._id, deactivatingUser.full_name);
      setDeactivatingUser(null);
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  const handleRestore = async (u: any) => {
    if (!onRestoreUser) return;
    setRestoringUserId(u._id);
    try {
      await onRestoreUser(u._id, u.full_name);
    } finally {
      setRestoringUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              strokeWidth={2}
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-fg w-56 sm:w-64"
            />
          </div>

          {/* Role Filter */}
          <div className="w-52">
            <SmoothSelect
              value={roleFilter}
              onChange={setRoleFilter}
              icon={Shield}
              title="System Role Filter"
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'COORDINATOR', label: 'Placement Coordinators' },
                { value: 'TEAM_LEADER', label: 'Team Leaders' },
                { value: 'ADMINISTRATOR', label: 'Administrators' },
              ]}
            />
          </div>
        </div>

        <button
          onClick={onOpenAddUser}
          className="px-4 py-2 bg-primary hover:bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} strokeWidth={2} aria-hidden /> Add New User
        </button>
      </div>

      {/* User Directory Table */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-background/90 text-fg-subtle font-semibold border-b border-border text-micro uppercase tracking-wider">
                <th className="py-3.5 px-5 min-w-[200px]">User / Full Name</th>
                <th className="py-3.5 px-4 min-w-[180px]">Contact Info</th>
                <th className="py-3.5 px-4 text-center min-w-[180px]">Assigned Role</th>
                <th className="py-3.5 px-4 min-w-[240px]">Assigned Institutions</th>
                <th className="py-3.5 px-4 text-center min-w-[130px]">Status</th>
                <th className="py-3.5 px-5 text-center min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-fg-subtle italic">
                    No matching users found in directory
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const primaryRole = u.role_codes?.[0] || 'COORDINATOR';
                  const isDeactivated = u.account_status === 'deactivated' || u.is_deleted;

                  // Calculate days left in the 1-week recovery window
                  let daysRemaining = 7;
                  if (u.deleted_at) {
                    const ms = Date.now() - new Date(u.deleted_at).getTime();
                    const daysPast = ms / (1000 * 60 * 60 * 24);
                    daysRemaining = Math.max(0, Math.ceil(7 - daysPast));
                  }

                  return (
                    <tr
                      key={u._id}
                      className={`transition-colors ${
                        isDeactivated
                          ? 'bg-surface-sunken/40 opacity-80 hover:opacity-100'
                          : 'hover:bg-surface/30'
                      }`}
                    >
                      {/* Name & Username */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-fg flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border ${
                              isDeactivated
                                ? 'bg-surface-sunken text-fg-subtle border-border'
                                : 'bg-surface text-primary border-border-strong'
                            }`}
                          >
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="leading-tight">{u.full_name}</div>
                            <span className="text-micro text-fg-subtle font-mono">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 font-mono text-micro">
                        <div className="text-fg-muted truncate max-w-[200px]" title={u.official_email}>
                          {u.official_email}
                        </div>
                        <div className="text-fg-subtle text-micro">{u.primary_mobile || '—'}</div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-md border tracking-wide select-none ${getRoleBadgeStyle(
                            primaryRole
                          )}`}
                        >
                          {formatRoleLabel(primaryRole)}
                        </span>
                      </td>

                      {/* Assigned Colleges */}
                      <td className="py-3.5 px-4 text-micro">
                        {u.assigned_college_ids && u.assigned_college_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {u.assigned_college_ids.map((c: any, i: number) => (
                              <span
                                key={i}
                                className="bg-surface text-primary px-1.5 py-0.5 rounded text-micro font-mono border border-border-strong shrink-0"
                                title={c.college_name || c.college_code}
                              >
                                {c.college_code || c.college_name || 'College'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-fg-subtle italic text-micro">All Institutions</span>
                        )}
                      </td>

                      {/* Status & Lock Badges */}
                      <td className="py-3.5 px-4 text-center space-y-1">
                        <div>
                          {u.account_status === 'partial_working' ? (
                            <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                              Partial Working
                            </span>
                          ) : u.account_status === 'on_leave' ? (
                            <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              On Leave
                            </span>
                          ) : u.account_status === 'blocked' ? (
                            <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              Blocked
                            </span>
                          ) : isDeactivated ? (
                            <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
                              Deactivated
                            </span>
                          ) : (
                            <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Deactivation Recovery Window Tag */}
                        {isDeactivated && (
                          <div>
                            {daysRemaining > 0 ? (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-flex items-center gap-1">
                                <Clock size={10} /> {daysRemaining}d to restore
                              </span>
                            ) : (
                              <span className="text-[10px] text-fg-subtle">Archived</span>
                            )}
                          </div>
                        )}

                        {u.is_profile_locked && (
                          <div>
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-1">
                              <Lock size={10} aria-hidden /> Profile Locked
                            </span>
                          </div>
                        )}
                        {(u.is_password_locked || u.account_status === 'blocked') && (
                          <div>
                            <span className="text-[10px] font-bold text-danger bg-danger/15 border border-danger/30 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-1">
                              <AlertTriangle size={10} aria-hidden /> Pwd Limit Exceeded
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {isDeactivated ? (
                            /* Restore Action for Deactivated User within 1-week window */
                            onRestoreUser && daysRemaining > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRestore(u)}
                                disabled={restoringUserId === u._id}
                                className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-micro font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                title="Restore account to Active status (Available within 1 week of deactivation)"
                              >
                                <RotateCcw size={11} className={`inline shrink-0 ${restoringUserId === u._id ? 'animate-spin' : ''}`} />
                                <span>{restoringUserId === u._id ? 'Restoring…' : 'Restore'}</span>
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditUser(u)}
                                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2.5 py-1 rounded text-micro font-semibold transition-colors cursor-pointer"
                              >
                                <Pencil size={12} className="inline shrink-0" /> Edit
                              </button>

                              {(u.is_profile_locked || u.is_password_locked || u.account_status === 'blocked') &&
                                onUnlockProfile && (
                                  <button
                                    type="button"
                                    onClick={() => onUnlockProfile(u._id, u.full_name)}
                                    className="bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 px-2.5 py-1 rounded text-micro font-bold transition-colors cursor-pointer"
                                    title="Unlock profile & reset password limits for this user"
                                  >
                                    <Unlock size={12} className="inline shrink-0" aria-hidden /> Unlock
                                  </button>
                                )}

                              <button
                                type="button"
                                onClick={() => setDeactivatingUser(u)}
                                className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 px-2 py-1 rounded text-micro font-semibold transition-colors cursor-pointer"
                                title="Deactivate User Account"
                              >
                                <Ban size={12} aria-hidden />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Deactivation Confirmation Modal ── */}
      {deactivatingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 grid place-items-center">
                  <UserX size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Deactivate User Account?</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">1-week restoration window applies</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Target Details Card */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 text-micro">Account Target:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{deactivatingUser.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 text-micro">Username / Email:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 text-micro">{deactivatingUser.official_email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 text-micro">Current Role:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 text-micro">
                  {formatRoleLabel(deactivatingUser.role_codes?.[0] || 'COORDINATOR')}
                </span>
              </div>
            </div>

            {/* Policy & Explanation Box */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-xs">
                <AlertTriangle size={13} className="shrink-0" />
                <span>What happens when deactivated:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-micro text-amber-800 dark:text-amber-300">
                <li>This user will immediately lose access and be unable to log in.</li>
                <li>Their assigned colleges and historic logs will be preserved.</li>
                <li>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">1-Week Recovery Window:</strong> The Administrator can restore this account anytime within <strong>7 days</strong>.
                </li>
                <li>After 7 days, the account will be permanently archived.</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                disabled={isSubmittingDeactivate}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isSubmittingDeactivate}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Ban size={13} />
                <span>{isSubmittingDeactivate ? 'Deactivating…' : 'Confirm Deactivation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
