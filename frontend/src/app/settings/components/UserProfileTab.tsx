'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Lock, Camera, Calendar, Mail, Phone, MapPin,
  Building, Shield, CheckCircle2, AlertCircle, Sparkles, User as UserIcon, AlertTriangle, Save, KeyRound, Trash2
} from 'lucide-react';
import { readSessionUser } from '@/lib/session';
import { PhotoCropModal } from './PhotoCropModal';

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

// Offline PIN Code to State prefix dictionary
const PIN_CODE_STATE_MAP: { prefix: number[]; state: string }[] = [
  { prefix: [11], state: 'Delhi' },
  { prefix: [12, 13], state: 'Haryana' },
  { prefix: [14, 15], state: 'Punjab' },
  { prefix: [16], state: 'Chandigarh' },
  { prefix: [17], state: 'Himachal Pradesh' },
  { prefix: [18, 19], state: 'Jammu & Kashmir' },
  { prefix: [20, 21, 22, 23, 24, 25, 26, 27, 28], state: 'Uttar Pradesh' },
  { prefix: [30, 31, 32, 33, 34], state: 'Rajasthan' },
  { prefix: [36, 37, 38, 39], state: 'Gujarat' },
  { prefix: [40, 41, 42, 43, 44], state: 'Maharashtra' },
  { prefix: [45, 46, 47, 48, 49], state: 'Madhya Pradesh' },
  { prefix: [50, 51, 52, 53], state: 'Andhra Pradesh / Telangana' },
  { prefix: [56, 57, 58, 59], state: 'Karnataka' },
  { prefix: [60, 61, 62, 63, 64], state: 'Tamil Nadu' },
  { prefix: [67, 68, 69], state: 'Kerala' },
  { prefix: [70, 71, 72, 73, 74], state: 'West Bengal' },
  { prefix: [75, 76, 77], state: 'Odisha' },
  { prefix: [78], state: 'Assam' },
  { prefix: [79], state: 'North East' },
  { prefix: [80, 81, 82, 83, 84, 85], state: 'Bihar / Jharkhand' },
];

function getStateFromPinPrefix(pin: string): string {
  const p2 = parseInt(pin.slice(0, 2), 10);
  const match = PIN_CODE_STATE_MAP.find((m) => m.prefix.includes(p2));
  return match?.state || '';
}

