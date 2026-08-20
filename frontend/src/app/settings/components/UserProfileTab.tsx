'use client';

import { useState } from 'react';
import { Lock, Pencil } from 'lucide-react';

interface Props {
  currentUser: any;
  onUpdateProfile: (data: any) => void;
}

export function UserProfileTab({ currentUser, onUpdateProfile }: Props) {
  const [personalEmail, setPersonalEmail] = useState(currentUser?.personal_email || '');
  const [primaryMobile, setPrimaryMobile] = useState(currentUser?.primary_mobile || '');
  const [secondaryMobile, setSecondaryMobile] = useState(currentUser?.secondary_mobile || '');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      personal_email: personalEmail.trim(),
      primary_mobile: primaryMobile.trim(),
      secondary_mobile: secondaryMobile.trim(),
    });
    alert('Personal profile contact details updated successfully!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New Password and Confirm Password do not match.');
      return;
    }
    onUpdateProfile({ password: newPassword });
    setPasswordMsg('Password changed successfully! ✓');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6">

      {/* ── Personal Profile Card ────────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-5 shadow-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{currentUser?.full_name || 'Placement Coordinator'}</span>
              <span className="text-micro bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30 uppercase font-mono">
                {currentUser?.role_codes?.[0] || 'COORDINATOR'}
              </span>
            </h2>
            <p className="text-xs text-fg-subtle font-mono mt-0.5">
              {currentUser?.official_email || 'user@infoziant.com'}
            </p>
          </div>
        </div>

        {/* Read-Only Corporate Attributes (Spec Section 6) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-background/60 p-4 rounded-xl border border-border/80">
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Username</span>
            <span className="text-fg font-mono font-semibold">{currentUser?.username || 'user'}</span>
          </div>
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Employee ID</span>
            <span className="text-fg font-mono font-semibold">{currentUser?.employee_id || 'INF-2026-01'}</span>
          </div>
          <div>
            <span className="text-micro text-fg-subtle uppercase font-semibold block">Account Status</span>
            <span className="text-success font-semibold capitalize">● {currentUser?.account_status || 'Active'}</span>
          </div>
        </div>

        {/* Editable Contact Information Form (Spec Section 6) */}
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <h3 className="text-xs font-bold text-fg flex items-center gap-1.5 pt-2">
            <Pencil size={14} strokeWidth={2} aria-hidden /> Editable Personal Contact Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Personal Email</label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="personal@gmail.com"
                className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Primary Mobile Number</label>
              <input
                type="text"
                value={primaryMobile}
                onChange={(e) => setPrimaryMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Alternate Contact Number</label>
              <input
                type="text"
                value={secondaryMobile}
                onChange={(e) => setSecondaryMobile(e.target.value)}
                placeholder="Optional secondary phone"
                className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-2 transition-colors text-xs"
            >
              Update Profile Contacts
            </button>
          </div>
        </form>
      </div>

      {/* ── Security & Change Password Card (Spec Section 7) ─────────────── */}
      <div className="glass-panel rounded-2xl border border-border p-6 space-y-4 shadow-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Lock size={14} strokeWidth={2} aria-hidden /> Change Account Password
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Password must be minimum 8 characters with at least one uppercase letter, number, and symbol.
          </p>
        </div>

        {passwordMsg && (
          <div className="p-3 bg-success/40 border border-success/40 rounded-xl text-success text-xs font-semibold">
            {passwordMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-lg">
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg "
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg "
                required
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-fg "
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg border border-border-strong rounded-xl font-bold transition-colors text-xs"
          >
            Update Password 🔑
          </button>
        </form>
      </div>

    </div>
  );
}
