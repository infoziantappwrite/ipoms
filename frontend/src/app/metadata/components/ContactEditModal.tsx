'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Props {
  initialData?: any | null;
  onClose: () => void;
  onSuccess: () => void;
  onDuplicateFound: (conflict: any, pending: any, isExact: boolean) => void;
}

export function ContactEditModal({
  initialData,
  onClose,
  onSuccess,
  onDuplicateFound,
}: Props) {
  const isEditing = !!initialData?._id;

  const [companyName, setCompanyName] = useState(initialData?.company_name || '');
  const [hrName, setHrName] = useState(initialData?.hr_name || '');
  const [hrDesignation, setHrDesignation] = useState(initialData?.hr_designation || '');
  const [primaryMobile, setPrimaryMobile] = useState(initialData?.primary_mobile || '');
  const [altMobiles, setAltMobiles] = useState(
    initialData?.mobile_numbers?.filter((m: string) => m !== initialData?.primary_mobile).join(', ') || ''
  );
  const [primaryEmail, setPrimaryEmail] = useState(initialData?.primary_email || '');
  const [companyType, setCompanyType] = useState(initialData?.company_type || 'software');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(false);

  const companyTypes = [
    { id: 'software', label: 'Software' },
    { id: 'ai', label: 'AI & Data' },
    { id: 'bpo', label: 'BPO / BPM' },
    { id: 'banking', label: 'Banking' },
    { id: 'education', label: 'Education' },
    { id: 'finance', label: 'Finance' },
    { id: 'core_engineering', label: 'Core Engineering' },
    { id: 'product', label: 'Product' },
    { id: 'consulting', label: 'Consulting' },
    { id: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent, forceSave = false) => {
    if (e) e.preventDefault();

    if (!companyName.trim()) {
      alert('Company Name is required.');
      return;
    }

    setLoading(true);
    try {
      const altMobilesList = altMobiles
        .split(',')
        .map((m: string) => m.trim())
        .filter(Boolean);

      const payload = {
        company_name: companyName.trim(),
        hr_name: hrName.trim(),
        hr_designation: hrDesignation.trim(),
        primary_mobile: primaryMobile.trim(),
        mobile_numbers: Array.from(new Set([primaryMobile.trim(), ...altMobilesList].filter(Boolean))),
        primary_email: primaryEmail.trim().toLowerCase(),
        company_type: companyType,
        notes: notes.trim(),
        force_save: forceSave,
      };

      const url = isEditing ? `${API}/metadata/${initialData._id}` : `${API}/metadata`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Duplicate detected (Spec Section 7 & 11)
        const isExact = data.error?.code === 'EXACT_DUPLICATE';
        onDuplicateFound(data.error?.existing_record, payload, isExact);
        setLoading(false);
        return;
      }

      if (data.success) {
        alert(isEditing ? 'Company details updated!' : 'Company contact created successfully!');
        onSuccess();
        onClose();
      } else {
        alert(data.error?.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Save metadata error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-xl border border-border-strong shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{isEditing ? '✏️' : '➕'}</span>
            {isEditing ? 'Edit Company & HR Contact' : 'Add New Company & HR Contact'}
          </h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-white text-base">
            ✕
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 text-xs">

          {/* Company Name & Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Infosys, TCS, Microsoft"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
                required
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Company Industry Type</label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg cursor-pointer"
              >
                {companyTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* HR Name & Designation Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">HR Contact Person Name</label>
              <input
                type="text"
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">HR Designation</label>
              <input
                type="text"
                value={hrDesignation}
                onChange={(e) => setHrDesignation(e.target.value)}
                placeholder="e.g. Lead Campus Recruiter"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
              />
            </div>
          </div>

          {/* Mobile & Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-muted font-semibold mb-1">Primary Mobile Number</label>
              <input
                type="text"
                value={primaryMobile}
                onChange={(e) => setPrimaryMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
              />
            </div>

            <div>
              <label className="block text-fg-muted font-semibold mb-1">Primary Official Email</label>
              <input
                type="email"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder="e.g. hr@company.com"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg font-mono"
              />
            </div>
          </div>

          {/* Additional Mobile Numbers */}
          <div>
            <label className="block text-fg-muted font-semibold mb-1">
              Alternate Phone Numbers (Comma-separated)
            </label>
            <input
              type="text"
              value={altMobiles}
              onChange={(e) => setAltMobiles(e.target.value)}
              placeholder="e.g. 9876543211, 044-28282828"
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg font-mono text-micro"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-fg-muted font-semibold mb-1">Calling Notes & Intelligence</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes on hiring seasons, previous hiring batches, preferred colleges..."
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg "
            />
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
              className="px-5 py-2 bg-primary hover:bg-primary text-white rounded-xl font-bold shadow-md transition-colors"
            >
              {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Contact 🏢'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
