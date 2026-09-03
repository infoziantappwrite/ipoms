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
  Zap,
  Check,
  Columns3,
  UserCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { getCachedColleges, fetchAllCollegesCached, sortCollegesWithPriority, getCoordinatorSelectedColleges } from '@/lib/collegeSession';
import { SmoothSelect } from '@/components/ui/SmoothSelect';
import { DateRangeCalendar, formatPeriodFromDates } from './DateRangeCalendar';

interface College {
  _id: string;
  college_name: string;
  college_code: string;
}

const WEEKLY_KPIS = [
  { key: 'total_calls', label: 'Calls', desc: 'Total Calls Made' },
  { key: 'positive_responses', label: 'Positives', desc: 'Positive Responses' },
  { key: 'jds_received', label: 'JDs Received', desc: 'JDs Received' },
  { key: 'drives_completed', label: 'Completed', desc: 'Drives Completed' },
  { key: 'drives_in_progress', label: 'In Progress', desc: 'Drives Underway' },
  { key: 'pipeline_leads', label: 'Pipeline', desc: 'Pipeline Leads' },
  { key: 'top_companies_count', label: 'Top Companies', desc: 'Target Tier 1' },
  { key: 'total_offers', label: 'Offers', desc: 'Confirmed Selects' },
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
      s.kpi_summary = true;
      s.completed_companies = true;
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
    jds_received: true,
    drives_completed: true,
    drives_in_progress: true,
    pipeline_leads: true,
    top_companies_count: true,
    total_offers: true,
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

  // Fetch live Weekly Tracker companies for the selected college and batch
  useEffect(() => {
    if (!collegeId || collegeId === 'all' || templateType === 'active_leads') {
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
        params.set('college_id', collegeId);
        if (academicYear && academicYear !== 'all') {
          params.set('academic_year', academicYear);
        }

        const res = await apiFetch(`/weekly-tracker?${params.toString()}`);
        if (isMounted && res.success && Array.isArray(res.data)) {
          const rows = res.data;
          setWeeklyCompanies({
            completed: rows.filter((r: any) => r.pipeline_section === 'completed'),
            in_drive: rows.filter((r: any) => r.pipeline_section === 'in_drive' || r.pipeline_section === 'companies_in_drive'),
            in_progress: rows.filter((r: any) => r.pipeline_section === 'in_progress'),
            pipeline: rows.filter((r: any) => r.pipeline_section === 'pipeline'),
            top_companies: rows.filter(
              (r: any) => r.pipeline_section === 'top_companies' || r.is_pinned_top
            ),
            rejected_companies: rows.filter(
              (r: any) => r.pipeline_section === 'rejected_companies' || r.pipeline_section === 'rejected_by_hr'
            ),
            on_hold_by_college: rows.filter(
              (r: any) => r.pipeline_section === 'on_hold_by_college' || r.pipeline_section === 'rejected_by_college'
            ),
            on_hold_by_hr: rows.filter((r: any) => r.pipeline_section === 'on_hold_by_hr'),
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
  }, [collegeId, academicYear, templateType]);

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
          kpi_summary: true,
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
        kpi_summary: true,
        completed_companies: true,
        in_progress: true,
        pipeline: true,
        top_companies: true,
        rejected_by_college: true,
        remarks: true,
      });
      setCustomRemarks('All campus drives are progressing actively as per schedule. Follow-ups with upcoming tech partners remain on track.');
    }
  };

  const handleGenerate = async () => {
    setValidationErrors([]);
    const errors: string[] = [];

    // 1. Mandatory Target College (For Weekly Placement, Month-End, and Pending Tasks)
    if (templateType === 'weekly_placement' || templateType === 'pending_tasks' || templateType === 'month_end') {
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

    // 3. Mandatory Date Range with minimum 5 days verification for weekly placement
    if (templateType === 'weekly_placement') {
      if (!startDate || !endDate) {
        errors.push('Both "From" and "To" dates are required for the Report Period.');
      } else {
        const s = new Date(startDate + 'T00:00:00');
        const e = new Date(endDate + 'T00:00:00');
        if (s > e) {
          errors.push('The "From" start date cannot be after the "To" end date.');
        } else {
          const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          if (diffDays < 5) {
            errors.push(
              `Weekly Report date range must span a minimum of 5 days (currently ${diffDays} day${diffDays === 1 ? '' : 's'}).`
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          template_type: templateType,
          college_id: templateType === 'active_leads' ? (collegeId || 'all') : collegeId,
          coordinator_id: coordinatorId || readSessionUser()?._id || readSessionUser()?.id || '',
          academic_year: academicYear,
          week_label: weekLabel,
          theme,
          lead_sources: templateType === 'active_leads' ? activeLeadStreams : undefined,
          active_leads_columns: templateType === 'active_leads' ? activeLeadsColumns : undefined,
          include_prepared_by: includePreparedBy,
          prepared_by: includePreparedBy ? preparedByName.trim() : '',
          included_sections: {
            ...sections,
            ...(templateType === 'active_leads' ? { active_leads: true } : {}),
            ...(templateType === 'pending_tasks' ? { pending_tasks: true } : {}),
          },
          included_kpi_cards: kpiCards,
          kpi_cards: kpiCards,
          custom_remarks: customRemarks,
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
        key: 'kpi_summary',
        label: 'Executive Placement KPI Summary',
        icon: BarChart3,
        desc: 'Select which KPI metrics appear in the header summary strip',
        isKpiSection: true,
        kpiList: WEEKLY_KPIS,
      },
      {
        key: 'completed_companies',
        label: '1. Companies Completed',
        icon: CheckCircle2,
        desc: 'Finished drives with confirmed placed student counts',
        companies: weeklyCompanies.completed,
        badgeColor: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      },
      {
        key: 'in_progress',
        label: '2. Companies In Progress',
        icon: Clock,
        desc: 'Active ongoing interview evaluation rounds',
        companies: weeklyCompanies.in_progress,
        badgeColor: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      },
      {
        key: 'pipeline',
        label: '3. Companies In Pipeline',
        icon: Layers,
        desc: 'Upcoming scheduled drives and confirmed tech partnerships',
        companies: weeklyCompanies.pipeline,
        badgeColor: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      },
      {
        key: 'top_companies',
        label: '4. Top Companies',
        icon: Sparkles,
        desc: 'Premier high-CTC partner organizations',
        companies: weeklyCompanies.top_companies,
        badgeColor: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      },
    ];

    // 5. Rejected Companies (Show checkbox if data exists)
    if (Array.isArray(weeklyCompanies.rejected_companies) && weeklyCompanies.rejected_companies.length > 0) {
      list.push({
        key: 'rejected_companies',
        label: '5. Rejected Companies',
        icon: XCircle,
        desc: 'Companies with employer declines or ineligible criteria',
        companies: weeklyCompanies.rejected_companies,
        badgeColor: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      });
    }

    // 6. Companies On Hold By College (Show checkbox if data exists)
    if (Array.isArray(weeklyCompanies.on_hold_by_college) && weeklyCompanies.on_hold_by_college.length > 0) {
      list.push({
        key: 'on_hold_by_college',
        label: '6. Companies On Hold By College',
        icon: Clock,
        desc: 'Placement drives placed on hold by college management / TPO',
        companies: weeklyCompanies.on_hold_by_college,
        badgeColor: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      });
    }

    // 7. Companies On Hold By HR (Show checkbox if data exists)
    if (Array.isArray(weeklyCompanies.on_hold_by_hr) && weeklyCompanies.on_hold_by_hr.length > 0) {
      list.push({
        key: 'on_hold_by_hr',
        label: '7. Companies On Hold By HR',
        icon: Clock,
        desc: 'Placement drives placed on hold by corporate HR partners',
        companies: weeklyCompanies.on_hold_by_hr,
        badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      });
    }

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
                ? 'bg-primary text-white shadow-xs'
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
                ? 'bg-primary text-white shadow-xs'
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
                ? 'bg-primary text-white shadow-xs'
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
                ? 'bg-primary text-white shadow-xs'
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
              <div>
                <label className="block text-xs font-semibold text-fg mb-1.5">
                  Target Institution <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
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

        {/* Section B: Reporting Period (For Weekly Report & Month-End Report) */}
        {templateType === 'weekly_placement' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/80 pb-2">
              <Calendar size={16} className="text-primary shrink-0" />
              <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
                Reporting Period & Date Range
              </h2>
            </div>
            <DateRangeCalendar
              startDate={startDate}
              endDate={endDate}
              onChangeRange={(s, e, calculatedLabel) => {
                setStartDate(s);
                setEndDate(e);
                setWeekLabel(calculatedLabel);
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
                      <span className="bg-primary text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
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
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          >
            <span>{loading ? 'Generating Report…' : 'Generate Report'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
