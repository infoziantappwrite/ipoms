'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Sparkles,
  ClipboardPaste,
  HelpCircle,
  Database,
  ArrowRight,
  Building2,
  User,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import {
  validateAndNormalizeIndianContact,
  validateAndNormalizeEmail,
} from '@/lib/contactValidation';
import { triggerHaptic } from '@/lib/haptics';
import { apiFetch } from '@/lib/api';

export interface ParsedExcelRow {
  id: string;
  company_name: string;
  hr_name: string;
  mobile_number: string;
  email_id: string;
  comments?: string;
  isCompanyValid: boolean;
  companyError?: string;
  isMobileValid: boolean;
  mobileError?: string;
  normalizedMobile?: string;
  isEmailValid: boolean;
  emailError?: string;
  normalizedEmail?: string;
  hasContact: boolean;
  contactError?: string;
  isValid: boolean;
}

export interface ImportResultData {
  created_count: number;
  duplicates_skipped: number;
  new_metadata_count: number;
  new_metadata_companies: Array<{
    _id: string;
    serial_number: number;
    company_name: string;
    hr_name: string;
    primary_mobile: string;
    primary_email: string;
  }>;
  new_metadata_ids: string[];
  existing_metadata_count: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    rows: Array<{ company_name: string; hr_name: string; mobile_number: string; email_id: string; comments?: string }>
  ) => Promise<any>;
  collegeName: string;
  initialText?: string;
}