function cleanLinkedinSlug(val: string): string {
  if (!val) return '';
  return val
    .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')
    .replace(/^(www\.)?linkedin\.com\/in\//i, '')
    .replace(/\/$/, '')
    .trim();
}

function getFullLinkedinUrl(slug: string): string {
  if (!slug) return '';
  if (slug.startsWith('http://') || slug.startsWith('https://')) return slug;
  return `https://www.linkedin.com/in/${cleanLinkedinSlug(slug)}`;
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
  const [linkedinProfile, setLinkedinProfile] = useState(cleanLinkedinSlug(effectiveUser?.linkedin_profile || ''));
  const [addressLine, setAddressLine] = useState(effectiveUser?.address_line || effectiveUser?.residential_address || '');
  const [pincode, setPincode] = useState(effectiveUser?.pincode || '');
  const [city, setCity] = useState(effectiveUser?.city || '');
  const [state, setState] = useState(effectiveUser?.state || '');
  const [pincodeLoading, setPincodeLoading] = useState(false);

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
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
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
      if (userToUse.linkedin_profile) setLinkedinProfile(cleanLinkedinSlug(userToUse.linkedin_profile));
      if (userToUse.address_line) setAddressLine(userToUse.address_line);
      else if (userToUse.residential_address) setAddressLine(userToUse.residential_address);
      if (userToUse.pincode) setPincode(userToUse.pincode);
      if (userToUse.city) setCity(userToUse.city);
      if (userToUse.state) setState(userToUse.state);
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
      if (userToUse.is_profile_locked) {
        setIsLockedAfterUpdate(true);
      }
    }
  }, [currentUser, sessionFallback]);

  const dobInputRef = useRef<HTMLInputElement>(null);

  // Lock status: Corporate identity is always locked.
  // In Personal details, ONLY LinkedIn, DOB, and Date of Joining are locked once submitted.
  const isPersonalLocked = Boolean(effectiveUser?.is_profile_locked || isLockedAfterUpdate);
  const isPasswordLocked = Boolean(effectiveUser?.is_password_locked || effectiveUser?.account_status === 'blocked');
  const monthlyPasswordChanges = effectiveUser?.monthly_password_changes_count || 0;

  // PIN Code live lookup with API + offline fallback
  const handlePincodeChange = async (newPin: string) => {
    const cleaned = newPin.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);

    if (cleaned.length === 6) {
      const offlineState = getStateFromPinPrefix(cleaned);
      if (offlineState && !state) {
        setState(offlineState);
      }

      setPincodeLoading(true);
      try {
        const r = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await r.json();
        if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          if (po.State) setState(po.State);
          if (po.District && !city) setCity(po.District);
        }
      } catch {
        // Fallback already assigned
      } finally {
        setPincodeLoading(false);
      }
    }
  };

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

  // Handle Photo File Upload & Open Interactive Cropper
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!photoStatus.eligible) {
      setPhotoError(`Photo can only be changed once per month. Available in ${photoStatus.daysLeft} days.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image file size must be less than 10MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Only image files (PNG, JPG, JPEG, WEBP) are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      setCropModalSrc(rawDataUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Handle Cropped Image from PhotoCropModal
  const handleCropFinished = (croppedDataUrl: string) => {
    setPhotoPreview(croppedDataUrl);
    setProfilePhotoUrl(croppedDataUrl);
    setCropModalSrc(null);
  };

  // Handle Photo Deletion / Removal
  const handleDeletePhoto = () => {
    setPhotoPreview('');
    setProfilePhotoUrl('');
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger modal on Personal Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
      const fullAddress = [
        addressLine.trim(),
        city.trim(),
        state.trim() ? `${state.trim()} - ${pincode.trim()}` : pincode.trim()
      ].filter(Boolean).join(', ');

      const payload: any = {
        personal_email: personalEmail.trim(),
        primary_mobile: primaryMobile.trim(),
        alternate_mobile: alternateMobile.trim(),
        address_line: addressLine.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        residential_address: fullAddress,
        linkedin_profile: cleanLinkedinSlug(linkedinProfile),
        date_of_birth: dateOfBirth || null,
        date_of_joining: dateOfJoining || null,
      };

      if (profilePhotoUrl && profilePhotoUrl !== currentUser?.profile_photo_url) {
        payload.profile_photo_url = profilePhotoUrl;
      }

      const res = await onUpdateProfile(payload);
      if (res.success) {
        setSuccessMsg(res.message || 'Personal details updated successfully! Locked fields have been recorded.');
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
      const res = await onUpdateProfile({ password: newPassword });
      if (res.success) {
        setPasswordSuccessMsg(res.message || 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordErrorMsg(res.error || 'Failed to update password.');
      }
    } catch {
      setPasswordErrorMsg('Error connecting to the server. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Reusable styling for disabled fields: crisp white background with 🚫 hover cursor
  const whiteDisabledInputClass =
    'w-full bg-white text-zinc-900 placeholder:text-zinc-400 border border-zinc-300 font-semibold rounded-xl px-3.5 py-2.5 shadow-sm select-none cursor-not-allowed transition-all hover:cursor-not-allowed hover:border-zinc-400';
  const normalInputClass =
    'w-full bg-background border border-border-strong text-fg focus:border-primary focus:outline-none rounded-xl px-3.5 py-2.5 transition-colors';

  return (
    <>
      <div className="space-y-6">

        {/* ── Section Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-fg flex items-center gap-2.5">
              <span>Account & Profile Settings</span>
              {isPersonalLocked && (
                <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Lock size={12} /> DOB & Joining Locked
                </span>
              )}
            </h1>
            <p className="text-xs text-fg-muted mt-0.5">
              Manage your identity, personal contact channels, security credentials, and organization profile.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono text-fg-muted">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Presence: Active</span>
            </span>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {successMsg && (
          <div className="p-4 bg-success/15 border border-success/30 rounded-xl text-success text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-danger/15 border border-danger/30 rounded-xl text-danger text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── MAIN 2-COLUMN PROFILE LAYOUT (GitHub / Linear Style) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── LEFT COLUMN (Profile Visual Identity Card) ─────────────── */}
          <div className="lg:col-span-4 glass-panel rounded-2xl border border-border p-6 shadow-3 flex flex-col items-center text-center space-y-5 sticky top-6">

            {/* Profile Avatar with Photo Update Overlay & Delete Option */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-border-strong bg-surface flex items-center justify-center shadow-4 relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={effectiveName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center text-3xl font-black text-primary">
                      {effectiveName.charAt(0)}
                    </div>
                  )}

                  {/* Hover Camera Overlay if eligible */}
                  {photoStatus.eligible && (
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

              {/* Small Delete Photo Button Underneath */}
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger border border-danger/25 hover:border-danger/40 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm animate-fadeIn"
                  title="Remove Profile Photo"
                >
                  <Trash2 size={12} className="shrink-0" />
                  <span>Remove Photo</span>
                </button>
              )}
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
              <div className="flex items-center justify-between text-fg-muted pt-1">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-fg-subtle shrink-0" />
                  <span>Joined {dateOfJoining ? new Date(dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '2026 Season'}</span>
                </div>
                {linkedinProfile ? (
                  <a
                    href={getFullLinkedinUrl(linkedinProfile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open LinkedIn Profile: ${getFullLinkedinUrl(linkedinProfile)}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0077b5] text-white border border-[#0077b5] text-[11px] font-bold shadow-sm transition-all hover:bg-[#006097] hover:scale-105 active:scale-95 animate-fadeIn cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.44a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                ) : (
                  <span
                    title="LinkedIn profile not added yet"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-fg-muted/40 text-[10px] cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5 fill-current opacity-30" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.44a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                    </svg>
                    <span className="text-[10px] opacity-40">Not linked</span>
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (Profile Information Form Cards) ───────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. Account & Corporate Identity (Disabled / Read-Only with White Background & 🚫 Cursor) */}
            <div className="glass-panel rounded-2xl border border-border p-6 shadow-3 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold text-fg flex items-center gap-2">
                  <Shield size={15} className="text-primary" />
                  Corporate & Organization Identity
                </h3>
                <span className="text-[10px] font-bold text-fg-subtle bg-surface px-2 py-0.5 rounded border border-border flex items-center gap-1 cursor-not-allowed" title="Immutable Corporate Identity">
                  <Lock size={10} /> Immutable (Read-Only)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1 cursor-not-allowed">
                    <span>Full Name</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="text"
                    value={effectiveName}
                    disabled
                    title="Corporate Full Name is managed by Administration"
                    className={whiteDisabledInputClass}
                  />
                </div>

                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1 cursor-not-allowed">
                    <span>Official Email Address</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="email"
                    value={effectiveEmail}
                    disabled
                    title="Official Email is managed by Administration"
                    className={`${whiteDisabledInputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1 cursor-not-allowed">
                    <span>System Role & Clearance</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="text"
                    value={effectiveRole}
                    disabled
                    title="Role clearance is assigned by System Administrator"
                    className={`${whiteDisabledInputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1 cursor-not-allowed">
                    <span>Username</span>
                    <Lock size={10} className="text-fg-subtle" />
                  </label>
                  <input
                    type="text"
                    value={effectiveUsername}
                    disabled
                    title="System username is automatically derived without initials"
                    className={`${whiteDisabledInputClass} font-mono`}
                  />
                  <p className="text-[10px] text-fg-subtle mt-1.5 leading-normal">
                    💡 Note: Your system username is always your name without initials (<span className="font-mono font-semibold text-primary">{effectiveUsername}</span>).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Personal & Contact Information (DOB, Date of Joining, LinkedIn are locked; Contacts remain editable) */}
            <form onSubmit={handleFormSubmit}>
              <div className="glass-panel rounded-2xl border border-border p-6 shadow-3 space-y-4">
                <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-fg flex items-center gap-2">
                      <UserIcon size={15} className="text-primary" />
                      Personal Contact & Employment Details
                    </h3>
                    <p className="text-[11px] text-fg-subtle mt-0.5">
                      {isPersonalLocked
                        ? 'Date of Birth, Joining Date, and LinkedIn are locked. Mobile numbers and Address can still be updated.'
                        : 'Update your contact phone numbers, personal email, address, and dates.'}
                    </p>
                  </div>
                  {isPersonalLocked && (
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={11} /> DOB & Joining Locked
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Primary Mobile (Always Editable) */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Phone size={12} className="text-primary" />
                      <span>Primary Mobile Number</span>
                    </label>
                    <input
                      type="tel"
                      value={primaryMobile}
                      onChange={(e) => setPrimaryMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={normalInputClass}
                    />
                  </div>

                  {/* Alternate Mobile (Always Editable) */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Phone size={12} className="text-fg-subtle" />
                      <span>Alternate / Emergency Mobile</span>
                    </label>
                    <input
                      type="tel"
                      value={alternateMobile}
                      onChange={(e) => setAlternateMobile(e.target.value)}
                      placeholder="+91 91234 56789"
                      className={normalInputClass}
                    />
                  </div>

                  {/* Personal Email (Always Editable) */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <Mail size={12} className="text-primary" />
                      <span>Personal Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      placeholder="personal.email@gmail.com"
                      className={normalInputClass}
                    />
                  </div>

                  {/* LinkedIn Profile (Locked if isPersonalLocked; instantly enables left icon on type / Tab / Enter) */}
                  <div>
                    <label className={`block font-semibold mb-1 flex items-center gap-1 ${isPersonalLocked ? 'text-fg-muted cursor-not-allowed' : 'text-fg-muted'}`}>
                      <svg className="w-3 h-3 fill-[#0077b5]" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.44a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                      </svg>
                      <span>LinkedIn Profile ID / Handle</span>
                      {isPersonalLocked && <Lock size={10} className="text-fg-subtle" />}
                    </label>
                    <div className="flex items-center rounded-xl overflow-hidden shadow-sm">
                      <span className={`px-2.5 py-2.5 text-[11px] font-mono select-none border-y border-l rounded-l-xl ${
                        isPersonalLocked
                          ? 'bg-zinc-100 border-zinc-300 text-zinc-600 cursor-not-allowed'
                          : 'bg-surface border-border-strong text-fg-subtle'
                      }`}>
                        www.linkedin.com/in/
                      </span>
                      <input
                        type="text"
                        value={linkedinProfile}
                        onChange={(e) => setLinkedinProfile(cleanLinkedinSlug(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            dobInputRef.current?.focus();
                          }
                        }}
                        disabled={isPersonalLocked}
                        title={isPersonalLocked ? 'LinkedIn profile ID is locked' : 'Enter handle and press Tab or Enter'}
                        placeholder="mohanaradha13"
                        className={isPersonalLocked ? `${whiteDisabledInputClass} rounded-l-none` : `${normalInputClass} rounded-l-none font-mono text-xs`}
                      />
                    </div>
                  </div>

                  {/* Date of Birth (Locked if isPersonalLocked with White background & 🚫 cursor) */}
                  <div>
                    <label className={`block font-semibold mb-1 flex items-center gap-1 ${isPersonalLocked ? 'text-fg-muted cursor-not-allowed' : 'text-fg-muted'}`}>
                      <Calendar size={12} className="text-fg-subtle" />
                      <span>Date of Birth</span>
                      {isPersonalLocked && <Lock size={10} className="text-fg-subtle" />}
                    </label>
                    <input
                      ref={dobInputRef}
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={isPersonalLocked}
                      title={isPersonalLocked ? 'Date of Birth is permanently locked' : 'Select Date of Birth'}
                      className={isPersonalLocked ? whiteDisabledInputClass : normalInputClass}
                    />
                  </div>

                  {/* Date of Joining (Locked if isPersonalLocked with White background & 🚫 cursor) */}
                  <div>
                    <label className={`block font-semibold mb-1 flex items-center gap-1 ${isPersonalLocked ? 'text-fg-muted cursor-not-allowed' : 'text-fg-muted'}`}>
                      <Calendar size={12} className="text-fg-subtle" />
                      <span>Date of Joining Office</span>
                      {isPersonalLocked && <Lock size={10} className="text-fg-subtle" />}
                    </label>
                    <input
                      type="date"
                      value={dateOfJoining}
                      onChange={(e) => setDateOfJoining(e.target.value)}
                      disabled={isPersonalLocked}
                      title={isPersonalLocked ? 'Date of Joining Office is permanently locked' : 'Select Date of Joining'}
                      className={isPersonalLocked ? whiteDisabledInputClass : normalInputClass}
                    />
                  </div>

                  {/* Residential Address: Door No, Street & Landmark (Always Editable) */}
                  <div className="sm:col-span-2">
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <MapPin size={12} className="text-primary" />
                      <span>Door No, Street Name & Landmark</span>
                    </label>
                    <input
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="Door/Flat No, Street Name, Area / Landmark"
                      className={normalInputClass}
                    />
                  </div>

                  {/* PIN Code with Auto-State Detection (Always Editable) */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-fg-subtle" />
                        <span>PIN Code</span>
                      </span>
                      {pincodeLoading && <span className="text-[10px] text-primary animate-pulse">Detecting State...</span>}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="6-digit PIN (e.g. 626126)"
                      className={`${normalInputClass} font-mono`}
                    />
                  </div>

                  {/* City / District (Always Editable) */}
                  <div>
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center gap-1">
                      <span>City / District</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City / District"
                      className={normalInputClass}
                    />
                  </div>

                  {/* State (Always Editable, Auto-populated from PIN code) */}
                  <div className="sm:col-span-2">
                    <label className="block text-fg-muted font-semibold mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>State</span>
                      </span>
                      {state && <span className="text-[10px] text-success font-medium">✓ Auto-detected from PIN</span>}
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State (auto-updated from PIN Code)"
                      className={`${normalInputClass} font-medium`}
                    />
                  </div>
                </div>

                {/* Personal Section Action Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
                  <p className="text-[11px] text-fg-subtle">
                    {isPersonalLocked
                      ? '🔒 DOB, Joining Date, and LinkedIn are locked. Phone numbers and address can be updated anytime.'
                      : '💡 Submitting will permanently lock your Date of Birth, Date of Joining, and LinkedIn profile.'}
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-3 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Save size={14} />
                    {loading ? <span>Saving Profile...</span> : <span>Update Profile</span>}
                  </button>
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

      {/* ── Normal Light Neumorphic Confirmation Modal ─────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200/90 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">Confirm Profile Update</h3>
                <p className="text-[11px] text-fg-subtle">Security & Record Integrity Notice</p>
              </div>
            </div>

            {/* Inset Light Message Container */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-normal shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]">
              Are you sure you want to update your profile? Once updated and confirmed, your Date of Birth, Date of Joining Office, and LinkedIn profile handle will be recorded and permanently locked (only an Administrator can unlock them). Your mobile numbers, personal email, and address will remain editable anytime.
            </div>

            {/* Normal Light Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmedUpdate}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                OK
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Interactive Face & Shoulder Photo Crop Modal ─────────────────── */}
      {cropModalSrc && (
        <PhotoCropModal
          imageSrc={cropModalSrc}
          onCropComplete={handleCropFinished}
          onCancel={() => setCropModalSrc(null)}
        />
      )}
    </>
  );
}
