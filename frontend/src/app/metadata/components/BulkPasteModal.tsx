'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Sparkles,
  ClipboardPaste,
  Database,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import {
  validateAndNormalizeIndianContact,
  validateAndNormalizeEmail,
  validateAndNormalizeMultiMobile,
  validateAndNormalizeMultiEmail,
  cleanPlaceholder,
  isPlaceholderValue,
} from '@/lib/contactValidation';
import { triggerHaptic } from '@/lib/haptics';
import { apiFetch } from '@/lib/api';

export interface ParsedMetadataExcelRow {
  id: string;
  company_name: string;
  hr_name: string;
  mobile_number: string;
  email_id: string;
  company_type?: string;
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

export interface BulkImportResultData {
  total_processed: number;
  inserted_count: number;
  merged_count: number;
  skipped_count: number;
  error_count: number;
  details: Array<{
    row_number: number;
    company_name: string;
    status: 'inserted' | 'merged' | 'skipped' | 'error';
    message: string;
  }>;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialText?: string;
}

export function BulkPasteModal({ onClose, onSuccess, initialText = '' }: Props) {
  const [rawText, setRawText] = useState(initialText);
  const [parsedRows, setParsedRows] = useState<ParsedMetadataExcelRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'preview'>('paste');
  const [metadataStatus, setMetadataStatus] = useState<{
    existing: string[];
    new: string[];
    isChecking: boolean;
  }>({ existing: [], new: [], isChecking: false });
  const [importResult, setImportResult] = useState<BulkImportResultData | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validate a single row
  const validateRow = useCallback(
    (
      raw: { company_name: string; hr_name: string; mobile_number: string; email_id: string; company_type?: string },
      id: string
    ): ParsedMetadataExcelRow => {
      const comp = cleanPlaceholder(raw.company_name);
      const hr = cleanPlaceholder(raw.hr_name) || 'HR Contact';
      const mob = cleanPlaceholder(raw.mobile_number);
      const em = cleanPlaceholder(raw.email_id).toLowerCase();
      const cType = raw.company_type || 'other';

      // 1. Mandatory Company Name validation
      const isCompanyValid = comp.length >= 2;
      const companyError = !isCompanyValid
        ? comp
          ? 'Company name is too short (min 2 chars)'
          : 'Company name is mandatory'
        : undefined;

      // 2. Mobile validation (optional if email is present, but must be valid format if provided)
      let isMobileValid = true;
      let mobileError: string | undefined;
      let normalizedMobile = '';

      if (mob) {
        const mobRes = validateAndNormalizeMultiMobile(mob);
        if (!mobRes.valid) {
          isMobileValid = false;
          mobileError = mobRes.error;
        } else {
          normalizedMobile = mobRes.normalized;
        }
      }

      // 3. Email validation (optional if mobile is present, but must be valid format if provided)
      let isEmailValid = true;
      let emailError: string | undefined;
      let normalizedEmail = '';

      if (em) {
        const emRes = validateAndNormalizeMultiEmail(em);
        if (!emRes.valid) {
          isEmailValid = false;
          emailError = emRes.error;
        } else {
          normalizedEmail = emRes.normalized;
        }
      }

      // 4. Contact point requirement: either mobile_number OR email_id must be present
      const hasContact = Boolean(normalizedMobile) || Boolean(normalizedEmail) || (mob ? isMobileValid : false) || (em ? isEmailValid : false);
      const contactError = !hasContact
        ? 'At least one contact point (Mobile or Email) is required'
        : undefined;

      // Overall row validity: Company is mandatory, at least one contact point is present, and neither is malformed
      const isValid = isCompanyValid && isMobileValid && isEmailValid && hasContact;

      return {
        id,
        company_name: comp || raw.company_name?.trim() || '',
        hr_name: hr,
        mobile_number: mob,
        email_id: em,
        company_type: cType,
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
  const checkMetadataBatch = useCallback(async (rows: ParsedMetadataExcelRow[]) => {
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

      const rows: ParsedMetadataExcelRow[] = [];

      lines.forEach((line, idx) => {
        let cols: string[] = [];
        if (line.includes('\t')) {
          cols = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        } else if (line.includes(',')) {
          cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        } else {
          cols = [line.trim()];
        }

        // Header check on first line
        if (idx === 0) {
          const first = (cols[0] || '').toLowerCase();
          if (
            first.includes('company') ||
            first.includes('organisation') ||
            first === 'sl.no' ||
            first === 's.no' ||
            (first.includes('name') && cols.length > 2)
          ) {
            return;
          }
        }

        let companyName = cleanPlaceholder(cols[0] || '');
        let hrName = 'HR Contact';
        let mobileNumber = '';
        let emailId = '';

        const remaining = cols.slice(1).map((c) => cleanPlaceholder(c)).filter((c) => c.length > 0);

        if (cols.length >= 4) {
          const c1 = cleanPlaceholder(cols[1] || '');
          const c2 = cleanPlaceholder(cols[2] || '');
          const c3 = cleanPlaceholder(cols[3] || '');

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
            }
          } else if (b.includes('@')) {
            emailId = b;
            hrName = a;
            mobileNumber = c.replace(/[^\d+]/g, '').length >= 6 ? c : '';
          } else {
            hrName = a;
            mobileNumber = b;
          }
        }

        const raw = {
          company_name: companyName,
          hr_name: cleanPlaceholder(hrName) || 'HR Contact',
          mobile_number: cleanPlaceholder(mobileNumber),
          email_id: cleanPlaceholder(emailId),
          company_type: 'other',
        };

        rows.push(validateRow(raw, `row-${idx}-${Date.now()}`));
      });

      // Sort so invalid contacts appear first at the top for immediate review & resolution
      rows.sort((a, b) => {
        if (!a.isValid && b.isValid) return -1;
        if (a.isValid && !b.isValid) return 1;
        return 0;
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
    setImportResult(null);
    if (initialText && initialText.trim()) {
      setRawText(initialText);
      parseClipboardText(initialText);
      setActiveTab('preview');
    } else {
      setRawText('');
      setParsedRows([]);
      setActiveTab('paste');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [initialText, parseClipboardText]);

  // Handle cell edit in preview
  const handleCellChange = (
    id: string,
    field: 'company_name' | 'hr_name' | 'mobile_number' | 'email_id',
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
          company_type: r.company_type,
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

  // Execute Add to Metadata
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    triggerHaptic('success');
    try {
      const payload = validRows.map((r) => ({
        company_name: r.company_name.trim(),
        hr_name: r.hr_name.trim() || 'HR Contact',
        primary_mobile: r.normalizedMobile || r.mobile_number.trim(),
        primary_email: r.normalizedEmail || r.email_id.trim().toLowerCase(),
        company_type: r.company_type || 'other',
      }));

      const res = await apiFetch<any>('/metadata/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ rows: payload }),
      });

      if (res?.success && res.data) {
        setImportResult(res.data);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ipoms_metadata_updated'));
        }
        onSuccess();
      } else {
        alert(res?.error?.message || 'Bulk paste import failed. Please try again.');
      }
    } catch (e: any) {
      console.error('Import failed', e);
      alert(e?.message || 'Network error during bulk import');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-[#161D2E] border border-border dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-fg animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-slate-50 dark:bg-[#1A2234]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-md shadow-purple-600/25 shrink-0"
              style={{ background: 'linear-gradient(180deg, #A800E6 0%, #8A00D4 50%, #6C00B8 100%)' }}
            >
              <ClipboardPaste size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-fg">Bulk Paste Metadata Contacts</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                  Master Metadata Directory
                </span>
              </div>
              <p className="text-xs text-fg-subtle">
                Column 1: Company Name • Column 2: HR Name • Column 3: Mobile Number • Column 4: Email ID
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── SUCCESS RESULT SCREEN (Step 3) ── */}
        {importResult ? (
          <div className="p-6 flex-1 flex flex-col items-center overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-md">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>

            <div className="space-y-1 text-center max-w-md">
              <h3 className="text-base font-extrabold text-fg tracking-tight">
                Import Completed Successfully!
              </h3>
              <p className="text-xs text-fg-subtle">
                <strong>{importResult.total_processed || 0} contacts</strong> were processed for the Master Metadata Directory.
              </p>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                  New Inserted
                </span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {importResult.inserted_count || 0}
                </span>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center shadow-2xs">
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 block">
                  Merged / Appended
                </span>
                <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {importResult.merged_count || 0}
                </span>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-center shadow-2xs">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block">
                  Duplicates Skipped
                </span>
                <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {importResult.skipped_count || 0}
                </span>
              </div>

              <div className="p-3 bg-surface-sunken border border-border rounded-xl text-center shadow-2xs">
                <span className="text-[11px] font-semibold text-fg-subtle block">
                  Total Processed
                </span>
                <span className="text-xl font-bold font-mono text-fg">
                  {importResult.total_processed || 0}
                </span>
              </div>
            </div>

            {/* Detailed Row-by-Row Log Table */}
            {Array.isArray(importResult.details) && importResult.details.length > 0 && (
              <div className="w-full max-w-2xl space-y-1.5 text-left">
                <h4 className="font-bold text-fg text-xs flex items-center gap-1.5">
                  <Database size={13} className="text-primary" />
                  <span>Processing Log &amp; Details:</span>
                </h4>
                <div className="max-h-48 overflow-y-auto border border-border rounded-xl overflow-hidden bg-surface">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-sunken text-fg-subtle text-[11px] uppercase font-bold sticky top-0 border-b border-border">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Company Name</th>
                        <th className="py-2 px-3 w-28 text-center">Result Status</th>
                        <th className="py-2 px-3">Action Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {importResult.details.map((item, idx) => {
                        let badge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-fg-subtle border border-border">
                            {item.status}
                          </span>
                        );

                        if (item.status === 'inserted') {
                          badge = (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Inserted
                            </span>
                          );
                        } else if (item.status === 'merged') {
                          badge = (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Appended
                            </span>
                          );
                        } else if (item.status === 'skipped') {
                          badge = (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Skipped
                            </span>
                          );
                        } else if (item.status === 'error') {
                          badge = (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Error
                            </span>
                          );
                        }

                        return (
                          <tr key={idx} className="hover:bg-surface-sunken/40">
                            <td className="py-1.5 px-3 text-center font-mono text-fg-subtle text-[11px]">
                              {item.row_number || idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-fg">
                              {item.company_name}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              {badge}
                            </td>
                            <td className="py-1.5 px-3 text-fg-muted text-[11px]">
                              {item.message}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 w-full max-w-md">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setImportResult(null);
                  setParsedRows([]);
                  setRawText('');
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-md active:scale-[0.98]"
              >
                <span>Done &amp; View in Directory</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher & Action Header */}
            <div className="px-6 pt-2 pb-0 flex items-center justify-between border-b border-border/60 bg-surface">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'border-primary text-primary bg-primary/5 font-bold'
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
                      ? 'border-primary text-primary bg-primary/5 font-bold'
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
                  className="mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer shadow-md shadow-purple-600/25 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(180deg, #A800E6 0%, #8A00D4 50%, #6C00B8 100%)' }}
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
              <div className="p-6 flex-1 flex flex-col gap-3.5 overflow-y-auto">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-fg">
                      Paste rows directly from Excel / Sheets / CSV:
                    </label>
                    {rawText && (
                      <button
                        type="button"
                        onClick={handleClearRawText}
                        className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear text
                      </button>
                    )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Example format (copy rows directly from Excel):\nSuguna Foods Pvt Limited\tMansoor Ahamed S J\t9176967025\tmansoorahamed@sugunafoods.com\nRenault Nissan\tAnchaneyalu KN\t9003213177\tanchaneyalu.kurra-nagaiah@rntbci.com\nOmega Healthcare\tArun Kumar\t9790759083\tarun@omegahealthcare.com\nCaresoft Global\tJayakumar\t9840123456\tjayakumar@caresoft.com`}
                    rows={10}
                    className="w-full flex-1 min-h-[220px] p-3.5 rounded-xl border border-border bg-surface text-xs font-mono text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled resize-none leading-relaxed shadow-inner"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: 4-Column Review & Validation Table */}
            {activeTab === 'preview' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-4">
                  <table className="w-full text-left text-xs border-collapse border border-border rounded-lg overflow-hidden">
                    <thead className="bg-surface-sunken text-fg-subtle font-semibold border-b border-border select-none uppercase tracking-wider text-[10.5px] sticky top-0 z-10">
                      <tr>
                        <th className="p-2 w-10 text-center">#</th>
                        <th className="p-2 w-[26%]">Company Name *</th>
                        <th className="p-2 w-[20%]">HR Name</th>
                        <th className="p-2 w-[22%]">Contact Number</th>
                        <th className="p-2 w-[22%]">Email ID</th>
                        <th className="p-2 w-12 text-center">Status</th>
                        <th className="p-2 w-10 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface font-sans">
                      {parsedRows.map((row, idx) => {
                        const normComp = row.company_name.trim().replace(/\s+/g, ' ').toLowerCase();
                        const isExistingInMeta = metadataStatus.existing.some(
                          (n) => n.trim().replace(/\s+/g, ' ').toLowerCase() === normComp
                        );
                        const isNewToMeta = !isExistingInMeta && metadataStatus.new.some(
                          (n) => n.trim().replace(/\s+/g, ' ').toLowerCase() === normComp
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

                            {/* Column 1: Company Name */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.company_name}
                                onChange={(e) => handleCellChange(row.id, 'company_name', e.target.value)}
                                placeholder="Company Name *"
                                className={`w-full px-2.5 py-1 rounded-lg border text-xs font-semibold outline-none transition-all ${
                                  !row.isCompanyValid
                                    ? 'border-destructive bg-destructive/10 text-destructive focus:ring-1 focus:ring-destructive'
                                    : 'border-border bg-surface text-fg focus:border-primary focus:ring-1 focus:ring-primary'
                                }`}
                              />
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {row.companyError && (
                                  <span className="text-[10px] text-destructive font-medium">{row.companyError}</span>
                                )}
                                {row.isCompanyValid && (
                                  <span
                                    className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                      isNewToMeta
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                        : isExistingInMeta
                                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                        : metadataStatus.isChecking
                                        ? 'bg-slate-500/10 text-fg-subtle border border-border'
                                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                    }`}
                                  >
                                    {isNewToMeta
                                      ? '✨ New to Metadata'
                                      : isExistingInMeta
                                      ? '🏢 In Metadata Base'
                                      : metadataStatus.isChecking
                                      ? 'Checking…'
                                      : '✨ New to Metadata'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Column 2: HR Name */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.hr_name}
                                onChange={(e) => handleCellChange(row.id, 'hr_name', e.target.value)}
                                placeholder="HR Contact (Optional)"
                                className="w-full px-2.5 py-1 rounded-lg border border-border bg-surface text-xs text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                              />
                            </td>

                            {/* Column 3: Contact Number */}
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
                                className={`w-full px-2.5 py-1 rounded-lg border font-mono text-xs outline-none transition-all ${
                                  !row.isMobileValid
                                    ? 'border-destructive bg-destructive/10 text-destructive focus:ring-1 focus:ring-destructive'
                                    : !row.hasContact
                                    ? 'border-amber-400/70 bg-amber-500/5 text-fg focus:border-primary focus:ring-1 focus:ring-primary'
                                    : 'border-border bg-surface text-fg focus:border-primary focus:ring-1 focus:ring-primary'
                                }`}
                              />
                              {row.mobileError ? (
                                <div className="text-[10px] text-destructive mt-0.5 font-medium">{row.mobileError}</div>
                              ) : !row.hasContact ? (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                  ⚠️ Mobile or Email required
                                </div>
                              ) : row.normalizedMobile && row.normalizedMobile !== row.mobile_number ? (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                                  ✓ {row.normalizedMobile}
                                </div>
                              ) : null}
                            </td>

                            {/* Column 4: Email ID */}
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
                                className={`w-full px-2.5 py-1 rounded-lg border text-xs outline-none transition-all ${
                                  !row.isEmailValid
                                    ? 'border-destructive bg-destructive/10 text-destructive focus:ring-1 focus:ring-destructive'
                                    : !row.hasContact
                                    ? 'border-amber-400/70 bg-amber-500/5 text-fg focus:border-primary focus:ring-1 focus:ring-primary'
                                    : 'border-border bg-surface text-fg focus:border-primary focus:ring-1 focus:ring-primary'
                                }`}
                              />
                              {row.emailError ? (
                                <div className="text-[10px] text-destructive mt-0.5 font-medium">{row.emailError}</div>
                              ) : !row.hasContact ? (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                  ⚠️ Mobile or Email required
                                </div>
                              ) : row.normalizedEmail && row.normalizedEmail !== row.email_id ? (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                                  ✓ {row.normalizedEmail}
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
                    Ready to add <strong className="text-fg">{validCount}</strong> of <strong className="text-fg">{parsedRows.length}</strong> row{parsedRows.length > 1 ? 's' : ''} into metadata database.
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
                          <span>Adding to Metadata…</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle size={14} />
                          <span>Add to Metadata ({validCount})</span>
                        </>
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
