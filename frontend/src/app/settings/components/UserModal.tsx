'use client';

import { useState, useEffect } from 'react';
import { Pencil, Plus, X, UserPlus, Shield, Activity, Lock, Unlock, Calendar, Mail, Phone, Linkedin, Hash } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SmoothSelect } from '@/components/ui/SmoothSelect';

interface Props {
  initialData?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserModal({ initialData, onClose, onSuccess }: Props) {
  const isEditing = !!initialData?._id;

  const [colleges, setColleges] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [officialEmail, setOfficialEmail] = useState(initialData?.official_email || '');
  const [employeeId, setEmployeeId] = useState(initialData?.employee_id || '');
  const [primaryMobile, setPrimaryMobile] = useState(initialData?.primary_mobile || '');
  const [secondaryMobile, setSecondaryMobile] = useState(initialData?.secondary_mobile || initialData?.alternate_mobile || '');
  const [personalEmail, setPersonalEmail] = useState(initialData?.personal_email || '');
  const [linkedinProfile, setLinkedinProfile] = useState(initialData?.linkedin_profile || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    initialData?.date_of_birth ? new Date(initialData.date_of_birth).toISOString().split('T')[0] : ''
  );
  const [dateOfJoining, setDateOfJoining] = useState(
    initialData?.date_of_joining ? new Date(initialData.date_of_joining).toISOString().split('T')[0] : ''
  );
  const [isProfileLocked, setIsProfileLocked] = useState<boolean>(Boolean(initialData?.is_profile_locked));
  const [selectedRole, setSelectedRole] = useState(initialData?.role_codes?.[0] || 'PLACEMENT_COORDINATOR');
  const [selectedColleges, setSelectedColleges] = useState<string[]>(
    initialData?.assigned_college_ids?.map((c: any) => (typeof c === 'object' ? c._id : c)) || []
  );
  const [accountStatus, setAccountStatus] = useState(initialData?.account_status || 'active');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch colleges and roles
    Promise.all([
      apiFetch('/colleges'),
      apiFetch('/roles'),
    ])
      .then(([colData, roleData]) => {
        if (colData.success) setColleges(colData.data.colleges || []);
        if (roleData.success) setRoles(roleData.data.roles || []);
      })
      .catch(console.error);
  }, []);

  const handleToggleCollege = (id: string) => {
    if (selectedColleges.includes(id)) {
      setSelectedColleges(selectedColleges.filter((cId) => cId !== id));
    } else {
      setSelectedColleges([...selectedColleges, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !officialEmail.trim()) {
      alert('Full Name, Username, and Official Email are required.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        official_email: officialEmail.trim().toLowerCase(),
        employee_id: employeeId.trim(),
        primary_mobile: primaryMobile.trim(),
        secondary_mobile: secondaryMobile.trim(),
        alternate_mobile: secondaryMobile.trim(),
        personal_email: personalEmail.trim().toLowerCase(),
        linkedin_profile: linkedinProfile.trim(),
        date_of_birth: dateOfBirth || null,
        date_of_joining: dateOfJoining || null,
        is_profile_locked: isProfileLocked,
        role_codes: [selectedRole],
        assigned_college_ids: selectedColleges,
        account_status: accountStatus,
      };

      if (!isEditing) {
        payload.password = password;
      }

      const url = isEditing ? `/users/${initialData._id}` : '/users';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.success) {
        alert(isEditing ? 'User profile and permissions updated successfully!' : 'New user account created successfully!');
        onSuccess();
        onClose();
      } else {
        alert(res.error?.message || 'Operation failed');
      }
    } catch (err) {
      console.error('User save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors disabled:bg-zinc-100 disabled:dark:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-200 disabled:dark:border-zinc-700 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {isEditing ? <Pencil size={15} strokeWidth={2} className="text-blue-600 dark:text-blue-400" aria-hidden /> : <Plus size={15} strokeWidth={2} className="text-blue-600 dark:text-blue-400" aria-hidden />}
            <span>{isEditing ? `Edit User & Permissions — ${initialData?.full_name || ''}` : 'Create New User Account'}</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Section 1: Corporate Identity & Account */}
          <div className="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
            <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Shield size={13} />
              <span>1. Corporate Identity & System Permissions</span>
            </h4>

            {/* Full Name & Username */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. A.Mohanaradha"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Login Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. mohanaradha"
                  disabled={isEditing}
                  className={`${inputClass} font-mono`}
                  required
                />
              </div>
            </div>

            {/* Official Email & Employee ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Official Email *</label>
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="name@infoziant.com"
                  disabled={isEditing}
                  className={`${inputClass} font-mono`}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Hash size={12} className="text-zinc-500" />
                  <span>Employee ID / Staff Code</span>
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. INF-PC-001"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            {/* Role & Account Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">System Role *</label>
                <SmoothSelect
                  value={selectedRole}
                  onChange={setSelectedRole}
                  icon={Shield}
                  title="Select System Role"
                  options={[
                    { value: 'PLACEMENT_COORDINATOR', label: 'Placement Coordinator' },
                    { value: 'TEAM_LEADER', label: 'Team Leader' },
                    { value: 'ADMINISTRATOR', label: 'Administrator (CEO / Director)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Account Status</label>
                <SmoothSelect
                  value={accountStatus}
                  onChange={setAccountStatus}
                  icon={Activity}
                  title="Account Status"
                  options={[
                    { value: 'active', label: 'Active (Full Working)' },
                    { value: 'partial_working', label: 'Partial Working (Reduced Load / Shift)' },
                    { value: 'on_leave', label: 'On Leave (Approved Leave)' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'blocked', label: 'Blocked / Locked Out' },
                    { value: 'deactivated', label: 'Deactivated' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Records & Field Lock Governance */}
          <div className="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Lock size={13} />
                <span>2. Personal Records & Field Lock Governance</span>
              </h4>

              {/* Administrator Lock Override Switch */}
              <button
                type="button"
                onClick={() => setIsProfileLocked(!isProfileLocked)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isProfileLocked
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                }`}
                title={isProfileLocked ? 'Click to UNLOCK profile fields for this user' : 'Click to LOCK profile fields for this user'}
              >
                {isProfileLocked ? (
                  <>
                    <Lock size={12} />
                    <span>Fields Locked (Click to Unlock)</span>
                  </>
                ) : (
                  <>
                    <Unlock size={12} />
                    <span>Fields Unlocked (User Can Edit)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {isProfileLocked
                ? '🔒 Primary fields (Mobile, Personal Email, LinkedIn, DOB, Date of Joining) are currently LOCKED for this user.'
                : '🔓 Fields are currently UNLOCKED. The user can freely update and re-lock their details on their profile tab.'}
            </p>

            {/* Primary Mobile & Secondary Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-zinc-500" />
                  <span>Primary Mobile Number</span>
                </label>
                <input
                  type="text"
                  value={primaryMobile}
                  onChange={(e) => setPrimaryMobile(e.target.value)}
                  placeholder="9876543210"
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-zinc-500" />
                  <span>Alternate / Emergency Mobile</span>
                </label>
                <input
                  type="text"
                  value={secondaryMobile}
                  onChange={(e) => setSecondaryMobile(e.target.value)}
                  placeholder="9123456780"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            {/* Personal Email & LinkedIn */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Mail size={12} className="text-zinc-500" />
                  <span>Personal Email Address</span>
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="personal@gmail.com"
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Linkedin size={12} className="text-zinc-500" />
                  <span>LinkedIn Handle / Profile ID</span>
                </label>
                <input
                  type="text"
                  value={linkedinProfile}
                  onChange={(e) => setLinkedinProfile(e.target.value)}
                  placeholder="e.g. mohanaradha13"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            {/* Date of Birth & Date of Joining */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-zinc-500" />
                  <span>Date of Birth</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-zinc-500" />
                  <span>Date of Joining Office</span>
                </label>
                <input
                  type="date"
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Initial Temporary Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          )}

          {/* Assigned Colleges Multi-Select */}
          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              Assigned Partner Institutions ({selectedColleges.length} Selected)
            </label>
            <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {colleges.map((c) => {
                const isSelected = selectedColleges.includes(c._id);
                return (
                  <label
                    key={c._id}
                    className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleCollege(c._id)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">
                      [{c.college_code}] {c.college_name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg font-medium border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {!loading && !isEditing && <UserPlus size={14} strokeWidth={2} aria-hidden />}
              <span>{loading ? 'Saving…' : isEditing ? 'Save User & Permissions' : 'Create User Account'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
