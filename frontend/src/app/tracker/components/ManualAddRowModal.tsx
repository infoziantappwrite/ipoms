'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  Building2,
  User,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Loader2,
  Database,
  Search,
  ChevronRight,
  ChevronDown,
  Timer,
  Lock,
  Calendar,
  Check,
  Info,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';
import type { CallOutcome, TrackerRow } from '../page';
import { ROW_OUTCOMES, type RowOutcomeOption } from './RowOutcomeDropdown';
import { MONTHS } from './TrackerRow';
import { MultiTagInput } from '@/components/ui/MultiTagInput';
import {
  validateAndNormalizeIndianMobile,
  validateAndNormalizeEmail,
} from '@/lib/contactValidation';

interface Props {
  coordinatorId: string;
  collegeId: string;
  sessionDate?: string;
  onClose: () => void;
  onRowAdded: (newRow: TrackerRow) => void;
}

// Helper: format duration seconds to "01m 24s"
function formatDurationSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// Helper: detect if a company record in database is an incomplete placeholder
function getCompanyMissingDetails(comp: any) {
  if (!comp) return { isPlaceholder: false, missing: [], hasMobile: false, hasEmail: false, hasHr: false };

  const hasMobile = Boolean(
    (comp.primary_mobile && comp.primary_mobile.trim()) ||
    (Array.isArray(comp.mobile_numbers) && comp.mobile_numbers.some((m: string) => m && m.trim()))
  );
  const hasEmail = Boolean(
    (comp.primary_email && comp.primary_email.trim()) ||
    (Array.isArray(comp.email_ids) && comp.email_ids.some((e: string) => e && e.trim()))
  );
  const hasHr = Boolean(
    (comp.hr_name &&
      comp.hr_name.trim() !== '' &&
      comp.hr_name.trim().toLowerCase() !== 'hr contact' &&
      comp.hr_name.trim().toLowerCase() !== 'contact') ||
    (Array.isArray(comp.hr_names) && comp.hr_names.some((h: string) => h && h.trim()))
  );

  const missing: string[] = [];
  if (!hasMobile) missing.push('Mobile Number');
  if (!hasEmail) missing.push('Email ID');
  if (!hasHr) missing.push('HR Contact Name');

  return {
    isPlaceholder: missing.length > 0,
    missing,
    hasMobile,
    hasEmail,
    hasHr,
  };
}

// Helper: smart parse time string or return current date
function parseTimeToDate(timeStr: string, baseDate?: Date): Date {
  const target = baseDate ? new Date(baseDate) : new Date();
  if (!timeStr || !timeStr.trim()) return target;

  const raw = timeStr.trim();
  let explicitPeriod: 'AM' | 'PM' | null = null;
  if (/\b(am|a)\b/i.test(raw) || raw.toUpperCase().endsWith('AM') || raw.toUpperCase().endsWith('A')) {
    explicitPeriod = 'AM';
  } else if (/\b(pm|p)\b/i.test(raw) || raw.toUpperCase().endsWith('PM') || raw.toUpperCase().endsWith('P')) {
    explicitPeriod = 'PM';
  }

  const clean = raw.replace(/[a-zA-Z]/g, '').trim();
  const parts = clean.split(/[:.]/).map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    let h = parts[0];
    const m = Math.min(59, Math.max(0, parts[1]));
    const s = parts[2] ? Math.min(59, Math.max(0, parts[2])) : 0;

    if (h >= 13 && h <= 23) {
      explicitPeriod = 'PM';
      h = h - 12;
    } else if (h === 0) {
      explicitPeriod = 'AM';
      h = 12;
    }

    const systemPeriod: 'AM' | 'PM' = target.getHours() >= 12 ? 'PM' : 'AM';
    const period = explicitPeriod || systemPeriod;

    let hour24 = h;
    if (period === 'PM' && h < 12) hour24 = h + 12;
    if (period === 'AM' && h === 12) hour24 = 0;

    target.setHours(hour24, m, s, 0);
  }
  return target;
}

