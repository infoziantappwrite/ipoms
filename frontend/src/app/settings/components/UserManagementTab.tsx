'use client';

import { useState } from 'react';
import { Pencil, Plus, Search, Lock, AlertTriangle, Unlock, Ban } from 'lucide-react';

interface Props {
  users: any[];
  onOpenAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeactivateUser: (id: string, name: string) => void;
  onUnlockProfile?: (id: string, name: string) => void;
}

export function UserManagementTab({
  users,
  onOpenAddUser,
  onEditUser,
  onDeactivateUser,
  onUnlockProfile,
}: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.official_email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' || (u.role_codes && u.role_codes.includes(roleFilter));

    return matchesSearch && matchesRole;
  });

  const roleStyles: any = {
    ADMINISTRATOR: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    TEAM_LEADER: 'bg-warning/20 text-warning border-warning/30',
    COORDINATOR: 'bg-primary/20 text-primary border-primary/30',
    TPO: 'bg-success/20 text-success border-success/30',
  };

  return (
    <div className="space-y-4">

      {/* Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={14} strokeWidth={2} aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-fg w-56 sm:w-64"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-fg cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="COORDINATOR">Placement Coordinators</option>
            <option value="TEAM_LEADER">Team Leaders</option>
            <option value="ADMINISTRATOR">Administrators</option>
            <option value="TPO">TPOs</option>
          </select>
        </div>

        <button
          onClick={onOpenAddUser}
          className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-1.5"
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
                <th className="py-3.5 px-5">User / Full Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4 text-center">Assigned Role</th>
                <th className="py-3.5 px-4">Assigned Institutions</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
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
                  return (
                    <tr key={u._id} className="hover:bg-surface/30 transition-colors">
                      {/* Name & Username */}
                      <td className="py-3 px-5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-xs text-primary font-bold border border-border-strong">
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div>{u.full_name}</div>
                            <span className="text-micro text-fg-subtle font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 font-mono text-micro">
                        <div className="text-fg-muted">{u.official_email}</div>
                        <div className="text-fg-subtle text-micro">{u.primary_mobile || '—'}</div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-micro font-bold px-2 py-0.5 rounded border uppercase ${
                            roleStyles[primaryRole] || roleStyles.COORDINATOR
                          }`}
                        >
                          {primaryRole.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Assigned Colleges */}
                      <td className="py-3 px-4 text-micro">
                        {u.assigned_college_ids && u.assigned_college_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.assigned_college_ids.map((c: any, i: number) => (
                              <span
                                key={i}
                                className="bg-surface text-primary px-1.5 py-0.5 rounded text-micro font-mono border border-border-strong"
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
                      <td className="py-3 px-4 text-center space-y-1">
                        <div>
                          <span
                            className={`text-micro font-semibold px-2 py-0.5 rounded-full capitalize ${
                              u.account_status === 'active'
                                ? 'bg-success/20 text-success border border-success/30'
                                : 'bg-destructive/20 text-destructive border border-destructive/30'
                            }`}
                          >
                            {u.account_status || 'active'}
                          </span>
                        </div>
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
                      <td className="py-3 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onEditUser(u)}
                            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2.5 py-1 rounded text-micro font-semibold transition-colors"
                          >
                            <Pencil size={12} className="inline shrink-0" /> Edit
                          </button>
                          {(u.is_profile_locked || u.is_password_locked || u.account_status === 'blocked') && onUnlockProfile && (
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
                            onClick={() => onDeactivateUser(u._id, u.full_name)}
                            className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 px-2 py-1 rounded text-micro font-semibold transition-colors"
                            title="Deactivate User"
                          >
                            <Ban size={12} aria-hidden />
                          </button>
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

    </div>
  );
}
