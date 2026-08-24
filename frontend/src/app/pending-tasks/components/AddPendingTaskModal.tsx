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
  'JD Received',
  'Awaiting Criteria',
  'Shortlisting Candidates',
  'Online Assessment Sent',
  'HR Round Scheduled',
  'Shortlist Shared',
  'Feedback Pending',
  'Drive Scheduled',
];

const ACTION_SUGGESTIONS = [
  'DB to be shared',
  'Drive date to be confirmed',
  'Drive date to be scheduled',
  'JD approval pending from college',
  'Shortlist confirmation awaited',
  'Follow-up with HR for drive slot',
  'Eligibility criteria clarification required',
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
        // Defaults for new task
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

  // Company Search Autocomplete handler
  const handleCompanyInput = (val: string) => {
    setCompanyName(val);
    setCompanyId(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) {
      setCompanySuggestions([]);
      setShowCompanyDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingCompany(true);
      try {
        const res = await apiFetch(`/companies/search?q=${encodeURIComponent(val.trim())}&limit=6`);
        if (res.success && Array.isArray((res.data as any)?.companies)) {
          setCompanySuggestions((res.data as any).companies);
          setShowCompanyDropdown(true);
        }
      } catch (err) {
        console.error('Company search error:', err);
      } finally {
        setIsSearchingCompany(false);
      }
    }, 250);
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
      setErrorMessage('Action to be Taken is required.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialData ? 'Edit Pending Task' : 'Add New Pending Task'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                For College: <span className="font-semibold text-indigo-600">{collegeName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Company Name (with Autocomplete) */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                placeholder="e.g. Zoho Corporation, Amazon..."
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {isSearchingCompany && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  searching...
                </span>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showCompanyDropdown && companySuggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto py-1 no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {companySuggestions.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handleSelectCompany(c)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-slate-800">{c.company_name}</span>
                      {c.domain && (
                        <span className="ml-1.5 text-[10px] text-slate-400">({c.domain})</span>
                      )}
                    </div>
                    {c.location && (
                      <span className="text-[10px] text-slate-400 shrink-0">{c.location}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 2: JD Received Date & DB Shared Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* JD Received Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                JD Received Date
              </label>
              <input
                type="date"
                value={jdReceivedDate}
                onChange={(e) => setJdReceivedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              />
            </div>

            {/* DB Shared Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>DB Shared Date</span>
                {dbSharedDate && <span className="text-[10px] text-emerald-600 font-semibold">✓ Shared</span>}
              </label>
              <input
                type="date"
                value={dbSharedDate}
                onChange={(e) => setDbSharedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Row 3: Current Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Status
            </label>
            <input
              type="text"
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              placeholder="e.g. JD Received, Shortlisting Candidates..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {CURRENT_STATUS_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCurrentStatus(s)}
                  className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    currentStatus === s ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Action to be Taken (Free text with quick suggestion chips) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Action to be Taken <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Free text • Type manually or click a suggestion below
              </span>
            </div>
            <textarea
              value={actionToBeTaken}
              onChange={(e) => setActionToBeTaken(e.target.value)}
              rows={2}
              placeholder="Type action manually (e.g., Database to be shared at the earliest, Drive date to be confirmed, etc.)..."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-medium"
            />
            {/* Quick-Click Suggestions for Action to be Taken */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ACTION_SUGGESTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setActionToBeTaken(opt)}
                  className={`text-[10px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    actionToBeTaken === opt
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  + {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: Drive Date & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Drive Date (Scheduled)
              </label>
              <input
                type="date"
                value={driveDate}
                onChange={(e) => setDriveDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes or HR contacts..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : initialData ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
