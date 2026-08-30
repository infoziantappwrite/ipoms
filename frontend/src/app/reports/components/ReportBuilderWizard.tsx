'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getCachedColleges, fetchAllCollegesCached } from '@/lib/collegeSession';
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
  { key: 'graduating_year', label: 'Graduating Batch', desc: 'Target Batch Year' },
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
  const [academicYear, setAcademicYear] = useState(
    initialTemplateType === 'active_leads' ? '' : 'all'
  );

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
  });

  const [colleges, setColleges] = useState<College[]>(() => getCachedColleges());
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Live Weekly Tracker Companies State (Synced directly with Weekly Tracker DB)
  const [weeklyCompanies, setWeeklyCompanies] = useState<{
    completed: any[];
    in_progress: any[];
    pipeline: any[];
    top_companies: any[];
    rejected_companies: any[];
    on_hold_by_college: any[];
    on_hold_by_hr: any[];
  }>({
    completed: [],
    in_progress: [],
    pipeline: [],
    top_companies: [],
    rejected_companies: [],
    on_hold_by_college: [],
    on_hold_by_hr: [],
  });
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  useEffect(() => {
    if (initialTemplateType) setTemplateType(initialTemplateType);
  }, [initialTemplateType]);

  useEffect(() => {
    if (initialCollegeId) setCollegeId(initialCollegeId);
  }, [initialCollegeId]);

  useEffect(() => {
    fetchAllCollegesCached()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setColleges(list);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Live Weekly Tracker Companies whenever target college, batch or template changes
  useEffect(() => {
    if (templateType !== 'weekly_placement') return;

    let isMounted = true;
    setLoadingWeekly(true);

    const fetchWeeklyData = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (collegeId && collegeId !== 'all') {
          queryParams.append('college_id', collegeId);
        }
        if (academicYear && academicYear !== 'all') {
          queryParams.append('academic_year', academicYear);
        }

        const res = await apiFetch<any>(`/weekly-tracker?${queryParams.toString()}`);
        if (isMounted && res.success && res.data) {
          const d = res.data.sections || res.data;
          setWeeklyCompanies({
            completed: Array.isArray(d.completed?.rows) ? d.completed.rows : (Array.isArray(d.completed) ? d.completed : []),
            in_progress: Array.isArray(d.in_progress?.rows) ? d.in_progress.rows : (Array.isArray(d.in_progress) ? d.in_progress : []),
            pipeline: Array.isArray(d.pipeline?.rows) ? d.pipeline.rows : (Array.isArray(d.pipeline) ? d.pipeline : []),
            top_companies: Array.isArray(d.top_companies?.rows) ? d.top_companies.rows : (Array.isArray(d.top_companies) ? d.top_companies : []),
            rejected_companies: Array.isArray(d.rejected_companies?.rows) ? d.rejected_companies.rows : (Array.isArray(d.rejected_by_hr?.rows) ? d.rejected_by_hr.rows : []),
            on_hold_by_college: Array.isArray(d.on_hold_by_college?.rows) ? d.on_hold_by_college.rows : (Array.isArray(d.rejected_by_college?.rows) ? d.rejected_by_college.rows : []),
            on_hold_by_hr: Array.isArray(d.on_hold_by_hr?.rows) ? d.on_hold_by_hr.rows : [],
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
      if (academicYear === 'all') {
        setAcademicYear('');
      }
      setSections({
        kpi_summary: true,
        active_leads: true,
        remarks: true,
      });
      setCustomRemarks('Comprehensive active corporate roster curated for campus recruitment engagements.');
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

    // 1. Mandatory Target College (Only for Weekly Placement and Pending Tasks, NOT for Active Leads)
    if (templateType !== 'active_leads') {
      if (!collegeId || collegeId.trim() === '' || collegeId === 'all') {
        errors.push('Target Institution is required. Please pick a college to generate the report.');
      }
    }

    // 2. Mandatory Graduating Academic Year (Strictly enforced for Active Leads: 2027, 2028, 2029...)
    if (templateType === 'active_leads') {
      if (!academicYear || academicYear === 'all' || academicYear.trim() === '') {
        errors.push('Graduating Academic Batch Year (e.g., 2027, 2028, 2029) is mandatory for Active Leads.');
      }
    } else {
      if (!academicYear || academicYear.trim() === '') {
        errors.push('Graduating Academic Year must be selected.');
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
          coordinator_id: coordinatorId,
          academic_year: academicYear,
          week_label: weekLabel,
          theme,
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

      {/* ── Navigation Tabs (Weekly Report, Pending Tasks, Active Leads) ────────────────── */}
      <div className="flex justify-center pt-2 pb-2">
        <div className="w-full max-w-2xl bg-surface border border-border p-1.5 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleCategoryChange('weekly_placement')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              templateType === 'weekly_placement'
                ? 'bg-primary text-white shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <CalendarDays size={15} strokeWidth={2.2} />
            <span className="whitespace-nowrap">Weekly Placement Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('pending_tasks')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
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
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
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
            ) : (
              <Building2 size={16} className="text-primary shrink-0" />
            )}
            <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
              {templateType === 'active_leads'
                ? 'Target Graduating Batch'
                : 'Institutional Scope & Batch'}
            </h2>
          </div>

          <div className={`grid gap-4 ${templateType === 'active_leads' ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2'}`}>
            {/* Target College (Only for Weekly Placement and Pending Tasks, NOT for Active Leads) */}
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
                        options={colleges.map((c: any) => ({
                          value: c._id,
                          label: c.college_name,
                          badge: c.college_code,
                          sublabel: c.location,
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
                Graduating Academic Batch <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              {(() => {
                const isMissingBatch =
                  validationErrors.length > 0 &&
                  ((templateType === 'active_leads' && (!academicYear || academicYear === 'all')) || !academicYear);

                const batchOptions = [
                  ...(templateType !== 'active_leads' ? [{ value: 'all', label: 'All Batches' }] : []),
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
                      value={academicYear === 'all' && templateType === 'active_leads' ? '' : academicYear}
                      onChange={(val) => {
                        setAcademicYear(val);
                        setValidationErrors([]);
                      }}
                      placeholder="Select Year"
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

        {/* Section B: Reporting Period (Only for Weekly Report) */}
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

        {/* Section C: Included Report Sections (Live Synced with Weekly Tracker) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-border/80 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary shrink-0" />
              <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
                Sections & Companies to Include in Report
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
