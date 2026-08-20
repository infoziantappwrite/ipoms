'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
  const [selectedRole, setSelectedRole] = useState(initialData?.role_codes?.[0] || 'COORDINATOR');
  const [selectedColleges, setSelectedColleges] = useState<string[]>(
    initialData?.assigned_college_ids?.map((c: any) => (typeof c === 'object' ? c._id : c)) || []
  );
  const [accountStatus, setAccountStatus] = useState(initialData?.account_status || 'active');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch colleges and roles
    Promise.all([
      fetch(`${API}/colleges`).then((r) => r.json()),
      fetch(`${API}/roles`).then((r) => r.json()),
    ])
      .then(([colData, roleData]) => {
        if (colData.success) setColleges(colData.data.colleges);
        if (roleData.success) setRoles(roleData.data.roles);
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
        role_codes: [selectedRole],
        assigned_college_ids: selectedColleges,
        account_status: accountStatus,
      };

      if (!isEditing) {
        payload.password = password;
      }

      const url = isEditing ? `${API}/users/${initialData._id}` : `${API}/users`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert(isEditing ? 'User profile updated!' : 'New user account created successfully!');
        onSuccess();
        onClose();
      } else {
        alert(data.error?.message || 'Operation failed');
      }
    } catch (err) {
      console.error('User save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 scrim flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-xl border border-border-strong shadow-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{isEditing ? '✏️' : '➕'}</span>
            {isEditing ? 'Edit User & Permissions' : 'Create New User Account'}
          </h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-white text-base">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priyadharshini K"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
                required
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Login Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. priyadharshini.k"
                disabled={isEditing}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg font-mono disabled:opacity-60"
                required
              />
            </div>
          </div>

          {/* Email & Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Official Email *</label>
              <input
                type="email"
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
                placeholder="name@infoziant.com"
                disabled={isEditing}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg font-mono disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Primary Mobile Number</label>
              <input
                type="text"
                value={primaryMobile}
                onChange={(e) => setPrimaryMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
              />
            </div>
          </div>

          {/* Role & Account Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">System Role *</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
              >
                <option value="COORDINATOR">Placement Coordinator</option>
                <option value="TEAM_LEADER">Team Leader</option>
                <option value="ADMINISTRATOR">Administrator (CEO / Director)</option>
                <option value="TPO">Training & Placement Officer (TPO)</option>
              </select>
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Account Status</label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer capitalize"
              >
                <option value="active">Active (Full Access)</option>
                <option value="inactive">Inactive / On Leave</option>
                <option value="blocked">Blocked</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Initial Temporary Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg font-mono text-micro"
              />
            </div>
          )}

          {/* Assigned Colleges Multi-Select */}
          <div>
            <label className="block text-fg-muted font-semibold mb-1">
              Assigned Partner Institutions ({selectedColleges.length} Selected)
            </label>
            <div className="max-h-36 overflow-y-auto bg-background border border-border rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {colleges.map((c) => {
                const isSelected = selectedColleges.includes(c._id);
                return (
                  <label
                    key={c._id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-micro cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/60 text-primary border border-primary/50' : 'text-fg-subtle hover:bg-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleCollege(c._id)}
                      className="rounded bg-surface border-border-strong text-primary "
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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg-muted rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-2 transition-colors"
            >
              {loading ? 'Saving…' : isEditing ? 'Save User' : 'Create User Account 👥'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