export function ManualAddRowModal({
  coordinatorId,
  collegeId,
  sessionDate,
  onClose,
  onRowAdded,
}: Props) {
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [hrNames, setHrNames] = useState<string[]>([]);
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([]);
  const [emailIds, setEmailIds] = useState<string[]>([]);

  // Start Time & Tracking
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  });
  const [startDateObj, setStartDateObj] = useState<Date>(() => new Date());

  // End Time & Duration (Auto calculated on status selection)
  const [endTime, setEndTime] = useState('');
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [durationText, setDurationText] = useState('');
  const [durationSec, setDurationSec] = useState<number | null>(null);

  // Outcome Dropdown State
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(false);
  const outcomeRef = useRef<HTMLDivElement>(null);

  // Follow-Up Month Dropdown State
  const [followUpMonth, setFollowUpMonth] = useState('');
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingMeta, setCheckingMeta] = useState(false);
  const [showNotInMetaModal, setShowNotInMetaModal] = useState(false);

  // Meta Database auto-complete & matched record state
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [totalMetaCount, setTotalMetaCount] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [autoFilled, setAutoFilled] = useState(false);
  const [matchedMetaRecord, setMatchedMetaRecord] = useState<any | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const hrNameInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch live total count of companies in Meta Database on mount & sync on events
  useEffect(() => {
    let isMounted = true;
    apiFetch<any>('/companies/search?limit=1')
      .then((res) => {
        if (isMounted && res.success && typeof res.data?.pagination?.total === 'number') {
          setTotalMetaCount(res.data.pagination.total);
        }
      })
      .catch((err) => console.error('Failed to fetch meta directory total count:', err));

    const handleSync = () => {
      apiFetch<any>('/companies/search?limit=1')
        .then((res) => {
          if (isMounted && res.success && typeof res.data?.pagination?.total === 'number') {
            setTotalMetaCount(res.data.pagination.total);
          }
        })
        .catch(() => {});
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('ipoms_metadata_updated', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('ipoms_metadata_updated', handleSync);
    };
  }, []);

  // Close outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
      if (outcomeRef.current && !outcomeRef.current.contains(e.target as Node)) {
        setIsOutcomeOpen(false);
      }
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setIsMonthOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !showNotInMetaModal) {
        if (showSuggestions) {
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          return;
        }
        if (isOutcomeOpen) {
          setIsOutcomeOpen(false);
          return;
        }
        if (isMonthOpen) {
          setIsMonthOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, showNotInMetaModal, showSuggestions, isOutcomeOpen, isMonthOpen, onClose]);

  // Fetch company suggestions from Meta Database
  const fetchSuggestions = async (query: string) => {
    try {
      setLoadingSuggestions(true);
      const endpoint = query.trim()
        ? `/companies/search?q=${encodeURIComponent(query.trim())}&limit=25`
        : `/companies/search?limit=25`;
      const res = await apiFetch<any>(endpoint);
      if (res.success && res.data?.companies) {
        setCompanySuggestions(res.data.companies);
        setShowSuggestions(true);
        setHighlightedIndex(-1);

        if (!query.trim() && typeof res.data?.pagination?.total === 'number') {
          setTotalMetaCount(res.data.pagination.total);
        }

        // Auto-detect if what the user typed matches an exact placeholder in the results
        if (query.trim()) {
          const exact = res.data.companies.find(
            (c: any) => (c.company_name || '').trim().toLowerCase() === query.trim().toLowerCase()
          );
          if (exact) {
            setMatchedMetaRecord(exact);
            setAutoFilled(true);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching companies for autocomplete:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleCompanyInputChange = (val: string) => {
    setCompanyName(val);
    setAutoFilled(false);
    setHighlightedIndex(-1);
    if (matchedMetaRecord && (matchedMetaRecord.company_name || '').trim().toLowerCase() !== val.trim().toLowerCase()) {
      setMatchedMetaRecord(null);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 150);
  };

  const handleCompanyInputFocus = () => {
    fetchSuggestions(companyName);
  };

  const handleSelectCompany = (comp: any) => {
    triggerHaptic('light');
    setCompanyName(comp.company_name);

    // Extract all distinct HR names
    const hrs: string[] = [];
    if (
      comp.hr_name &&
      comp.hr_name.trim() &&
      comp.hr_name.trim().toLowerCase() !== 'hr contact' &&
      comp.hr_name.trim().toLowerCase() !== 'contact'
    ) {
      comp.hr_name.split(/[,;/]+/).forEach((h: string) => {
        const clean = h.trim();
        if (
          clean &&
          clean.toLowerCase() !== 'hr contact' &&
          clean.toLowerCase() !== 'contact' &&
          !hrs.includes(clean)
        ) {
          hrs.push(clean);
        }
      });
    }
    if (Array.isArray(comp.hr_names)) {
      comp.hr_names.forEach((h: string) => {
        const clean = h && h.trim();
        if (
          clean &&
          clean.toLowerCase() !== 'hr contact' &&
          clean.toLowerCase() !== 'contact' &&
          !hrs.includes(clean)
        ) {
          hrs.push(clean);
        }
      });
    }
    setHrNames(hrs);

    // Extract all distinct mobile numbers
    const mobs: string[] = [];
    if (comp.primary_mobile && comp.primary_mobile.trim()) {
      mobs.push(comp.primary_mobile.trim());
    }
    if (Array.isArray(comp.mobile_numbers)) {
      comp.mobile_numbers.forEach((m: string) => {
        if (m && m.trim() && !mobs.includes(m.trim())) mobs.push(m.trim());
      });
    }
    if (Array.isArray(comp.contact_numbers)) {
      comp.contact_numbers.forEach((m: string) => {
        if (m && m.trim() && !mobs.includes(m.trim())) mobs.push(m.trim());
      });
    }
    setMobileNumbers(mobs);

    // Extract all distinct email IDs
    const emails: string[] = [];
    if (comp.primary_email && comp.primary_email.trim()) {
      emails.push(comp.primary_email.trim().toLowerCase());
    }
    if (Array.isArray(comp.email_ids)) {
      comp.email_ids.forEach((e: string) => {
        const clean = e && e.trim().toLowerCase();
        if (clean && !emails.includes(clean)) emails.push(clean);
      });
    }
    setEmailIds(emails);

    setMatchedMetaRecord(comp);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setAutoFilled(true);
    // Focus HR Name input so user can seamlessly continue data entry
    setTimeout(() => hrNameInputRef.current?.focus(), 50);
  };

  const handleCompanyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      // When pressing Tab, close the suggestions dropdown immediately so focus flows directly to HR Name input
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      // Native browser Tab moves directly to hr_name field without cycling through dropdown options
    } else if (e.key === 'ArrowDown') {
      if (companySuggestions.length > 0) {
        e.preventDefault();
        setShowSuggestions(true);
        setHighlightedIndex((prev) => (prev < companySuggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      if (companySuggestions.length > 0) {
        e.preventDefault();
        setShowSuggestions(true);
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : companySuggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (showSuggestions && highlightedIndex >= 0 && companySuggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectCompany(companySuggestions[highlightedIndex]);
      }
    }
  };

  const handleSetCurrentTime = () => {
    triggerHaptic('light');
    const now = new Date();
    const formatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    setStartTime(formatted);
    setStartDateObj(now);

    // If end time already exists, recalculate duration
    if (endDateObj) {
      const diffSec = Math.max(0, Math.round((endDateObj.getTime() - now.getTime()) / 1000));
      setDurationSec(diffSec);
      setDurationText(formatDurationSec(diffSec));
    }
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const parsed = parseTimeToDate(val);
    setStartDateObj(parsed);
    if (endDateObj) {
      const diffSec = Math.max(0, Math.round((endDateObj.getTime() - parsed.getTime()) / 1000));
      setDurationSec(diffSec);
      setDurationText(formatDurationSec(diffSec));
    }
  };

  // When Call Status is selected -> automatically calculate End Time and Duration
  const handleSelectOutcome = (newOutcome: CallOutcome) => {
    triggerHaptic('selection');
    setOutcome(newOutcome);
    setIsOutcomeOpen(false);

    const now = new Date();
    const endFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    setEndTime(endFormatted);
    setEndDateObj(now);

    // Parse current start time date
    const startObj = parseTimeToDate(startTime, startDateObj);
    let diffSec = Math.round((now.getTime() - startObj.getTime()) / 1000);

    // If start time was set in the future or equal, provide a realistic minimum 45s call duration
    if (diffSec <= 0) {
      diffSec = 45;
    }

    setDurationSec(diffSec);
    setDurationText(formatDurationSec(diffSec));
  };

  const handleSelectMonth = (m: string) => {
    triggerHaptic('selection');
    setFollowUpMonth(m);
    setIsMonthOpen(false);
  };

  const saveRowToTracker = async (matchedComp?: any) => {
    try {
      setSubmitting(true);
      triggerHaptic('medium');

      const startObj = parseTimeToDate(startTime, startDateObj);
      const endObj = endDateObj || new Date();
      const computedSec = durationSec ?? Math.max(0, Math.round((endObj.getTime() - startObj.getTime()) / 1000));

      const payload = {
        coordinator_id: coordinatorId,
        college_id: collegeId,
        company_name: companyName.trim(),
        hr_name: hrNames.join(', ').trim() || 'HR Contact',
        mobile_number: mobileNumbers.join(', ').trim(),
        email_id: emailIds.join(', ').trim().toLowerCase(),
        call_start_time: startObj.toISOString(),
        call_end_time: endObj.toISOString(),
        duration_seconds: computedSec,
        outcome_status: outcome,
        follow_up_month: outcome === 'follow_up' ? followUpMonth : null,
        comments: comments.trim(),
        session_date: sessionDate,
      };

      const res = await apiFetch('/daily-tracker/manual-row', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && (res.data as any)?.row) {
        const rec = matchedComp || matchedMetaRecord;
        if (rec && getCompanyMissingDetails(rec).isPlaceholder) {
          toast(`Enriched company placeholder for "${companyName.trim()}" & logged entry`, 'success');
        } else {
          toast('New entry added to tracker', 'success');
        }
        onRowAdded((res.data as any).row);
        setShowNotInMetaModal(false);
        onClose();
      } else {
        toast(res.error?.message || 'Failed to add entry', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Server error adding entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast('Company name is required', 'warning');
      return;
    }
    if (mobileNumbers.length === 0) {
      toast('At least one mobile number is required', 'warning');
      return;
    }
    if (!outcome) {
      toast('Call Status is mandatory to log this entry', 'warning');
      return;
    }
    if (outcome === 'follow_up' && !followUpMonth) {
      toast('Follow Up Month is mandatory when Call Status is Follow Up', 'warning');
      return;
    }

    // 1. If auto-filled or matched from Meta Database suggestion, it is present in Meta Database
    if (autoFilled || matchedMetaRecord) {
      await saveRowToTracker(matchedMetaRecord);
      return;
    }

    // 2. Otherwise, check whether this company/contact is present in Meta Database
    setCheckingMeta(true);
    let matchedCompanyDoc: any = null;
    try {
      const res = await apiFetch<any>(`/companies/search?q=${encodeURIComponent(companyName.trim())}&limit=10`);
      if (res.success && Array.isArray(res.data?.companies)) {
        const normInputName = companyName.trim().toLowerCase();
        const inputMobiles = mobileNumbers.map((m) => m.trim());
        const match = res.data.companies.find((c: any) => {
          const cName = (c.company_name || '').trim().toLowerCase();
          const cMobile = (c.primary_mobile || '').trim();
          const cMobArray = Array.isArray(c.mobile_numbers) ? c.mobile_numbers.map((m: string) => m.trim()) : [];
          return cName === normInputName || inputMobiles.some((im) => im === cMobile || cMobArray.includes(im));
        });
        if (match) {
          matchedCompanyDoc = match;
          setMatchedMetaRecord(match);
        }
      }
    } catch (err) {
      console.error('Error checking Meta Database:', err);
    } finally {
      setCheckingMeta(false);
    }

    if (matchedCompanyDoc) {
      // Present in Meta Database -> skip info popup and save directly (with live enrichment)
      await saveRowToTracker(matchedCompanyDoc);
    } else {
      // Not present in Meta Database -> show polite information pop-up
      setShowNotInMetaModal(true);
    }
  };

  const handleRedirectToMeta = () => {
    triggerHaptic('light');
    const params = new URLSearchParams({
      add: 'true',
      company_name: companyName.trim(),
      hr_name: hrNames.join(', ').trim(),
      primary_mobile: mobileNumbers[0] || '',
      primary_email: emailIds[0] || '',
      return_to: '/tracker',
    });
    window.location.href = `/metadata?${params.toString()}`;
  };

  const handleSkipAndSave = () => {
    setShowNotInMetaModal(false);
    saveRowToTracker();
  };

  const selectedOutcomeOption = ROW_OUTCOMES.find((o) => o.value === outcome);
  const placeholderInfo = matchedMetaRecord ? getCompanyMissingDetails(matchedMetaRecord) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-border bg-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
              <Plus size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-fg tracking-tight">Add Contact Entry</h2>
              <p className="text-micro text-fg-subtle">
                Auto-fill from Meta Database ({totalMetaCount !== null ? `${totalMetaCount.toLocaleString('en-IN')} records` : 'fetching…'}) or add custom details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold text-fg-subtle bg-surface-sunken border border-border px-1.5 py-0.5 rounded">
              Shift+A
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-surface-raised flex items-center justify-center text-fg-subtle hover:text-fg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form Body (Invisible Scrollbar) */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-3.5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-surface"
        >
          {/* Section 1: Company Name with Meta Database Auto-Complete */}
          <div className="relative" ref={suggestionsRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-fg uppercase tracking-wider">
                Company Name <span className="text-rose-500">*</span>
              </label>
              {autoFilled ? (
                <span className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  placeholderInfo?.isPlaceholder
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30'
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {placeholderInfo?.isPlaceholder ? (
                    <>
                      <Sparkles size={11} strokeWidth={2.5} className="text-amber-500" /> Existing Placeholder in DB
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={11} strokeWidth={2.5} /> Auto-filled from Meta DB
                    </>
                  )}
                </span>
              ) : (
                <span className="text-[11px] text-primary flex items-center gap-1 font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                  <Database size={10} /> {totalMetaCount !== null ? `${totalMetaCount.toLocaleString('en-IN')} Meta Companies` : 'Meta Database'}
                </span>
              )}
            </div>

            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => handleCompanyInputChange(e.target.value)}
                onFocus={handleCompanyInputFocus}
                onKeyDown={handleCompanyKeyDown}
                placeholder="Click or type to search Meta Database (e.g. 100Pillars, Google, Zoho)…"
                className={`w-full bg-surface-sunken border text-xs text-fg pl-9 pr-9 py-2 rounded-xl outline-none transition-all placeholder:text-fg-disabled shadow-2xs font-medium ${
                  autoFilled
                    ? placeholderInfo?.isPlaceholder
                      ? 'border-amber-500/60 ring-2 ring-amber-500/15'
                      : 'border-emerald-500/60 ring-2 ring-emerald-500/15'
                    : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {loadingSuggestions ? (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
              ) : (
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              )}
            </div>

            {/* Auto-Complete Dropdown Card (Solid Minimal Surface) */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-surface border border-border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-border/60 animate-in fade-in zoom-in-95 duration-100 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="px-3.5 py-2 bg-surface-sunken text-[11px] font-bold text-fg-subtle flex items-center justify-between border-b border-border/80 sticky top-0 z-10">
                  <span className="flex items-center gap-1.5">
                    <Database size={11} className="text-primary" /> Meta Database Contacts
                  </span>
                  <span className="text-micro font-medium">{companySuggestions.length} found</span>
                </div>

                {companySuggestions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-fg-subtle">
                    No matching companies found. You can manually type contact details below.
                  </div>
                ) : (
                  companySuggestions.map((comp, idx) => {
                    const itemPlaceholderInfo = getCompanyMissingDetails(comp);
                    const isHighlighted = highlightedIndex === idx;
                    return (
                      <button
                        key={comp._id || comp.company_name}
                        type="button"
                        tabIndex={-1}
                        onClick={() => handleSelectCompany(comp)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-3 group cursor-pointer ${
                          isHighlighted
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                            : 'hover:bg-surface-raised'
                        }`}
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="text-xs font-bold text-fg group-hover:text-primary transition-colors flex items-center gap-1.5 truncate">
                            <Building2 size={13} className="text-fg-subtle shrink-0 group-hover:text-primary" />
                            <span className="truncate">{comp.company_name}</span>
                            {itemPlaceholderInfo.isPlaceholder && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                                Placeholder • Needs Details
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-fg-muted font-medium flex items-center gap-2.5 flex-wrap">
                            {comp.hr_name && comp.hr_name !== 'HR Contact' ? (
                              <span className="flex items-center gap-1">
                                <User size={11} className="text-fg-subtle" /> {comp.hr_name}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-[10.5px] italic flex items-center gap-0.5">
                                No HR Name
                              </span>
                            )}
                            {comp.primary_mobile || comp.contact_numbers?.[0] || comp.mobile_numbers?.[0] ? (
                              <span className="flex items-center gap-1 font-mono text-[10.5px] text-fg-subtle">
                                <Phone size={10} className="text-emerald-500" /> {comp.primary_mobile || comp.contact_numbers?.[0] || comp.mobile_numbers?.[0]}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-[10.5px] italic flex items-center gap-0.5">
                                No Phone
                              </span>
                            )}
                            {comp.primary_email || comp.email_ids?.[0] ? (
                              <span className="flex items-center gap-1 font-mono text-[10.5px] text-fg-subtle truncate max-w-[180px]">
                                <Mail size={10} className="text-blue-500" /> {comp.primary_email || comp.email_ids?.[0]}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-[10.5px] italic flex items-center gap-0.5">
                                No Email
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-opacity ${
                          itemPlaceholderInfo.isPlaceholder
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15 group-hover:bg-amber-500/25'
                            : 'text-primary bg-primary/10 opacity-0 group-hover:opacity-100'
                        }`}>
                          <span>{itemPlaceholderInfo.isPlaceholder ? 'Fill Details' : 'Auto-Fill'}</span>
                          <ChevronRight size={12} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Placeholder Notification Banner */}
          {matchedMetaRecord && placeholderInfo?.isPlaceholder && (
            <div className="p-3 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl space-y-1 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles size={14} className="text-amber-500 shrink-0" />
                  <span>Existing Company Placeholder Found {matchedMetaRecord.serial_number ? `(S.No #${matchedMetaRecord.serial_number})` : ''}</span>
                </div>
                <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Needs Contact Info
                </span>
              </div>
              <p className="text-[11.5px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                This company is already present in the database, but missing <strong>{placeholderInfo.missing.join(', ')}</strong>.
                Fill in the numbers and details below to enrich this record directly rather than creating a duplicate entry.
              </p>
            </div>
          )}

          {/* Section 2: HR Name & Mobile Number (2-column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-fg uppercase tracking-wider">
                  HR / Contact Name(s)
                </label>
                {matchedMetaRecord && !placeholderInfo?.hasHr && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    Missing in DB
                  </span>
                )}
              </div>
              <MultiTagInput
                values={hrNames}
                onChange={setHrNames}
                isMono={false}
                icon={<User size={14} />}
                inputRef={hrNameInputRef}
                placeholder="e.g. Rajesh Sharma (press Enter or comma for multiple)"
              />
            </div>

            {/* Mobile Numbers MultiTagInput */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-fg uppercase tracking-wider">
                  Mobile Number(s) <span className="text-rose-500">*</span>
                </label>
                {matchedMetaRecord && !placeholderInfo?.hasMobile && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    Missing in DB
                  </span>
                )}
              </div>
              <MultiTagInput
                values={mobileNumbers}
                onChange={setMobileNumbers}
                validator={validateAndNormalizeIndianMobile}
                required
                icon={<Phone size={14} />}
                placeholder="e.g. 9876543210 (10 digits starting 6-9, Enter/comma for multiple)"
              />
            </div>
          </div>

          {/* Section 3: Email IDs MultiTagInput */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-fg uppercase tracking-wider">
                Email ID(s) <span className="text-fg-disabled text-micro font-normal lowercase">(optional)</span>
              </label>
              {matchedMetaRecord && !placeholderInfo?.hasEmail && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  Missing in DB
                </span>
              )}
            </div>
            <MultiTagInput
              values={emailIds}
              onChange={setEmailIds}
              validator={validateAndNormalizeEmail}
              type="email"
              icon={<Mail size={14} />}
              placeholder="e.g. hr@company.com (press Enter or comma for multiple)"
            />
          </div>

          {/* Section 4: Call Timings & Duration (3-column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Start Time */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-fg uppercase tracking-wider">Start Time</label>
                <button
                  type="button"
                  onClick={handleSetCurrentTime}
                  className="text-micro text-primary hover:underline cursor-pointer font-bold bg-primary/10 px-1.5 py-0.2 rounded"
                >
                  Now
                </button>
              </div>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  placeholder="07:08 PM"
                  className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-2.5 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs font-mono font-medium"
                />
              </div>
            </div>

            {/* End Time (Disabled / Auto-calculated) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1">
                  End Time <Lock size={10} className="text-fg-subtle" />
                </label>
                <span className="text-[10px] text-fg-subtle italic">Auto</span>
              </div>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none opacity-60" />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={endTime || '--:--'}
                  placeholder="Auto on Status"
                  className="w-full bg-surface-raised border border-border/80 text-xs text-fg-muted pl-9 pr-2.5 py-2 rounded-xl outline-none shadow-2xs font-mono cursor-not-allowed opacity-85 font-medium"
                />
              </div>
            </div>

            {/* Duration (Disabled / Auto-calculated) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1">
                  Duration <Lock size={10} className="text-fg-subtle" />
                </label>
                <span className="text-[10px] text-fg-subtle italic">Auto</span>
              </div>
              <div className="relative">
                <Timer size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none opacity-60" />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={durationText || '-- min'}
                  placeholder="Auto on Status"
                  className="w-full bg-surface-raised border border-border/80 text-xs text-fg-muted pl-9 pr-2.5 py-2 rounded-xl outline-none shadow-2xs font-mono cursor-not-allowed opacity-85 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Minimal Solid Outcome & Follow-Up Month (Custom Dropdowns) */}
          <div className={`grid grid-cols-1 ${outcome === 'follow_up' ? 'sm:grid-cols-2' : 'grid-cols-1'} gap-3.5`}>
            {/* Minimal Solid Outcome Dropdown */}
            <div className="relative" ref={outcomeRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-fg uppercase tracking-wider">
                  Call Status <span className="text-rose-500">*</span>
                </label>
                {endTime && (
                  <span className="text-micro text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 size={11} strokeWidth={2.5} /> End Time & Duration Locked
                  </span>
                )}
              </div>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsOutcomeOpen((prev) => !prev);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-2xs cursor-pointer select-none ${
                  selectedOutcomeOption
                    ? 'bg-surface border-emerald-500/60 ring-2 ring-emerald-500/15 text-fg'
                    : 'bg-surface-sunken border-border hover:border-primary/50 text-fg-subtle hover:text-fg'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedOutcomeOption ? (
                    <>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOutcomeOption.dotColor} ring-1 ring-black/5 dark:ring-white/10`} />
                      <span className={`truncate text-xs font-bold ${selectedOutcomeOption.textColor}`}>
                        {selectedOutcomeOption.label}
                      </span>
                    </>
                  ) : (
                    <span className="truncate text-fg-subtle font-normal">
                      — Select Status (Calculates End Time & Duration) —
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-fg-subtle shrink-0 transition-transform duration-150 ${
                    isOutcomeOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>

              {/* Solid Minimal Popover Menu (No Liquid Glass) */}
              {isOutcomeOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-xl p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 text-fg select-none max-h-60 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {ROW_OUTCOMES.map((opt) => {
                    const isSelected = opt.value === outcome;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        tabIndex={-1}
                        onClick={() => handleSelectOutcome(opt.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                            : 'hover:bg-surface-raised text-fg'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                          <span className={`truncate ${opt.textColor}`}>
                            {opt.label}
                          </span>
                        </div>
                        {isSelected && <Check size={14} className="text-primary shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Follow Up Month (Solid Minimal Dropdown) */}
            {outcome === 'follow_up' && (
              <div className="relative animate-in fade-in slide-in-from-top-1 duration-100" ref={monthRef}>
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                  Follow Up Month <span className="text-rose-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsMonthOpen((prev) => !prev);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-2xs cursor-pointer select-none ${
                    followUpMonth
                      ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'bg-surface-sunken border-amber-400/50 text-fg-subtle hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar size={14} className="text-amber-500 shrink-0" />
                    <span className="truncate">
                      {followUpMonth ? followUpMonth : '— Select Follow Up Month —'}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-amber-500 shrink-0 transition-transform duration-150 ${
                      isMonthOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Solid Minimal Month Popover */}
                {isMonthOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-xl p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {MONTHS.map((m) => {
                      const isSelected = followUpMonth === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          tabIndex={-1}
                          onClick={() => handleSelectMonth(m)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                              : 'hover:bg-surface-raised text-fg'
                          }`}
                        >
                          <span className="truncate">{m}</span>
                          {isSelected && <Check size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 6: Comments / Notes */}
          <div>
            <label className="block text-[11px] font-bold text-fg uppercase tracking-wider mb-1">
              Comments / Notes
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add call notes, conversation summary, requirements, next steps…"
                className="w-full bg-surface-sunken border border-border text-xs text-fg p-3 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled shadow-2xs resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end pt-2 border-t border-border/60">
            <button
              type="submit"
              disabled={submitting || checkingMeta}
              className="flex items-center justify-center gap-2 px-7 py-2 rounded-xl bg-primary hover:bg-blue-700 disabled:opacity-50 text-primary-foreground text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.992]"
            >
              {submitting || checkingMeta ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{checkingMeta ? 'Verifying Meta DB…' : 'Adding Entry…'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Add Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Information Pop-up Modal: Contact Not Present in Meta Database ── */}
      {showNotInMetaModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface text-fg rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-border pb-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Database size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">Contact Not in Meta Database</h3>
                <p className="text-micro text-fg-subtle">Directory synchronization notice</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-fg-muted leading-relaxed">
              <p>
                The contact <strong className="text-fg font-semibold">&ldquo;{companyName}&rdquo;</strong> is not present in the Master Meta Database directory.
              </p>
              <div className="p-3 bg-surface-sunken border border-border rounded-xl space-y-1.5 text-[11.5px]">
                <p className="font-semibold text-fg flex items-center gap-1.5">
                  <Info size={14} className="text-primary" />
                  Do you want to add this contact to the Meta Database?
                </p>
                <p className="text-fg-subtle leading-normal">
                  Adding it to the Meta Database will register this company and HR details permanently for all future calling rosters and analytics.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleSkipAndSave}
                disabled={submitting}
                className="px-5 py-2 bg-surface-sunken hover:bg-surface-raised border border-border text-fg rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.992]"
              >
                Not Now
              </button>

              <button
                type="button"
                onClick={handleRedirectToMeta}
                className="px-6 py-2 bg-primary hover:bg-blue-700 text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer hover:scale-[1.02] active:scale-[0.992]"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
