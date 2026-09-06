'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Calendar,
  Layers,
  Activity,
  ArrowRightCircle,
  AlertCircle,
  FileText,
  Search,
  Check,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { CharCountBadge } from '@/components/ui/CharCountBadge';
import { SmoothDatePicker } from '@/components/ui/SmoothDatePicker';
import type { PendingTaskRow } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<PendingTaskRow>) => Promise<boolean>;
  initialData?: PendingTaskRow | null;
  collegeId: string;
  collegeName: string;
}

const CURRENT_STATUS_SUGGESTIONS = [
  'Database Pending',
  'Database Shared',
  'JD Received',
  'Drive Scheduled',
  'Drive in Progress',
  'Drive Completed',
  'Awaiting TPO Approval',
  'Awaiting HR Approval',
];

const ACTION_SUGGESTIONS = [
  'JD approval pending from college',
  'Eligibility criteria clarification required',
  'DB to be shared',
  'Drive date to be confirmed',
  'Drive date to be scheduled',
  'Shortlist confirmation awaited',
  'Follow-up with HR for drive slot',
];

export function AddPendingTaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  collegeId,
  collegeName,
}: Props) {
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jdReceivedDate, setJdReceivedDate] = useState('');
  const [dbSharedDate, setDbSharedDate] = useState('');
  const [currentStatus, setCurrentStatus] = useState('JD Received');
  const [actionToBeTaken, setActionToBeTaken] = useState('');
  const [driveDate, setDriveDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Autocomplete state for Company Search
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCompanyName(initialData.company_name || '');
        setCompanyId(
          typeof initialData.company_id === 'object' && initialData.company_id
            ? initialData.company_id._id
            : (initialData.company_id as string) || null
        );
        setJdReceivedDate(
          initialData.jd_received_date
            ? new Date(initialData.jd_received_date).toISOString().split('T')[0]
            : ''
        );
        setDbSharedDate(
          initialData.db_shared_date
            ? new Date(initialData.db_shared_date).toISOString().split('T')[0]
            : ''
        );
        setCurrentStatus(initialData.current_status || 'JD Received');
        setActionToBeTaken(initialData.action_to_be_taken || '');
        setDriveDate(
          initialData.drive_date ? new Date(initialData.drive_date).toISOString().split('T')[0] : ''
        );
        setRemarks(initialData.remarks || '');
      } else {
        setCompanyName('');
        setCompanyId(null);
        setJdReceivedDate(new Date().toISOString().split('T')[0]);
        setDbSharedDate('');
        setCurrentStatus('JD Received');
        setActionToBeTaken('');
        setDriveDate('');
        setRemarks('');
      }
      setErrorMessage('');
    }
  }, [isOpen, initialData]);

  // Debounced search for companies
  const handleCompanyInput = (val: string) => {
    setCompanyName(val);
    setCompanyId(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length >= 2) {
      setIsSearchingCompany(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await apiFetch(`/companies?search=${encodeURIComponent(val.trim())}&limit=8`);
          if (res.success && Array.isArray((res.data as any)?.companies)) {
            setCompanySuggestions((res.data as any).companies);
            setShowCompanyDropdown(true);
          }
        } catch {
          setCompanySuggestions([]);
        } finally {
          setIsSearchingCompany(false);
        }
      }, 300);
    } else {
      setCompanySuggestions([]);
      setShowCompanyDropdown(false);
      setIsSearchingCompany(false);
    }
  };

  const handleSelectCompany = (comp: any) => {
    setCompanyName(comp.company_name);
    setCompanyId(comp._id);
    setShowCompanyDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMessage('Company Name is required.');
      return;
    }
    if (!actionToBeTaken.trim()) {
      setErrorMessage('Remarks / Next Action is required.');
      return;
    }
    if (actionToBeTaken.trim().length < 10) {
      setErrorMessage(
        `Remarks / Next Action must be at least 10 characters long (currently ${actionToBeTaken.trim().length}/10).`
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload: Partial<PendingTaskRow> = {
        college_id: collegeId,
        company_name: companyName.trim(),
        company_id: companyId as any,
        jd_received_date: jdReceivedDate ? (new Date(jdReceivedDate).toISOString() as any) : null,
        db_shared_date: dbSharedDate ? (new Date(dbSharedDate).toISOString() as any) : null,
        db_shared_status: dbSharedDate ? 'Shared' : 'Pending',
        current_status: currentStatus.trim() || 'JD Received',
        next_status: '',
        action_to_be_taken: actionToBeTaken.trim(),
        drive_date: driveDate ? (new Date(driveDate).toISOString() as any) : null,
        remarks: remarks.trim(),
      };

      const success = await onSubmit(payload);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save pending task.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs animate-fadeIn text-fg">
      <div
        className="bg-surface rounded-2xl shadow-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-sunken border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">
                {initialData ? 'Edit Pending Task' : 'Add New Pending Task'}
              </h2>
              <p className="text-xs text-fg-subtle font-medium">
                For College: <span className="font-semibold text-primary">{collegeName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-surface">
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Company Name (with Autocomplete) */}
          <div className="relative">
            <label className="block text-xs font-semibold text-fg mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={companyName}
                onChange={(e) => handleCompanyInput(e.target.value)}
                onFocus={() => {
                  if (companySuggestions.length > 0) setShowCompanyDropdown(true);
                }}
                placeholder="Type or select company name..."
                required
                className="w-full px-3 py-2 text-xs bg-surface-sunken border border-border rounded-lg text-fg placeholder:text-fg-disabled focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {isSearchingCompany && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle text-xs">
                  Searching...
                </span>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showCompanyDropdown && companySuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-border/60">
                {companySuggestions.map((comp) => (
                  <button
                    key={comp._id}
                    type="button"
                    onClick={() => handleSelectCompany(comp)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-primary/10 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold text-fg">{comp.company_name}</span>
                    {comp.domain && <span className="text-fg-subtle text-[11px]">{comp.domain}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 2: JD Received Date & DB Shared Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SmoothDatePicker
                label="JD Received Date"
                value={jdReceivedDate}
                onChange={setJdReceivedDate}
                variant="input"
                fullWidth
                usePortal
                clearable
                placeholder="dd-mm-yyyy"
              />
            </div>

            <div>
              <SmoothDatePicker
                label="DB Shared Date"
                value={dbSharedDate}
                onChange={setDbSharedDate}
                variant="input"
                fullWidth
                usePortal
                clearable
                placeholder="dd-mm-yyyy"
              />
            </div>
          </div>

          {/* Row 3: Current Status */}
          <div>
            <label className="block text-xs font-semibold text-fg mb-1">
              Current Status
            </label>
            <input
              type="text"
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              placeholder="e.g. Database Pending, Drive Scheduled..."
              className="w-full px-3 py-2 text-xs bg-surface-sunken border border-border rounded-lg text-fg placeholder:text-fg-disabled focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {CURRENT_STATUS_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCurrentStatus(s)}
                  className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    currentStatus === s ? 'bg-primary/20 text-primary font-semibold' : 'bg-surface-sunken hover:bg-surface-raised text-fg-muted'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Remarks / Next Action */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-fg">
                Remarks / Next Action <span className="text-rose-500">*</span>
              </label>
              <div className="text-[10px] font-medium flex items-center gap-1.5">
                <CharCountBadge length={actionToBeTaken.trim().length} min={10} />
              </div>
            </div>
            <textarea
              value={actionToBeTaken}
              onChange={(e) => setActionToBeTaken(e.target.value)}
              rows={2}
              minLength={10}
              placeholder="Type remarks or next action manually (min 10 chars, e.g., Database to be shared at the earliest, Drive date to be confirmed, etc.)..."
              required
              className={`w-full px-3 py-2 text-xs bg-surface-sunken border rounded-lg text-fg placeholder:text-fg-disabled focus:bg-surface focus:outline-none focus:ring-2 resize-none font-medium transition-colors ${
                actionToBeTaken.trim().length > 0 && actionToBeTaken.trim().length < 10
                  ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20'
                  : 'border-border focus:border-primary focus:ring-primary/20'
              }`}
            />
            {/* Quick-Click Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ACTION_SUGGESTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setActionToBeTaken(opt)}
                  className={`text-[10px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    actionToBeTaken === opt
                      ? 'bg-primary/20 border-primary/40 text-primary font-bold shadow-2xs'
                      : 'bg-surface-sunken border-border text-fg-muted hover:bg-surface-raised hover:text-fg'
                  }`}
                >
                  + {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: Drive Date & Additional Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SmoothDatePicker
                label="Drive Date (Scheduled)"
                value={driveDate}
                onChange={setDriveDate}
                variant="input"
                fullWidth
                usePortal
                clearable
                placeholder="dd-mm-yyyy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1">
                Additional Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes or HR contacts..."
                className="w-full px-3 py-2 text-xs bg-surface-sunken border border-border rounded-lg text-fg placeholder:text-fg-disabled focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : initialData ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
