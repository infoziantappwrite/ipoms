'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { SettingsNav, SettingsSection } from './components/SettingsNav';
import { UserProfileTab } from './components/UserProfileTab';
import { UserManagementTab } from './components/UserManagementTab';
import { UserModal } from './components/UserModal';
import { RoleMatrixTab } from './components/RoleMatrixTab';
import { SystemConfigTab } from './components/SystemConfigTab';
import { SystemInfoTab } from './components/SystemInfoTab';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf, updateSessionUser } from '@/lib/session';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [users, setUsers] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [systemSummary, setSystemSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const loadSettingsData = useCallback(async () => {
    setLoading(true);
    try {
      const sessionUser = readSessionUser();
      if (!sessionUser?._id) {
        setLoading(false);
        return;
      }

      // `GET /users` is Team-Leader/Admin only (routePolicy.ts) — a coordinator
      // calling it gets a 403, so only fetch it for roles that can use it.
      // Own profile always comes from `/profile/:id`, which every role may
      // read for itself; that used to be looked up by scanning the full user
      // list instead, which meant a bare, unauthenticated fetch() to an
      // endpoint coordinators can't even call silently left currentUser stuck
      // null forever, and every save on this page failed with
      // "No active profile found."
      const isSupervisor = roleOf(sessionUser) === 'admin' || roleOf(sessionUser) === 'team_leader';

      const [profileRes, settingsRes, usersRes] = await Promise.all([
        apiFetch(`/profile/${sessionUser._id}`),
        apiFetch('/settings'),
        isSupervisor ? apiFetch('/users') : Promise.resolve(null),
      ]);

      if (profileRes.success) {
        setCurrentUser(profileRes.data);
      }

      if (settingsRes.success) {
        setSettingsData((settingsRes.data as any).settings);
        setSystemSummary((settingsRes.data as any).system_summary);
      }

      if (usersRes?.success) {
        setUsers((usersRes.data as any).users);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  // Update current user profile with monthly photo check
  const handleUpdateProfile = async (updateFields: any): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!currentUser?._id) return { success: false, error: 'No active profile found.' };
    try {
      const res = await apiFetch(`/profile/${currentUser._id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateFields),
      });
      if (res.success) {
        setCurrentUser(res.data);
        // Sync with localStorage & live app events
        updateSessionUser(res.data);
        return { success: true, message: res.message || 'Profile updated successfully!' };
      } else {
        return { success: false, error: res.error?.message || 'Failed to update profile.' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating profile.' };
    }
  };

  // Update system settings
  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const res = await apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify(newSettings),
      });
      if (res.success) {
        setSettingsData(res.data);
      }
    } catch (err) {
      console.error('Update settings error:', err);
    }
  };

  // Deactivate user
  const handleDeactivateUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate and archive user account "${name}"?`)) return;
    try {
      const res = await apiFetch(`/users/${id}`, { method: 'DELETE' });
      if (res.success) {
        alert(res.message);
        loadSettingsData();
      }
    } catch (err) {
      console.error('Deactivate user error:', err);
    }
  };

  // Administrator unlocks profile for coordinator
  const handleUnlockUserProfile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to unlock profile editing for "${name}"? They will be able to modify their contact details.`)) return;
    try {
      const res = await apiFetch(`/users/${id}/unlock-profile`, { method: 'PATCH' });
      if (res.success) {
        alert(res.message);
        loadSettingsData();
      } else {
        alert(res.error?.message || 'Failed to unlock profile.');
      }
    } catch (err) {
      console.error('Unlock profile error:', err);
    }
  };

  const isAdmin = currentUser?.role_codes?.some((r: string) => r.toUpperCase().includes('ADMIN'));

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Top Header Bar (Frozen / Sticky at top, unaffected by scrolling) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <Settings size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <span>{isAdmin ? 'Settings & System Administration' : 'Profile'}</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            {isAdmin
              ? 'Personal Profile, User Accounts, Role Permissions (RBAC) & Global Season Configuration'
              : 'Manage your profile picture, personal contact details, residential address, and security'}
          </p>
        </div>

        {/* User Presence Badge & Sign Out Button (Top-Right Corner) */}
        <div className="shrink-0 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono text-fg-muted shadow-sm select-none">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Presence: Active</span>
          </span>
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Main Layout: Profile or Admin Settings Panel ───────────────────── */}
      <div className="p-6 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-6 flex-1">

        {/* Admin-only Sidebar Nav */}
        {isAdmin && (
          <SettingsNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            userCount={users.length}
            userRole={currentUser?.role_codes?.[0] || 'ADMINISTRATOR'}
          />
        )}

        {/* Content Pane */}
        <div className="flex-1 w-full">
          {loading && !currentUser ? (
            <div className="p-12 text-center text-fg-subtle italic text-xs">
              Loading profile details…
            </div>
          ) : (
            <>
              {activeSection === 'profile' && (
                <UserProfileTab
                  currentUser={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}

              {isAdmin && activeSection === 'users' && (
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
                  onUnlockProfile={handleUnlockUserProfile}
                />
              )}

              {isAdmin && activeSection === 'roles' && <RoleMatrixTab />}

              {isAdmin && (activeSection === 'config' || activeSection === 'org') && (
                <SystemConfigTab
                  settingsData={settingsData}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}

              {isAdmin && activeSection === 'system_info' && (
                <SystemInfoTab summaryData={systemSummary} />
              )}
            </>
          )}
        </div>

      </div>

      {/* User Create / Edit Modal */}
      {isAdmin && showUserModal && (
        <UserModal
          initialData={editingUser}
          onClose={() => setShowUserModal(false)}
          onSuccess={loadSettingsData}
        />
      )}
    </div>
  );
}
