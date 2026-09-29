'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  Radio,
  CalendarClock,
  Layers,
  Briefcase,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { formatCtcToLines } from '@/app/weekly-tracker/components/CtcInlineEditor';

interface TpoRow {
  _id: string;
  company_name: string;
  job_role: string;
  ctc_lpa?: string;
  company_type?: string;
  contact_number?: string;
  mobile_numbers?: string[];
  email_id?: string;
  email_ids?: string[];
  jd_received_date?: string;
  db_shared_date?: string;
  current_status_text?: string;
  follow_up_date?: string;
  drive_date?: string;
  registered_count: number;
  shortlisted_count: number;
  selected_count: number;
}

interface Sections {
  completed: TpoRow[];
  drive_in_progress: TpoRow[];
  upcoming_drive: TpoRow[];
  in_progress: TpoRow[];
  pipeline: TpoRow[];
  rejected_by_tpo: TpoRow[];
  rejected: TpoRow[];
}

interface TpoWeeklyData {
  college: { name: string; code: string; logo_url?: string; location?: string } | null;
  sections: Sections;
}

interface SectionMeta {
  key: keyof Sections;
  label: string;
  shortLabel: string;
  icon: any;
  activeTextColor: string;
  activeIconColor: string;
  neonUnderlineBg: string;
  neonUnderlineGlow: string;
  neonBadgeBg: string;
  neonBadgeGlow: string;
}

const SECTION_META: SectionMeta[] = [
  {
    key: 'completed',
    label: 'Companies Completed',
    shortLabel: 'Completed',
    icon: CheckCircle2,
    activeTextColor: 'text-emerald-700',
    activeIconColor: 'text-emerald-500',
    neonUnderlineBg: 'bg-gradient-to-r from-[#10B981] via-[#00F5A0] to-[#059669]',
    neonUnderlineGlow: 'shadow-[0_0_12px_rgba(0,245,160,0.65)]',
    neonBadgeBg: 'bg-gradient-to-r from-[#10B981] to-[#059669]',
    neonBadgeGlow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]',
  },
  {
    key: 'drive_in_progress',
    label: 'Drive In Progress',
    shortLabel: 'Drive In Progress',
    icon: Radio,
    activeTextColor: 'text-blue-700',
    activeIconColor: 'text-blue-500',
    neonUnderlineBg: 'bg-gradient-to-r from-[#60A5FA] via-[#2563EB] to-[#1D4ED8]',
    neonUnderlineGlow: 'shadow-[0_0_12px_rgba(37,99,235,0.65)]',
    neonBadgeBg: 'bg-gradient-to-r from-[#60A5FA] to-[#1D4ED8]',
    neonBadgeGlow: 'shadow-[0_0_10px_rgba(37,99,235,0.5)]',
  },
  {
    key: 'upcoming_drive',
    label: 'Upcoming Drive',
    shortLabel: 'Upcoming Drive',
    icon: CalendarClock,
    activeTextColor: 'text-purple-700',
    activeIconColor: 'text-purple-500',
    neonUnderlineBg: 'bg-gradient-to-r from-[#C084FC] via-[#9333EA] to-[#581C87]',
    neonUnderlineGlow: 'shadow-[0_0_12px_rgba(147,51,234,0.65)]',
    neonBadgeBg: 'bg-gradient-to-r from-[#C084FC] to-[#581C87]',
    neonBadgeGlow: 'shadow-[0_0_10px_rgba(147,51,234,0.5)]',
  },
  {
    key: 'in_progress',
    label: 'Companies In Progress',
    shortLabel: 'In Progress',
    icon: Layers,
    activeTextColor: 'text-amber-700',
    activeIconColor: 'text-amber-500',
    neonUnderlineBg: 'bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-[#EA580C]',
    neonUnderlineGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.65)]',
    neonBadgeBg: 'bg-gradient-to-r from-[#FBBF24] to-[#EA580C]',
    neonBadgeGlow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]',
  },
  {
    key: 'pipeline',
    label: 'Companies in Pipeline',
    shortLabel: 'Pipeline',
    icon: Briefcase,
    activeTextColor: 'text-teal-700',
    activeIconColor: 'text-teal-500',
    neonUnderlineBg: 'bg-gradient-to-r from-[#2DD4BF] via-[#06B6D4] to-[#0E7490]',
    neonUnderlineGlow: 'shadow-[0_0_12px_rgba(6,182,212,0.65)]',
    neonBadgeBg: 'bg-gradient-to-r from-[#2DD4BF] to-[#0E7490]',
    neonBadgeGlow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]',
  },
  {
    key: 'rejected_by_tpo',
    label: 'Companies Rejected by TPO',
    shortLabel: 'Rejected by TPO',
    icon: XCircle,
    activeTextColor: 'text-rose-700',
    activeIconColor: 'text-rose-500',
    neonUnderlineBg: 'bg-gradient-to-r from-[#FF0844] via-[#F43F5E] to-[#BE123C]',
    neonUnderlineGlow: 'shadow-[0_0_12px_rgba(255,8,68,0.65)]',
    neonBadgeBg: 'bg-gradient-to-r from-[#FF0844] to-[#BE123C]',
    neonBadgeGlow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]',
  },
];

