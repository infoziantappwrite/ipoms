'use client';

import { useState } from 'react';
import { Plus, Pencil, X, Building2, Briefcase } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SmoothSelect } from '@/components/ui/SmoothSelect';

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

      const endpoint = isEditing ? `/metadata/${initialData._id}` : `/metadata`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await apiFetch<any>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.error?.code === 'DUPLICATE_COMPANY' || res.error?.code === 'EXACT_DUPLICATE' || (res as any).status === 409) {
        const isExact = res.error?.code === 'EXACT_DUPLICATE';
        onDuplicateFound((res.error as any)?.existing_record, payload, isExact);
        setLoading(false);
        return;
      }

      if (res.success) {
        alert(isEditing ? 'Company details updated!' : 'Company contact created successfully!');
        onSuccess();
        onClose();
      } else {
        alert(res.error?.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Save metadata error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface text-fg rounded-2xl w-full max-w-xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <h3 className="text-sm font-bold text-fg flex items-center gap-2">
            {isEditing ? (
              <Pencil size={16} strokeWidth={2} className="text-primary" aria-hidden />
            ) : (
              <Plus size={16} strokeWidth={2} className="text-primary" aria-hidden />
            )}
            {isEditing ? 'Edit Company & HR Contact' : 'Add New Company & HR Contact'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg hover:bg-surface-sunken text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 text-xs">

          {/* Company Name & Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Infosys, TCS, Microsoft"
                className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-xs text-fg placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">Company Industry Type</label>
              <SmoothSelect
                value={companyType}
                onChange={setCompanyType}
                icon={Briefcase}
                title="Company Industry Type"
                options={companyTypes.map((t) => ({
                  value: t.id,
                  label: t.label,
                }))}
              />
            </div>
          </div>

          {/* HR Name & Designation Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">HR Contact Person Name</label>
              <input
                type="text"
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-xs text-fg placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">HR Designation</label>
              <input
                type="text"
                value={hrDesignation}
                onChange={(e) => setHrDesignation(e.target.value)}
                placeholder="e.g. Lead Campus Recruiter"
                className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-xs text-fg placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Mobile & Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">Primary Mobile Number</label>
              <input
                type="text"
                value={primaryMobile}
                onChange={(e) => setPrimaryMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-xs text-fg font-mono placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">Primary Official Email</label>
              <input
                type="email"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder="e.g. hr@company.com"
                className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-xs text-fg font-mono placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Additional Mobile Numbers */}
          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1">
              Alternate Phone Numbers (Comma-separated)
            </label>
            <input
              type="text"
              value={altMobiles}
              onChange={(e) => setAltMobiles(e.target.value)}
              placeholder="e.g. 9876543211, 044-28282828"
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-xs text-fg font-mono placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1">Calling Notes & Intelligence</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes on hiring seasons, previous hiring batches, preferred colleges..."
              className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2 text-xs text-fg placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end pt-3 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
