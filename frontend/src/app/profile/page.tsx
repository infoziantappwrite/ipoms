'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Shield } from 'lucide-react';
import { UserProfileTab } from '@/app/settings/components/UserProfileTab';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf, updateSessionUser } from '@/lib/session';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const sessionUser = readSessionUser();
      if (!sessionUser?._id) {
        setLoading(false);
        return;
      }

      const res = await apiFetch(`/profile/${sessionUser._id}`);
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = async (updateFields: any): Promise<{ success: boolean; message?: string; error?: string; data?: any }> => {
    const sessionUser = readSessionUser();
    const targetId = currentUser?._id || (currentUser as any)?.id || sessionUser?._id || sessionUser?.id;
    if (!targetId) return { success: false, error: 'No active profile found.' };
    try {
      const res = await apiFetch(`/profile/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateFields),
      });
      if (res.success) {
        setCurrentUser(res.data);
        updateSessionUser(res.data);
        return { success: true, message: res.message || 'Profile updated successfully!', data: res.data };
      } else {
        return { success: false, error: res.error?.message || 'Failed to update profile.' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating profile.' };
    }
  };

  const isAdmin = currentUser?.role_codes?.some((r: string) => r.toUpperCase().includes('ADMIN'));

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">
      {/* ── Top Header Bar (Frozen / Sticky at top) ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            {isAdmin ? (
              <Shield size={18} strokeWidth={2} className="text-primary" aria-hidden />
            ) : (
              <User size={18} strokeWidth={2} className="text-primary" aria-hidden />
            )}
            <span>{isAdmin ? 'Administrator Account & Security' : 'My Profile & Personal Details'}</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            {isAdmin
              ? 'Administrator governance credentials, Outlook email verification, and password management'
              : 'Manage your profile picture, personal contact details, residential address, and security'}
          </p>
        </div>

        {/* User Presence & Sign Out */}
        <div className="shrink-0 flex items-center gap-3">
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        {loading && !currentUser ? (
          <div className="p-12 text-center text-fg-subtle italic text-xs">
            Loading profile…
          </div>
        ) : (
          <UserProfileTab
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </div>
    </div>
  );
}
