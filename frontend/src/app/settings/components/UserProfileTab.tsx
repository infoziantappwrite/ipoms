'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Lock, Camera, Calendar, Mail, Phone, MapPin,
  Building, Shield, CheckCircle2, AlertCircle, Sparkles, User as UserIcon, AlertTriangle, Save, KeyRound
} from 'lucide-react';
import { readSessionUser } from '@/lib/session';

interface Props {
  currentUser: any;
  onUpdateProfile: (data: any) => Promise<{ success: boolean; message?: string; error?: string; is_locked?: boolean }>;
}

function getCleanUsername(user: any): string {
  const explicit = user?.username ? String(user.username).trim() : '';
  if (explicit && !explicit.includes('@') && !explicit.includes('.') && explicit.length > 2) {
    return explicit.toLowerCase();
  }
  let name = user?.full_name || explicit || '';
  if (name.includes('@')) {
    name = name.split('@')[0];
  }
  let cleaned = name.trim().replace(/^[A-Za-z]\.\s*/i, '');
  cleaned = cleaned.replace(/\s+[A-Za-z]\.?\s*$/i, '');
  cleaned = cleaned.replace(/\s+[A-Za-z]\.?\s*$/i, '');
  const firstWord = cleaned.split(/[\s_.-]+/)[0];
  return (firstWord || cleaned || 'coordinator').toLowerCase();
}

