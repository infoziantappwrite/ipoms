'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Shield } from 'lucide-react';
import { UserManagementTab } from '@/app/settings/components/UserManagementTab';
import { UserModal } from '@/app/settings/components/UserModal';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf } from '@/lib/session';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const sessionUser = readSessionUser();
      if (!sessionUser?._id) {
        setLoading(false);
        return;
      }

      const res = await apiFetch('/users');
      if (res.success && res.data) {
        setUsers((res.data as any).users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Deactivate user
  const handleDeactivateUser = async (id: string, name: string) => {
    try {
      const res = await apiFetch(`/users/${id}`, { method: 'DELETE' });
      if (res.success) {
        alert(res.message || `User account "${name}" has been deactivated. You can restore it anytime within 7 days.`);
        loadUsers();
      } else {
        alert(res.error?.message || 'Failed to deactivate user.');
      }
    } catch (err: any) {
      console.error('Deactivate user error:', err);
      alert(err.message || 'Network error deactivating user.');
    }
  };

  // Administrator restores deactivated user (within 7 days)
  const handleRestoreUser = async (id: string, name: string) => {
    try {
      const res = await apiFetch(`/users/${id}/restore`, { method: 'PATCH' });
      if (res.success) {
        alert(res.message || `User account "${name}" has been restored to Active status!`);
        loadUsers();
      } else {
        alert(res.error?.message || 'Failed to restore user.');
      }
    } catch (err: any) {
      console.error('Restore user error:', err);
      alert(err.message || 'Network error restoring user.');
    }
  };

  // Administrator unlocks profile for coordinator
  const handleUnlockUserProfile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to unlock profile editing for "${name}"? They will be able to modify their contact details.`)) return;
    try {
      const res = await apiFetch(`/users/${id}/unlock-profile`, { method: 'PATCH' });
      if (res.success) {
        alert(res.message);
        loadUsers();
      } else {
        alert(res.error?.message || 'Failed to unlock profile.');
      }
    } catch (err) {
      console.error('Unlock profile error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">
      {/* ── Top Header Bar (Frozen / Sticky at top) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <Users size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <span>User Management & Staff Directory</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            Manage staff accounts, placement coordinators, team leaders, account unlocks, and college staffing allocations
          </p>
        </div>

        {/* Action Controls & Sign Out */}
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => {
              setEditingUser(null);
              setShowUserModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add User</span>
          </button>
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        {loading ? (
          <div className="p-12 text-center text-fg-subtle italic text-xs">
            Loading user directory…
          </div>
        ) : (
          <UserManagementTab
            users={users}
            onOpenAddUser={() => {
              setEditingUser(null);
              setShowUserModal(true);
            }}
            onEditUser={(u) => {
              setEditingUser(u);
              setShowUserModal(true);
            }}
            onDeactivateUser={handleDeactivateUser}
            onRestoreUser={handleRestoreUser}
            onUnlockProfile={handleUnlockUserProfile}
          />
        )}
      </div>

      {/* User Create / Edit Modal */}
      {showUserModal && (
        <UserModal
          initialData={editingUser}
          onClose={() => setShowUserModal(false)}
          onSuccess={loadUsers}
        />
      )}
    </div>
  );
}