const PAGE_SIZE = 10;


/** Formats ISO date string into crisp short date matching the screenshot (e.g. 24 Sept 2026) */
function formatDisplayDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'June',
      'July',
      'Aug',
      'Sept',
      'Oct',
      'Nov',
      'Dec',
    ];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        return `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
    return String(dateStr);
  } catch {
    return null;
  }
}

/** Each comma-separated role gets its own styled pill chip matching WeeklyTable.tsx */
function RoleChips({ value }: { value: string }) {
  const roles = (value || '')
    .split(/[,/\\;]+/)
    .map((r) => r.trim())
    .filter(Boolean);

  if (roles.length === 0) return <span className="text-slate-400 italic">—</span>;

  return (
    <div className="flex flex-col items-start gap-1 w-full">
      {roles.map((role, i) => (
        <span
          key={i}
          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] whitespace-normal break-words leading-tight max-w-full"
          title={role}
        >
          {role}
        </span>
      ))}
    </div>
  );
}

/** Contact numbers renderer with WhatsApp Button (Web / Desktop App Options) */
function ContactCell({ row }: { row: TpoRow }) {
  const rawList: string[] = [];
  if (row.contact_number) {
    rawList.push(...row.contact_number.split(/[,;\n/]+/).map((s) => s.trim()));
  }
  if (Array.isArray(row.mobile_numbers)) {
    rawList.push(...row.mobile_numbers.map((s) => String(s).trim()));
  }

  // Filter only valid phone numbers (must contain digits and not be plain text names like "Balaji")
  const validNumbers = rawList
    .filter(Boolean)
    .filter((num) => {
      const digitsOnly = num.replace(/\D/g, '');
      return digitsOnly.length >= 7 && !/^[a-zA-Z\s]+$/.test(num);
    });

  const uniqueNumbers = Array.from(new Set(validNumbers));

  if (uniqueNumbers.length === 0) {
    return <span className="text-slate-400 italic text-[11px] select-none">+ Add Contact</span>;
  }

  return (
    <div className="flex flex-col gap-1.5 whitespace-nowrap">
      {uniqueNumbers.map((num, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="flex items-center shrink-0">
            <WhatsAppButton
              mobileNumber={num}
              companyName={row.company_name}
            />
          </div>
          <span className="font-mono text-xs font-medium text-slate-800 tabular-nums select-all">
            {num}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Email addresses renderer (Text only for placement officers) */
function EmailCell({ row }: { row: TpoRow }) {
  const rawList: string[] = [];
  if (row.email_id) {
    rawList.push(...row.email_id.split(/[,;\n/]+/).map((s) => s.trim()));
  }
  if (Array.isArray(row.email_ids)) {
    rawList.push(...row.email_ids.map((s) => String(s).trim()));
  }

  // Must contain @ and a domain
  const validEmails = rawList
    .filter(Boolean)
    .filter((em) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));

  const uniqueEmails = Array.from(new Set(validEmails));

  if (uniqueEmails.length === 0) {
    return <span className="text-slate-400 italic text-[11px] select-none">+ Add Email</span>;
  }

  return (
    <div className="flex flex-col gap-1.5 whitespace-nowrap">
      {uniqueEmails.map((email, i) => (
        <span
          key={i}
          className="text-xs font-medium text-slate-800 select-all"
          title={email}
        >
          {email}
        </span>
      ))}
    </div>
  );
}

export default function TpoWeeklyTrackerPage() {
  const [data, setData] = useState<TpoWeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTabKey, setActiveTabKey] = useState<keyof Sections>('completed');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);

  const loadTracker = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await apiFetch<TpoWeeklyData>('/tpo/weekly-tracker');
      if (res.success && res.data) {
        setData(res.data);
        setError('');
        if (!isBackground) {
          const firstNonEmpty = SECTION_META.find(
            (s) => (res.data?.sections[s.key]?.length ?? 0) > 0
          );
          if (firstNonEmpty) {
            setActiveTabKey(firstNonEmpty.key);
          }
        }
      } else if (!isBackground) {
        setError(res.error?.message || 'Could not load the tracker data.');
      }
    } catch {
      if (!isBackground) setError('Cannot reach the iPOMS server.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracker();

    const interval = setInterval(() => {
      loadTracker(true);
    }, 5000);

    let ch1: BroadcastChannel | null = null;
    let ch2: BroadcastChannel | null = null;
    let ch3: BroadcastChannel | null = null;
    let chTpo: BroadcastChannel | null = null;
    try {
      ch1 = new BroadcastChannel('ipoms_tracker_sync');
      ch1.onmessage = () => loadTracker(true);
      ch2 = new BroadcastChannel('ipoms_weekly_sync');
      ch2.onmessage = () => loadTracker(true);
      ch3 = new BroadcastChannel('ipoms_daily_leads_sync');
      ch3.onmessage = () => loadTracker(true);
      chTpo = new BroadcastChannel('ipoms_tpo_sync_channel');
      chTpo.onmessage = () => loadTracker(true);
    } catch {}

    const handleTpoSync = () => loadTracker(true);
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('ipoms_')) loadTracker(true);
    };
    const handleFocus = () => loadTracker(true);

    window.addEventListener('ipoms_tpo_sync', handleTpoSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      ch1?.close();
      ch2?.close();
      ch3?.close();
      chTpo?.close();
      window.removeEventListener('ipoms_tpo_sync', handleTpoSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadTracker]);

  const activeMeta = SECTION_META.find((s) => s.key === activeTabKey) || SECTION_META[0];
  const rawRows = data?.sections[activeTabKey] ?? [];

  // Sort rows
  const processedRows = useMemo(() => {
    const rows = [...rawRows];
    rows.sort((a, b) => {
      const cmp = (a.company_name || '').localeCompare(b.company_name || '');
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [rawRows, sortAsc]);

  const totalRows = processedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (validCurrentPage - 1) * PAGE_SIZE;
  const paginatedRows = processedRows.slice(startIdx, startIdx + PAGE_SIZE);

  const isCompleted = activeTabKey === 'completed';
  const hasContactAndEmail = [
    'drive_in_progress',
    'upcoming_drive',
    'in_progress',
    'pipeline',
  ].includes(activeTabKey);
  const hasJdDbDates = [
    'drive_in_progress',
    'upcoming_drive',
    'in_progress',
  ].includes(activeTabKey);
  const hasDriveDate = [
    'drive_in_progress',
    'upcoming_drive',
  ].includes(activeTabKey);

  // Dynamic role column width
  const longestRoleLength = paginatedRows.reduce((maxLen, r) => {
    const roles = (r.job_role || '').split(/[,/\\;]+/).map((s) => s.trim()).filter(Boolean);
    if (roles.length === 0) return Math.max(maxLen, (r.job_role || '').length);
    const rowMax = Math.max(...roles.map((s) => s.length), 0);
    return Math.max(maxLen, rowMax);
  }, 0);
  const dynamicRoleWidth = Math.max(160, Math.min(320, Math.ceil(longestRoleLength * 7.8) + 36));

  // Dynamic email column width
  const longestEmailLength = paginatedRows.reduce((max, r) => {
    const email = r.email_id || (r.email_ids && r.email_ids[0]) || '';
    return email.length > max ? email.length : max;
  }, 0);
  const dynamicEmailWidth = hasContactAndEmail
    ? Math.max(220, Math.ceil(longestEmailLength * 8) + 60)
    : 0;

  // Sticky Offsets (Freeze S.No, Company Name, Role, CTC)
  const sNoWidth = 48;
  const companyWidth = 200;
  const roleWidth = dynamicRoleWidth;
  const ctcWidth = 175;

  const sNoLeft = 0;
  const companyLeft = sNoLeft + sNoWidth; // 48
  const roleLeft = companyLeft + companyWidth; // 248
  const ctcLeft = roleLeft + roleWidth; // 248 + roleWidth

  const totalCols =
    4 +
    (hasContactAndEmail ? 2 : 0) +
    (hasJdDbDates ? 2 : 0) +
    (hasDriveDate ? 1 : 0) +
    1 +
    (isCompleted ? 3 : 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        <span className="text-xs font-semibold text-slate-500">Loading company tracker…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center">
        <XCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-bold text-rose-900">Tracker Unavailable</h3>
        <p className="mt-1 text-xs text-rose-600">{error || 'No tracker data found.'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      {/* ── 1. Top Horizontal Tabs with Equal Spacing & 12px Font (600/700 weight) ── */}
      <div className="flex w-full items-stretch overflow-x-auto no-scrollbar border-b border-slate-200/90 bg-white">
        {SECTION_META.map((tab) => {
          const isActive = activeTabKey === tab.key;
          const count = data.sections[tab.key]?.length ?? 0;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTabKey(tab.key);
                setCurrentPage(1);
              }}
              className={`group relative flex flex-1 items-center justify-center gap-2 px-2.5 sm:px-3.5 py-3.5 text-[12px] whitespace-nowrap transition-all cursor-pointer min-w-[130px] sm:min-w-0 ${
                isActive
                  ? `${tab.activeTextColor} font-[700] bg-slate-50/40`
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80 font-[600]'
              }`}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2.5 : 2}
                className={`${isActive ? tab.activeIconColor : 'text-slate-400 group-hover:text-slate-600'} shrink-0`}
              />
              <span className="truncate">{tab.shortLabel}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums shrink-0 transition-all ${
                  isActive
                    ? `${tab.neonBadgeBg} ${tab.neonBadgeGlow} text-white`
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/80'
                }`}
              >
                {count}
              </span>

              {/* Dual-Shade Neon Gradient Bottom Active Indicator */}
              {isActive && (
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[3.5px] rounded-full ${tab.neonUnderlineBg} ${tab.neonUnderlineGlow} animate-in fade-in zoom-in-95 duration-200`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 2. Top-Only Pagination Controls (Visible when more than 1 page) ─ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end px-5 py-2.5 bg-slate-50/70 border-b border-slate-200/80">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline mr-1">
              Page <span className="text-slate-700 font-bold">{validCurrentPage}</span> of {totalPages}
            </span>

            <button
              type="button"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              title="Previous page"
            >
              <ChevronLeft size={14} strokeWidth={2.4} />
            </button>

            {/* Page Buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isCurrent = page === validCurrentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[28px] h-7 px-1.5 text-xs font-bold rounded-lg transition-all ${
                      isCurrent
                        ? `${activeMeta.neonBadgeBg} ${activeMeta.neonBadgeGlow} text-white font-black`
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              title="Next page"
            >
              <ChevronRight size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Table Data Area with Column Freezing & Smooth Sliding ───────── */}
      <div className="overflow-x-auto bg-white scroll-smooth overscroll-x-contain">
        <table className="w-full text-xs text-left border-separate border-spacing-0 bg-white">
          <thead>
            <tr className="bg-[#F1F5F9] text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-micro select-none">
              {/* Frozen 1: S.NO */}
              <th
                style={{ left: sNoLeft }}
                className="sticky z-30 bg-[#F1F5F9] py-2.5 px-3 w-12 min-w-[48px] max-w-[48px] text-center border-b border-slate-200 font-black text-slate-900"
              >
                S.NO
              </th>

              {/* Frozen 2: COMPANY NAME * */}
              <th
                style={{ left: companyLeft }}
                className="sticky z-30 bg-[#F1F5F9] py-2.5 px-3 w-[200px] min-w-[200px] max-w-[200px] text-left border-b border-slate-200 font-black text-slate-900 cursor-pointer select-none group hover:text-primary"
                onClick={() => setSortAsc(!sortAsc)}
                title="Click to sort by company name"
              >
                <div className="flex items-center gap-1.5">
                  <span>
                    COMPANY NAME <span className="text-rose-500 font-bold">*</span>
                  </span>
                  <ArrowUpDown size={12} className="text-slate-600 group-hover:text-primary" />
                </div>
              </th>

              {/* Frozen 3: ROLE (Dynamic Section-Wise Width) */}
              <th
                style={{
                  left: roleLeft,
                  width: roleWidth,
                  minWidth: roleWidth,
                  maxWidth: roleWidth,
                }}
                className="sticky z-30 bg-[#F1F5F9] py-2.5 px-3 text-left border-b border-slate-200 font-black text-slate-900 select-none"
              >
                ROLE
              </th>

              {/* Frozen 4: CTC (Last Frozen Column with solid border & shadow divider) */}
              <th
                style={{
                  left: ctcLeft,
                  width: ctcWidth,
                  minWidth: ctcWidth,
                  maxWidth: ctcWidth,
                }}
                className="sticky z-30 bg-[#F1F5F9] py-2.5 px-2.5 w-[175px] min-w-[175px] max-w-[175px] border-b border-slate-200 border-r-2 border-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)] select-none text-left font-black text-slate-900"
              >
                CTC
              </th>

              {/* ── Scrollable Headers (Slide smoothly from left and right) ── */}
              {/* Scrollable: CONTACT & EMAIL */}
              {hasContactAndEmail && (
                <>
                  <th
                    className="py-2.5 px-3 w-[170px] min-w-[170px] max-w-[170px] text-left border-b border-slate-200 select-none bg-[#F1F5F9]"
                    title="Contact Number"
                  >
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <Phone size={13} strokeWidth={2.5} />
                      <span className="font-bold text-[11px] uppercase tracking-wider">CONTACT</span>
                    </div>
                  </th>
                  <th
                    style={{ width: dynamicEmailWidth, minWidth: dynamicEmailWidth }}
                    className="py-2.5 px-3 text-left border-b border-slate-200 select-none bg-[#F1F5F9]"
                    title="Email ID"
                  >
                    <div className="flex items-center gap-1.5 text-indigo-600 whitespace-nowrap">
                      <Mail size={13} strokeWidth={2.5} />
                      <span className="font-bold text-[11px] uppercase tracking-wider">EMAIL</span>
                    </div>
                  </th>
                </>
              )}

              {/* Scrollable: JD Date & DB Date */}
              {hasJdDbDates && (
                <>
                  <th
                    className="py-2.5 px-3 min-w-[145px] text-center border-b border-slate-200 bg-[#F1F5F9] select-none"
                    title="JD Received Date"
                  >
                    <div className="inline-flex items-center justify-center gap-1 text-sky-600">
                      <span className="font-extrabold text-[11px]">JD</span>
                      <Calendar size={13} strokeWidth={2.5} />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 min-w-[145px] text-center border-b border-slate-200 bg-[#F1F5F9] select-none"
                    title="Database Shared Date"
                  >
                    <div className="inline-flex items-center justify-center gap-1 text-emerald-600">
                      <span className="font-extrabold text-[11px]">DB</span>
                      <Calendar size={13} strokeWidth={2.5} />
                    </div>
                  </th>
                </>
              )}

              {/* Scrollable: Drive Date */}
              {hasDriveDate && (
                <th
                  className="py-2.5 px-3 min-w-[145px] text-center border-b border-slate-200 bg-[#F1F5F9] select-none"
                  title="Drive Date"
                >
                  <div className="inline-flex items-center justify-center gap-1 text-purple-600">
                    <span className="font-extrabold text-[11px]">DRIVE</span>
                    <Calendar size={13} strokeWidth={2.5} />
                  </div>
                </th>
              )}

              {/* Scrollable: STATUS (10-word line wrapping on 11th word) */}
              <th className="py-2.5 px-3 text-left font-black text-slate-900 border-b border-slate-200 bg-[#F1F5F9] w-[410px] min-w-[400px] max-w-[420px]">
                STATUS <span className="text-rose-500 font-bold">*</span>
              </th>

              {/* Scrollable: Completed Section Counts */}
              {isCompleted && (
                <>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap font-black text-slate-900 border-b border-slate-200 bg-[#F1F5F9] min-w-[100px]">
                    REGISTERED
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap font-black text-slate-900 border-b border-slate-200 bg-[#F1F5F9] min-w-[100px]">
                    SHORTLISTED
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap font-black text-emerald-700 border-b border-slate-200 bg-[#F1F5F9] min-w-[120px]">
                    OFFERS RECEIVED
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-normal">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-4 py-12 text-center text-xs italic text-slate-400 bg-white"
                >
                  No companies in {activeMeta.shortLabel} yet.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r, idx) => {
                const serialNo = startIdx + idx + 1;

                return (
                  <tr
                    key={r._id}
                    className="group hover:bg-[#F8FAFC] align-top transition-colors border-b border-slate-200"
                  >
                    {/* Frozen 1: S.NO */}
                    <td
                      style={{ left: sNoLeft }}
                      className="sticky z-20 py-3 px-1.5 w-12 min-w-[48px] max-w-[48px] text-center text-slate-500 font-mono text-micro font-medium border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC] select-none"
                    >
                      <span className="tabular-nums font-semibold text-slate-600">
                        {serialNo}
                      </span>
                    </td>

                    {/* Frozen 2: COMPANY NAME (Font weight 500, natural black) */}
                    <td
                      style={{ left: companyLeft }}
                      className="sticky z-20 py-3 px-3 w-[200px] min-w-[200px] max-w-[200px] font-medium text-slate-800 border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC] break-words leading-snug"
                    >
                      <span>{r.company_name}</span>
                    </td>

                    {/* Frozen 3: ROLE (Rounded pill chip) */}
                    <td
                      style={{
                        left: roleLeft,
                        width: roleWidth,
                        minWidth: roleWidth,
                        maxWidth: roleWidth,
                      }}
                      className="sticky z-20 py-3 px-3 text-slate-600 border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]"
                    >
                      <RoleChips value={r.job_role} />
                    </td>

                    {/* Frozen 4: CTC (Mint green rounded-2xl pill badge with shadow divider & proper text wrapping) */}
                    <td
                      style={{
                        left: ctcLeft,
                        width: ctcWidth,
                        minWidth: ctcWidth,
                        maxWidth: ctcWidth,
                      }}
                      className="sticky z-20 py-3 px-2.5 w-[175px] min-w-[175px] max-w-[175px] border-b border-slate-200 border-r-2 border-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)] bg-white group-hover:bg-[#F8FAFC]"
                    >
                      {(() => {
                        const ctcLines = formatCtcToLines(r.ctc_lpa);

                        return (
                          <div className="w-full flex items-center justify-start">
                            {ctcLines ? (
                              <div
                                className="w-fit max-w-full px-3 py-1.5 rounded-lg text-left inline-flex items-center text-[#059669] bg-[#E8F8F0] border border-[#A7F3D0] shadow-2xs font-mono text-xs font-bold leading-snug break-words whitespace-normal"
                                title={ctcLines.line2 ? `${ctcLines.line1}\n${ctcLines.line2}` : ctcLines.line1}
                              >
                                <div className="flex flex-col items-start gap-0.5 break-words whitespace-normal leading-tight">
                                  <span>{ctcLines.line1}</span>
                                  {ctcLines.line2 && <span>{ctcLines.line2}</span>}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-normal text-xs pl-1">—</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* ── Scrollable Body Columns ─────────────────────────── */}
                    {/* Scrollable: CONTACT & EMAIL */}
                    {hasContactAndEmail && (
                      <>
                        <td className="py-3 px-3 w-[170px] min-w-[170px] max-w-[170px] border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]">
                          <ContactCell row={r} />
                        </td>
                        <td
                          style={{ width: dynamicEmailWidth, minWidth: dynamicEmailWidth }}
                          className="py-3 px-3 border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]"
                        >
                          <EmailCell row={r} />
                        </td>
                      </>
                    )}

                    {/* Scrollable: JD Date & DB Date */}
                    {hasJdDbDates && (
                      <>
                        <td className="py-3 px-3 text-center whitespace-nowrap border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]">
                          {r.jd_received_date && formatDisplayDate(r.jd_received_date) ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-800 shadow-2xs whitespace-nowrap">
                              <Calendar size={13} className="text-blue-600 shrink-0" />
                              <span>{formatDisplayDate(r.jd_received_date)}</span>
                              <ChevronDown size={11} className="text-slate-400 shrink-0" />
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200/80 bg-slate-50/50 text-xs font-medium text-slate-500 shadow-2xs whitespace-nowrap">
                              <Calendar size={13} className="text-blue-500/70 shrink-0" />
                              <span>Set JD Date</span>
                              <ChevronDown size={11} className="text-slate-400 shrink-0" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]">
                          {r.db_shared_date && formatDisplayDate(r.db_shared_date) ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-800 shadow-2xs whitespace-nowrap">
                              <Calendar size={13} className="text-blue-600 shrink-0" />
                              <span>{formatDisplayDate(r.db_shared_date)}</span>
                              <ChevronDown size={11} className="text-slate-400 shrink-0" />
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200/80 bg-slate-50/50 text-xs font-medium text-slate-500 shadow-2xs whitespace-nowrap">
                              <Calendar size={13} className="text-blue-500/70 shrink-0" />
                              <span>Set DB Date</span>
                              <ChevronDown size={11} className="text-slate-400 shrink-0" />
                            </div>
                          )}
                        </td>
                      </>
                    )}

                    {/* Scrollable: Drive Date */}
                    {hasDriveDate && (
                      <td className="py-3 px-3 text-center whitespace-nowrap border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]">
                        {r.drive_date && formatDisplayDate(r.drive_date) ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-200 bg-purple-50/80 text-xs font-semibold text-purple-900 shadow-2xs whitespace-nowrap">
                            <Calendar size={13} className="text-purple-600 shrink-0" />
                            <span>{formatDisplayDate(r.drive_date)}</span>
                            <ChevronDown size={11} className="text-purple-400 shrink-0" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200/80 bg-slate-50/50 text-xs font-medium text-slate-500 shadow-2xs whitespace-nowrap">
                            <Calendar size={13} className="text-purple-500/70 shrink-0" />
                            <span>Set Drive Date</span>
                            <ChevronDown size={11} className="text-slate-400 shrink-0" />
                          </div>
                        )}
                      </td>
                    )}

                    {/* Scrollable: STATUS (10-word line wrapping on 11th word) */}
                    <td className="py-3 px-3 text-slate-700 break-words whitespace-normal w-[410px] min-w-[400px] max-w-[420px] leading-relaxed border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC] font-normal">
                      {r.current_status_text ? (
                        <span>{r.current_status_text}</span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">—</span>
                      )}
                    </td>

                    {/* Scrollable: Completed Section Counts */}
                    {isCompleted && (
                      <>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-700 font-semibold border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]">
                          {r.registered_count || 0}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-700 font-semibold border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]">
                          {r.shortlisted_count || 0}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-600 border-b border-slate-200 bg-white group-hover:bg-[#F8FAFC]">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                            {r.selected_count || 0}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
