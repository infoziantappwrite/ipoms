'use client';

import { useState } from 'react';

interface Props {
  users: any[];
  onOpenAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeactivateUser: (id: string, name: string) => void;
}

export function UserManagementTab({
  users,
  onOpenAddUser,
  onEditUser,
  onDeactivateUser,
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
    TEAM_LEADER: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    COORDINATOR: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    TPO: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="space-y-4">

      {/* Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-56 sm:w-64"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center gap-1.5"
        >
          <span>➕</span> Add New User
        </button>
      </div>

      {/* User Directory Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5">User / Full Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4 text-center">Assigned Role</th>
                <th className="py-3.5 px-4">Assigned Institutions</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    No matching users found in directory
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const primaryRole = u.role_codes?.[0] || 'COORDINATOR';
                  return (
                    <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name & Username */}
                      <td className="py-3 px-5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-blue-400 font-bold border border-slate-700">
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div>{u.full_name}</div>
                            <span className="text-[10px] text-slate-500 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-300">{u.official_email}</div>
                        <div className="text-slate-500 text-[10px]">{u.primary_mobile || '—'}</div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            roleStyles[primaryRole] || roleStyles.COORDINATOR
                          }`}
                        >
                          {primaryRole.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Assigned Colleges */}
                      <td className="py-3 px-4 text-[11px]">
                        {u.assigned_college_ids && u.assigned_college_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.assigned_college_ids.map((c: any, i: number) => (
                              <span
                                key={i}
                                className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700"
                              >
                                {c.college_code || c.college_name || 'College'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[10px]">All Institutions</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            u.account_status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {u.account_status || 'active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditUser(u)}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeactivateUser(u._id, u.full_name)}
                            className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[11px] font-semibold transition-colors"
                            title="Deactivate User"
                          >
                            🚫
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
