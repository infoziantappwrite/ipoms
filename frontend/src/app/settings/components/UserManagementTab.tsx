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
  Users,
  Building2,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export function isTpoUser(u: any): boolean {
  if (!u) return false;
  const roleCodes = (u.role_codes || []).map((r: string) => String(r).toUpperCase());
  if (roleCodes.includes('TPO') || roleCodes.includes('COLLEGE_OFFICER') || roleCodes.includes('PLACEMENT_OFFICER')) return true;
  const role = String(u.role || u.role_id?.role_code || '').toUpperCase();
  if (role === 'TPO' || role === 'COLLEGE_OFFICER' || role === 'PLACEMENT_OFFICER') return true;
  if (u.official_email && u.official_email.toLowerCase().includes('.tpo@ipoms.internal')) return true;
  if (u.username && (u.username.toLowerCase().endsWith('.tpo') || u.username.toLowerCase().includes('tpo'))) return true;
  if (u.full_name && (u.full_name.includes('— Placement Officer') || u.full_name.includes('- Placement Officer') || u.full_name.includes('Placement Officer'))) return true;
  return false;
}

export function cleanCollegeDisplayName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\s*[-—–]\s*Placement\s*Officer\s*$/i, '')
    .replace(/\s*Placement\s*Officer\s*$/i, '')
    .trim();
}

type DirectoryTab = 'coordinators' | 'officers' | 'all';

interface Props {
  users: any[];
  onOpenAddUser: (defaultRole?: string) => void;
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
  const [activeTab, setActiveTab] = useState<DirectoryTab>('coordinators');
  const [search, setSearch] = useState('');

