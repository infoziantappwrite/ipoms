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
  const [collegeId, setCollegeId] = useState(initialCollegeId || 'all');
  const [academicYear, setAcademicYear] = useState('all');

  // Dynamic Interactive Date Range Calendar Selection
  const [startDate, setStartDate] = useState('2026-08-21');
  const [endDate, setEndDate] = useState('2026-08-27');
  const [weekLabel, setWeekLabel] = useState(
    () => formatPeriodFromDates('2026-08-21', '2026-08-27') || '21 Aug – 27 Aug 2026'
  );

  const [theme, setTheme] = useState('blue');
  const [customRemarks, setCustomRemarks] = useState(
    'All campus drives are progressing actively as per schedule. Follow-ups with upcoming tech partners remain on track.'
  );

  // Section inclusion toggles
  const [sections, setSections] = useState<Record<string, boolean>>({
    kpi_summary: true,
    completed_companies: true,
    in_progress: true,
    pipeline: true,
    top_companies: true,
    remarks: true,
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
  }>({
    completed: [],
    in_progress: [],
    pipeline: [],
    top_companies: [],
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
            completed: Array.isArray(d.completed) ? d.completed : [],
            in_progress: Array.isArray(d.in_progress) ? d.in_progress : [],
            pipeline: Array.isArray(d.pipeline) ? d.pipeline : [],
            top_companies: Array.isArray(d.top_companies) ? d.top_companies : [],
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
    } else {
      setSections({
        kpi_summary: true,
        completed_companies: true,
        in_progress: true,
        pipeline: true,
        top_companies: true,
        remarks: true,
      });
      setCustomRemarks('All campus drives are progressing actively as per schedule. Follow-ups with upcoming tech partners remain on track.');
    }
  };

  const handleGenerate = async () => {
    setValidationErrors([]);
    const errors: string[] = [];

    // 1. Mandatory Target College
    if (!collegeId || collegeId.trim() === '') {
      errors.push('Target College must be selected.');
    }

    // 2. Mandatory Graduating Academic Year
    if (!academicYear || academicYear.trim() === '') {
      errors.push('Graduating Academic Year must be selected.');
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
          college_id: collegeId,
          coordinator_id: coordinatorId,
          academic_year: academicYear,
          week_label: weekLabel,
          theme,
          included_sections: sections,
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
        { key: 'kpi_summary', label: 'Active Leads KPI Summary', icon: BarChart3, desc: 'Total leads count, target batch year, and active partner tally' },
        { key: 'active_leads', label: 'Active Corporate Leads Table', icon: TrendingUp, desc: 'Detailed table with Company, Roles, CTC package, and Fall of Month' },
        { key: 'remarks', label: 'Coordinator Remarks & Observations', icon: PenLine, desc: 'Corporate relationship overview and strategic notes' },
      ];
    }

    return [
      {
        key: 'kpi_summary',
        label: 'Executive Placement KPI Summary',
        icon: BarChart3,
        desc: '8 metrics: Total Calls, Positives, JDs, Completed, In Progress, Pipeline, Top Companies, Offers',
        companies: [],
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
        label: '3. Companies in Pipeline',
        icon: Layers,
        desc: 'Upcoming scheduled drives and confirmed tech partnerships',
        companies: weeklyCompanies.pipeline,
        badgeColor: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      },
      {
        key: 'top_companies',
        label: '4. Top Companies',
        icon: Sparkles,
        desc: 'Premier high-CTC partner organizations',
        companies: weeklyCompanies.top_companies,
        badgeColor: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      },
      {
        key: 'remarks',
        label: 'Coordinator Remarks & Observations',
        icon: PenLine,
        desc: 'Operational observations and placement overview',
        companies: [],
      },
    ];
  };

  return (
    <div className="space-y-6 text-fg">

      {/* ── Navigation Tabs (Weekly Report, Pending Tasks, Active Leads) ────────────────── */}
      <div className="flex justify-center pt-2 pb-2">
        <div className="w-full max-w-xl bg-surface border border-border p-1.5 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleCategoryChange('weekly_placement')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              templateType === 'weekly_placement'
                ? 'bg-primary text-white shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <CalendarDays size={15} strokeWidth={2.2} />
            <span>Weekly Placement Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('pending_tasks')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              templateType === 'pending_tasks'
                ? 'bg-primary text-white shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <ListTodo size={15} strokeWidth={2.2} />
            <span>Pending Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('active_leads')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              templateType === 'active_leads'
                ? 'bg-primary text-white shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-sunken'
            }`}
          >
            <TrendingUp size={15} strokeWidth={2.2} />
            <span>Active Leads</span>
          </button>
        </div>
      </div>

      {/* ── Configuration Card: Showing Sections Relevant to Active Report ─────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-6">

        {/* Section A: Scope & Institution Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            <Building2 size={16} className="text-primary shrink-0" />
            <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
              Institutional Scope & Batch
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target College */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Target Institution <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <SmoothSelect
                value={collegeId}
                onChange={(val) => {
                  setCollegeId(val);
                  setValidationErrors([]);
                }}
                searchable={true}
                searchPlaceholder="Search institution name or code…"
                icon={Building2}
                title="Institutional Target Scope"
                options={[
                  {
                    value: 'all',
                    label: 'All Colleges (Consolidated Report)',
                    badge: 'ALL',
                  },
                  ...colleges.map((c: any) => ({
                    value: c._id,
                    label: c.college_name,
                    badge: c.college_code,
                    sublabel: c.location,
                  })),
                ]}
              />
            </div>

            {/* Graduating Academic Year */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Graduating Academic Batch <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <SmoothSelect
                value={academicYear}
                onChange={(val) => {
                  setAcademicYear(val);
                  setValidationErrors([]);
                }}
                icon={GraduationCap}
                title="Graduating Academic Batch"
                options={[
                  { value: 'all', label: 'All Batches' },
                  { value: '2027', label: '2027' },
                  { value: '2028', label: '2028' },
                  { value: '2029', label: '2029' },
                  { value: '2030', label: '2030' },
                  { value: '2031', label: '2031' },
                  { value: '2032', label: '2032' },
                  { value: '2033', label: '2033' },
                  { value: '2034', label: '2034' },
                  { value: '2035', label: '2035' },
                ]}
              />
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
              {loadingWeekly && (
                <span className="flex items-center gap-1 text-[11px] text-primary font-bold animate-pulse">
                  <Loader2 size={12} className="animate-spin" /> Syncing with Weekly Tracker…
                </span>
              )}
              <span className="text-micro font-semibold text-fg-subtle">
                {Object.values(sections).filter(Boolean).length} Selected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {getSectionsConfig().map((sec: any) => {
              const Icon = sec.icon;
              const isChecked = !!sections[sec.key];
              const hasCompanies = Array.isArray(sec.companies) && sec.companies.length > 0;

              return (
                <div
                  key={sec.key}
                  className={`flex flex-col p-3.5 rounded-xl border transition-all select-none ${
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

                        {Array.isArray(sec.companies) && (
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                              hasCompanies
                                ? sec.badgeColor || 'bg-surface border-border text-fg'
                                : 'bg-surface border-border text-fg-subtle'
                            }`}
                          >
                            {sec.companies.length} {sec.companies.length === 1 ? 'Company' : 'Companies'}
                          </span>
                        )}
                      </div>
                      <p className="text-micro text-fg-subtle leading-normal">{sec.desc}</p>
                    </div>
                  </label>

                  {/* Live Synced Company Pill List from Weekly Tracker */}
                  {Array.isArray(sec.companies) && (
                    <div className="mt-2.5 pt-2 border-t border-border/50">
                      {hasCompanies ? (
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {sec.companies.map((c: any, i: number) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border font-mono ${
                                sec.badgeColor || 'bg-surface border-border text-fg'
                              }`}
                              title={`${c.company_name} — ${c.job_role || 'Role'} ${c.ctc_lpa ? `(${c.ctc_lpa})` : ''}`}
                            >
                              <Briefcase size={10} className="shrink-0" />
                              <span className="font-semibold">{c.company_name}</span>
                              {c.selected_count ? (
                                <span className="font-bold ml-0.5 text-emerald-600 dark:text-emerald-400">
                                  ({c.selected_count} Placed)
                                </span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-fg-subtle italic">
                          {loadingWeekly ? 'Checking tracker records…' : 'No companies logged in this section for this college'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section D: Coordinator Observations & Remarks */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            <PenLine size={16} className="text-primary shrink-0" />
            <h2 className="text-xs font-bold text-fg uppercase tracking-wider">
              Coordinator Remarks & Notes
            </h2>
          </div>
          <textarea
            rows={2}
            value={customRemarks}
            onChange={(e) => setCustomRemarks(e.target.value)}
            className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-3 text-xs text-fg outline-none shadow-xs font-medium"
            placeholder="Add operational notes, remarks, or instructions for leadership..."
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
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={14} strokeWidth={2} aria-hidden />
            <span>{loading ? 'Generating Report…' : 'Generate Report'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
