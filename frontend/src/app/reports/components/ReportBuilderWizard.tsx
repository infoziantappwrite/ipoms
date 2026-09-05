'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Sparkles,
  BarChart3,
  TrendingUp,
  ListTodo,
  Calendar,
  CalendarDays,
  AlertCircle,
  Building2,
  Layers,
  CheckCircle2,
  ChevronDown,
  PenLine,
  Clock,
  GraduationCap,
  Loader2,
  Briefcase,
  XCircle,
  Award,
  Trophy,
  Flame,
  Rocket,
  Zap,
  Check,
  Columns3,
  UserCheck,
  Highlighter,
  Palette,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  RotateCcw,
  Star,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { getCachedColleges, fetchAllCollegesCached, sortCollegesWithPriority, getCoordinatorSelectedColleges } from '@/lib/collegeSession';
import { SmoothSelect } from '@/components/ui/SmoothSelect';
import { DateRangeCalendar, formatPeriodFromDates } from './DateRangeCalendar';

export function extractCtcNumbers(ctcStr: string | undefined | null): number[] {
  if (!ctcStr) return [];
  const clean = String(ctcStr).replace(/,/g, '');
  const matches = clean.match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => !isNaN(n) && n > 0 && n < 250);
}

export function matchesMinCtc(
  ctcStr: string | undefined | null,
  minCtc: number | null | undefined,
  includeCompetitive: boolean = false
): boolean {
  if (minCtc === null || minCtc === undefined || minCtc <= 0) return true;
  const numbers = extractCtcNumbers(ctcStr);
  if (numbers.length === 0) return includeCompetitive;
  return Math.max(...numbers) >= minCtc;
}

export function getCtcBadgeColor(ctcStr: string | undefined | null): string {
  const numbers = extractCtcNumbers(ctcStr);
  if (numbers.length === 0) {
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  }
  const maxVal = Math.max(...numbers);
  if (maxVal >= 10) {
    return 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
  }
  if (maxVal >= 6) {
    return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  }
  if (maxVal >= 4) {
    return 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800';
  }
  return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
}

interface College {
  _id: string;
  college_name: string;
  college_code: string;
}


const ACTIVE_17_COLLEGE_CODES = [
  'KLU', 'PSNA', 'KIOT', 'DSU', 'SMVEC', 'AIHT', 'ACET', 'NEHRU',
  'HITS', 'MAR', 'ACEW', 'NGC', 'NGCE', 'NGP', 'KAMARAJ', 'NPR', 'MCET', 'MEC'
];

const ACTIVE_LEADS_KPIS = [
  { key: 'total_leads', label: 'Total Leads', desc: 'Active Corporate Leads' },
  { key: 'hot_leads_count', label: 'Hot (JD Received)', desc: 'Verified JD Received' },
  { key: 'warm_leads_count', label: 'Warm (Positives)', desc: 'Confirmed Positives' },
  { key: 'pipeline_leads_count', label: 'Weekly Pipeline', desc: 'In-Progress & Pipeline' },
  { key: 'graduating_year', label: 'Graduating Batch', desc: 'Target Batch Year' },
];

const MONTH_OPTIONS = [
  { value: '2026-01', label: 'January 2026', badge: '31 Days', sublabel: '01 Jan 2026 – 31 Jan 2026 • Ends on 31st', start: '2026-01-01', end: '2026-01-31' },
  { value: '2026-02', label: 'February 2026', badge: '28 Days', sublabel: '01 Feb 2026 – 28 Feb 2026 • Ends on 28th', start: '2026-02-01', end: '2026-02-28' },
  { value: '2026-03', label: 'March 2026', badge: '31 Days', sublabel: '01 Mar 2026 – 31 Mar 2026 • Ends on 31st', start: '2026-03-01', end: '2026-03-31' },
  { value: '2026-04', label: 'April 2026', badge: '30 Days', sublabel: '01 Apr 2026 – 30 Apr 2026 • Ends on 30th', start: '2026-04-01', end: '2026-04-30' },
  { value: '2026-05', label: 'May 2026', badge: '31 Days', sublabel: '01 May 2026 – 31 May 2026 • Ends on 31st', start: '2026-05-01', end: '2026-05-31' },
  { value: '2026-06', label: 'June 2026', badge: '30 Days', sublabel: '01 Jun 2026 – 30 Jun 2026 • Ends on 30th', start: '2026-06-01', end: '2026-06-30' },
  { value: '2026-07', label: 'July 2026', badge: '31 Days', sublabel: '01 Jul 2026 – 31 Jul 2026 • Ends on 31st', start: '2026-07-01', end: '2026-07-31' },
  { value: '2026-08', label: 'August 2026', badge: '31 Days', sublabel: '01 Aug 2026 – 31 Aug 2026 • Ends on 31st', start: '2026-08-01', end: '2026-08-31' },
  { value: '2026-09', label: 'September 2026', badge: '30 Days', sublabel: '01 Sep 2026 – 30 Sep 2026 • Ends on 30th', start: '2026-09-01', end: '2026-09-30' },
  { value: '2026-10', label: 'October 2026', badge: '31 Days', sublabel: '01 Oct 2026 – 31 Oct 2026 • Ends on 31st', start: '2026-10-01', end: '2026-10-31' },
  { value: '2026-11', label: 'November 2026', badge: '30 Days', sublabel: '01 Nov 2026 – 30 Nov 2026 • Ends on 30th', start: '2026-11-01', end: '2026-11-30' },
  { value: '2026-12', label: 'December 2026', badge: '31 Days', sublabel: '01 Dec 2026 – 31 Dec 2026 • Ends on 31st', start: '2026-12-01', end: '2026-12-31' },
  { value: '2027-01', label: 'January 2027', badge: '31 Days', sublabel: '01 Jan 2027 – 31 Jan 2027 • Ends on 31st', start: '2027-01-01', end: '2027-01-31' },
  { value: '2027-02', label: 'February 2027', badge: '28 Days', sublabel: '01 Feb 2027 – 28 Feb 2027 • Ends on 28th', start: '2027-02-01', end: '2027-02-28' },
  { value: '2027-03', label: 'March 2027', badge: '31 Days', sublabel: '01 Mar 2027 – 31 Mar 2027 • Ends on 31st', start: '2027-03-01', end: '2027-03-31' },
  { value: '2027-04', label: 'April 2027', badge: '30 Days', sublabel: '01 Apr 2027 – 30 Apr 2027 • Ends on 30th', start: '2027-04-01', end: '2027-04-30' },
  { value: '2027-05', label: 'May 2027', badge: '31 Days', sublabel: '01 May 2027 – 31 May 2027 • Ends on 31st', start: '2027-05-01', end: '2027-05-31' },
];

const MONTH_END_KPIS = [
  { key: 'total_conversion_count', label: 'Total Conversions', desc: 'Total Conversion Count' },
  { key: 'total_companies_scheduled', label: 'Companies Scheduled', desc: 'Total Companies Scheduled' },
  { key: 'total_offers_moved', label: 'Offers Received', desc: 'Total Offers Received' },
];

const HIGHLIGHT_PALETTES = [
  { label: 'Fluorescent Yellow', color: '#fef08a', border: '#fde047', badge: 'Yellow' },
  { label: 'Warm Amber', color: '#fed7aa', border: '#fdba74', badge: 'Amber' },
  { label: 'Soft Coral', color: '#fecdd3', border: '#fda4af', badge: 'Rose' },
  { label: 'Ice Sky', color: '#bae6fd', border: '#7dd3fc', badge: 'Sky' },
  { label: 'Mint Green', color: '#bbf7d0', border: '#86efac', badge: 'Green' },
  { label: 'Lavender', color: '#e9d5ff', border: '#d8b4fe', badge: 'Purple' },
];

interface Props {
  initialTemplateType: string;
  initialCollegeId: string;
  coordinatorId: string;
  onReportGenerated: (reportData: any) => void;
}