  // Deactivation confirmation modal state
  const [deactivatingUser, setDeactivatingUser] = useState<any | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null);

  const coordinatorCount = users.filter((u) => !isTpoUser(u)).length;
  const officerCount = users.filter((u) => isTpoUser(u)).length;

  const filteredUsers = users.filter((u) => {
    const isTpo = isTpoUser(u);

    // Filter by Directory Tab
    if (activeTab === 'coordinators' && isTpo) return false;
    if (activeTab === 'officers' && !isTpo) return false;

    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.official_email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.assigned_college_ids?.some((c: any) =>
        (c.college_name || c.college_code || '').toLowerCase().includes(search.toLowerCase())
      );

    return matchesSearch;
  });

  const formatRoleLabel = (role: string, isTpo = false) => {
    if (isTpo) return 'Placement Officer (TPO)';
    const r = (role || '').toUpperCase();
    if (r === 'TPO' || r.includes('OFFICER')) return 'Placement Officer (TPO)';
    if (r.includes('ADMIN')) return 'Administrator';
    if (r.includes('LEADER')) return 'Team Leader';
    if (r.includes('COORDINATOR')) return 'Placement Coordinator';
    return role.replace(/_/g, ' ');
  };

  const getRoleBadgeStyle = (role: string, isTpo = false) => {
    if (isTpo) {
      return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shadow-2xs';
    }
    const r = (role || '').toUpperCase();
    if (r === 'TPO' || r.includes('OFFICER')) {
      return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shadow-2xs';
    }
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

  const isOfficersView = activeTab === 'officers';

  return (
    <div className="space-y-4">
      {/* ── Top Bar: Segmented Switch Toggle + Search & Filters ── */}
      <div className="bg-surface/60 backdrop-blur-sm p-2.5 rounded-2xl border border-border shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Segmented Switch Toggle */}
        <div className="inline-flex p-1 bg-background/90 dark:bg-zinc-950/80 rounded-xl border border-border/80 shadow-2xs overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('coordinators')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'coordinators'
                ? 'bg-primary text-primary-foreground shadow-sm scale-[1.01]'
                : 'text-fg-muted hover:text-fg hover:bg-surface/50'
            }`}
          >
            <Users size={14} strokeWidth={2.2} />
            <span>Infoziant Staff</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none font-semibold ${
                activeTab === 'coordinators'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-sunken text-fg-subtle border border-border'
              }`}
            >
              {coordinatorCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('officers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'officers'
                ? 'bg-primary text-primary-foreground shadow-sm scale-[1.01]'
                : 'text-fg-muted hover:text-fg hover:bg-surface/50'
            }`}
          >
            <Building2 size={14} strokeWidth={2.2} />
            <span>Placement TPO</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none font-semibold ${
                activeTab === 'officers'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-sunken text-fg-subtle border border-border'
              }`}
            >
              {officerCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm scale-[1.01]'
                : 'text-fg-muted hover:text-fg hover:bg-surface/50'
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-sunken text-fg-subtle border border-border'
              }`}
            >
              {users.length}
            </span>
          </button>
        </div>

        {/* Search & Action Button */}
        <div className="flex flex-wrap items-center gap-2.5 justify-end">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
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
              placeholder={
                activeTab === 'officers'
                  ? 'Search college, officer or username…'
                  : activeTab === 'coordinators'
                  ? 'Search staff or email…'
                  : 'Search user directory…'
              }
              className="bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-fg w-full sm:w-64 lg:w-72 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Add Account Button */}
          <button
            onClick={() =>
              onOpenAddUser(activeTab === 'officers' ? 'TPO' : 'PLACEMENT_COORDINATOR')
            }
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            <span>
              {activeTab === 'officers'
                ? 'Add Placement TPO'
                : activeTab === 'coordinators'
                ? 'Add Infoziant Staff'
                : 'Add New Account'}
            </span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-background/90 text-fg-subtle font-semibold border-b border-border text-micro uppercase tracking-wider">
                <th className="py-3.5 px-5 min-w-[240px]">
                  {isOfficersView ? 'College Name' : 'User / Full Name'}
                </th>
                <th className="py-3.5 px-4 min-w-[200px]">
                  {isOfficersView ? 'Officer Contact & Login' : 'Contact Info'}
                </th>
                {!isOfficersView && (
                  <>
                    <th className="py-3.5 px-4 text-center min-w-[160px]">Assigned Role</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Assigned Institutions</th>
                  </>
                )}
                <th className="py-3.5 px-4 text-center min-w-[130px]">Status</th>
                <th className="py-3.5 px-5 text-center min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={isOfficersView ? 4 : 6}
                    className="py-12 text-center text-fg-subtle italic"
                  >
                    {activeTab === 'officers'
                      ? 'No matching Placement TPOs found'
                      : activeTab === 'coordinators'
                      ? 'No matching Infoziant staff found'
                      : 'No matching users found in directory'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isTpo = isTpoUser(u);
                  const primaryRole = isTpo ? 'TPO' : u.role_codes?.[0] || 'COORDINATOR';
                  const isDeactivated =
                    u.account_status === 'deactivated' ||
                    u.account_status === 'inactive' ||
                    u.is_deleted;

                  // Clean display name for colleges
                  const displayName = isTpo
                    ? cleanCollegeDisplayName(u.full_name)
                    : u.full_name;

                  // Calculate days left in the 1-month (30-day) recovery window
                  let daysRemaining = 30;
                  if (u.deleted_at) {
                    const ms = Date.now() - new Date(u.deleted_at).getTime();
                    const daysPast = ms / (1000 * 60 * 60 * 24);
                    daysRemaining = Math.max(0, Math.ceil(30 - daysPast));
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
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0 ${
                              isDeactivated
                                ? 'bg-surface-sunken text-fg-subtle border-border'
                                : isTpo
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                                : 'bg-surface text-primary border-border-strong'
                            }`}
                          >
                            {isTpo ? (
                              <Building2 size={15} />
                            ) : (
                              u.full_name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div className="leading-tight font-semibold text-fg">
                              {displayName}
                            </div>
                            <span className="text-micro text-fg-subtle font-mono">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 font-mono text-micro">
                        <div
                          className="text-fg-muted truncate max-w-[240px]"
                          title={u.official_email}
                        >
                          {u.official_email}
                        </div>
                        <div className="text-fg-subtle text-micro">
                          {u.primary_mobile || '—'}
                        </div>
                      </td>

                      {/* Role & Assigned Institutions (Only shown for Coordinators/All) */}
                      {!isOfficersView && (
                        <>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-md border tracking-wide select-none ${getRoleBadgeStyle(
                                primaryRole,
                                isTpo
                              )}`}
                            >
                              {formatRoleLabel(primaryRole, isTpo)}
                            </span>
                          </td>

                          <td
                            className="py-3.5 px-4 text-micro"
                            aria-label={`Assigned colleges for ${u.full_name}: ${
                              u.assigned_college_ids
                                ?.map((c: any) => c.college_name || c.college_code)
                                .join(', ') || 'All Institutions'
                            }`}
                          >
                            {u.assigned_college_ids && u.assigned_college_ids.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                <span className="sr-only">
                                  Assigned institutions for {u.full_name}:{' '}
                                </span>
                                {u.assigned_college_ids.map((c: any, i: number) => (
                                  <span
                                    key={i}
                                    className={`px-1.5 py-0.5 rounded text-micro font-mono border shrink-0 ${
                                      isTpo
                                        ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 font-semibold'
                                        : 'bg-surface text-primary border-border-strong'
                                    }`}
                                    title={c.college_name || c.college_code}
                                    aria-label={`${c.college_code}: ${
                                      c.college_name || c.college_code
                                    }`}
                                  >
                                    {c.college_code || c.college_name || 'College'}
                                  </span>
                                ))}
                              </div>
                            ) : isTpo ? (
                              <span className="text-fg-subtle italic text-micro">
                                No College Assigned
                              </span>
                            ) : (
                              <span className="text-fg-subtle italic text-micro">
                                All Institutions
                              </span>
                            )}
                          </td>
                        </>
                      )}

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
                                className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-micro font-bold transition-all hover:scale-105 active:scale-[0.992] cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                title="Restore account to Active status (Available within 1 week of deactivation)"
                              >
                                <RotateCcw
                                  size={11}
                                  className={`inline shrink-0 ${
                                    restoringUserId === u._id ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>
                                  {restoringUserId === u._id ? 'Restoring…' : 'Restore'}
                                </span>
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

                              {(u.is_profile_locked ||
                                u.is_password_locked ||
                                u.account_status === 'blocked') &&
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
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Deactivate Account?
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    1-week restoration window applies
                  </p>
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
                <span className="text-zinc-500 dark:text-zinc-400 text-micro">
                  {isTpoUser(deactivatingUser) ? 'College Target:' : 'Account Target:'}
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {isTpoUser(deactivatingUser)
                    ? cleanCollegeDisplayName(deactivatingUser.full_name)
                    : deactivatingUser.full_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 text-micro">Username / Email:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 text-micro">
                  {deactivatingUser.official_email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 text-micro">Role / Account:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 text-micro">
                  {formatRoleLabel(
                    deactivatingUser.role_codes?.[0] || 'COORDINATOR',
                    isTpoUser(deactivatingUser)
                  )}
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
                <li>This account will immediately lose access and be unable to log in.</li>
                <li>Historic logs, student data, and company assignments will be preserved.</li>
                <li>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    1-Month Recovery Window:
                  </strong>{' '}
                  The Administrator can restore this account anytime within <strong>30 days (1 month)</strong>.
                </li>
                <li>After 30 days, the account will be permanently archived.</li>
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