export function ExcelPasteModal({ isOpen, onClose, onImport, collegeName, initialText = '' }: Props) {
  const router = useRouter();
  const [rawText, setRawText] = useState(initialText);
  const [parsedRows, setParsedRows] = useState<ParsedExcelRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'preview'>('paste');
  const [metadataStatus, setMetadataStatus] = useState<{
    existing: string[];
    new: string[];
    isChecking: boolean;
  }>({ existing: [], new: [], isChecking: false });
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validate a single row
  const validateRow = useCallback(
    (
      raw: { company_name: string; hr_name: string; mobile_number: string; email_id: string; comments?: string },
      id: string
    ): ParsedExcelRow => {
      const comp = raw.company_name?.trim() || '';
      const hr = raw.hr_name?.trim() || 'HR Contact';
      const mob = raw.mobile_number?.trim() || '';
      const em = raw.email_id?.trim().toLowerCase() || '';
      const comm = raw.comments?.trim() || '';

      // 1. Mandatory Company Name validation
      const isCompanyValid = comp.length >= 2;
      const companyError = !isCompanyValid ? (comp ? 'Company name is too short (min 2 chars)' : 'Company name is mandatory') : undefined;

      // 2. Mobile validation (optional if email is present, but must be valid format if provided)
      let isMobileValid = true;
      let mobileError: string | undefined;
      let normalizedMobile = mob;

      if (mob) {
        const mobList = mob.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
        const normalizedList: string[] = [];
        for (const m of mobList) {
          const res = validateAndNormalizeIndianContact(m);
          if (!res.valid) {
            isMobileValid = false;
            mobileError = res.error || `Invalid contact number: "${m}"`;
            break;
          } else {
            normalizedList.push(res.normalized);
          }
        }
        if (isMobileValid) {
          normalizedMobile = normalizedList.join(', ');
        }
      }

      // 3. Email validation (optional if mobile is present, but must be valid format if provided)
      let isEmailValid = true;
      let emailError: string | undefined;
      let normalizedEmail = em;

      if (em) {
        const emList = em.split(/[,;/]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
        const normalizedEmList: string[] = [];
        for (const e of emList) {
          const res = validateAndNormalizeEmail(e);
          if (!res.valid) {
            isEmailValid = false;
            emailError = res.error || `Invalid email ID: "${e}"`;
            break;
          } else {
            normalizedEmList.push(res.normalized);
          }
        }
        if (isEmailValid) {
          normalizedEmail = normalizedEmList.join(', ');
        }
      }

      // 4. Contact point requirement: either mobile_number OR email_id must be present
      const hasContact = Boolean(mob) || Boolean(em);
      const contactError = !hasContact ? 'At least one contact point (Mobile or Email) is required' : undefined;

      // Overall row validity: Company is mandatory, at least one contact point is present, and neither is malformed
      const isValid = isCompanyValid && isMobileValid && isEmailValid && hasContact;

      return {
        id,
        company_name: comp,
        hr_name: hr,
        mobile_number: mob,
        email_id: em,
        comments: comm,
        isCompanyValid,
        companyError,
        isMobileValid,
        mobileError,
        normalizedMobile,
        isEmailValid,
        emailError,
        normalizedEmail,
        hasContact,
        contactError,
        isValid,
      };
    },
    []
  );

  // Check metadata database for existing vs new companies in background
  const checkMetadataBatch = useCallback(async (rows: ParsedExcelRow[]) => {
    const validNames = rows
      .filter((r) => r.isCompanyValid && r.company_name.trim())
      .map((r) => r.company_name.trim());

    if (validNames.length === 0) {
      setMetadataStatus({ existing: [], new: [], isChecking: false });
      return;
    }

    setMetadataStatus((prev) => ({ ...prev, isChecking: true }));
    try {
      const res = await apiFetch<any>('/daily-tracker/check-metadata-batch', {
        method: 'POST',
        body: JSON.stringify({ company_names: validNames }),
      });
      if (res.success && res.data) {
        setMetadataStatus({
          existing: res.data.existing_names || [],
          new: res.data.new_names || [],
          isChecking: false,
        });
      } else {
        setMetadataStatus({ existing: [], new: validNames, isChecking: false });
      }
    } catch {
      setMetadataStatus({ existing: [], new: validNames, isChecking: false });
    }
  }, []);

  // Parse raw text into structured rows
  const parseClipboardText = useCallback(
    (text: string) => {
      if (!text || !text.trim()) {
        setParsedRows([]);
        return;
      }

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const rows: ParsedExcelRow[] = [];

      lines.forEach((line, idx) => {
        let cols: string[] = [];
        if (line.includes('\t')) {
          cols = line.split('\t').map((c) => c.trim());
        } else if (line.includes(',')) {
          cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        } else {
          cols = [line];
        }

        // Header check
        if (idx === 0) {
          const first = (cols[0] || '').toLowerCase();
          if (
            first.includes('company') ||
            first.includes('organisation') ||
            (first.includes('name') && cols.length > 2)
          ) {
            return;
          }
        }

        let companyName = cols[0] || '';
        let hrName = 'HR Contact';
        let mobileNumber = '';
        let emailId = '';
        let comments = '';

        const remaining = cols.slice(1).map((c) => c.trim()).filter((c) => c.length > 0);

        if (cols.length >= 4) {
          const c1 = cols[1] || '';
          const c2 = cols[2] || '';
          const c3 = cols[3] || '';
          comments = cols.slice(4).join(' ').trim();

          if (c1.includes('@')) {
            emailId = c1;
            hrName = 'HR Contact';
            mobileNumber = c2.replace(/[^\d+]/g, '').length >= 5 ? c2 : c3;
          } else if (c2.includes('@') && (c3.replace(/[^\d+]/g, '').length >= 5 || !c3)) {
            hrName = c1 || 'HR Contact';
            emailId = c2;
            mobileNumber = c3;
          } else {
            hrName = c1 || 'HR Contact';
            mobileNumber = c2;
            emailId = c3;
          }
        } else if (remaining.length === 1) {
          const item = remaining[0];
          if (item.includes('@')) {
            emailId = item;
          } else if (item.replace(/[^\d+]/g, '').length >= 6) {
            mobileNumber = item;
          } else {
            hrName = item;
          }
        } else if (remaining.length === 2) {
          const [a, b] = remaining;
          if (a.includes('@')) {
            emailId = a;
            mobileNumber = b.replace(/[^\d+]/g, '').length >= 6 ? b : '';
            hrName = !mobileNumber ? b : 'HR Contact';
          } else if (b.includes('@')) {
            emailId = b;
            if (a.replace(/[^\d+]/g, '').length >= 6) {
              mobileNumber = a;
            } else {
              hrName = a;
            }
          } else if (a.replace(/[^\d+]/g, '').length >= 6) {
            mobileNumber = a;
            hrName = b;
          } else if (b.replace(/[^\d+]/g, '').length >= 6) {
            hrName = a;
            mobileNumber = b;
          } else {
            hrName = a;
            comments = b;
          }
        } else if (remaining.length === 3) {
          const [a, b, c] = remaining;
          if (c.includes('@')) {
            emailId = c;
            if (b.replace(/[^\d+]/g, '').length >= 6) {
              hrName = a;
              mobileNumber = b;
            } else if (a.replace(/[^\d+]/g, '').length >= 6) {
              mobileNumber = a;
              hrName = b;
            } else {
              hrName = a;
              comments = b;
            }
          } else if (b.includes('@')) {
            emailId = b;
            hrName = a;
            mobileNumber = c.replace(/[^\d+]/g, '').length >= 6 ? c : '';
          } else {
            hrName = a;
            mobileNumber = b;
            comments = c;
          }
        }

        const raw = {
          company_name: companyName,
          hr_name: hrName || 'HR Contact',
          mobile_number: mobileNumber,
          email_id: emailId,
          comments: comments,
        };

        rows.push(validateRow(raw, `row-${idx}-${Date.now()}`));
      });

      setParsedRows(rows);
      if (rows.length > 0) {
        checkMetadataBatch(rows);
      }
    },
    [validateRow, checkMetadataBatch]
  );

  const handleReviewAndValidate = useCallback(() => {
    if (!rawText || !rawText.trim()) return;
    triggerHaptic('selection');
    parseClipboardText(rawText);
    setActiveTab('preview');
  }, [rawText, parseClipboardText]);

  const handleClearRawText = useCallback(() => {
    triggerHaptic('light');
    setRawText('');
    setParsedRows([]);
  }, []);

  // Initial load handler
  useEffect(() => {
    if (isOpen) {
      setImportResult(null);
      if (initialText) {
        setRawText(initialText);
      } else {
        setRawText('');
        setParsedRows([]);
        setActiveTab('paste');
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  }, [isOpen, initialText]);

  // Handle cell edit in preview
  const handleCellChange = (
    id: string,
    field: 'company_name' | 'hr_name' | 'mobile_number' | 'email_id' | 'comments',
    value: string
  ) => {
    setParsedRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const updated = {
          company_name: field === 'company_name' ? value : r.company_name,
          hr_name: field === 'hr_name' ? value : r.hr_name,
          mobile_number: field === 'mobile_number' ? value : r.mobile_number,
          email_id: field === 'email_id' ? value : r.email_id,
          comments: field === 'comments' ? value : r.comments,
        };
        return validateRow(updated, id);
      });
      if (field === 'company_name') {
        checkMetadataBatch(next);
      }
      return next;
    });
  };

  const handleDeleteRow = (id: string) => {
    triggerHaptic('light');
    setParsedRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      checkMetadataBatch(next);
      return next;
    });
  };

  const handleClearInvalidRows = () => {
    triggerHaptic('selection');
    setParsedRows((prev) => {
      const next = prev.filter((r) => r.isValid);
      checkMetadataBatch(next);
      return next;
    });
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  // Execute import & display result summary
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    triggerHaptic('success');
    try {
      const res = await onImport(
        validRows.map((r) => ({
          company_name: r.company_name,
          hr_name: r.hr_name || 'HR Contact',
          mobile_number: r.normalizedMobile || r.mobile_number,
          email_id: r.normalizedEmail || r.email_id,
          comments: r.comments,
        }))
      );

      if (res?.success && res.data) {
        setImportResult({
          created_count: res.data.created_count || validRows.length,
          duplicates_skipped: res.data.duplicates_skipped || 0,
          new_metadata_count: res.data.new_metadata_count || 0,
          new_metadata_companies: res.data.new_metadata_companies || [],
          new_metadata_ids: res.data.new_metadata_ids || [],
          existing_metadata_count: res.data.existing_metadata_count || 0,
        });
      } else {
        onClose();
      }
    } catch (e) {
      console.error('Import failed', e);
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  // Direct paste from browser clipboard
  const handleReadClipboard = async () => {
    try {
      triggerHaptic('selection');
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
      }
    } catch {
      textareaRef.current?.focus();
    }
  };

  // Navigate to Metadata page with highlighted records
  const handleGoToMetadata = () => {
    triggerHaptic('selection');
    onClose();
    if (importResult?.new_metadata_ids && importResult.new_metadata_ids.length > 0) {
      router.push(`/metadata?recent=true&highlight=${importResult.new_metadata_ids.join(',')}`);
    } else {
      router.push('/metadata');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-[#161D2E] border border-border dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-fg animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-slate-50 dark:bg-[#1A2234]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-2xs">
              <FileSpreadsheet size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-fg">Paste from Excel / Google Sheets</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                  {collegeName}
                </span>
              </div>
              <p className="text-xs text-fg-subtle">
                <span className="font-semibold text-fg">COMPANY NAME</span> (Mandatory) + <span className="font-semibold text-fg">MOBILE NUMBER</span> or <span className="font-semibold text-fg">EMAIL ID</span> (At least 1 required) • HR Name is optional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── SUCCESS RESULT SCREEN (Step 3) ── */}
        {importResult ? (
          <div className="p-8 flex-1 flex flex-col items-center justify-center text-center overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg animate-bounce">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-extrabold text-fg tracking-tight">
                Import Completed Successfully!
              </h3>
              <p className="text-xs text-fg-subtle">
                <strong>{importResult.created_count} contacts</strong> were loaded into today&apos;s Daily Tracker workspace for <strong>{collegeName}</strong>.
              </p>
            </div>

            {/* Metadata Auto-Save Card */}
            <div className="w-full max-w-xl p-5 sm:p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 text-left space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-100">
                    Corporate Metadata Base Auto-Sync
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 shrink-0">
                  {importResult.new_metadata_count > 0 ? `${importResult.new_metadata_count} New Saved` : 'All Existed'}
                </span>
              </div>

              {importResult.new_metadata_count > 0 ? (
                <>
                  <p className="text-xs text-emerald-800 dark:text-emerald-200/90 leading-relaxed">
                    ✨ <strong>{importResult.new_metadata_count} new contact{importResult.new_metadata_count > 1 ? 's' : ''}</strong> were not previously found in the metadata catalog and have been <strong>automatically registered and saved to the Company Metadata Base</strong> with their phone numbers and email IDs!
                  </p>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                    {importResult.new_metadata_companies.map((c, i) => (
                      <div
                        key={c._id || i}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20 text-xs text-fg"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            #{c.serial_number}
                          </span>
                          <span className="font-bold truncate">{c.company_name}</span>
                          <span className="text-fg-subtle text-[11px]">({c.hr_name})</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {c.primary_mobile || c.primary_email}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-emerald-800 dark:text-emerald-200/80 leading-relaxed">
                  All {importResult.created_count} imported company contacts already existed in the Company Metadata Database. Existing records were verified.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2 w-full max-w-md">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Continue in Tracker
              </button>

              <button
                type="button"
                onClick={handleGoToMetadata}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-[0.98] ring-2 ring-emerald-500/30"
              >
                <Database size={14} />
                <span>View in Metadata Base</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher & Action Header in Single Clean Row */}
            <div className="px-6 pt-2 pb-0 flex items-center justify-between border-b border-border/60 bg-surface">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-fg-subtle hover:text-fg'
                  }`}
                >
                  1. Paste Raw Data
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  disabled={parsedRows.length === 0}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'preview'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-fg-subtle hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <span>2. Review &amp; Validate</span>
                  {parsedRows.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        invalidCount === 0
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {parsedRows.length}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === 'paste' ? (
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <ClipboardPaste size={13} /> Paste from Clipboard
                </button>
              ) : parsedRows.length > 0 ? (
                <div className="flex items-center gap-4 text-xs pb-1.5">
                  <div className="flex items-center gap-3 font-semibold">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={13} /> {validCount} Valid
                    </span>
                    {invalidCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle size={13} /> {invalidCount} Need Fix
                      </span>
                    )}
                  </div>

                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearInvalidRows}
                      className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 font-semibold cursor-pointer underline ml-1"
                    >
                      <Trash2 size={12} /> Remove {invalidCount} Invalid Row{invalidCount > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {/* Tab 1: Paste Input */}
            {activeTab === 'paste' && (
              <div className="p-6 flex-1 flex flex-col gap-3 overflow-y-auto">
                <textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Example format (copy rows directly from Excel):\nSuguna Foods Pvt Limited\tMansoor Ahamed S J\t9176967025\tmansoorahamed@sugunafoods.com\nRenault Nissan\tAnchaneyalu KN\t9003213177\tanchaneyalu.kurra-nagaiah@rntbci.com\nOmega Healthcare\t\t9790759083\nCaresoft Global\t\t\tjayakumar@caresoft.com`}
                  rows={12}
                  className="w-full flex-1 min-h-[280px] p-3.5 rounded-xl border border-border bg-surface text-xs font-mono text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled resize-none"
                />
              </div>
            )}

            {/* Tab 2: Preview & Validation Grid */}
            {activeTab === 'preview' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Table */}
                <div className="flex-1 overflow-auto p-4">
                  <table className="w-full text-left text-xs border-collapse border border-border rounded-lg overflow-hidden">
                    <thead className="bg-surface-sunken text-fg-subtle font-semibold border-b border-border select-none uppercase tracking-wider text-[10.5px]">
                      <tr>
                        <th className="p-2 w-10 text-center">#</th>
                        <th className="p-2 w-[24%]">Company Name *</th>
                        <th className="p-2 w-[18%]">HR Name</th>
                        <th className="p-2 w-[22%]">Contact Number</th>
                        <th className="p-2 w-[22%]">Email ID</th>
                        <th className="p-2 w-12 text-center">Status</th>
                        <th className="p-2 w-10 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {parsedRows.map((row, idx) => {
                        const isNewToMeta = metadataStatus.new.some(
                          (n) => n.toLowerCase() === row.company_name.trim().toLowerCase()
                        );
                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors ${
                              !row.isValid ? 'bg-amber-500/5 dark:bg-amber-500/10' : 'hover:bg-surface-raised'
                            }`}
                          >
                            {/* S.No */}
                            <td className="p-2 text-center text-fg-subtle font-mono text-[11px]">{idx + 1}</td>

                            {/* Company Name */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.company_name}
                                onChange={(e) => handleCellChange(row.id, 'company_name', e.target.value)}
                                placeholder="Company Name"
                                className={`w-full px-2 py-1 rounded border text-xs outline-none focus:ring-1 ${
                                  !row.isCompanyValid
                                    ? 'border-destructive bg-destructive/10 text-destructive focus:ring-destructive'
                                    : 'border-border bg-surface text-fg focus:border-primary focus:ring-primary'
                                }`}
                              />
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {row.companyError && (
                                  <span className="text-[10px] text-destructive">{row.companyError}</span>
                                )}
                                {row.isCompanyValid && (
                                  <span
                                    className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                      isNewToMeta
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                    }`}
                                  >
                                    {isNewToMeta ? '✨ New to Metadata' : '🏢 In Metadata Base'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* HR Name */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.hr_name}
                                onChange={(e) => handleCellChange(row.id, 'hr_name', e.target.value)}
                                placeholder="HR Contact (Optional)"
                                className="w-full px-2 py-1 rounded border border-border bg-surface text-xs text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              />
                            </td>

                            {/* Contact Number */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.mobile_number}
                                onChange={(e) => handleCellChange(row.id, 'mobile_number', e.target.value)}
                                placeholder={
                                  row.email_id
                                    ? 'Mobile / Phone (Optional)'
                                    : !row.hasContact
                                    ? 'Mobile (or enter Email)'
                                    : 'Mobile / Phone'
                                }
                                className={`w-full px-2 py-1 rounded border font-mono text-xs outline-none focus:ring-1 ${
                                  !row.isMobileValid
                                    ? 'border-destructive bg-destructive/10 text-destructive focus:ring-destructive'
                                    : !row.hasContact
                                    ? 'border-amber-400/70 bg-amber-500/5 text-fg focus:border-primary focus:ring-primary'
                                    : 'border-border bg-surface text-fg focus:border-primary focus:ring-primary'
                                }`}
                              />
                              {row.mobileError ? (
                                <div className="text-[10px] text-destructive mt-0.5">{row.mobileError}</div>
                              ) : !row.hasContact ? (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                  ⚠️ Mobile or Email required
                                </div>
                              ) : row.normalizedMobile && row.normalizedMobile !== row.mobile_number ? (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  ✓ Formatted: {row.normalizedMobile}
                                </div>
                              ) : null}
                            </td>

                            {/* Email ID */}
                            <td className="p-1.5">
                              <input
                                type="email"
                                value={row.email_id}
                                onChange={(e) => handleCellChange(row.id, 'email_id', e.target.value)}
                                placeholder={
                                  row.mobile_number
                                    ? 'Email Address (Optional)'
                                    : !row.hasContact
                                    ? 'Email (or enter Mobile)'
                                    : 'Email Address'
                                }
                                className={`w-full px-2 py-1 rounded border text-xs outline-none focus:ring-1 ${
                                  !row.isEmailValid
                                    ? 'border-destructive bg-destructive/10 text-destructive focus:ring-destructive'
                                    : !row.hasContact
                                    ? 'border-amber-400/70 bg-amber-500/5 text-fg focus:border-primary focus:ring-primary'
                                    : 'border-border bg-surface text-fg focus:border-primary focus:ring-primary'
                                }`}
                              />
                              {row.emailError ? (
                                <div className="text-[10px] text-destructive mt-0.5">{row.emailError}</div>
                              ) : !row.hasContact ? (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                  ⚠️ Mobile or Email required
                                </div>
                              ) : row.normalizedEmail && row.normalizedEmail !== row.email_id ? (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  ✓ Suggested: {row.normalizedEmail}
                                </div>
                              ) : null}
                            </td>

                            {/* Status Icon */}
                            <td className="p-2 text-center">
                              {row.isValid ? (
                                <span title="Row is valid and ready to import">
                                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 mx-auto" />
                                </span>
                              ) : (
                                <span
                                  title={
                                    !row.isCompanyValid
                                      ? (row.companyError || 'Company name is mandatory')
                                      : !row.hasContact
                                      ? 'At least one contact point (Mobile Number or Email ID) is required'
                                      : !row.isMobileValid
                                      ? (row.mobileError || 'Invalid contact number')
                                      : (row.emailError || 'Invalid email ID')
                                  }
                                >
                                  <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 mx-auto cursor-help" />
                                </span>
                              )}
                            </td>

                            {/* Action (Delete row) */}
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                title="Delete this row"
                                className="w-6 h-6 rounded flex items-center justify-center text-fg-subtle hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer mx-auto"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/80 flex items-center justify-between bg-slate-50 dark:bg-[#1A2234]">
              <div className="text-xs text-fg-subtle">
                {activeTab === 'paste' ? (
                  <span>Paste tabular data from Excel/Sheets, then click Review &amp; Validate to proceed.</span>
                ) : (
                  <span>
                    Ready to import <strong className="text-fg">{validCount}</strong> of <strong className="text-fg">{parsedRows.length}</strong> row{parsedRows.length > 1 ? 's' : ''} into today&apos;s tracker.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {activeTab === 'paste' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleClearRawText}
                      disabled={!rawText}
                      className="px-4 py-2 rounded-xl border border-border bg-surface text-fg hover:bg-surface-raised text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      disabled={!rawText || !rawText.trim()}
                      onClick={handleReviewAndValidate}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      Review &amp; Validate
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('paste')}
                      disabled={isImporting}
                      className="px-4 py-2 rounded-xl border border-border bg-surface text-fg hover:bg-surface-raised text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      Back to Edit
                    </button>

                    <button
                      type="button"
                      disabled={validCount === 0 || isImporting}
                      onClick={handleExecuteImport}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Importing…
                        </>
                      ) : (
                        <span>Import to Tracker</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