export function ReportBuilderWizard({
  initialTemplateType,
  initialCollegeId,
  coordinatorId,
  onReportGenerated,
}: Props) {
  const [templateType, setTemplateType] = useState(initialTemplateType || 'weekly_placement');
  const [collegeId, setCollegeId] = useState(
    initialCollegeId && initialCollegeId !== 'all' ? initialCollegeId : ''
  );
  const [academicYear, setAcademicYear] = useState('all');
  const [weeklyTargetMode, setWeeklyTargetMode] = useState<'single' | 'group'>('single');
  const [selectedGroupCollegeIds, setSelectedGroupCollegeIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');

  // Active Leads Stream Filter Selection (JD Received, Positives, Weekly Tracker)
  const [activeLeadStreams, setActiveLeadStreams] = useState<{
    jd_received: boolean;
    positives: boolean;
    weekly_tracker: boolean;
  }>({
    jd_received: true,
    positives: true,
    weekly_tracker: true,
  });

  // Active Leads Table Columns Selector
  const [activeLeadsColumns, setActiveLeadsColumns] = useState<{
    colleges: boolean;
    role: boolean;
    ctc: boolean;
  }>({
    colleges: true,
    role: true,
    ctc: true,
  });

  // Prepared By / Sign-off Footer Options
  const [includePreparedBy, setIncludePreparedBy] = useState<boolean>(true);
  const [preparedByName, setPreparedByName] = useState<string>(() => {
    return readSessionUser()?.full_name || 'Placement Coordinator';
  });

  // Pending Tasks State for row highlighting during report creation
  const [pendingTasksList, setPendingTasksList] = useState<any[]>([]);
  const [loadingPendingTasks, setLoadingPendingTasks] = useState<boolean>(false);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const [highlightColor, setHighlightColor] = useState<string>('#fef08a'); // Fluorescent Yellow
  const [highlightColorMap, setHighlightColorMap] = useState<Record<string, string>>({});

  // Selected Month for Month-End reports
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Dynamic Interactive Date Range Calendar Selection
  const [startDate, setStartDate] = useState('2026-08-21');
  const [endDate, setEndDate] = useState('2026-08-27');
  const [weekLabel, setWeekLabel] = useState(
    () => formatPeriodFromDates('2026-08-21', '2026-08-27') || '21 Aug – 27 Aug 2026'
  );
  const [theme, setTheme] = useState('blue');
  const [customRemarks, setCustomRemarks] = useState(() => {
    if (initialTemplateType === 'pending_tasks') {
      return 'All pending action items are actively tracked with institutions and corporate HRs for prompt closure.';
    }
    if (initialTemplateType === 'active_leads') {
      return 'Comprehensive active corporate roster curated for campus recruitment engagements.';
    }
    if (initialTemplateType === 'month_end') {
      return 'Comprehensive monthly recruitment progress review covering conversions, scheduled drives, and placement selections.';
    }
    return 'All campus drives are progressing actively as per schedule. Follow-ups with upcoming tech partners remain on track.';
  });

  // Section inclusion toggles initialized from template
  const [sections, setSections] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    if (initialTemplateType === 'pending_tasks') {
      s.pending_tasks = true;
      s.remarks = true;
    } else if (initialTemplateType === 'active_leads') {
      s.kpi_summary = true;
      s.active_leads = true;
      s.remarks = true;
    } else if (initialTemplateType === 'month_end') {
      s.kpi_summary = true;
      s.completed_companies = true;
      s.company_conversions = true;
      s.companies_in_drive = true;
      s.company_drives_scheduled = true;
      s.on_hold_by_college = true;
      s.on_hold_by_hr = true;
      s.remarks = false;
    } else {
      s.kpi_summary = false;
      s.completed_companies = true;
      s.companies_in_drive = true;
      s.in_progress = true;
      s.pipeline = true;
      s.top_companies = true;
      s.rejected_companies = true;
      s.on_hold_by_college = true;
      s.on_hold_by_hr = true;
      s.remarks = true;
    }
    return s;
  });

  // Granular KPI card picker toggles
  const [kpiCards, setKpiCards] = useState<Record<string, boolean>>({
    total_calls: true,
    positive_responses: true,
    not_hiring: true,
    jds_received: true,
    total_leads: true,
    graduating_year: true,
    active_companies_count: true,
    colleges_handled: true,
    total_conversion_count: true,
    total_companies_scheduled: true,
    total_offers_moved: true,
  });

  const [colleges, setColleges] = useState<College[]>(() => getCachedColleges());
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Live Weekly Tracker Companies State (Synced directly with Weekly Tracker DB)
  const [weeklyCompanies, setWeeklyCompanies] = useState<{
    completed: any[];
    in_drive: any[];
    in_progress: any[];
    pipeline: any[];
    top_companies: any[];
    rejected_companies: any[];
    on_hold_by_college: any[];
    on_hold_by_hr: any[];
  }>({
    completed: [],
    in_drive: [],
    in_progress: [],
    pipeline: [],
    top_companies: [],
    rejected_companies: [],
    on_hold_by_college: [],
    on_hold_by_hr: [],
  });
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  // ── Weekly Tracker Filters & Preview State ──
  const [weeklyMinCtc, setWeeklyMinCtc] = useState<number | null>(null);
  const [weeklyCustomCtcInput, setWeeklyCustomCtcInput] = useState<string>('');
  const [weeklyIncludeCompetitive, setWeeklyIncludeCompetitive] = useState<boolean>(false);
  const [weeklyCompanySearch, setWeeklyCompanySearch] = useState<string>('');
  const [weeklyCompanyType, setWeeklyCompanyType] = useState<string>('all');
  const [weeklyStatusFilter, setWeeklyStatusFilter] = useState<string>('all');
  const [weeklyActivePreviewTab, setWeeklyActivePreviewTab] = useState<string>('all');
  const [weeklyExcludedIds, setWeeklyExcludedIds] = useState<Set<string>>(new Set());

  // Sync colleges on mount
  useEffect(() => {
    let isMounted = true;
    const loadColleges = async () => {
      try {
        const fetched = await fetchAllCollegesCached();
        if (isMounted && fetched && fetched.length > 0) {
          setColleges(fetched);
        }
      } catch (err) {
        console.error('Failed to load colleges in ReportBuilderWizard:', err);
      }
    };
    loadColleges();
    return () => {
      isMounted = false;
    };
  }, []);

  // Prioritize active focus colleges first, followed by all remaining colleges in alphabetical order
  const prioritizedColleges = useMemo(() => {
    const coordinatorSelectedIds = getCoordinatorSelectedColleges();
    const focusedIdsFromColleges = (colleges as any[]).filter((c) => c.is_selected_by_me).map((c) => c._id);
    const activeFocusIds = Array.from(new Set([...coordinatorSelectedIds, ...focusedIdsFromColleges]));
    return sortCollegesWithPriority(colleges as any[], activeFocusIds);
  }, [colleges]);

  const filteredGroupColleges = useMemo(() => {
    if (!groupSearchQuery.trim()) return prioritizedColleges;
    const q = groupSearchQuery.toLowerCase().trim();
    return prioritizedColleges.filter((c: any) =>
      (c.college_name || '').toLowerCase().includes(q) ||
      (c.college_code || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q)
    );
  }, [prioritizedColleges, groupSearchQuery]);

  // Fetch live Weekly Tracker companies for the selected college and batch
  useEffect(() => {
    const targetIds =
      weeklyTargetMode === 'group'
        ? selectedGroupCollegeIds.filter(Boolean)
        : collegeId && collegeId !== 'all'
        ? [collegeId]
        : [];

    if (targetIds.length === 0 || templateType === 'active_leads') {
      setWeeklyCompanies({
        completed: [],
        in_drive: [],
        in_progress: [],
        pipeline: [],
        top_companies: [],
        rejected_companies: [],
        on_hold_by_college: [],
        on_hold_by_hr: [],
      });
      return;
    }

    let isMounted = true;
    const fetchWeeklyData = async () => {
      setLoadingWeekly(true);
      try {
        const params = new URLSearchParams();
        params.set('college_id', targetIds.join(','));
        if (academicYear && academicYear !== 'all') {
          params.set('academic_year', academicYear);
        }

        let res = await apiFetch(`/weekly-tracker?${params.toString()}`);

        // Fallback: If 0 records returned for a specific academic year filter, fallback to all batches for this college
        if (
          isMounted &&
          res.success &&
          res.data &&
          ((res.data.sections && Object.values(res.data.sections).every((s: any) => !s?.rows?.length)) ||
            (Array.isArray(res.data) && res.data.length === 0)) &&
          academicYear &&
          academicYear !== 'all'
        ) {
          const fallbackParams = new URLSearchParams();
          fallbackParams.set('college_id', targetIds.join(','));
          res = await apiFetch(`/weekly-tracker?${fallbackParams.toString()}`);
        }

        if (isMounted && res.success && res.data) {
          let completed: any[] = [];
          let in_drive: any[] = [];
          let in_progress: any[] = [];
          let pipeline: any[] = [];
          let top_companies: any[] = [];
          let rejected_companies: any[] = [];
          let on_hold_by_college: any[] = [];
          let on_hold_by_hr: any[] = [];

          if (res.data.sections) {
            const sec = res.data.sections;
            completed = sec.completed?.rows || [];
            in_drive = sec.in_drive?.rows || sec.companies_in_drive?.rows || [];
            in_progress = sec.in_progress?.rows || [];
            pipeline = sec.pipeline?.rows || [];
            top_companies = sec.top_companies?.rows || [];
            rejected_companies = sec.rejected_companies?.rows || sec.rejected_by_hr?.rows || [];
            on_hold_by_college = sec.on_hold_by_college?.rows || sec.rejected_by_college?.rows || [];
            on_hold_by_hr = sec.on_hold_by_hr?.rows || [];
          } else if (Array.isArray(res.data)) {
            const rows = res.data;
            completed = rows.filter((r: any) => r.pipeline_section === 'completed');
            in_drive = rows.filter((r: any) => r.pipeline_section === 'in_drive' || r.pipeline_section === 'companies_in_drive');
            in_progress = rows.filter((r: any) => r.pipeline_section === 'in_progress');
            pipeline = rows.filter((r: any) => r.pipeline_section === 'pipeline');
            top_companies = rows.filter((r: any) => r.pipeline_section === 'top_companies' || r.is_pinned_top);
            rejected_companies = rows.filter((r: any) => r.pipeline_section === 'rejected_companies' || r.pipeline_section === 'rejected_by_hr');
            on_hold_by_college = rows.filter((r: any) => r.pipeline_section === 'on_hold_by_college' || r.pipeline_section === 'rejected_by_college');
            on_hold_by_hr = rows.filter((r: any) => r.pipeline_section === 'on_hold_by_hr');
          }

          setWeeklyCompanies({
            completed,
            in_drive,
            in_progress,
            pipeline,
            top_companies,
            rejected_companies,
            on_hold_by_college,
            on_hold_by_hr,
          });
        }
      } catch (err) {
        console.error('Failed to sync weekly tracker data in report builder:', err);
      } finally {
        if (isMounted) setLoadingWeekly(false);
      }
    };
    fetchWeeklyData();
    return () => {
      isMounted = false;
    };
  }, [collegeId, weeklyTargetMode, selectedGroupCollegeIds, academicYear, templateType]);

  const selectedCollegeObj = useMemo(() => {
    if (weeklyTargetMode === 'group') {
      return {
        college_name: `${selectedGroupCollegeIds.length} Selected Institutions`,
        college_code: 'MULTI',
      };
    }
    return (colleges as any[]).find((c) => String(c._id) === String(collegeId));
  }, [colleges, collegeId, weeklyTargetMode, selectedGroupCollegeIds]);

  // Dynamic CTC ranges calculation based on actual companies present in the selected college
  const { availableCtcBrackets, unspecifiedCtcCount } = useMemo(() => {
    const allRows = [
      ...(weeklyCompanies.in_progress || []),
      ...(weeklyCompanies.pipeline || []),
      ...(weeklyCompanies.in_drive || []),
      ...(weeklyCompanies.completed || []),
      ...(weeklyCompanies.top_companies || []),
      ...(weeklyCompanies.on_hold_by_college || []),
      ...(weeklyCompanies.on_hold_by_hr || []),
      ...(weeklyCompanies.rejected_companies || []),
    ];

    if (allRows.length === 0) {
      return {
        availableCtcBrackets: [{ label: 'All CTCs', value: null, count: 0 }],
        unspecifiedCtcCount: 0,
      };
    }

    let unspecCount = 0;
    const distinctNumbers = new Set<number>();
    allRows.forEach((r) => {
      const nums = extractCtcNumbers(r.ctc_lpa || r.ctc);
      if (nums.length === 0) {
        unspecCount++;
      } else {
        nums.forEach((n) => {
          if (n >= 1 && n <= 100) {
            distinctNumbers.add(Math.round(n * 10) / 10);
          }
        });
      }
    });

    const baselineThresholds = [3, 4, 5, 6, 8, 10, 12, 15];
    const allThresholdCandidates = Array.from(
      new Set([...baselineThresholds, ...Array.from(distinctNumbers)])
    ).sort((a, b) => a - b);

    const brackets = allThresholdCandidates
      .map((thresh) => ({
        value: thresh,
        label: `≥ ${thresh} LPA`,
        count: allRows.filter((r) => matchesMinCtc(r.ctc_lpa || r.ctc, thresh, false)).length,
      }))
      .filter((b) => b.count > 0);

    return {
      availableCtcBrackets: [
        { label: 'All CTCs', value: null, count: allRows.length },
        ...brackets,
      ],
      unspecifiedCtcCount: unspecCount,
    };
  }, [weeklyCompanies]);

  // Dropdown options formatted for SmoothSelect
  const ctcSelectOptions = useMemo(() => {
    return availableCtcBrackets.map((b) => ({
      value: b.value === null ? 'all' : String(b.value),
      label: b.value === null ? 'All CTC Packages (Any Range)' : `≥ ${b.value} LPA onwards`,
      badge: `${b.count} ${b.count === 1 ? 'drive' : 'drives'}`,
    }));
  }, [availableCtcBrackets]);

  // Memoized Filtered Weekly Tracker companies based on CTC and column filters
  const filteredWeeklyCompanies = useMemo(() => {
    const filterRow = (r: any) => {
      // 1. Min CTC
      if (!matchesMinCtc(r.ctc_lpa || r.ctc, weeklyMinCtc, weeklyIncludeCompetitive)) return false;
      // 2. Company Name
      if (weeklyCompanySearch.trim()) {
        const q = weeklyCompanySearch.toLowerCase().trim();
        if (!(r.company_name || '').toLowerCase().includes(q)) return false;
      }
      // 3. Company Type
      if (weeklyCompanyType && weeklyCompanyType !== 'all') {
        const t = (r.company_type || '').toLowerCase();
        if (weeklyCompanyType === 'software' && !t.includes('soft') && !t.includes('it')) return false;
        if (weeklyCompanyType === 'core' && !t.includes('core') && !t.includes('mech') && !t.includes('elec') && !t.includes('civil')) return false;
        if (weeklyCompanyType === 'product' && !t.includes('prod')) return false;
        if (weeklyCompanyType === 'banking' && !t.includes('bank') && !t.includes('fin')) return false;
        if (weeklyCompanyType === 'consulting' && !t.includes('consult')) return false;
      }
      // 4. Status
      if (weeklyStatusFilter && weeklyStatusFilter !== 'all') {
        const s = weeklyStatusFilter.toLowerCase().trim();
        const text = ((r.current_status_text || r.status || '') + ' ' + (r.remarks || '')).toLowerCase();
        if (!text.includes(s)) return false;
      }
      return true;
    };

    return {
      completed: (weeklyCompanies.completed || []).filter(filterRow),
      in_drive: (weeklyCompanies.in_drive || []).filter(filterRow),
      in_progress: (weeklyCompanies.in_progress || []).filter(filterRow),
      pipeline: (weeklyCompanies.pipeline || []).filter(filterRow),
      top_companies: (weeklyCompanies.top_companies || []).filter(filterRow),
      rejected_companies: (weeklyCompanies.rejected_companies || []).filter(filterRow),
      on_hold_by_college: (weeklyCompanies.on_hold_by_college || []).filter(filterRow),
      on_hold_by_hr: (weeklyCompanies.on_hold_by_hr || []).filter(filterRow),
    };
  }, [
    weeklyCompanies,
    weeklyMinCtc,
    weeklyIncludeCompetitive,
    weeklyCompanySearch,
    weeklyCompanyType,
    weeklyStatusFilter,
  ]);

  const totalWeeklyRawCount = useMemo(() => {
    return Object.values(weeklyCompanies).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    );
  }, [weeklyCompanies]);

  const totalWeeklyFilteredCount = useMemo(() => {
    return Object.values(filteredWeeklyCompanies).reduce((sum: number, arr: any) => {
      const activeRows = Array.isArray(arr)
        ? arr.filter(
            (r: any) =>
              !weeklyExcludedIds.has(String(r._id || r.company_id || r.company_name))
          )
        : [];
      return sum + activeRows.length;
    }, 0);
  }, [filteredWeeklyCompanies, weeklyExcludedIds]);

  const previewRows = useMemo(() => {
    if (weeklyActivePreviewTab === 'in_progress')
      return filteredWeeklyCompanies.in_progress.map((r) => ({ ...r, _sectionKey: 'in_progress', _sectionLabel: 'In Progress' }));
    if (weeklyActivePreviewTab === 'pipeline')
      return filteredWeeklyCompanies.pipeline.map((r) => ({ ...r, _sectionKey: 'pipeline', _sectionLabel: 'In Pipeline' }));
    if (weeklyActivePreviewTab === 'in_drive')
      return filteredWeeklyCompanies.in_drive.map((r) => ({ ...r, _sectionKey: 'in_drive', _sectionLabel: 'In Drive' }));
    if (weeklyActivePreviewTab === 'completed')
      return filteredWeeklyCompanies.completed.map((r) => ({ ...r, _sectionKey: 'completed', _sectionLabel: 'Completed' }));
    if (weeklyActivePreviewTab === 'top_companies')
      return filteredWeeklyCompanies.top_companies.map((r) => ({ ...r, _sectionKey: 'top_companies', _sectionLabel: 'Top Company' }));
    if (weeklyActivePreviewTab === 'on_hold') {
      return [
        ...filteredWeeklyCompanies.on_hold_by_college.map((r) => ({ ...r, _sectionKey: 'on_hold_by_college', _sectionLabel: 'On Hold (College)' })),
        ...filteredWeeklyCompanies.on_hold_by_hr.map((r) => ({ ...r, _sectionKey: 'on_hold_by_hr', _sectionLabel: 'On Hold (HR)' })),
      ];
    }
    if (weeklyActivePreviewTab === 'rejected') {
      return filteredWeeklyCompanies.rejected_companies.map((r) => ({ ...r, _sectionKey: 'rejected_companies', _sectionLabel: 'Rejected' }));
    }
    // 'all'
    return [
      ...filteredWeeklyCompanies.in_progress.map((r) => ({ ...r, _sectionKey: 'in_progress', _sectionLabel: 'In Progress' })),
      ...filteredWeeklyCompanies.pipeline.map((r) => ({ ...r, _sectionKey: 'pipeline', _sectionLabel: 'In Pipeline' })),
      ...filteredWeeklyCompanies.in_drive.map((r) => ({ ...r, _sectionKey: 'in_drive', _sectionLabel: 'In Drive' })),
      ...filteredWeeklyCompanies.completed.map((r) => ({ ...r, _sectionKey: 'completed', _sectionLabel: 'Completed' })),
      ...filteredWeeklyCompanies.top_companies.map((r) => ({ ...r, _sectionKey: 'top_companies', _sectionLabel: 'Top Company' })),
      ...filteredWeeklyCompanies.on_hold_by_college.map((r) => ({ ...r, _sectionKey: 'on_hold_by_college', _sectionLabel: 'On Hold (College)' })),
      ...filteredWeeklyCompanies.on_hold_by_hr.map((r) => ({ ...r, _sectionKey: 'on_hold_by_hr', _sectionLabel: 'On Hold (HR)' })),
      ...filteredWeeklyCompanies.rejected_companies.map((r) => ({ ...r, _sectionKey: 'rejected_companies', _sectionLabel: 'Rejected' })),
    ];
  }, [weeklyActivePreviewTab, filteredWeeklyCompanies]);

  const tabCounts = useMemo(() => {
    const countActive = (arr: any[]) =>
      (arr || []).filter(
        (r: any) => !weeklyExcludedIds.has(String(r._id || r.company_id || r.company_name))
      ).length;
    return {
      all: totalWeeklyFilteredCount,
      in_progress: countActive(filteredWeeklyCompanies.in_progress),
      pipeline: countActive(filteredWeeklyCompanies.pipeline),
      in_drive: countActive(filteredWeeklyCompanies.in_drive),
      completed: countActive(filteredWeeklyCompanies.completed),
      top_companies: countActive(filteredWeeklyCompanies.top_companies),
      on_hold:
        countActive(filteredWeeklyCompanies.on_hold_by_college) +
        countActive(filteredWeeklyCompanies.on_hold_by_hr),
      rejected: countActive(filteredWeeklyCompanies.rejected_companies),
    };
  }, [filteredWeeklyCompanies, weeklyExcludedIds, totalWeeklyFilteredCount]);

  const handleToggleExcludeCompany = (id: string) => {
    setWeeklyExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPreview = () => {
    setWeeklyExcludedIds((prev) => {
      const next = new Set(prev);
      previewRows.forEach((r: any) => {
        next.delete(String(r._id || r.company_id || r.company_name));
      });
      return next;
    });
  };

  const handleDeselectAllPreview = () => {
    setWeeklyExcludedIds((prev) => {
      const next = new Set(prev);
      previewRows.forEach((r: any) => {
        next.add(String(r._id || r.company_id || r.company_name));
      });
      return next;
    });
  };

  const handleResetWeeklyFilters = () => {
    setWeeklyMinCtc(null);
    setWeeklyCustomCtcInput('');
    setWeeklyIncludeCompetitive(false);
    setWeeklyCompanySearch('');
    setWeeklyCompanyType('all');
    setWeeklyStatusFilter('all');
    setWeeklyExcludedIds(new Set());
  };

  // Sync state when returning from editor via initialTemplateType / initialCollegeId props
  useEffect(() => {
    if (initialTemplateType && initialTemplateType !== templateType) {
      setTemplateType(initialTemplateType);
      if (initialTemplateType === 'pending_tasks') {
        setSections({
          pending_tasks: true,
          remarks: true,
        });
        setCustomRemarks('All pending action items are actively tracked with institutions and corporate HRs for prompt closure.');
      } else if (initialTemplateType === 'active_leads') {
        setSections({
          kpi_summary: true,
          active_leads: true,
          remarks: true,
        });
        setCustomRemarks('Comprehensive active corporate roster curated for campus recruitment engagements.');
      } else if (initialTemplateType === 'month_end') {
        setSections({
          kpi_summary: true,
          completed_companies: true,
          company_conversions: true,
          companies_in_drive: true,
          company_drives_scheduled: true,
          on_hold_by_college: true,
          on_hold_by_hr: true,
          remarks: false,
        });
        setCustomRemarks('Comprehensive monthly recruitment progress review covering conversions, scheduled drives, and placement selections.');
      } else {
        setSections({
          kpi_summary: false,
          completed_companies: true,
          in_progress: true,
          pipeline: true,
          top_companies: true,
          rejected_companies: true,
          on_hold_by_college: true,
          on_hold_by_hr: true,
          remarks: true,
        });
        setCustomRemarks('All campus drives are progressing actively as per schedule. Follow-ups with upcoming tech partners remain on track.');
      }
    }
    if (initialCollegeId && initialCollegeId !== 'all') {
      setCollegeId(initialCollegeId);
    }
  }, [initialTemplateType, initialCollegeId]);

  // ── Auto-load Pending Tasks when template is pending_tasks and college is selected ──
  useEffect(() => {
    if (templateType !== 'pending_tasks') return;
    if (!collegeId || collegeId === 'all') {
      setPendingTasksList([]);
      return;
    }
    let isSubscribed = true;
    setLoadingPendingTasks(true);
    apiFetch(`/pending-tasks?college_id=${collegeId}`)
      .then((res) => {
        if (!isSubscribed) return;
        if (res.success && res.data) {
          const list = (res.data as any).tasks || [];
          setPendingTasksList(list);
        }
      })
      .catch((err) => console.error('[ReportBuilder] Failed to load pending tasks:', err))
      .finally(() => {
        if (isSubscribed) setLoadingPendingTasks(false);
      });
    return () => {
      isSubscribed = false;
    };
  }, [templateType, collegeId]);

  const handleToggleRowHighlight = (taskId: string) => {
    const nextSet = new Set(highlightedTaskIds);
    const nextMap = { ...highlightColorMap };
    if (nextSet.has(taskId)) {
      nextSet.delete(taskId);
      delete nextMap[taskId];
    } else {
      nextSet.add(taskId);
      nextMap[taskId] = highlightColor;
    }
    setHighlightedTaskIds(nextSet);
    setHighlightColorMap(nextMap);
  };

  const handleAutoHighlightCollegePending = () => {
    const nextSet = new Set(highlightedTaskIds);
    const nextMap = { ...highlightColorMap };
    pendingTasksList.forEach((t) => {
      const status = (t.current_status || '').toLowerCase();
      const action = (t.action_to_be_taken || '').toLowerCase();
      const remarks = (t.remarks || '').toLowerCase();
      const isPending =
        status.includes('pending') ||
        status.includes('db pending') ||
        status.includes('database pending') ||
        action.includes('yet to be share') ||
        action.includes('db yet') ||
        action.includes('pending') ||
        remarks.includes('pending');
      if (isPending) {
        nextSet.add(t._id);
        nextMap[t._id] = highlightColor;
      }
    });
    setHighlightedTaskIds(nextSet);
    setHighlightColorMap(nextMap);
  };

  const handleClearAllHighlights = () => {
    setHighlightedTaskIds(new Set());
    setHighlightColorMap({});
  };

  const handleHighlightAllTasks = () => {
    const nextSet = new Set<string>();
    const nextMap: Record<string, string> = {};
    pendingTasksList.forEach((t) => {
      nextSet.add(t._id);
      nextMap[t._id] = highlightColor;
    });
    setHighlightedTaskIds(nextSet);
    setHighlightColorMap(nextMap);
  };

  const handleCategoryChange = (newType: string) => {
    setTemplateType(newType);
    setValidationErrors([]);
    if (newType === 'pending_tasks') {
      setSections({
        pending_tasks: true,
        remarks: true,
      });
      setCustomRemarks('All pending action items are actively tracked with institutions and corporate HRs for prompt closure.');
    } else if (newType === 'active_leads') {
      setSections({
        kpi_summary: true,
        active_leads: true,
        remarks: true,
      });
      setCustomRemarks('Comprehensive active corporate roster curated for campus recruitment engagements.');
    } else if (newType === 'month_end') {
      setSections({
        kpi_summary: true,
        completed_companies: true,
        company_conversions: true,
        companies_in_drive: true,
        company_drives_scheduled: true,
        on_hold_by_college: true,
        on_hold_by_hr: true,
        remarks: false,
      });
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
      setWeekLabel('August 2026');
      setCustomRemarks('Comprehensive monthly recruitment progress review covering conversions, scheduled drives, and placement selections.');
    } else {
      setSections({
        kpi_summary: false,
        completed_companies: true,
        companies_in_drive: true,
        in_progress: true,
        pipeline: true,
        top_companies: true,
        rejected_companies: true,
        on_hold_by_college: true,
        on_hold_by_hr: true,
        remarks: true,
      });
      setCustomRemarks('All campus drives are progressing actively as per schedule. Follow-ups with upcoming tech partners remain on track.');
    }
  };

  const handleGenerate = async () => {
    setValidationErrors([]);
    const errors: string[] = [];

    // 1. Mandatory Target College (For Weekly Placement, Month-End, and Pending Tasks)
    if (templateType === 'weekly_placement') {
      if (weeklyTargetMode === 'group') {
        if (selectedGroupCollegeIds.length === 0) {
          errors.push('Please select at least one college for the multi-college weekly report.');
        }
      } else {
        if (!collegeId || collegeId.trim() === '' || collegeId === 'all') {
          errors.push('Target Institution is required. Please pick a college to generate the report.');
        }
      }
    } else if (templateType === 'pending_tasks' || templateType === 'month_end') {
      if (!collegeId || collegeId.trim() === '' || collegeId === 'all') {
        errors.push('Target Institution is required. Please pick a college to generate the report.');
      }
    }

    // 2. Graduating Academic Year (Mandatory for Weekly Reports only, Optional for Active Leads & Month-End)
    if (templateType === 'weekly_placement') {
      if (!academicYear || academicYear.trim() === '') {
        errors.push('Graduating Academic Year must be selected.');
      }
    }

    // 2b. Active Leads Stream Selection (At least one stream must be active)
    if (templateType === 'active_leads') {
      if (!activeLeadStreams.jd_received && !activeLeadStreams.positives && !activeLeadStreams.weekly_tracker) {
        errors.push('Please select at least one stream (JD Received, Positives, or Weekly Tracker) to build the Active Leads report.');
      }
    }

    // 3. Date Range verification for weekly placement (Optional for both single and multi-college)
    if (templateType === 'weekly_placement') {
      if (startDate && endDate) {
        const s = new Date(startDate + 'T00:00:00');
        const e = new Date(endDate + 'T00:00:00');
        if (s > e) {
          errors.push('The "From" start date cannot be after the "To" end date.');
        }
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const isMultiWeekly = templateType === 'weekly_placement' && weeklyTargetMode === 'group';
      const effectiveWeekLabel = (!startDate || !endDate)
        ? (weekLabel && !weekLabel.toLowerCase().includes('select') && !weekLabel.toLowerCase().includes('cumulative') ? weekLabel : '')
        : (weekLabel && !weekLabel.toLowerCase().includes('cumulative') ? weekLabel : '');
      // Build custom weekly companies filtered payload if weekly_placement template
      let customWeeklyCompaniesPayload: any = undefined;
      if (templateType === 'weekly_placement') {
        const filterExcluded = (arr: any[]) =>
          (arr || []).filter(
            (r: any) => !weeklyExcludedIds.has(String(r._id || r.company_id || r.company_name))
          );
        customWeeklyCompaniesPayload = {
          completed: filterExcluded(filteredWeeklyCompanies.completed),
          in_drive: filterExcluded(filteredWeeklyCompanies.in_drive),
          in_progress: filterExcluded(filteredWeeklyCompanies.in_progress),
          pipeline: filterExcluded(filteredWeeklyCompanies.pipeline),
          top_companies: filterExcluded(filteredWeeklyCompanies.top_companies),
          rejected_companies: filterExcluded(filteredWeeklyCompanies.rejected_companies),
          on_hold_by_college: filterExcluded(filteredWeeklyCompanies.on_hold_by_college),
          on_hold_by_hr: filterExcluded(filteredWeeklyCompanies.on_hold_by_hr),
        };
      }

      const res = await apiFetch('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          template_type: templateType,
          is_multi_college: isMultiWeekly,
          college_ids: isMultiWeekly ? selectedGroupCollegeIds : undefined,
          college_id: isMultiWeekly ? 'multi' : (templateType === 'active_leads' ? (collegeId || 'all') : collegeId),
          coordinator_id: coordinatorId || readSessionUser()?._id || readSessionUser()?.id || '',
          academic_year: academicYear,
          week_label: effectiveWeekLabel,
          theme,
          lead_sources: templateType === 'active_leads' ? activeLeadStreams : undefined,
          active_leads_columns: templateType === 'active_leads' ? activeLeadsColumns : undefined,
          include_prepared_by: includePreparedBy,
          prepared_by: includePreparedBy ? preparedByName.trim() : '',
          min_ctc: weeklyMinCtc,
          include_competitive_ctc: weeklyIncludeCompetitive,
          company_name_filter: weeklyCompanySearch.trim() || undefined,
          company_type_filter: weeklyCompanyType !== 'all' ? weeklyCompanyType : undefined,
          status_filter: weeklyStatusFilter.trim() || undefined,
          custom_weekly_companies: customWeeklyCompaniesPayload,
          included_sections: {
            ...sections,
            ...(templateType === 'active_leads' ? { active_leads: true } : {}),
            ...(templateType === 'pending_tasks' ? { pending_tasks: true } : {}),
          },
          included_kpi_cards: kpiCards,
          kpi_cards: kpiCards,
          custom_remarks: customRemarks,
          highlighted_task_ids: Array.from(highlightedTaskIds),
          highlight_color_map: highlightColorMap,
          default_highlight_color: highlightColor,
          custom_pending_tasks: templateType === 'pending_tasks' && pendingTasksList.length > 0 ? pendingTasksList.map((t, idx) => ({
            _id: t._id,
            s_no: t.serial_no || idx + 1,
            company_name: t.company_name,
            jd_received_date: t.jd_received_date ? new Date(t.jd_received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
            db_shared_date: t.db_shared_date ? new Date(t.db_shared_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
            current_status: t.current_status || 'Database Pending',
            action_to_be_taken: t.action_to_be_taken || '',
            drive_date: t.drive_date ? new Date(t.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
            remarks: t.remarks || '',
            is_highlighted: highlightedTaskIds.has(t._id),
            highlight_color: highlightColorMap[t._id] || highlightColor,
          })) : undefined,
        }),
      });
      if (res.success && res.data) {
        onReportGenerated((res.data as any).report);
      } else {
        setValidationErrors([res.error?.message || 'Failed to generate report']);
      }
    } catch (err) {
      console.error('Generate report error:', err);
      setValidationErrors(['Network error while generating report. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  // Section items tailored specifically to the active category with live company details
  const getSectionsConfig = () => {
    if (templateType === 'pending_tasks') {
      return [
        { key: 'pending_tasks', label: 'Placement Pending Tasks Table', icon: ListTodo, desc: 'Complete breakdown of pending drives, actions, and remarks' },
        { key: 'remarks', label: 'Coordinator Remarks & Observations', icon: PenLine, desc: 'Action items summary and leadership notes' },
      ];
    }
    if (templateType === 'active_leads') {
      return [
        {
          key: 'kpi_summary',
          label: 'Active Leads KPI Summary',
          icon: BarChart3,
          desc: 'Select which KPI metrics appear in the header summary strip',
          isKpiSection: true,
          kpiList: ACTIVE_LEADS_KPIS,
        },
        { key: 'remarks', label: 'Notes', icon: PenLine, desc: 'Corporate relationship overview and strategic notes' },
      ];
    }
    if (templateType === 'month_end') {
      return [
        {
          key: 'kpi_summary',
          label: 'Month-End Executive KPI Cards',
          icon: BarChart3,
          desc: '3 colored cards: Total conversions, Companies scheduled, Offers received',
          isKpiSection: true,
          kpiList: MONTH_END_KPIS,
        },
        {
          key: 'completed_companies',
          label: 'Companies Completed',
          icon: Trophy,
          desc: 'Company Name, Role, CTC, Status, Offers Received',
          companies: weeklyCompanies.completed,
          badgeColor: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        },
        {
          key: 'company_conversions',
          label: 'JD Received Companies',
          icon: Briefcase,
          desc: 'Company Name, Role, CTC, JD Received Date',
          companies: weeklyCompanies.in_progress,
          badgeColor: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        },
        {
          key: 'companies_in_drive',
          label: 'Companies in Drive',
          icon: Calendar,
          desc: 'Company Name, Role, CTC, Status',
          companies: weeklyCompanies.in_drive,
          badgeColor: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        },
        {
          key: 'on_hold_by_college',
          label: 'Companies on Hold by TPO',
          icon: Clock,
          desc: 'Placement drives placed on hold by college management / TPO',
          companies: weeklyCompanies.on_hold_by_college,
          badgeColor: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        },
        {
          key: 'on_hold_by_hr',
          label: 'Companies on Hold by HR',
          icon: AlertCircle,
          desc: 'Drives on hold from corporate employer / HR side',
          companies: weeklyCompanies.on_hold_by_hr,
          badgeColor: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        },
        {
          key: 'remarks',
          label: 'Coordinator Monthly Observations',
          icon: PenLine,
          desc: 'Operational summary and placement review notes',
        },
      ];
    }

    const list: any[] = [
      {
        key: 'completed_companies',
        label: '1. Companies Completed',
        icon: CheckCircle2,
        desc: 'Finished drives with confirmed placed student counts',
        companies: filteredWeeklyCompanies.completed,
        badgeColor: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      },
      {
        key: 'companies_in_drive',
        label: '2. Companies in Drive',
        icon: Rocket,
        desc: 'Scheduled campus placement drives actively underway or confirmed',
        companies: filteredWeeklyCompanies.in_drive,
        badgeColor: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      },
      {
        key: 'in_progress',
        label: '3. Companies In Progress',
        icon: Clock,
        desc: 'Active ongoing interview evaluation rounds',
        companies: filteredWeeklyCompanies.in_progress,
        badgeColor: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      },
      {
        key: 'pipeline',
        label: '4. Companies In Pipeline',
        icon: Layers,
        desc: 'Upcoming scheduled drives and confirmed tech partnerships',
        companies: filteredWeeklyCompanies.pipeline,
        badgeColor: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      },
      {
        key: 'top_companies',
        label: '5. Top Companies',
        icon: Sparkles,
        desc: 'Premier high-CTC partner organizations',
        companies: filteredWeeklyCompanies.top_companies || [],
        badgeColor: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      },
      {
        key: 'rejected_companies',
        label: '6. Rejected Companies',
        icon: XCircle,
        desc: 'Companies with employer declines or ineligible criteria',
        companies: filteredWeeklyCompanies.rejected_companies || [],
        badgeColor: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      },
      {
        key: 'on_hold_by_college',
        label: '7. Companies On Hold By College',
        icon: Clock,
        desc: 'Placement drives placed on hold by college management / TPO',
        companies: filteredWeeklyCompanies.on_hold_by_college || [],
        badgeColor: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      },
      {
        key: 'on_hold_by_hr',
        label: '8. Companies On Hold By HR',
        icon: Clock,
        desc: 'Placement drives placed on hold by corporate HR partners',
        companies: filteredWeeklyCompanies.on_hold_by_hr || [],
        badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      },
    ];

    list.push({
      key: 'remarks',
      label: 'Coordinator Remarks & Observations',
      icon: PenLine,
      desc: 'Operational observations and placement overview',
    });

    return list;
  };

  return (
    <div className="space-y-6 text-fg">

      {/* ── Navigation Tabs (Weekly Report, Month-End Report, Pending Tasks, Active Leads) ────────────────── */}
      <div className="flex justify-center pt-2 pb-2">
        <div className="w-full max-w-4xl bg-surface border border-border p-1.5 rounded-2xl shadow-xs grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => handleCategoryChange('weekly_placement')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              templateType === 'weekly_placement'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <CalendarDays size={15} strokeWidth={2.2} />
            <span className="whitespace-nowrap">Weekly Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('month_end')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              templateType === 'month_end'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <Award size={15} strokeWidth={2.2} />
            <span className="whitespace-nowrap">Month-End Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('pending_tasks')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              templateType === 'pending_tasks'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <ListTodo size={15} strokeWidth={2.2} />
            <span className="whitespace-nowrap">Pending Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('active_leads')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              templateType === 'active_leads'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <Sparkles size={15} strokeWidth={2.2} />
            <span className="whitespace-nowrap">Active Leads</span>
          </button>
        </div>
      </div>

      {/* ── Configuration Card: Showing Sections Relevant to Active Report ─────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-6">

        {/* Section A: Scope & Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            {templateType === 'active_leads' ? (
              <Sparkles size={16} className="text-primary shrink-0" />
            ) : templateType === 'month_end' ? (
              <Award size={16} className="text-indigo-600 shrink-0" />
            ) : (
              <Building2 size={16} className="text-primary shrink-0" />
            )}
            <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
              {templateType === 'active_leads'
                ? 'Target Graduating Batch (Optional)'
                : templateType === 'month_end'
                ? 'Institutional Scope & Batch'
                : 'Institutional Scope & Batch'}
            </h2>
          </div>

          <div className={`grid gap-4 ${templateType === 'active_leads' ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2'}`}>
            {/* Target College (For Weekly Placement, Month-End, Pending Tasks) */}
            {templateType !== 'active_leads' && (
              <div className={templateType === 'weekly_placement' && weeklyTargetMode === 'group' ? 'md:col-span-2' : ''}>
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <label className="block text-xs font-semibold text-fg">
                    Target Institution <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>

                  {/* Mode Toggle for Weekly Report */}
                  {templateType === 'weekly_placement' && (
                    <div className="flex items-center gap-1 p-0.5 bg-surface-sunken border border-border rounded-lg text-micro font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklyTargetMode('single');
                          setValidationErrors([]);
                        }}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          weeklyTargetMode === 'single'
                            ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                            : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        Single College
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklyTargetMode('group');
                          setValidationErrors([]);
                          if (selectedGroupCollegeIds.length === 0) {
                            const activeColleges = colleges.filter((c: any) =>
                              ACTIVE_17_COLLEGE_CODES.includes((c.college_code || '').toUpperCase())
                            );
                            setSelectedGroupCollegeIds(activeColleges.map((c: any) => c._id));
                          }
                        }}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          weeklyTargetMode === 'group'
                            ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                            : 'text-fg-muted hover:text-fg'
                        }`}
                      >
                        Multiple Colleges / Group
                      </button>
                    </div>
                  )}
                </div>

                {/* Single College Selector */}
                {(templateType !== 'weekly_placement' || weeklyTargetMode === 'single') && (
                  <div>
                    {(() => {
                      const isMissingCollege = validationErrors.some(
                        (e) => e.toLowerCase().includes('institution') || e.toLowerCase().includes('college')
                      );
                      return (
                        <div>
                          <SmoothSelect
                            value={collegeId}
                            error={isMissingCollege}
                            onChange={(val) => {
                              setCollegeId(val);
                              setValidationErrors((prev) =>
                                prev.filter(
                                  (e) => !e.toLowerCase().includes('institution') && !e.toLowerCase().includes('college')
                                )
                              );
                            }}
                            placeholder="Select Target Institution *"
                            searchable={true}
                            searchPlaceholder="Search institution name or code…"
                            icon={Building2}
                            title="Target College / Institution"
                            options={prioritizedColleges.map((c: any) => ({
                              value: c._id,
                              label: c.college_name,
                              badge: c.college_code,
                              sublabel: c.location,
                              isPinned: Boolean(c.isPinned || c.is_selected_by_me),
                            }))}
                          />
                          {isMissingCollege && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              Please pick a college before generating the report
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Multiple Colleges / Group Multi-Select */}
                {templateType === 'weekly_placement' && weeklyTargetMode === 'group' && (
                  <div className="border border-border rounded-xl p-3 bg-surface-sunken/40 flex flex-col gap-2.5">
                    {/* Quick Presets Ribbon */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const activeColleges = colleges.filter((c: any) =>
                              ACTIVE_17_COLLEGE_CODES.includes((c.college_code || '').toUpperCase())
                            );
                            setSelectedGroupCollegeIds(activeColleges.map((c: any) => c._id));
                            setValidationErrors([]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          🟢 17 Active Colleges
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroupCollegeIds(colleges.map((c: any) => c._id));
                            setValidationErrors([]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-medium text-fg hover:border-primary transition-colors cursor-pointer shadow-2xs"
                        >
                          Select All ({colleges.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupCollegeIds([])}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-medium text-fg-muted hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                        >
                          Clear
                        </button>
                      </div>

                      <span className="text-xs font-bold text-primary font-mono">
                        {selectedGroupCollegeIds.length} of {colleges.length} Selected
                      </span>
                    </div>

                    {/* Search filter inside group selector */}
                    <div className="relative">
                      <input
                        type="text"
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        placeholder="Search colleges by name, code or city…"
                        className="w-full pl-7 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-fg outline-none focus:border-primary placeholder:text-fg-disabled"
                      />
                      <Search size={13} className="absolute left-2.5 top-2.5 text-fg-disabled pointer-events-none" />
                    </div>

                    {/* Scrollable Checkbox List */}
                    <div className="max-h-52 overflow-y-auto pr-1 space-y-1 divide-y divide-border/40 border border-border rounded-lg bg-surface p-1.5 [scrollbar-width:thin]">
                      {filteredGroupColleges.length === 0 ? (
                        <p className="text-center py-4 text-xs text-fg-disabled italic">No institutions match search</p>
                      ) : (
                        filteredGroupColleges.map((c: any) => {
                          const isSelected = selectedGroupCollegeIds.includes(c._id);
                          const isActiveCode = ACTIVE_17_COLLEGE_CODES.includes((c.college_code || '').toUpperCase());

                          return (
                            <label
                              key={c._id}
                              className={`flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-surface-sunken cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/5 font-medium' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setValidationErrors([]);
                                    setSelectedGroupCollegeIds((prev) =>
                                      isSelected ? prev.filter((id) => id !== c._id) : [...prev, c._id]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
                                />
                                <span className="text-xs text-fg truncate font-medium">{c.college_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isActiveCode && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Active College" />
                                )}
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-sunken border border-border text-fg-subtle font-semibold">
                                  {c.college_code}
                                </span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {validationErrors.some((e) => e.toLowerCase().includes('multi-college') || e.toLowerCase().includes('at least one college')) && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        Please select at least one college for the report.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Graduating Academic Year / Batch */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Graduating Academic Batch {templateType === 'month_end' || templateType === 'active_leads' ? <span className="text-fg-subtle text-[11px] font-normal">(Optional)</span> : <span className="text-rose-500 font-bold ml-0.5">*</span>}
              </label>
              {(() => {
                const isMissingBatch =
                  validationErrors.length > 0 &&
                  templateType === 'weekly_placement' &&
                  (!academicYear || academicYear.trim() === '');

                const batchOptions = [
                  { value: 'all', label: 'All Batches' },
                  { value: '2026', label: '2026' },
                  { value: '2027', label: '2027' },
                  { value: '2028', label: '2028' },
                  { value: '2029', label: '2029' },
                  { value: '2030', label: '2030' },
                  { value: '2031', label: '2031' },
                  { value: '2032', label: '2032' },
                  { value: '2033', label: '2033' },
                  { value: '2034', label: '2034' },
                  { value: '2035', label: '2035' },
                ];

                return (
                  <div>
                    <SmoothSelect
                      value={academicYear || 'all'}
                      onChange={(val) => {
                        setAcademicYear(val);
                        setValidationErrors([]);
                      }}
                      placeholder={templateType === 'active_leads' ? 'All Batches (Optional)' : 'Select Year'}
                      icon={GraduationCap}
                      title="Graduating Academic Batch"
                      options={batchOptions}
                      error={isMissingBatch}
                    />
                    {isMissingBatch && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 animate-fadeIn">
                        Please select a graduating batch year.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Section B for Active Leads: Pipeline Streams & Priority Tiers */}
        {templateType === 'active_leads' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/80 pb-2">
              <Layers size={16} className="text-primary shrink-0" />
              <div>
                <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
                  Corporate Pipeline Streams & Priority Tiers
                </h2>
                <p className="text-[11px] text-fg-subtle font-normal mt-0.5">
                  Select which recruitment streams to print (click to tick or untick). You can select any one or combine multiple.
                </p>
              </div>
            </div>

            {/* 3 Unified Interactive Cards with Tick Marks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. Hot Leads - JD Received */}
              <div
                onClick={() =>
                  setActiveLeadStreams((prev) => ({ ...prev, jd_received: !prev.jd_received }))
                }
                className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  activeLeadStreams.jd_received
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-surface-sunken/50 border-border opacity-70 hover:opacity-100 hover:border-border-strong'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                      activeLeadStreams.jd_received ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      <Flame size={16} />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
                        <span>JD Received</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded font-extrabold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                          HOT LEAD
                        </span>
                      </h3>
                      <p className="text-[10px] text-fg-subtle">Top Priority • Confirmed Drives</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 mt-0.5 ${
                      activeLeadStreams.jd_received
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                        : 'border-border bg-surface-sunken'
                    }`}
                  >
                    {activeLeadStreams.jd_received && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>
                <p className="text-[11px] text-fg-muted leading-snug">
                  Companies with officially confirmed and received Job Descriptions (Hot leads ready for drive scheduling).
                </p>
              </div>

              {/* 2. Warm Leads - Positive Leads */}
              <div
                onClick={() =>
                  setActiveLeadStreams((prev) => ({ ...prev, positives: !prev.positives }))
                }
                className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  activeLeadStreams.positives
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-surface-sunken/50 border-border opacity-70 hover:opacity-100 hover:border-border-strong'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                      activeLeadStreams.positives ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      <Zap size={16} />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
                        <span>Positive Leads</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded font-extrabold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          WARM LEAD
                        </span>
                      </h3>
                      <p className="text-[10px] text-fg-subtle">Medium Priority • In Discussion</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 mt-0.5 ${
                      activeLeadStreams.positives
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                        : 'border-border bg-surface-sunken'
                    }`}
                  >
                    {activeLeadStreams.positives && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>
                <p className="text-[11px] text-fg-muted leading-snug">
                  Corporate HRs who confirmed direct hiring interest and affirmative recruiter responses.
                </p>
              </div>

              {/* 3. Operational Leads - Weekly Tracker (In Progress & Pipeline) */}
              <div
                onClick={() =>
                  setActiveLeadStreams((prev) => ({ ...prev, weekly_tracker: !prev.weekly_tracker }))
                }
                className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  activeLeadStreams.weekly_tracker
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-surface-sunken/50 border-border opacity-70 hover:opacity-100 hover:border-border-strong'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                      activeLeadStreams.weekly_tracker ? 'bg-blue-600 text-white' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      <Briefcase size={16} />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
                        <span>Weekly Tracker</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded font-extrabold bg-blue-500/20 text-blue-500 border border-blue-500/30">
                          PIPELINE
                        </span>
                      </h3>
                      <p className="text-[10px] text-fg-subtle">Operations • In-Progress & Pipeline</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 mt-0.5 ${
                      activeLeadStreams.weekly_tracker
                        ? 'bg-blue-600 border-blue-700 text-white shadow-xs'
                        : 'border-border bg-surface-sunken'
                    }`}
                  >
                    {activeLeadStreams.weekly_tracker && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>
                <p className="text-[11px] text-fg-muted leading-snug">
                  Active campus recruitment operations and corporate pipeline discussions from the weekly tracker.
                </p>
              </div>
            </div>

            {/* Column Customization Picker for Active Leads */}
            <div className="p-4 rounded-xl bg-surface-sunken/60 border border-border space-y-3 mt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Columns3 size={15} className="text-primary shrink-0" />
                  <h4 className="text-xs font-bold text-fg uppercase tracking-wider">
                    Table Columns to Include
                  </h4>
                </div>
                <span className="text-[10px] text-fg-subtle">
                  Company Name is included by default
                </span>
              </div>
              <p className="text-[11px] text-fg-subtle">
                Choose which information columns you want listed in the Active Leads table:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Colleges Column */}
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  activeLeadsColumns.colleges
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20'
                    : 'bg-surface border-border text-fg-subtle hover:text-fg'
                }`}>
                  <input
                    type="checkbox"
                    checked={activeLeadsColumns.colleges}
                    onChange={(e) => setActiveLeadsColumns((prev) => ({ ...prev, colleges: e.target.checked }))}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">Colleges Column</span>
                    <p className="text-[10px] text-fg-muted font-normal mt-0.5 leading-snug">
                      Lists institutions where JD was received
                    </p>
                  </div>
                </label>

                {/* 2. Role Column */}
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  activeLeadsColumns.role
                    ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20'
                    : 'bg-surface border-border text-fg-subtle hover:text-fg'
                }`}>
                  <input
                    type="checkbox"
                    checked={activeLeadsColumns.role}
                    onChange={(e) => setActiveLeadsColumns((prev) => ({ ...prev, role: e.target.checked }))}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">Role / Designation</span>
                    <p className="text-[10px] text-fg-muted font-normal mt-0.5 leading-snug">
                      Offered job role or profile
                    </p>
                  </div>
                </label>

                {/* 3. CTC Column */}
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  activeLeadsColumns.ctc
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                    : 'bg-surface border-border text-fg-subtle hover:text-fg'
                }`}>
                  <input
                    type="checkbox"
                    checked={activeLeadsColumns.ctc}
                    onChange={(e) => setActiveLeadsColumns((prev) => ({ ...prev, ctc: e.target.checked }))}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">CTC / Salary</span>
                    <p className="text-[10px] text-fg-muted font-normal mt-0.5 leading-snug">
                      Compensation package details
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Validation Notice if none selected */}
            {!activeLeadStreams.jd_received && !activeLeadStreams.positives && !activeLeadStreams.weekly_tracker && (
              <p className="text-[11.5px] text-rose-500 font-semibold flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl animate-fadeIn">
                <AlertCircle size={14} className="shrink-0" />
                Please select at least one stream (JD Received, Positives, or Weekly Tracker) to build the Active Leads report.
              </p>
            )}
          </div>
        )}

        {/* Section: Placement Pending Tasks & Interactive Row Highlighting */}
        {templateType === 'pending_tasks' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-border/80 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Highlighter size={16} className="text-amber-500 shrink-0" />
                <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
                  Placement Pending Tasks & Row Highlighting
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {loadingPendingTasks && (
                  <span className="flex items-center gap-1 text-[11px] text-primary font-bold animate-pulse">
                    <Loader2 size={12} className="animate-spin" /> Loading tasks…
                  </span>
                )}
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200">
                  {highlightedTaskIds.size} of {pendingTasksList.length} Tasks Highlighted
                </span>
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-2xs">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Highlighter size={15} />
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-bold leading-tight">
                  Selective Row Highlighter for College-Side Pending Items
                </p>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed font-normal">
                  If there are totally 5 tasks but only 3 are pending cases from the college side (e.g. <strong className="font-semibold underline">Database Pending</strong>), you can highlight those rows here in your chosen shade. The highlight is preserved across <strong className="font-semibold">Live Preview</strong>, <strong className="font-semibold">Excel</strong>, <strong className="font-semibold">Image</strong>, and <strong className="font-semibold">PDF</strong> exports.
                </p>
              </div>
            </div>

            {/* Highlighting Toolbar: Palette Swatches & Quick Actions */}
            <div className="p-3.5 rounded-xl bg-surface-sunken/80 border border-border flex items-center justify-between flex-wrap gap-3">
              {/* Color Swatches */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-fg-muted flex items-center gap-1.5">
                  <Palette size={13} className="text-primary" /> Highlighter Shade:
                </span>
                <div className="flex items-center gap-1.5">
                  {HIGHLIGHT_PALETTES.map((pal) => {
                    const isSelected = highlightColor === pal.color;
                    return (
                      <button
                        key={pal.color}
                        type="button"
                        onClick={() => {
                          setHighlightColor(pal.color);
                          if (highlightedTaskIds.size > 0) {
                            const updatedMap: Record<string, string> = {};
                            highlightedTaskIds.forEach((id) => {
                              updatedMap[id] = pal.color;
                            });
                            setHighlightColorMap(updatedMap);
                          }
                        }}
                        title={`${pal.label} (${pal.badge})`}
                        style={{ backgroundColor: pal.color, borderColor: pal.border }}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                          isSelected ? 'scale-110 ring-2 ring-primary ring-offset-1 ring-offset-surface' : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check size={11} className="text-slate-900 font-bold" strokeWidth={3.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoHighlightCollegePending}
                  title="Auto-highlight pending tasks from college side (DB Pending, Database Pending, etc.)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Sparkles size={13} className="text-amber-600" />
                  <span>Auto-Highlight DB Pending</span>
                </button>

                <button
                  type="button"
                  onClick={handleHighlightAllTasks}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-fg-subtle hover:text-fg hover:bg-surface border border-border transition-all cursor-pointer"
                >
                  Highlight All
                </button>

                {highlightedTaskIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHighlights}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10 border border-rose-500/30 transition-all cursor-pointer"
                  >
                    Clear Highlights
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Preview Table in Wizard */}
            <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-2xs">
              {loadingPendingTasks ? (
                <div className="p-8 text-center text-fg-subtle flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-xs font-medium">Fetching pending tasks for selected institution...</span>
                </div>
              ) : !collegeId || collegeId === 'all' ? (
                <div className="p-8 text-center text-fg-subtle">
                  <Building2 size={24} className="mx-auto mb-2 opacity-50 text-primary" />
                  <p className="text-xs font-semibold">Please pick a Target Institution above to load and highlight its pending tasks.</p>
                </div>
              ) : pendingTasksList.length === 0 ? (
                <div className="p-8 text-center text-fg-subtle">
                  <ListTodo size={24} className="mx-auto mb-2 opacity-50 text-fg-subtle" />
                  <p className="text-xs font-semibold">No active pending tasks recorded for this college.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="sticky top-0 z-10 bg-surface-sunken border-b border-border text-[10.5px] font-bold text-fg-muted uppercase tracking-wider select-none">
                      <tr>
                        <th className="py-2.5 px-2 w-10 text-center font-mono">#</th>
                        <th className="py-2.5 px-3 text-center min-w-[160px]">Company Name</th>
                        <th className="py-2.5 px-2 min-w-[100px] text-center whitespace-nowrap">JD Received Date</th>
                        <th className="py-2.5 px-2 min-w-[100px] text-center whitespace-nowrap">DB Shared Date</th>
                        <th className="py-2.5 px-2 min-w-[130px] text-center">Current Status</th>
                        <th className="py-2.5 px-3 min-w-[200px] text-center">Remarks / Next Action</th>
                        <th className="py-2.5 px-2 min-w-[100px] text-center whitespace-nowrap">Drive Date</th>
                        <th className="py-2.5 px-3 w-28 text-center">Highlight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {pendingTasksList.map((t: any, idx: number) => {
                        const isHl = highlightedTaskIds.has(t._id);
                        const rowHlColor = highlightColorMap[t._id] || highlightColor;
                        return (
                          <tr
                            key={t._id || idx}
                            style={isHl ? { backgroundColor: rowHlColor } : undefined}
                            className={`transition-colors cursor-pointer ${
                              isHl
                                ? 'font-semibold text-slate-950 shadow-2xs'
                                : idx % 2 === 0
                                ? 'bg-surface hover:bg-surface-sunken/60'
                                : 'bg-surface-sunken/30 hover:bg-surface-sunken/60'
                            }`}
                            onClick={() => handleToggleRowHighlight(t._id)}
                          >
                            <td className="py-2 px-2 text-center font-mono font-bold" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              {t.serial_no || idx + 1}
                            </td>
                            <td className="py-2 px-3 text-center font-bold" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              {t.company_name}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap font-mono text-[11px]" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              {t.jd_received_date ? new Date(t.jd_received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap font-mono text-[11px]" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              {t.db_shared_date ? new Date(t.db_shared_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-2 px-2 text-center" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isHl
                                  ? 'bg-black/10 border-black/20 text-slate-900'
                                  : t.current_status?.toLowerCase().includes('pending')
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                                  : 'bg-surface border-border text-fg'
                              }`}>
                                {t.current_status || 'Database Pending'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center leading-snug" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              <span className="font-semibold block">{t.action_to_be_taken || '—'}</span>
                              {t.remarks && <span className="text-[10px] opacity-75 italic block mt-0.5">Note: {t.remarks}</span>}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap font-mono text-[11px]" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              {t.drive_date ? new Date(t.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-2 px-3 text-center" style={{ backgroundColor: isHl ? rowHlColor : undefined }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleRowHighlight(t._id);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                                  isHl
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-surface hover:bg-amber-100 hover:text-amber-800 border border-border text-fg-subtle'
                                }`}
                              >
                                <Highlighter size={12} className={isHl ? 'fill-amber-400 text-amber-400' : ''} />
                                <span>{isHl ? 'Highlighted' : 'Highlight'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section B: Reporting Period (For Weekly Report & Month-End Report) */}
        {templateType === 'weekly_placement' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-border/80 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary shrink-0" />
                <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
                  Reporting Period & Date Range
                </h2>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              </div>
              <span className="text-[11px] text-fg-subtle">
                Leave empty for all records, or choose dates to filter
              </span>
            </div>
            <DateRangeCalendar
              startDate={startDate}
              endDate={endDate}
              isOptional={true}
              onChangeRange={(s, e, calculatedLabel) => {
                setStartDate(s);
                setEndDate(e);
                setWeekLabel((calculatedLabel && !calculatedLabel.toLowerCase().includes('cumulative')) ? calculatedLabel : '');
                setValidationErrors([]);
              }}
            />
          </div>
        )}

        {templateType === 'month_end' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/80 pb-2">
              <Calendar size={16} className="text-primary shrink-0" />
              <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
                Month-End Reporting Period
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-fg mb-1.5">
                  Select Reporting Month <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <SmoothSelect
                  value={selectedMonth}
                  onChange={(val) => {
                    setSelectedMonth(val);
                    const found = MONTH_OPTIONS.find((m) => m.value === val);
                    if (found) {
                      setStartDate(found.start);
                      setEndDate(found.end);
                      setWeekLabel(`${found.label} (${found.start} – ${found.end})`);
                      setValidationErrors([]);
                    }
                  }}
                  placeholder="Select Month"
                  icon={CalendarDays}
                  title="Month-End Reporting Cycle"
                  options={MONTH_OPTIONS.map((m) => ({
                    value: m.value,
                    label: m.label,
                    badge: m.badge,
                    sublabel: m.sublabel,
                  }))}
                />
              </div>

              {(() => {
                const activeMonth = MONTH_OPTIONS.find((m) => m.value === selectedMonth) || MONTH_OPTIONS[7];
                return (
                  <div className="mt-0 md:mt-6 p-3.5 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 flex flex-col justify-center space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-fg">
                        <CheckCircle2 size={15} className="text-primary shrink-0" />
                        <span>{activeMonth.label}</span>
                      </div>
                      <span className="bg-primary text-primary-foreground font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                        {activeMonth.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-fg-muted pl-6">
                      Submission Cycle: <strong className="text-fg font-semibold">{activeMonth.start}</strong> to <strong className="text-fg font-semibold">{activeMonth.end}</strong>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Section C: Included Report Sections (Live Synced with Weekly Tracker) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-border/80 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary shrink-0" />
              <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
                Sections & Metrics to Include in Report
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {templateType === 'weekly_placement' && loadingWeekly && (
                <span className="flex items-center gap-1 text-[11px] text-primary font-bold animate-pulse">
                  <Loader2 size={12} className="animate-spin" /> Syncing with Weekly Tracker…
                </span>
              )}
              {templateType === 'active_leads' && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                  <Sparkles size={12} /> Synced with Active Leads Management
                </span>
              )}
              {templateType === 'month_end' && (
                <span className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  <Award size={12} /> Individual Coordinator Month-End Summary
                </span>
              )}
              <span className="text-micro font-semibold text-fg-subtle">
                {Object.values(sections).filter(Boolean).length} Selected
              </span>
            </div>
          </div>

          {/* Mandatory Active Leads Table Core Notice */}
          {templateType === 'active_leads' && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 shadow-2xs">
              <span className="w-8 h-8 rounded-lg bg-emerald-600/15 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                <Sparkles size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold flex items-center gap-2">
                  <span>Active Corporate Leads Table</span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold border border-emerald-300/60 dark:border-emerald-700/60">
                    Always Included
                  </span>
                </div>
                <p className="text-micro text-emerald-700/80 dark:text-emerald-400/80 font-normal mt-0.5">
                  Directly synced from the <strong className="font-semibold">Active Leads Management</strong> module ({academicYear || 'Selected Year'} batch) with strictly 4 columns: <strong className="font-semibold">#</strong>, <strong className="font-semibold">Company Name</strong>, <strong className="font-semibold">Role</strong>, <strong className="font-semibold">CTC</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {getSectionsConfig().map((sec: any) => {
              const Icon = sec.icon;
              const isChecked = !!sections[sec.key];
              const hasCompanies = Array.isArray(sec.companies) && sec.companies.length > 0;
              const isKpi = !!sec.isKpiSection;
              const isFullWidth = isKpi || sec.key === 'remarks' || getSectionsConfig().length <= 2;
              const activeKpiCount = isKpi && Array.isArray(sec.kpiList)
                ? sec.kpiList.filter((k: any) => kpiCards[k.key] !== false).length
                : 0;

              return (
                <div
                  key={sec.key}
                  className={`flex flex-col p-3.5 rounded-xl border transition-all select-none ${
                    isFullWidth ? 'col-span-1 md:col-span-2' : ''
                  } ${
                    isChecked
                      ? 'bg-primary/5 border-primary/40 dark:border-primary/50 shadow-xs'
                      : 'bg-surface-sunken border-border opacity-70 hover:opacity-100 hover:bg-surface-raised'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setSections({ ...sections, [sec.key]: e.target.checked })}
                      className="mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                    />
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-fg flex items-center gap-1.5">
                          <Icon size={14} className={isChecked ? 'text-primary' : 'text-fg-subtle'} />
                          <span>{sec.label}</span>
                        </span>

                        {isKpi && Array.isArray(sec.kpiList) ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 bg-primary/10 border-primary/20 text-primary">
                            {activeKpiCount}/{sec.kpiList.length} Cards Selected
                          </span>
                        ) : Array.isArray(sec.companies) ? (
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                              hasCompanies
                                ? sec.badgeColor || 'bg-surface border-border text-fg'
                                : 'bg-surface border-border text-fg-subtle'
                            }`}
                          >
                            {sec.companies.length} {sec.companies.length === 1 ? 'Company' : 'Companies'}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-micro text-fg-subtle leading-normal">{sec.desc}</p>
                    </div>
                  </label>

                  {/* KPI Metric Cards Picker (Shown when KPI Section is checked) */}
                  {isKpi && isChecked && Array.isArray(sec.kpiList) && (
                    <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-micro">
                        <span className="font-semibold text-fg-subtle">Select KPI metric cards to include in report:</span>
                        <div className="flex items-center gap-2 font-bold">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const updated = { ...kpiCards };
                              sec.kpiList.forEach((k: any) => { updated[k.key] = true; });
                              setKpiCards(updated);
                            }}
                            className="text-[10px] text-primary hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-border">|</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const updated = { ...kpiCards };
                              sec.kpiList.forEach((k: any) => { updated[k.key] = false; });
                              setKpiCards(updated);
                            }}
                            className="text-[10px] text-fg-subtle hover:text-fg hover:underline cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                      <div className={sec.kpiList.length <= 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : 'grid grid-cols-2 sm:grid-cols-4 gap-2'}>
                        {sec.kpiList.map((kpi: any) => {
                          const isKpiActive = kpiCards[kpi.key] !== false;
                          return (
                            <label
                              key={kpi.key}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                isKpiActive
                                  ? 'bg-primary/10 border-primary/40 text-primary shadow-2xs font-bold ring-1 ring-primary/20'
                                  : 'bg-surface border-border text-fg-subtle hover:text-fg'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isKpiActive}
                                onChange={(e) => setKpiCards({ ...kpiCards, [kpi.key]: e.target.checked })}
                                className="rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="truncate leading-tight">{kpi.label}</span>
                                <span className="text-[10px] text-fg-subtle font-normal truncate mt-0.5">{kpi.desc}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section C.1: Weekly Placement CTC & Column Filters + Live Pipeline Preview */}
        {templateType === 'weekly_placement' && (
          <div className="space-y-4 pt-2 border border-primary/25 bg-surface-raised/40 dark:bg-primary/5 rounded-2xl p-4 sm:p-5 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-fg">
                      Company CTC & Selective Sharing Filters
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30">
                      Showing {totalWeeklyFilteredCount} of {totalWeeklyRawCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-fg-subtle">
                    Filter placement drives by minimum CTC threshold and selectively include/exclude company rows for the weekly report.
                  </p>
                </div>
              </div>

              {(weeklyMinCtc !== null || weeklyCompanySearch || weeklyCompanyType !== 'all' || weeklyStatusFilter !== 'all' || weeklyExcludedIds.size > 0 || weeklyIncludeCompetitive || weeklyActivePreviewTab !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetWeeklyFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-fg-subtle hover:text-fg hover:bg-surface transition-all self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* CTC Range Filter Controls (Dropdown List + Custom LPA + Include Competitive) */}
            <div className="space-y-2.5 bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Select Minimum CTC Threshold (Starting Package Onwards):
                  {weeklyMinCtc !== null && (
                    <span className="text-primary font-extrabold ml-1">≥ {weeklyMinCtc} LPA</span>
                  )}
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-fg-subtle cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={weeklyIncludeCompetitive}
                    onChange={(e) => setWeeklyIncludeCompetitive(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                  <span>
                    Include Competitive / Unspecified CTC
                    {unspecifiedCtcCount > 0 && ` (${unspecifiedCtcCount})`}
                  </span>
                </label>
              </div>

              {/* Main Selection Area: Dropdown + Custom LPA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* 1. Primary Dropdown Selector (Lists every available CTC cutoff onwards) */}
                <div className="w-full sm:w-80 shrink-0">
                  <SmoothSelect
                    value={weeklyMinCtc === null ? 'all' : String(weeklyMinCtc)}
                    onChange={(val) => {
                      if (val === 'all') {
                        setWeeklyMinCtc(null);
                        setWeeklyCustomCtcInput('');
                      } else {
                        const num = parseFloat(val);
                        setWeeklyMinCtc(isNaN(num) ? null : num);
                        setWeeklyCustomCtcInput('');
                      }
                    }}
                    icon={TrendingUp}
                    title="Select Starting CTC (Onwards)"
                    placeholder="Select CTC threshold..."
                    searchable={true}
                    searchPlaceholder="Search CTC package (e.g. 4, 6.5, 10)..."
                    options={ctcSelectOptions}
                  />
                </div>

                {/* 2. Custom numeric LPA input */}
                <div className="flex items-center gap-2 sm:pl-3 sm:border-l border-border/70">
                  <span className="text-[11px] font-semibold text-fg-subtle whitespace-nowrap">Or Custom CTC:</span>
                  <div className="relative w-24">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={weeklyCustomCtcInput}
                      placeholder="e.g. 7"
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeeklyCustomCtcInput(val);
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 0) {
                          setWeeklyMinCtc(num);
                        } else if (val === '') {
                          setWeeklyMinCtc(null);
                        }
                      }}
                      className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1.5 text-xs text-fg outline-none font-medium font-mono"
                    />
                  </div>
                  <span className="text-xs font-medium text-fg-subtle">LPA</span>
                  {weeklyMinCtc !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setWeeklyMinCtc(null);
                        setWeeklyCustomCtcInput('');
                      }}
                      className="text-[11px] font-semibold text-fg-subtle hover:text-red-500 underline ml-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Column-level filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* 1. Company Name search */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
                  <Search size={11} />
                  Company Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={weeklyCompanySearch}
                    onChange={(e) => setWeeklyCompanySearch(e.target.value)}
                    placeholder="Search by company name..."
                    className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg pl-7 pr-7 py-1.5 text-xs text-fg outline-none shadow-2xs font-medium"
                  />
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                  {weeklyCompanySearch && (
                    <button
                      type="button"
                      onClick={() => setWeeklyCompanySearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg cursor-pointer p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Pipeline Section selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
                  <Layers size={11} />
                  Pipeline Section
                </label>
                <select
                  value={weeklyActivePreviewTab}
                  onChange={(e) => setWeeklyActivePreviewTab(e.target.value as any)}
                  className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1.5 text-xs text-fg outline-none shadow-2xs font-medium cursor-pointer"
                >
                  <option value="all">All Placement Drives ({tabCounts.all})</option>
                  <option value="in_progress">In Progress ({tabCounts.in_progress})</option>
                  <option value="pipeline">In Pipeline ({tabCounts.pipeline})</option>
                  <option value="in_drive">In Drive ({tabCounts.in_drive})</option>
                  <option value="completed">Completed ({tabCounts.completed})</option>
                  <option value="top_companies">Top Companies ({tabCounts.top_companies})</option>
                  <option value="on_hold">On Hold / Decl. ({tabCounts.on_hold + tabCounts.rejected})</option>
                </select>
              </div>

              {/* 3. Company Type filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
                  <Briefcase size={11} />
                  Company Type
                </label>
                <select
                  value={weeklyCompanyType}
                  onChange={(e) => setWeeklyCompanyType(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1.5 text-xs text-fg outline-none shadow-2xs font-medium cursor-pointer"
                >
                  <option value="all">All Company Types</option>
                  <option value="software">Software / IT</option>
                  <option value="core">Core Engineering</option>
                  <option value="product">Product Development</option>
                  <option value="banking">Banking / FinTech</option>
                  <option value="consulting">Consulting / Analytics</option>
                </select>
              </div>

              {/* 4. Status / Remarks filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
                  <Clock size={11} />
                  Status / Remarks
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={weeklyStatusFilter}
                    onChange={(e) => setWeeklyStatusFilter(e.target.value)}
                    placeholder="Filter status or remarks..."
                    className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg pl-7 pr-7 py-1.5 text-xs text-fg outline-none shadow-2xs font-medium"
                  />
                  <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                  {weeklyStatusFilter && (
                    <button
                      type="button"
                      onClick={() => setWeeklyStatusFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg cursor-pointer p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Section Table Header & Row Selection Actions */}
            <div className="space-y-2 pt-2 border-t border-border/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface border border-border/70 rounded-xl px-3.5 py-2 shadow-2xs">
                {/* Active Section Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-fg-subtle">
                    Previewing:
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {weeklyActivePreviewTab === 'all' && `All Matching Drives (${previewRows.length})`}
                    {weeklyActivePreviewTab === 'in_progress' && `In Progress Drives (${previewRows.length})`}
                    {weeklyActivePreviewTab === 'pipeline' && `Upcoming Pipeline Drives (${previewRows.length})`}
                    {weeklyActivePreviewTab === 'in_drive' && `In Drive / Scheduled Drives (${previewRows.length})`}
                    {weeklyActivePreviewTab === 'completed' && `Completed Drives (${previewRows.length})`}
                    {weeklyActivePreviewTab === 'top_companies' && `Top Tier Companies (${previewRows.length})`}
                    {weeklyActivePreviewTab === 'on_hold' && `On Hold & Declined (${previewRows.length})`}
                    {weeklyActivePreviewTab === 'rejected' && `Rejected (${previewRows.length})`}
                  </span>
                </div>

                {/* Bulk Select/Deselect in current tab */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSelectAllPreview}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-border">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllPreview}
                    className="text-xs font-semibold text-fg-subtle hover:text-fg hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Table of Preview Rows */}
              <div className="border border-border/80 rounded-xl overflow-hidden bg-surface">
                {previewRows.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-surface-sunken flex items-center justify-center text-fg-subtle">
                      <Filter size={20} />
                    </div>
                    <p className="text-xs font-semibold text-fg">
                      No companies match the filter criteria
                    </p>
                    <p className="text-[11px] text-fg-subtle">
                      Try adjusting the CTC threshold or clearing the search terms.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto overflow-x-auto relative bg-surface">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-20 bg-surface-sunken border-b border-border text-[10.5px] font-bold text-fg-muted uppercase tracking-wider select-none shadow-2xs">
                        <tr className="bg-surface-sunken">
                          <th className="bg-surface-sunken py-2.5 px-3 w-10 text-center">Inc</th>
                          <th className="bg-surface-sunken py-2.5 px-2 w-10 text-center font-mono">#</th>
                          <th className="bg-surface-sunken py-2.5 px-3 min-w-[200px]">Company & Role</th>
                          <th className="bg-surface-sunken py-2.5 px-3 min-w-[130px]">Type</th>
                          <th className="bg-surface-sunken py-2.5 px-3 min-w-[100px]">CTC</th>
                          <th className="bg-surface-sunken py-2.5 px-3 min-w-[200px]">Status / Remarks</th>
                          <th className="bg-surface-sunken py-2.5 px-3 min-w-[120px]">Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-medium bg-surface">
                        {previewRows.map((row: any, idx: number) => {
                          const rowId = String(row._id || row.company_id || row.company_name);
                          const isIncluded = !weeklyExcludedIds.has(rowId);
                          const ctc = row.ctc_lpa || row.ctc || 'Competitive';
                          return (
                            <tr
                              key={`${rowId}-${idx}`}
                              onClick={() => handleToggleExcludeCompany(rowId)}
                              className={`cursor-pointer transition-colors ${
                                isIncluded
                                  ? 'hover:bg-primary/5 bg-surface text-fg'
                                  : 'opacity-40 bg-surface-sunken/40 line-through text-fg-subtle'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => handleToggleExcludeCompany(rowId)}
                                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                                />
                              </td>
                              <td className="py-2.5 px-2 text-center text-fg-subtle text-[11px] font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-fg leading-snug">
                                  {row.company_name}
                                </div>
                                <div className="text-[10px] text-fg-subtle">
                                  {row.job_role || row.role || 'Campus Hire'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-fg-subtle text-[11px] whitespace-nowrap">
                                {row.company_type || 'IT / Tech'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getCtcBadgeColor(ctc)}`}>
                                  {ctc}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-fg-subtle text-[11px] max-w-xs truncate">
                                {row.current_status_text || row.status || row.remarks || '—'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-surface-sunken border border-border text-fg-subtle">
                                  {row._sectionLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="px-3 py-2 bg-surface-sunken border-t border-border flex items-center justify-between text-[11px] text-fg-subtle">
                  <span>
                    Tip: Click any row or checkbox to include or exclude individual companies from the generated report.
                  </span>
                  <span className="font-semibold text-fg">
                    {previewRows.filter((r: any) => !weeklyExcludedIds.has(String(r._id || r.company_id || r.company_name))).length} selected in this tab
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section D: Observations & Remarks */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            <PenLine size={16} className="text-primary shrink-0" />
            <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
              {templateType === 'active_leads' ? 'Notes' : 'Coordinator Remarks & Notes'}
            </h2>
          </div>
          <textarea
            rows={2}
            value={customRemarks}
            onChange={(e) => setCustomRemarks(e.target.value)}
            className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-3 text-xs text-fg outline-none shadow-xs font-medium"
            placeholder={templateType === 'active_leads' ? 'Add notes or highlights for the batch roster...' : 'Add operational notes, remarks, or instructions for leadership...'}
          />
        </div>

        {/* Section E: Report Author & Footer Options */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            <UserCheck size={16} className="text-primary shrink-0" />
            <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
              Footer & Sign-off Options
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-surface-sunken/60 border border-border space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includePreparedBy}
                onChange={(e) => setIncludePreparedBy(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-fg flex items-center gap-2">
                  Include &quot;Prepared by&quot; in Report Footer
                </span>
                <p className="text-[11px] text-fg-subtle mt-0.5">
                  When selected, the preferred by person name will be displayed in the document footer area. When unchecked, it will be omitted from the report.
                </p>
              </div>
            </label>

            {includePreparedBy && (
              <div className="pt-2 pl-7 flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-semibold text-fg shrink-0">
                  Prepared by Name:
                </label>
                <input
                  type="text"
                  value={preparedByName}
                  onChange={(e) => setPreparedByName(e.target.value)}
                  placeholder="e.g. Placement Coordinator / Your Name"
                  className="flex-1 bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-1.5 text-xs text-fg outline-none shadow-xs font-medium"
                />
              </div>
            )}
          </div>
        </div>

        {/* Validation Errors Alert */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-2 animate-fadeIn shadow-2xs">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
              <AlertCircle size={16} strokeWidth={2.25} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Required Fields Missing</span>
            </div>
            <ul className="space-y-1 text-fg-muted text-micro pl-1 font-medium">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit & Generate Action */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
          <div className="text-micro text-fg-subtle font-medium">
            Category: <strong className="text-fg font-semibold capitalize">{templateType.replace('_', ' ')}</strong>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          >
            <span>{loading ? 'Generating Report…' : 'Generate Report'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
