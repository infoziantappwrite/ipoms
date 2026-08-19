'use client';

import { useState } from 'react';

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
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold text-blue-400">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{currentUser?.full_name || 'Placement Coordinator'}</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 uppercase font-mono">
                {currentUser?.role_codes?.[0] || 'COORDINATOR'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {currentUser?.official_email || 'user@infoziant.com'}
            </p>
          </div>
        </div>

        {/* Read-Only Corporate Attributes (Spec Section 6) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Username</span>
            <span className="text-slate-200 font-mono font-semibold">{currentUser?.username || 'user'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Employee ID</span>
            <span className="text-slate-200 font-mono font-semibold">{currentUser?.employee_id || 'INF-2026-01'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Account Status</span>
            <span className="text-emerald-400 font-semibold capitalize">● {currentUser?.account_status || 'Active'}</span>
          </div>
        </div>

        {/* Editable Contact Information Form (Spec Section 6) */}
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pt-2">
            <span>✏️</span> Editable Personal Contact Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Personal Email</label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="personal@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Primary Mobile Number</label>
              <input
                type="text"
                value={primaryMobile}
                onChange={(e) => setPrimaryMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Alternate Contact Number</label>
              <input
                type="text"
                value={secondaryMobile}
                onChange={(e) => setSecondaryMobile(e.target.value)}
                placeholder="Optional secondary phone"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md transition-colors text-xs"
            >
              Update Profile Contacts
            </button>
          </div>
        </form>
      </div>

      {/* ── Security & Change Password Card (Spec Section 7) ─────────────── */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <span>🔒</span> Change Account Password
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Password must be minimum 8 characters with at least one uppercase letter, number, and symbol.
          </p>
        </div>

        {passwordMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold">
            {passwordMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-lg">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition-colors text-xs"
          >
            Update Password 🔑
          </button>
        </form>
      </div>

    </div>
  );
}
