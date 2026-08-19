'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsNav, SettingsSection } from './components/SettingsNav';
import { UserProfileTab } from './components/UserProfileTab';
import { UserManagementTab } from './components/UserManagementTab';
import { UserModal } from './components/UserModal';
import { RoleMatrixTab } from './components/RoleMatrixTab';
import { SystemConfigTab } from './components/SystemConfigTab';
import { SystemInfoTab } from './components/SystemInfoTab';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [users, setUsers] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [systemSummary, setSystemSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Active User ID (will come from JWT session)
  const CURRENT_USER_ID = '6a84719afa3bf51271bc1548';
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const loadSettingsData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, settingsRes] = await Promise.all([
        fetch(`${API}/users`),
        fetch(`${API}/settings`),
      ]);

      const uData = await usersRes.json();
      const sData = await settingsRes.json();

      if (uData.success) {
        setUsers(uData.data.users);
        const me = uData.data.users.find((u: any) => u._id === CURRENT_USER_ID) || uData.data.users[0];
        setCurrentUser(me);
      }

      if (sData.success) {
        setSettingsData(sData.data.settings);
        setSystemSummary(sData.data.system_summary);
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

  // Update current user profile
  const handleUpdateProfile = async (updateFields: any) => {
    if (!currentUser?._id) return;
    try {
      const res = await fetch(`${API}/users/${currentUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateFields),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
        loadSettingsData();
      }
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  // Update system settings
  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const res = await fetch(`${API}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsData(data.data);
      }
    } catch (err) {
      console.error('Update settings error:', err);
    }
  };

  // Deactivate user
  const handleDeactivateUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate and archive user account "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadSettingsData();
      }
    } catch (err) {
      console.error('Deactivate user error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">

      {/* ── Top Header Bar ────────────────────────────────────────────────── */}
      <div className="glass-panel border-b border-slate-800 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>⚙️</span> Settings & System Administration
            </h1>
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              Modules 01 & 09 • Governance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personal Profile, User Accounts, Role Permissions (RBAC) & Global Season Configuration
          </p>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Nav + Content Panel ───────────────────────── */}
      <div className="p-6 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-6 flex-1">

        {/* Sidebar Nav */}
        <SettingsNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          userCount={users.length}
        />

        {/* Content Pane */}
        <div className="flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-500 italic text-xs">
              Loading settings…
            </div>
          ) : (
            <>
              {activeSection === 'profile' && (
                <UserProfileTab
                  currentUser={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}

              {activeSection === 'users' && (
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
                />
              )}

              {activeSection === 'roles' && <RoleMatrixTab />}

              {(activeSection === 'config' || activeSection === 'org') && (
                <SystemConfigTab
                  settingsData={settingsData}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}

              {activeSection === 'system_info' && (
                <SystemInfoTab summaryData={systemSummary} />
              )}
            </>
          )}
        </div>

      </div>

      {/* User Create / Edit Modal */}
      {showUserModal && (
        <UserModal
          initialData={editingUser}
          onClose={() => setShowUserModal(false)}
          onSuccess={loadSettingsData}
        />
      )}

    </div>
  );
}
