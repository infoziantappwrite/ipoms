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

  const roleStyles: any = {
    ADMINISTRATOR: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    TEAM_LEADER: 'bg-warning/20 text-warning border-warning/30',
    COORDINATOR: 'bg-primary/20 text-primary border-primary/30',
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
          className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                <th className="py-3.5 px-4 text-center min-w-[140px]">Assigned Role</th>
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
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-micro font-bold px-2 py-0.5 rounded border uppercase ${
                            roleStyles[primaryRole] || roleStyles.COORDINATOR
                          }`}
                        >
                          {primaryRole.replace('_', ' ')}
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

      {/* ── Rich Deactivation Confirmation Modal ── */}
      {deactivatingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl border border-destructive/30 p-6 shadow-5 space-y-5 bg-surface-raised animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive grid place-items-center">
                  <UserX size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-fg">Deactivate User Account?</h3>
                  <p className="text-micro text-fg-subtle">1-week restoration window applies</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                className="text-fg-subtle hover:text-fg p-1 rounded-lg hover:bg-surface-sunken"
              >
                <X size={16} />
              </button>
            </div>

            {/* Target Details Card */}
            <div className="p-3.5 bg-surface-sunken rounded-xl border border-border space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-fg-subtle text-micro">Account Target:</span>
                <span className="font-bold text-fg">{deactivatingUser.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-subtle text-micro">Username / Email:</span>
                <span className="font-mono text-fg text-micro">{deactivatingUser.official_email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-subtle text-micro">Current Role:</span>
                <span className="font-semibold text-primary text-micro uppercase">
                  {(deactivatingUser.role_codes?.[0] || 'COORDINATOR').replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Policy & Explanation Box */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs space-y-2 text-amber-800 dark:text-amber-300">
              <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={14} className="shrink-0" />
                <span>What happens when deactivated:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-micro text-fg-muted">
                <li>This user will immediately lose access and be unable to log in.</li>
                <li>Their assigned colleges and historic logs will be preserved.</li>
                <li>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">1-Week Recovery Window:</strong> The Administrator can restore this account anytime within <strong>7 days</strong>.
                </li>
                <li>After 7 days, the account will be permanently archived.</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                disabled={isSubmittingDeactivate}
                className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-fg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isSubmittingDeactivate}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive text-white text-xs font-bold shadow-2 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