export function UserProfileTab({ currentUser, onUpdateProfile }: Props) {
  const [sessionFallback, setSessionFallback] = useState<any>(null);

  useEffect(() => {
    setSessionFallback(readSessionUser());
  }, []);

  const effectiveUser = currentUser || sessionFallback;
  const effectiveName = effectiveUser?.full_name || 'A.Mohanaradha';
  const effectiveEmail = effectiveUser?.official_email || 'mohanaradha_a@infoziant.com';
  const effectiveRole = effectiveUser?.role_codes?.[0] || 'PLACEMENT_COORDINATOR';
  const effectiveUsername = getCleanUsername(effectiveUser);

  // Form fields
  const [personalEmail, setPersonalEmail] = useState(effectiveUser?.personal_email || '');
  const [primaryMobile, setPrimaryMobile] = useState(effectiveUser?.primary_mobile || '');
  const [alternateMobile, setAlternateMobile] = useState(effectiveUser?.alternate_mobile || effectiveUser?.secondary_mobile || '');
  const [residentialAddress, setResidentialAddress] = useState(effectiveUser?.residential_address || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    effectiveUser?.date_of_birth ? new Date(effectiveUser.date_of_birth).toISOString().split('T')[0] : ''
  );
  const [dateOfJoining, setDateOfJoining] = useState(
    effectiveUser?.date_of_joining ? new Date(effectiveUser.date_of_joining).toISOString().split('T')[0] : ''
  );

  // Profile photo state & monthly limit
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(effectiveUser?.profile_photo_url || '');
  const [photoPreview, setPhotoPreview] = useState(effectiveUser?.profile_photo_url || '');
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLockedAfterUpdate, setIsLockedAfterUpdate] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const userToUse = currentUser || sessionFallback;
    if (userToUse) {
      if (userToUse.personal_email) setPersonalEmail(userToUse.personal_email);
      if (userToUse.primary_mobile) setPrimaryMobile(userToUse.primary_mobile);
      if (userToUse.alternate_mobile || userToUse.secondary_mobile) {
        setAlternateMobile(userToUse.alternate_mobile || userToUse.secondary_mobile);
      }
      if (userToUse.residential_address) setResidentialAddress(userToUse.residential_address);
      if (userToUse.date_of_birth) {
        setDateOfBirth(new Date(userToUse.date_of_birth).toISOString().split('T')[0]);
      }
      if (userToUse.date_of_joining) {
        setDateOfJoining(new Date(userToUse.date_of_joining).toISOString().split('T')[0]);
      }
      if (userToUse.profile_photo_url) {
        setProfilePhotoUrl(userToUse.profile_photo_url);
        setPhotoPreview(userToUse.profile_photo_url);
      }
    }
  }, [currentUser, sessionFallback]);

  // Lock status
  const isPersonalLocked = Boolean(effectiveUser?.is_profile_locked || isLockedAfterUpdate);
  const isPasswordLocked = Boolean(effectiveUser?.is_password_locked || effectiveUser?.account_status === 'blocked');
  const monthlyPasswordChanges = effectiveUser?.monthly_password_changes_count || 0;

  // Calculate 30-day monthly limit eligibility for photo
  const getPhotoEligibility = () => {
    if (!currentUser?.photo_last_updated_at) {
      return { eligible: true, daysLeft: 0, lastDate: null };
    }
    const lastDate = new Date(currentUser.photo_last_updated_at);
    const diffMs = Date.now() - lastDate.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (diffMs < thirtyDaysMs) {
      const daysLeft = Math.ceil((thirtyDaysMs - diffMs) / (24 * 60 * 60 * 1000));
      return { eligible: false, daysLeft, lastDate };
    }
    return { eligible: true, daysLeft: 0, lastDate };
  };

  const photoStatus = getPhotoEligibility();

  // Handle Photo File Upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!photoStatus.eligible) {
      setPhotoError(`Photo can only be changed once per month. Available in ${photoStatus.daysLeft} days.`);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image file size must be less than 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Only image files (PNG, JPG, WEBP) are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setProfilePhotoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Trigger modal on Personal Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isPersonalLocked) return;

    // Open confirmation warning modal
    setShowConfirmModal(true);
  };

  // Perform confirmed backend update for personal details
  const handleConfirmedUpdate = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        personal_email: personalEmail.trim(),
        primary_mobile: primaryMobile.trim(),
        alternate_mobile: alternateMobile.trim(),
        residential_address: residentialAddress.trim(),
        date_of_birth: dateOfBirth || null,
        date_of_joining: dateOfJoining || null,
      };

      if (profilePhotoUrl && profilePhotoUrl !== currentUser?.profile_photo_url) {
        payload.profile_photo_url = profilePhotoUrl;
      }

      const res = await onUpdateProfile(payload);
      if (res.success) {
        setSuccessMsg(res.message || 'Personal details updated and locked successfully!');
        setIsLockedAfterUpdate(true);
      } else {
        setErrorMsg(res.error || 'Failed to update profile.');
      }
    } catch {
      setErrorMsg('Error connecting to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Independent Password Change Handler (Always Accessible)
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!newPassword || newPassword.trim().length < 9) {
      setPasswordErrorMsg('New password must be at least 9 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirm password do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const payload = { password: newPassword.trim() };
      const res = await onUpdateProfile(payload);
      if (res.success) {
        setPasswordSuccessMsg(res.message || 'Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
      } else {
        setPasswordErrorMsg(res.error || 'Failed to update password.');
      }
    } catch {
      setPasswordErrorMsg('Error connecting to the server. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">

        {/* ── Status Banners ────────────────────────────────────────────── */}
        {successMsg && (
          <div className="p-4 bg-success/15 border border-success/40 rounded-2xl text-success text-xs font-semibold flex items-center gap-3 shadow-2 animate-fadeIn">
            <CheckCircle2 size={18} className="shrink-0 text-success" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-danger/15 border border-danger/40 rounded-2xl text-danger text-xs font-semibold flex items-center gap-3 shadow-2 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-danger" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── GitHub-Style 2-Column Responsive Layout ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT COLUMN (GitHub-Style Profile Panel) ─────────────────── */}
          <div className="lg:col-span-4 space-y-5">
            <div className="glass-panel rounded-2xl border border-border p-6 shadow-3 flex flex-col items-center text-center space-y-4">
              
              {/* Avatar Image with Monthly Limit Badge */}
              <div className="relative group">
                <div className="w-44 h-44 rounded-full border-4 border-surface-raised overflow-hidden shadow-4 bg-primary-subtle flex items-center justify-center relative">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt={effectiveName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-5xl font-bold font-mono">
                      {effectiveName.charAt(0)}
                    </div>
                  )}

                  {/* Hover Camera Overlay if eligible */}
                  {photoStatus.eligible && !isPersonalLocked && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]"
                      title="Change profile picture"
                    >
                      <Camera size={24} />
                      <span className="text-[10px] font-bold">Update Photo</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Photo Change Rule Badge */}
              <div className="w-full text-center">
                {photoStatus.eligible ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success text-[11px] font-semibold">
                    <Sparkles size={12} />
                    <span>Photo update available</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-[11px] font-semibold">
                    <Lock size={12} />
                    <span>Photo locked • Available in {photoStatus.daysLeft} days</span>
                  </div>
                )}
                {photoError && (
                  <p className="text-[11px] text-danger mt-1.5 font-medium">{photoError}</p>
                )}
                <p className="text-[10px] text-fg-subtle mt-1">
                  Profile photo can be updated once per month. Max 2MB (PNG/JPG).
                </p>
              </div>

              {/* User Identity Header */}
              <div className="w-full space-y-1">
                <h2 className="text-lg font-bold text-fg leading-tight">
                  {effectiveName}
                </h2>
                <p className="text-xs text-fg-muted font-mono">
                  @{effectiveUsername}
                </p>
                <div className="pt-2 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                    <Shield size={12} />
                    {effectiveRole}
                  </span>
                </div>
              </div>

              {/* Quick Metadata Info List */}
              <div className="w-full border-t border-border pt-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-fg-muted">
                  <Building size={14} className="text-fg-subtle shrink-0" />
                  <span className="truncate">Infoziant Placement Operations</span>
                </div>
                <div className="flex items-center gap-2 text-fg-muted">
                  <Mail size={14} className="text-fg-subtle shrink-0" />
                  <span className="truncate font-mono">{effectiveEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-fg-muted">
                  <Calendar size={14} className="text-fg-subtle shrink-0" />
                  <span>Joined {dateOfJoining ? new Date(dateOfJoining).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '2026 Season'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT COLUMN (Profile Information Form Cards) ───────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. Account & Corporate Identity (Disabled / Read-Only) */}
            <div className="glass-panel rounded-2xl border border-border p-6 shadow-3 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold text-fg flex items-center gap-2">
                  <Shield size={15} className="text-primary" />
                  Corporate & Organization Identity
                </h3>
                <span className="text-[10px] font-bold text-fg-subtle bg-surface px-2 py-0.5 rounded border border-border flex items-center gap-1">
                  <Lock size={10} /> Immutable (Read-Only)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                    <span>Full Name</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="text"
                    value={effectiveName}
                    disabled
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-semibold rounded-xl px-3.5 py-2.5 cursor-not-allowed select-none opacity-80"
                  />
                </div>

                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                    <span>Official Email Address</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="email"
                    value={effectiveEmail}
                    disabled
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-mono font-semibold rounded-xl px-3.5 py-2.5 cursor-not-allowed select-none opacity-80"
                  />
                </div>

                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                    <span>System Role & Clearance</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="text"
                    value={effectiveRole}
                    disabled
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-mono font-semibold rounded-xl px-3.5 py-2.5 cursor-not-allowed select-none opacity-80"
                  />
                </div>

                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                    <span>Username</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="text"
                    value={effectiveUsername}
                    disabled
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-mono font-semibold rounded-xl px-3.5 py-2.5 cursor-not-allowed select-none opacity-80"
                  />
                  <p className="text-[10px] text-fg-subtle mt-1.5 leading-normal">
                    💡 Note: Your system username is always your name without initials (<span className="font-mono font-semibold text-primary">{effectiveUsername}</span>).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Personal & Contact Information (Visibly Grayed Out When Disabled) */}
            <form onSubmit={handleFormSubmit}>
              <div className={`rounded-2xl border p-6 shadow-3 space-y-4 transition-all duration-200 ${
                isPersonalLocked
                  ? 'bg-zinc-950/60 border-zinc-800/90 shadow-none'
                  : 'glass-panel border-border'
              }`}>
                <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-fg flex items-center gap-2">
                      <UserIcon size={15} className={isPersonalLocked ? 'text-zinc-500' : 'text-primary'} />
                      Personal Contact & Employment Details
                    </h3>
                    <p className="text-[11px] text-fg-subtle mt-0.5">
                      {isPersonalLocked
                        ? 'Your updated personal details have been recorded and locked.'
                        : 'Update your contact phone numbers, personal email, address, and dates.'}
                    </p>
                  </div>
                  {isPersonalLocked && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={11} /> Saved & Locked
                    </span>
                  )}
                </div>

                {/* Visible Grayed-Out Lock Notice */}
                {isPersonalLocked && (
                  <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-400 text-[11px] flex items-center gap-2.5 animate-fadeIn">
                    <Lock size={15} className="shrink-0 text-amber-400" />
                    <div>
                      <span className="font-bold text-zinc-200">Fields Locked:</span> These sections were submitted and are now disabled in gray shade. If you require any further updates, please contact an Administrator to unlock your profile.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Primary Mobile */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Phone size={12} className={isPersonalLocked ? 'text-zinc-500' : 'text-primary'} />
                      <span>Primary Mobile Number</span>
                      {isPersonalLocked && <Lock size={10} className="text-zinc-500" />}
                    </label>
                    <input
                      type="tel"
                      value={primaryMobile}
                      onChange={(e) => setPrimaryMobile(e.target.value)}
                      disabled={isPersonalLocked}
                      placeholder="+91 98765 43210"
                      className={`w-full rounded-xl px-3.5 py-2.5 transition-colors ${
                        isPersonalLocked
                          ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-400 placeholder:text-zinc-600 cursor-not-allowed select-none opacity-75 backdrop-blur-sm'
                          : 'bg-background border border-border-strong text-fg focus:border-primary focus:outline-none'
                      }`}
                    />
                  </div>

                  {/* Alternate Mobile */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Phone size={12} className="text-fg-subtle" />
                      <span>Alternate / Emergency Mobile</span>
                      {isPersonalLocked && <Lock size={10} className="text-zinc-500" />}
                    </label>
                    <input
                      type="tel"
                      value={alternateMobile}
                      onChange={(e) => setAlternateMobile(e.target.value)}
                      disabled={isPersonalLocked}
                      placeholder="+91 91234 56789"
                      className={`w-full rounded-xl px-3.5 py-2.5 transition-colors ${
                        isPersonalLocked
                          ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-400 placeholder:text-zinc-600 cursor-not-allowed select-none opacity-75 backdrop-blur-sm'
                          : 'bg-background border border-border-strong text-fg focus:border-primary focus:outline-none'
                      }`}
                    />
                  </div>

                  {/* Personal Email */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Mail size={12} className={isPersonalLocked ? 'text-zinc-500' : 'text-primary'} />
                      <span>Personal Email Address</span>
                      {isPersonalLocked && <Lock size={10} className="text-zinc-500" />}
                    </label>
                    <input
                      type="email"
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      disabled={isPersonalLocked}
                      placeholder="personal.email@gmail.com"
                      className={`w-full rounded-xl px-3.5 py-2.5 transition-colors ${
                        isPersonalLocked
                          ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-400 placeholder:text-zinc-600 cursor-not-allowed select-none opacity-75 backdrop-blur-sm'
                          : 'bg-background border border-border-strong text-fg focus:border-primary focus:outline-none'
                      }`}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-fg-subtle" />
                      <span>Date of Birth</span>
                      {isPersonalLocked && <Lock size={10} className="text-zinc-500" />}
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={isPersonalLocked}
                      className={`w-full rounded-xl px-3.5 py-2.5 transition-colors ${
                        isPersonalLocked
                          ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-400 cursor-not-allowed select-none opacity-75 backdrop-blur-sm'
                          : 'bg-background border border-border-strong text-fg focus:border-primary focus:outline-none'
                      }`}
                    />
                  </div>

                  {/* Date of Joining */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-fg-subtle" />
                      <span>Date of Joining Office</span>
                      {isPersonalLocked && <Lock size={10} className="text-zinc-500" />}
                    </label>
                    <input
                      type="date"
                      value={dateOfJoining}
                      onChange={(e) => setDateOfJoining(e.target.value)}
                      disabled={isPersonalLocked}
                      className={`w-full rounded-xl px-3.5 py-2.5 transition-colors ${
                        isPersonalLocked
                          ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-400 cursor-not-allowed select-none opacity-75 backdrop-blur-sm'
                          : 'bg-background border border-border-strong text-fg focus:border-primary focus:outline-none'
                      }`}
                    />
                  </div>

                  {/* Residential Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <MapPin size={12} className={isPersonalLocked ? 'text-zinc-500' : 'text-primary'} />
                      <span>Residential Address</span>
                      {isPersonalLocked && <Lock size={10} className="text-zinc-500" />}
                    </label>
                    <textarea
                      value={residentialAddress}
                      onChange={(e) => setResidentialAddress(e.target.value)}
                      disabled={isPersonalLocked}
                      rows={3}
                      placeholder="Street Address, City, State, PIN Code"
                      className={`w-full rounded-xl px-3.5 py-2.5 leading-relaxed transition-colors ${
                        isPersonalLocked
                          ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-400 placeholder:text-zinc-600 cursor-not-allowed select-none opacity-75 backdrop-blur-sm'
                          : 'bg-background border border-border-strong text-fg focus:border-primary focus:outline-none'
                      }`}
                    />
                  </div>
                </div>

                {/* Personal Section Action Bar */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  {isPersonalLocked ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 bg-zinc-900/90 px-5 py-2.5 rounded-xl border border-zinc-800">
                      <Lock size={14} className="text-amber-400" />
                      <span>Personal Details Saved & Locked</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-3 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      {loading ? <span>Saving Profile...</span> : <span>Update Profile</span>}
                    </button>
                  )}
                </div>

              </div>
            </form>

            {/* 3. Password Management (ALWAYS VISIBLE & EDITABLE — Max 2 Changes Per Month) */}
            <form onSubmit={handlePasswordUpdate}>
              <div className={`glass-panel rounded-2xl border p-6 shadow-3 space-y-4 ${
                isPasswordLocked ? 'border-danger/50 bg-danger/5' : 'border-border'
              }`}>
                <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-fg flex items-center gap-2">
                      <KeyRound size={15} className="text-primary" />
                      Security & Password Management
                    </h3>
                    <p className="text-[11px] text-fg-subtle mt-0.5">
                      You can change your password up to 2 times per month.
                    </p>
                  </div>

                  {/* Monthly Password Change Counter Badge */}
                  <div>
                    {isPasswordLocked ? (
                      <span className="text-[11px] font-bold text-danger bg-danger/15 border border-danger/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Lock size={12} /> Account Locked (Limit Exceeded)
                      </span>
                    ) : monthlyPasswordChanges >= 2 ? (
                      <span className="text-[11px] font-bold text-danger bg-danger/10 border border-danger/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <AlertTriangle size={12} /> 2 / 2 Used (3rd attempt will lock profile)
                      </span>
                    ) : monthlyPasswordChanges === 1 ? (
                      <span className="text-[11px] font-bold text-warning bg-warning/10 border border-warning/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <KeyRound size={12} /> 1 / 2 Changes Used This Month
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-success bg-success/10 border border-success/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> 2 Password Changes Available This Month
                      </span>
                    )}
                  </div>
                </div>

                {/* Password Alerts */}
                {isPasswordLocked && (
                  <div className="p-4 bg-danger/15 border border-danger/40 rounded-xl text-danger text-xs font-semibold flex items-center gap-3">
                    <AlertCircle size={18} className="shrink-0 text-danger" />
                    <div>
                      <span className="font-bold">Security Lockout:</span> You have attempted to change your password more than 2 times this month. Your account is locked. Please contact your System Administrator to release your account.
                    </div>
                  </div>
                )}

                {passwordSuccessMsg && (
                  <div className="p-3.5 bg-success/15 border border-success/40 rounded-xl text-success text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrorMsg && (
                  <div className="p-3.5 bg-danger/15 border border-danger/40 rounded-xl text-danger text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Lock size={12} className="text-primary" />
                      <span>New Password</span>
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isPasswordLocked}
                      placeholder="Min. 9 characters"
                      className="w-full bg-background border border-border-strong rounded-xl px-3.5 py-2.5 text-fg focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Lock size={12} className="text-primary" />
                      <span>Confirm New Password</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isPasswordLocked}
                      placeholder="Re-enter new password"
                      className="w-full bg-background border border-border-strong rounded-xl px-3.5 py-2.5 text-fg focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password Change Action Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                  <p className="text-[11px] text-fg-subtle">
                    ℹ️ Rule: Maximum 2 password updates allowed per month. A 3rd attempt will automatically lock your profile.
                  </p>

                  <button
                    type="submit"
                    disabled={passwordLoading || isPasswordLocked || !newPassword}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-2 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound size={14} />
                    {passwordLoading ? <span>Updating Password...</span> : <span>Update Password</span>}
                  </button>
                </div>

              </div>
            </form>

          </div>

        </div>

      </div>

      {/* ── Warning Confirmation Modal ─────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel border border-warning/40 bg-background max-w-md w-full rounded-2xl p-6 shadow-4 space-y-4">
            <div className="flex items-center gap-3 text-warning">
              <div className="w-10 h-10 rounded-xl bg-warning/15 border border-warning/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">Confirm Profile Update</h3>
                <p className="text-[11px] text-fg-subtle">Security & Record Integrity Notice</p>
              </div>
            </div>

            <div className="p-3.5 bg-surface rounded-xl border border-border text-xs text-fg-muted leading-relaxed">
              Are you sure you want to update your personal details? Once updated and confirmed, your personal contact number, personal email, address, and joining details will be saved and permanently disabled in gray shade (only an Administrator can unlock them in the future).
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmedUpdate}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-2 transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
