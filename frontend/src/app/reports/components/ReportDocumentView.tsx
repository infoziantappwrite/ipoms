'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Rocket,
  Inbox,
  Star,
  ListTodo,
  TrendingUp,
  Briefcase,
  Calendar,
  User,
  Building2,
  Clock,
  XCircle,
  AlertCircle,
  PhoneCall,
  Flame,
  Zap,
} from 'lucide-react';
import { getCollegeLogoUrl } from '@/lib/collegeLogo';
import { getCleanPeriod } from './NativeReportEditor';
import { sectionTitle, columnHeading } from '../lib/reportOverrides';

export interface ReportDocumentViewProps {
  report: any;
  editable?: boolean;
  onUpdateCell?: (sectionKey: string, rowIndex: number, field: string, value: any) => void;
  onUpdateTitle?: (title: string) => void;
  onRenameSection?: (key: string, value: string) => void;
  onRenameColumn?: (key: string, index: number, value: string) => void;
  className?: string;
  id?: string;
}

function EditableReportCell({
  value,
  onChange,
  className = '',
  placeholder = '',
  type = 'text',
  nowrap = false,
  editable = true,
}: {
  value: any;
  onChange?: (val: any) => void;
  className?: string;
  placeholder?: string;
  type?: 'text' | 'number';
  nowrap?: boolean;
  editable?: boolean;
}) {
  const rawText = value !== undefined && value !== null ? String(value) : '';
  const isNowrap = nowrap || className.includes('whitespace-nowrap');

  if (!editable) {
    return (
      <div className={`min-h-[1.35rem] w-full text-center ${isNowrap ? 'whitespace-nowrap' : 'whitespace-normal break-words'} leading-snug ${className}`}>
        {rawText !== '' ? rawText : placeholder || '—'}
      </div>
    );
  }

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const text = e.currentTarget.innerText.trim();
        if (onChange) {
          if (type === 'number') {
            onChange(Number(text) || 0);
          } else {
            onChange(text === '—' ? '' : text);
          }
        }
      }}
      className={`min-h-[1.35rem] w-full text-center outline-none focus:ring-1 focus:ring-primary/40 focus:bg-surface-sunken/60 rounded px-1 py-0.5 ${
        isNowrap ? 'whitespace-nowrap' : 'whitespace-normal break-words'
      } leading-snug transition-all ${className}`}
      title="Click to edit"
    >
      {rawText !== '' ? rawText : placeholder || '—'}
    </div>
  );
}

function EditableLabel({
  value,
  onCommit,
  className = '',
  editable = true,
}: {
  value: string;
  onCommit?: (v: string) => void;
  className?: string;
  editable?: boolean;
}) {
  if (!editable) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const t = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
        document.execCommand('insertText', false, t);
      }}
      onBlur={(e) => {
        const t = e.currentTarget.innerText.replace(/\s+/g, ' ').trim();
        if (!t) e.currentTarget.innerText = value;
        if (onCommit) onCommit(t);
      }}
      className={`outline-none cursor-text rounded-sm px-0.5 hover:bg-primary/10 focus:bg-primary/10 focus:ring-1 focus:ring-primary/40 print:hover:bg-transparent print:focus:bg-transparent print:focus:ring-0 ${className}`}
      title="Click to rename - changes this report only"
    >
      {value}
    </span>
  );
}

export function ReportDocumentView({
  report,
  editable = false,
  onUpdateCell,
  onUpdateTitle,
  onRenameSection,
  onRenameColumn,
  className = '',
  id = 'printable-report-canvas',
}: ReportDocumentViewProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (!report) return null;

  const collegeName = report.branding?.college_name || 'Consolidated Partner Institutions';
  const collegeCode = (report.branding?.college_code || 'iPOMS').toUpperCase();
  const isConsolidated = !collegeCode || collegeCode === 'IPOMS';
  const collegeLogoUrl = getCollegeLogoUrl(collegeCode, collegeName, report.branding?.college_logo);

  const activeCols = report.active_leads_columns || {};
  const showCollegesCol = Boolean(
    report.template_type === 'active_leads' &&
    (activeCols.colleges !== undefined
      ? activeCols.colleges
      : ((report.kpi_summary?.selected_streams?.jd_received && !report.kpi_summary?.selected_streams?.positives && !report.kpi_summary?.selected_streams?.weekly_tracker) ||
         report.kpi_summary?.tier_focus?.includes('JD Received') ||
         report.kpi_summary?.tier_focus?.includes('Hot Leads (JD Received)') ||
         report.report_title?.includes('JD Received') ||
         report.report_title?.includes('Hot Leads') ||
         (report.sections?.active_leads && report.sections.active_leads.some((r: any) => r.colleges && r.colleges !== '—' && r.source === 'jd_received'))))
  );
  const showRoleCol = activeCols.role !== false;
  const showCtcCol = activeCols.ctc !== false;

  const activeLeadsColWidths = (() => {
    if (showCollegesCol && showRoleCol && showCtcCol) {
      return { comp: '28%', colleges: '22%', role: '28%', ctc: '22%' };
    }
    if (showCollegesCol && showRoleCol && !showCtcCol) {
      return { comp: '36%', colleges: '30%', role: '34%', ctc: '0%' };
    }
    if (showCollegesCol && !showRoleCol && showCtcCol) {
      return { comp: '42%', colleges: '34%', role: '0%', ctc: '24%' };
    }
    if (showCollegesCol && !showRoleCol && !showCtcCol) {
      return { comp: '55%', colleges: '45%', role: '0%', ctc: '0%' };
    }
    if (!showCollegesCol && showRoleCol && showCtcCol) {
      return { comp: '34%', colleges: '0%', role: '38%', ctc: '28%' };
    }
    if (!showCollegesCol && showRoleCol && !showCtcCol) {
      return { comp: '50%', colleges: '0%', role: '50%', ctc: '0%' };
    }
    if (!showCollegesCol && !showRoleCol && showCtcCol) {
      return { comp: '65%', colleges: '0%', role: '0%', ctc: '35%' };
    }
    return { comp: '100%', colleges: '0%', role: '0%', ctc: '0%' };
  })();

  const defaultTitle = (() => {
    if (report.template_type === 'daily_positives') return 'POSITIVES  OF  THE  DAY';
    if (report.template_type === 'daily_jd_received') return 'JD  RECEIVED  FOR  THE  DAY';
    if (report.template_type === 'pending_tasks') return 'PENDING  TASK  PLACEMENT  REPORT';
    if (report.template_type === 'month_end' || report.template_type === 'monthly_placement') {
      const m = (report.report_period?.split(' ')[0] || (typeof window !== 'undefined' ? new Date().toLocaleDateString('en-US', { month: 'long' }) : 'October')).toUpperCase();
      return report.report_title ? report.report_title.toUpperCase() : `${m}   MONTH  PLACEMENT  REPORT`;
    }
    if (report.report_title) {
      return report.report_title.toUpperCase();
    }
    if (report.template_type === 'active_leads') return 'ACTIVE  LEADS  PIPELINE  REPORT';
    if (report.is_multi_college) return 'CONSOLIDATED  WEEKLY  PLACEMENT  REPORT';
    return 'WEEKLY  PLACEMENT  REPORT';
  })();

  return (
    <div
      id={id}
      className={`printable-report-canvas bg-surface border border-border rounded-2xl shadow-xs p-8 sm:p-12 text-fg min-h-[1123px] flex flex-col justify-between print:w-full print:p-0 print:border-none print:shadow-none print:bg-white print:text-black print:min-h-screen ${className}`}
    >
      {/* 1. Header Branding Strip with Infoziant Logo (Left), Centered Title & Subtitle, & Target College Logo (Right) */}
      <div className="flex items-center justify-between border-b-2 border-border print:border-slate-300 pb-4 gap-4 mb-2">
        {/* Left: Infoziant Logo */}
        <div className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/infoziant-head.png"
            alt="Infoziant"
            className="h-14 w-auto object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/college-logos/Infozianthead.png';
            }}
          />
        </div>

        {/* Center: Main Title and Subtitle (Center-Aligned) */}
        <div className="flex-1 text-center min-w-0 px-2 flex flex-col items-center justify-center">
          {editable ? (
            <>
              <span className="hidden print:block text-xl sm:text-2xl font-black text-[#0a2540] tracking-tight font-sans text-center uppercase">
                {report.report_title ? report.report_title.toUpperCase() : defaultTitle}
              </span>
              <input
                type="text"
                value={report.report_title || defaultTitle}
                onChange={(e) => onUpdateTitle && onUpdateTitle(e.target.value)}
                className="print:hidden text-xl sm:text-2xl font-black text-[#0a2540] dark:text-blue-100 tracking-tight font-sans text-center bg-transparent border-b border-dashed border-transparent hover:border-border focus:border-primary focus:outline-none w-full transition-colors uppercase"
                placeholder="Report Title"
              />
            </>
          ) : (
            <h1 className="text-xl sm:text-2xl font-black text-[#0a2540] tracking-tight font-sans text-center uppercase">
              {report.report_title ? report.report_title.toUpperCase() : defaultTitle}
            </h1>
          )}
          <p className="text-xs font-semibold text-fg-muted print:text-slate-700 mt-0.5 text-center">{collegeName}</p>
        </div>

        {/* Right: Target College Logo */}
        <div className="flex items-center shrink-0 justify-end min-w-[100px]">
          {report.is_multi_college || isConsolidated ? null : !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={collegeLogoUrl}
              src={collegeLogoUrl}
              alt={collegeName}
              className="h-14 w-auto max-w-[160px] object-contain shrink-0"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="h-10 px-3.5 bg-surface-sunken border border-border rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-fg">
              <Building2 size={15} className="text-primary shrink-0" />
              <span>{collegeCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Metadata Ribbon */}
      <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-fg-muted bg-surface-sunken/40 print:bg-slate-50 border border-border print:border-slate-200 rounded-lg px-5 py-2.5 font-medium mb-4">
        {report.template_type === 'weekly_placement' && getCleanPeriod(report.report_period) ? (
          <>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-primary shrink-0" />
              <span>
                Period:{' '}
                <strong className="text-fg print:text-slate-900 font-semibold">
                  {getCleanPeriod(report.report_period)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-fg-subtle shrink-0" />
              <span>
                Generated On:{' '}
                <strong className="text-fg print:text-slate-900 font-semibold">
                  {report.generated_date}
                </strong>
              </span>
            </div>
          </>
        ) : report.template_type === 'daily_positives' || report.template_type === 'daily_jd_received' ? (
          <>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-fg-subtle shrink-0" />
              <span>
                Generated On:{' '}
                <strong className="text-fg print:text-slate-900 font-semibold">
                  {report.generated_date}
                </strong>
              </span>
            </div>
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-fg-subtle shrink-0" />
              <span>
                Generated On:{' '}
                <strong className="text-fg print:text-slate-900 font-semibold">
                  {report.generated_date}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Content Sections */}
      <div className="space-y-6 flex-1 flex flex-col pt-1">
        {/* KPI Summary (Excluded for Pending Tasks Report) */}
        {report.template_type !== 'pending_tasks' && report.included_sections?.kpi_summary !== false && report.kpi_summary && (() => {
          const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
          
          if (report.template_type === 'month_end' || report.template_type === 'monthly_placement') {
            const meCards = [
              { key: 'total_calls', label: 'Total Calls Made', val: report.kpi_summary.total_calls ?? 0, icon: PhoneCall, col: 'text-blue-600 dark:text-blue-400' },
              { key: 'positive_responses', label: 'Positives Received', val: report.kpi_summary.positive_responses ?? 0, icon: TrendingUp, col: 'text-emerald-600 dark:text-emerald-400' },
              { key: 'total_duration', label: 'Duration Spent', val: report.kpi_summary.total_duration || '0m', icon: Clock, col: 'text-cyan-600 dark:text-cyan-400' },
              { key: 'total_offers_moved', label: 'Offers Received', val: report.kpi_summary.total_offers_moved || 0, icon: Trophy, col: 'text-purple-600 dark:text-purple-400' },
            ].filter((c) => activeKpis[c.key] !== false);

            if (meCards.length === 0) return null;

            return (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0a2540] dark:text-blue-200 uppercase tracking-wider px-1">
                  <Star size={13} className="text-primary shrink-0" />
                  <span>Month-End KPI Summary</span>
                </div>
                <div className="flex flex-wrap gap-3.5 w-full">
                  {meCards.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div
                        key={c.key}
                        className="flex-1 min-w-[130px] bg-white dark:bg-surface border border-sky-100/90 dark:border-slate-800 rounded-2xl p-4 text-center flex flex-col items-center justify-center shadow-xs hover:shadow-md transition-shadow"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1">
                          <Icon size={19} className={c.col} strokeWidth={2.2} />
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{c.label}</span>
                        <span className={`text-2xl sm:text-3xl font-black ${c.col} mt-1 font-mono`}>{c.val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (report.template_type === 'daily_positives' || report.template_type === 'daily_jd_received') {
            const isPositives = report.template_type === 'daily_positives';
            const dailyCards = [
              { key: isPositives ? 'total_positives' : 'total_jds', label: isPositives ? 'Total Positives' : 'Total JDs Received', val: isPositives ? (report.kpi_summary.total_positives || 0) : (report.kpi_summary.total_jds || 0), icon: isPositives ? Flame : Zap, col: isPositives ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { key: 'active_colleges_count', label: isPositives ? 'Colleges Reached' : 'Beneficiary Colleges', val: report.kpi_summary.active_colleges_count || 0, icon: Building2, col: 'text-blue-600 dark:text-blue-400' },
              { key: 'distinct_companies_count', label: 'Distinct Companies', val: report.kpi_summary.distinct_companies_count || 0, icon: Briefcase, col: 'text-indigo-600 dark:text-indigo-400' },
              { key: 'highest_ctc', label: 'Highest Package', val: report.kpi_summary.highest_ctc || '—', icon: Trophy, col: 'text-purple-600 dark:text-purple-400' },
            ];

            return (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-fg-muted uppercase tracking-wider px-1">
                  <Star size={13} className="text-primary shrink-0" />
                  <span>{isPositives ? 'Positives of the Day' : 'JD Received for the Day'} KPI Summary</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {dailyCards.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.key} className="bg-surface-sunken/40 print:bg-slate-50 border border-border print:border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-2xs">
                        <Icon size={16} className={`${c.col} mb-1`} />
                        <span className="text-[11px] font-medium text-fg-muted print:text-slate-600">{c.label}</span>
                        <span className={`text-lg sm:text-xl font-bold ${c.col} mt-0.5`}>{c.val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
            const alCards = [
              { key: 'total_leads', label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, icon: Briefcase, col: 'text-blue-600 dark:text-blue-400' },
              { key: 'hot_leads_count', label: 'JD Received Companies', val: report.kpi_summary.hot_leads_count ?? report.kpi_summary.jd_received_count ?? 0, icon: Flame, col: 'text-amber-600 dark:text-amber-400' },
              { key: 'pipeline_leads_count', label: 'Companies in Pipeline', val: report.kpi_summary.pipeline_leads_count ?? report.kpi_summary.pipeline_count ?? 0, icon: Zap, col: 'text-blue-600 dark:text-blue-400' },
              { key: 'graduating_year', label: 'Graduating Batch', val: report.kpi_summary.graduating_year || 'All Batches', icon: Calendar, col: 'text-emerald-600 dark:text-emerald-400' },
            ].filter((c) => activeKpis[c.key] !== false);

            if (alCards.length === 0) return null;

            return (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-fg-muted uppercase tracking-wider px-1">
                  <Star size={13} className="text-primary shrink-0" />
                  <span>Active Leads KPI Summary</span>
                </div>
                <div className={`grid gap-3 ${alCards.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : alCards.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {alCards.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.key} className="bg-surface-sunken/40 print:bg-slate-50 border border-border print:border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-2xs">
                        <Icon size={16} className={`${c.col} mb-1`} />
                        <span className="text-[11px] font-medium text-fg-muted print:text-slate-600">{c.label}</span>
                        <span className={`text-lg sm:text-xl font-bold ${c.col} mt-0.5`}>{c.val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (report.is_multi_college) {
            const multiCards = [
              { key: 'total_colleges', label: 'Colleges Included', val: report.kpi_summary.total_colleges || report.colleges_data?.length || 0, icon: Building2, col: 'text-blue-600 dark:text-blue-400' },
              { key: 'drives_completed', label: 'Drives Completed', val: report.kpi_summary.drives_completed || 0, icon: Trophy, col: 'text-emerald-600 dark:text-emerald-400' },
              { key: 'drives_in_progress', label: 'In Progress', val: report.kpi_summary.drives_in_progress || 0, icon: Rocket, col: 'text-blue-600 dark:text-blue-400' },
              { key: 'total_offers', label: 'Offers Placed', val: report.kpi_summary.total_offers || 0, icon: Star, col: 'text-purple-600 dark:text-purple-400' },
            ].filter((c) => activeKpis[c.key] !== false);

            if (multiCards.length === 0) return null;

            return (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-fg-muted uppercase tracking-wider px-1">
                  <Star size={13} className="text-primary shrink-0" />
                  <span>Consolidated KPI Summary</span>
                </div>
                <div className={`grid gap-3 ${multiCards.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                  {multiCards.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.key} className="bg-surface-sunken/40 print:bg-slate-50 border border-border print:border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-2xs">
                        <Icon size={16} className={`${c.col} mb-1`} />
                        <span className="text-[11px] font-medium text-fg-muted print:text-slate-600">{c.label}</span>
                        <span className={`text-lg sm:text-xl font-bold ${c.col} mt-0.5`}>{c.val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Single College Weekly Placement
          const wpCards = [
            { key: 'total_calls', label: 'Total Calls Made', val: report.kpi_summary.total_calls || 0, icon: PhoneCall, col: 'text-blue-600 dark:text-blue-400' },
            { key: 'positive_responses', label: 'Positives', val: report.kpi_summary.positive_responses || 0, icon: TrendingUp, col: 'text-emerald-600 dark:text-emerald-400' },
            { key: 'not_hiring', label: 'Not Hiring', val: report.kpi_summary.not_hiring || 0, icon: XCircle, col: 'text-rose-600 dark:text-rose-400' },
            { key: 'jds_received', label: 'JD Received', val: report.kpi_summary.jds_received || 0, icon: Inbox, col: 'text-cyan-600 dark:text-cyan-400' },
          ].filter((c) => activeKpis[c.key] !== false);

          if (wpCards.length === 0) return null;

          return (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-fg-muted uppercase tracking-wider px-1">
                <Star size={13} className="text-primary shrink-0" />
                <span>Executive Placement KPI Summary</span>
              </div>
              <div className={`grid gap-3 ${wpCards.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                {wpCards.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="bg-surface-sunken/40 print:bg-slate-50 border border-border print:border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-2xs">
                      <Icon size={16} className={`${c.col} mb-1`} />
                      <span className="text-[11px] font-medium text-fg-muted print:text-slate-600">{c.label}</span>
                      <span className={`text-lg sm:text-xl font-bold ${c.col} mt-0.5`}>{c.val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Multi-College Consolidated Tables ── */}
        {report.is_multi_college && Array.isArray(report.colleges_data) && report.colleges_data.length > 0 && (
          <div className="space-y-6 pt-2">
            {report.colleges_data.map((colData: any, cIdx: number) => (
              <div key={cIdx} className="space-y-3">
                <div className="flex items-center justify-between border-b-2 border-primary pb-1">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-primary" />
                    <h3 className="font-bold text-base text-fg uppercase">{colData.college_name} {colData.college_code ? `(${colData.college_code})` : ''}</h3>
                  </div>
                  <span className="text-xs font-semibold text-fg-muted">
                    {colData.total_completed || 0} Completed • {colData.total_in_drive ? `${colData.total_in_drive} In Drive • ` : ''}{colData.total_in_progress || 0} In Progress • {colData.total_offers || 0} Offers
                  </span>
                </div>

                {colData.completed_companies && colData.completed_companies.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-white">
                      <Trophy size={13} />
                      <span>Companies Completed ({colData.completed_companies.length})</span>
                    </div>
                    <div className="overflow-x-auto rounded border border-border bg-surface">
                      <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                        <colgroup>
                          <col style={{ width: '36px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '24%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '100px' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                            <th className="py-2 px-1 text-center font-bold">#</th>
                            <th className="py-2 px-2 text-center font-bold">COMPANY NAME</th>
                            <th className="py-2 px-2 text-center font-bold">ROLE</th>
                            <th className="py-2 px-1 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">STATUS</th>
                            <th className="py-2 px-2 text-center font-bold">OFFERS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {colData.completed_companies.map((r: any, idx: number) => (
                            <tr key={idx} className="bg-surface">
                              <td className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">{r.s_no || idx + 1}</td>
                              <td className="py-2 px-2 font-bold text-[#0a2540] dark:text-slate-100">{r.company_name}</td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{r.job_role || r.role || '—'}</td>
                              <td className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-400">{r.ctc_lpa || r.ctc || '—'}</td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{r.current_status_text || r.status || '—'}</td>
                              <td className="py-2 px-2 text-center font-bold text-emerald-700 dark:text-emerald-400">{r.selected_count || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Single College Standard Tables ── */}
        {!report.is_multi_college && report.template_type !== 'pending_tasks' && report.template_type !== 'active_leads' && report.template_type !== 'daily_positives' && report.template_type !== 'daily_jd_received' && (
          <div className="space-y-4 pt-1">
            {/* Section 1: Completed Companies */}
            {report.included_sections?.completed !== false && report.sections?.completed_companies && report.sections.completed_companies.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-white px-1">
                  <Trophy size={13} />
                  <span>
                    <EditableLabel
                      value={sectionTitle(report, 'completed', 'COMPANIES COMPLETED')}
                      onCommit={(v) => onRenameSection && onRenameSection('completed', v)}
                      editable={editable}
                    />
                  </span>
                </div>
                <div className="overflow-x-auto rounded border border-border bg-surface">
                  <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                    <colgroup>
                      <col style={{ width: '36px' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '100px' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                        <th className="py-2 px-1 text-center font-bold">#</th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'completed', 1, 'COMPANY NAME')} onCommit={(v) => onRenameColumn && onRenameColumn('completed', 1, v)} editable={editable} /></th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'completed', 2, 'ROLE')} onCommit={(v) => onRenameColumn && onRenameColumn('completed', 2, v)} editable={editable} /></th>
                        <th className="py-2 px-1 text-center font-bold"><EditableLabel value={columnHeading(report, 'completed', 3, 'CTC')} onCommit={(v) => onRenameColumn && onRenameColumn('completed', 3, v)} editable={editable} /></th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'completed', 4, 'STATUS')} onCommit={(v) => onRenameColumn && onRenameColumn('completed', 4, v)} editable={editable} /></th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'completed', 5, 'OFFERS')} onCommit={(v) => onRenameColumn && onRenameColumn('completed', 5, v)} editable={editable} /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.sections.completed_companies.map((r: any, idx: number) => (
                        <tr key={idx} className="bg-surface">
                          <td className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">{r.s_no || idx + 1}</td>
                          <td className="py-2 px-2 text-left font-bold text-[#0a2540] dark:text-slate-100">
                            <EditableReportCell
                              value={r.company_name}
                              onChange={(val) => onUpdateCell && onUpdateCell('completed_companies', idx, 'company_name', val)}
                              className="font-bold text-[#0a2540] dark:text-slate-100 text-left"
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                            <EditableReportCell
                              value={r.job_role || r.role}
                              onChange={(val) => onUpdateCell && onUpdateCell('completed_companies', idx, 'job_role', val)}
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            <EditableReportCell
                              value={r.ctc_lpa || r.ctc}
                              onChange={(val) => onUpdateCell && onUpdateCell('completed_companies', idx, 'ctc_lpa', val)}
                              className="font-bold text-emerald-700 dark:text-emerald-400"
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                            <EditableReportCell
                              value={r.current_status_text || r.status}
                              onChange={(val) => onUpdateCell && onUpdateCell('completed_companies', idx, 'current_status_text', val)}
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            <EditableReportCell
                              value={r.selected_count || 0}
                              type="number"
                              onChange={(val) => onUpdateCell && onUpdateCell('completed_companies', idx, 'selected_count', val)}
                              className="font-bold text-emerald-700 dark:text-emerald-400"
                              editable={editable}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 2: Drive In Progress */}
            {report.included_sections?.drive_in_progress !== false && report.sections?.drive_in_progress && report.sections.drive_in_progress.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-white px-1">
                  <Rocket size={13} />
                  <span>
                    <EditableLabel
                      value={sectionTitle(report, 'drive_in_progress', 'DRIVE IN PROGRESS')}
                      onCommit={(v) => onRenameSection && onRenameSection('drive_in_progress', v)}
                      editable={editable}
                    />
                  </span>
                </div>
                <div className="overflow-x-auto rounded border border-border bg-surface">
                  <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                    <colgroup>
                      <col style={{ width: '36px' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                        <th className="py-2 px-1 text-center font-bold">#</th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'drive_in_progress', 1, 'COMPANY NAME')} onCommit={(v) => onRenameColumn && onRenameColumn('drive_in_progress', 1, v)} editable={editable} /></th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'drive_in_progress', 2, 'ROLE')} onCommit={(v) => onRenameColumn && onRenameColumn('drive_in_progress', 2, v)} editable={editable} /></th>
                        <th className="py-2 px-1 text-center font-bold"><EditableLabel value={columnHeading(report, 'drive_in_progress', 3, 'CTC')} onCommit={(v) => onRenameColumn && onRenameColumn('drive_in_progress', 3, v)} editable={editable} /></th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'drive_in_progress', 4, 'STATUS')} onCommit={(v) => onRenameColumn && onRenameColumn('drive_in_progress', 4, v)} editable={editable} /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.sections.drive_in_progress.map((r: any, idx: number) => (
                        <tr key={idx} className="bg-surface">
                          <td className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">{r.s_no || idx + 1}</td>
                          <td className="py-2 px-2 text-left font-bold text-[#0a2540] dark:text-slate-100">
                            <EditableReportCell
                              value={r.company_name}
                              onChange={(val) => onUpdateCell && onUpdateCell('drive_in_progress', idx, 'company_name', val)}
                              className="font-bold text-[#0a2540] dark:text-slate-100 text-left"
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                            <EditableReportCell
                              value={r.job_role || r.role}
                              onChange={(val) => onUpdateCell && onUpdateCell('drive_in_progress', idx, 'job_role', val)}
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            <EditableReportCell
                              value={r.ctc_lpa || r.ctc}
                              onChange={(val) => onUpdateCell && onUpdateCell('drive_in_progress', idx, 'ctc_lpa', val)}
                              className="font-bold text-emerald-700 dark:text-emerald-400"
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                            <EditableReportCell
                              value={r.current_status_text || r.status || 'Drive in progress'}
                              onChange={(val) => onUpdateCell && onUpdateCell('drive_in_progress', idx, 'current_status_text', val)}
                              editable={editable}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Upcoming Drives */}
            {report.included_sections?.companies_in_drive !== false && (report.sections?.companies_in_drive || report.sections?.upcoming_drives) && (report.sections.companies_in_drive?.length > 0 || report.sections.upcoming_drives?.length > 0) && (() => {
              const list = report.sections?.companies_in_drive || report.sections?.upcoming_drives || [];
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-white px-1">
                    <Calendar size={13} />
                    <span>
                      <EditableLabel
                        value={sectionTitle(report, 'companies_in_drive', 'UPCOMING DRIVES')}
                        onCommit={(v) => onRenameSection && onRenameSection('companies_in_drive', v)}
                        editable={editable}
                      />
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded border border-border bg-surface">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                      <colgroup>
                        <col style={{ width: '36px' }} />
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '26%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '30%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                          <th className="py-2 px-1 text-center font-bold">#</th>
                          <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'companies_in_drive', 1, 'COMPANY NAME')} onCommit={(v) => onRenameColumn && onRenameColumn('companies_in_drive', 1, v)} editable={editable} /></th>
                          <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'companies_in_drive', 2, 'ROLE')} onCommit={(v) => onRenameColumn && onRenameColumn('companies_in_drive', 2, v)} editable={editable} /></th>
                          <th className="py-2 px-1 text-center font-bold"><EditableLabel value={columnHeading(report, 'companies_in_drive', 3, 'CTC')} onCommit={(v) => onRenameColumn && onRenameColumn('companies_in_drive', 3, v)} editable={editable} /></th>
                          <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'companies_in_drive', 4, 'STATUS')} onCommit={(v) => onRenameColumn && onRenameColumn('companies_in_drive', 4, v)} editable={editable} /></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {list.map((r: any, idx: number) => (
                          <tr key={idx} className="bg-surface">
                            <td className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">{r.s_no || idx + 1}</td>
                            <td className="py-2 px-2 text-left font-bold text-[#0a2540] dark:text-slate-100">
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) => onUpdateCell && onUpdateCell('companies_in_drive', idx, 'company_name', val)}
                                className="font-bold text-[#0a2540] dark:text-slate-100 text-left"
                                editable={editable}
                              />
                            </td>
                            <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                              <EditableReportCell
                                value={r.job_role || r.role}
                                onChange={(val) => onUpdateCell && onUpdateCell('companies_in_drive', idx, 'job_role', val)}
                                editable={editable}
                              />
                            </td>
                            <td className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-400">
                              <EditableReportCell
                                value={r.ctc_lpa || r.ctc}
                                onChange={(val) => onUpdateCell && onUpdateCell('companies_in_drive', idx, 'ctc_lpa', val)}
                                className="font-bold text-emerald-700 dark:text-emerald-400"
                                editable={editable}
                              />
                            </td>
                            <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                              <EditableReportCell
                                value={r.current_status_text || r.status || 'Upcoming Drive'}
                                onChange={(val) => onUpdateCell && onUpdateCell('companies_in_drive', idx, 'current_status_text', val)}
                                editable={editable}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Section 4: Companies In Progress */}
            {report.included_sections?.in_progress !== false && report.sections?.in_progress && report.sections.in_progress.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-white px-1">
                  <ListTodo size={13} />
                  <span>
                    <EditableLabel
                      value={sectionTitle(report, 'in_progress', 'COMPANIES IN PROGRESS')}
                      onCommit={(v) => onRenameSection && onRenameSection('in_progress', v)}
                      editable={editable}
                    />
                  </span>
                </div>
                <div className="overflow-x-auto rounded border border-border bg-surface">
                  <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                    <colgroup>
                      <col style={{ width: '36px' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                        <th className="py-2 px-1 text-center font-bold">#</th>
                        <th className="py-2 px-2 text-left font-bold"><EditableLabel value={columnHeading(report, 'in_progress', 1, 'COMPANY NAME')} onCommit={(v) => onRenameColumn && onRenameColumn('in_progress', 1, v)} editable={editable} /></th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'in_progress', 2, 'ROLE')} onCommit={(v) => onRenameColumn && onRenameColumn('in_progress', 2, v)} editable={editable} /></th>
                        <th className="py-2 px-1 text-center font-bold"><EditableLabel value={columnHeading(report, 'in_progress', 3, 'CTC')} onCommit={(v) => onRenameColumn && onRenameColumn('in_progress', 3, v)} editable={editable} /></th>
                        <th className="py-2 px-2 text-center font-bold"><EditableLabel value={columnHeading(report, 'in_progress', 4, 'STATUS')} onCommit={(v) => onRenameColumn && onRenameColumn('in_progress', 4, v)} editable={editable} /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.sections.in_progress.map((r: any, idx: number) => (
                        <tr key={idx} className="bg-surface">
                          <td className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">{r.s_no || idx + 1}</td>
                          <td className="py-2 px-2 text-left font-bold text-[#0a2540] dark:text-slate-100">
                            <EditableReportCell
                              value={r.company_name}
                              onChange={(val) => onUpdateCell && onUpdateCell('in_progress', idx, 'company_name', val)}
                              className="font-bold text-[#0a2540] dark:text-slate-100 text-left"
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                            <EditableReportCell
                              value={r.job_role || r.role}
                              onChange={(val) => onUpdateCell && onUpdateCell('in_progress', idx, 'job_role', val)}
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            <EditableReportCell
                              value={r.ctc_lpa || r.ctc}
                              onChange={(val) => onUpdateCell && onUpdateCell('in_progress', idx, 'ctc_lpa', val)}
                              className="font-bold text-emerald-700 dark:text-emerald-400"
                              editable={editable}
                            />
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                            <EditableReportCell
                              value={r.current_status_text || r.status || '—'}
                              onChange={(val) => onUpdateCell && onUpdateCell('in_progress', idx, 'current_status_text', val)}
                              editable={editable}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Section: Placement Pending Tasks ── */}
        {(report.template_type === 'pending_tasks' || (report.included_sections?.pending_tasks !== false && report.sections?.pending_tasks && report.sections.pending_tasks.length > 0)) && (() => {
          const allTasks = report.sections?.pending_tasks || [];
          const sec1 = report.sections?.drive_in_progress && report.sections.drive_in_progress.length > 0
            ? report.sections.drive_in_progress
            : allTasks.filter((t: any) => t.task_section === 'drive_in_progress');
          const sec2 = report.sections?.companies_in_drive && report.sections.companies_in_drive.length > 0
            ? report.sections.companies_in_drive
            : allTasks.filter((t: any) => t.task_section === 'companies_in_drive');
          const sec3 = report.sections?.company_in_progress && report.sections.company_in_progress.length > 0
            ? report.sections.company_in_progress
            : allTasks.filter((t: any) => t.task_section === 'company_in_progress' || (!t.task_section && !sec1.includes(t) && !sec2.includes(t)));

          const pendingSections = [
            { title: 'DRIVE IN PROGRESS', list: sec1, icon: Rocket, colClass: 'text-black dark:text-white', key: 'drive_in_progress' },
            { title: 'COMPANIES IN DRIVE', list: sec2, icon: Calendar, colClass: 'text-black dark:text-white', key: 'companies_in_drive' },
            { title: 'COMPANY IN PROGRESS', list: sec3, icon: ListTodo, colClass: 'text-black dark:text-white', key: 'company_in_progress' },
          ].filter(s => s.list.length > 0);

          if (pendingSections.length === 0) return null;

          return (
            <div className="space-y-4 pt-1">
              {pendingSections.map((sec, sIdx) => {
                const Icon = sec.icon;
                return (
                  <div key={sIdx} className="space-y-1.5">
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${sec.colClass} px-1`}>
                      <Icon size={13} />
                      <span>{sec.title}</span>
                    </div>
                    <div className="overflow-x-auto rounded border border-border bg-surface">
                      <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                        <colgroup>
                          <col style={{ width: '36px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '24%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '36%' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                            <th className="py-2 px-1 text-center font-bold">#</th>
                            <th className="py-2 px-2 text-left font-bold">COMPANY NAME</th>
                            <th className="py-2 px-2 text-center font-bold">ROLE</th>
                            <th className="py-2 px-1 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {sec.list.map((r: any, idx: number) => {
                            const isHl = Boolean(r.is_highlighted);
                            const hlBg = r.highlight_color || '#fef08a';
                            const targetIdx = allTasks.indexOf(r) >= 0 ? allTasks.indexOf(r) : idx;
                            return (
                              <tr
                                key={idx}
                                style={isHl ? { backgroundColor: hlBg } : undefined}
                                className={!isHl ? 'bg-surface' : ''}
                              >
                                <td className={`py-2 px-1 text-center font-bold ${isHl ? 'text-black' : 'text-blue-700 dark:text-blue-400'}`}>
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-2 text-left font-bold text-[#0a2540] dark:text-slate-100">
                                  <EditableReportCell
                                    value={r.company_name}
                                    onChange={(val) => onUpdateCell && onUpdateCell('pending_tasks', targetIdx, 'company_name', val)}
                                    className={`font-bold text-left ${isHl ? 'text-black font-black' : 'text-[#0a2540] dark:text-slate-100'}`}
                                    editable={editable}
                                  />
                                </td>
                                <td className={`py-2 px-2 text-center ${isHl ? 'text-black font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                  <EditableReportCell
                                    value={r.role || r.job_role}
                                    onChange={(val) => onUpdateCell && onUpdateCell('pending_tasks', targetIdx, 'role', val)}
                                    className={isHl ? 'text-black' : ''}
                                    editable={editable}
                                  />
                                </td>
                                <td className={`py-2 px-1 text-center font-bold ${isHl ? 'text-black' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                  <EditableReportCell
                                    value={r.ctc || r.ctc_lpa || r.package_details}
                                    onChange={(val) => onUpdateCell && onUpdateCell('pending_tasks', targetIdx, 'ctc', val)}
                                    className={isHl ? 'text-black font-black' : 'text-emerald-700 dark:text-emerald-400 font-bold'}
                                    editable={editable}
                                  />
                                </td>
                                <td className={`py-2 px-2 text-center ${isHl ? 'text-black font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                  <EditableReportCell
                                    value={r.status || r.current_status_text || r.action_to_be_taken || r.current_status || r.remarks}
                                    onChange={(val) => onUpdateCell && onUpdateCell('pending_tasks', targetIdx, 'status', val)}
                                    className={isHl ? 'text-black' : ''}
                                    editable={editable}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Section: Active Leads Table ── */}
        {report.template_type === 'active_leads' && report.sections?.active_leads && report.sections.active_leads.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-white px-1">
              <Briefcase size={13} />
              <span>ACTIVE CORPORATE LEADS</span>
            </div>
            <div className="overflow-x-auto rounded border border-border bg-surface">
              <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                    <th className="py-2 px-1 text-center font-bold" style={{ width: '36px' }}>#</th>
                    <th className="py-2 px-2 text-center font-bold" style={{ width: activeLeadsColWidths.comp }}>COMPANY NAME</th>
                    {showCollegesCol && <th className="py-2 px-2 text-center font-bold" style={{ width: activeLeadsColWidths.colleges }}>TARGET COLLEGES</th>}
                    {showRoleCol && <th className="py-2 px-2 text-center font-bold" style={{ width: activeLeadsColWidths.role }}>ROLE / DESIGNATION</th>}
                    {showCtcCol && <th className="py-2 px-1 text-center font-bold" style={{ width: activeLeadsColWidths.ctc }}>PACKAGE / CTC</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.sections.active_leads.map((r: any, idx: number) => (
                    <tr key={idx} className="bg-surface">
                      <td className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">{r.s_no || idx + 1}</td>
                      <td className="py-2 px-2 text-left font-bold text-[#0a2540] dark:text-slate-100">
                        <EditableReportCell
                          value={r.company_name}
                          onChange={(val) => onUpdateCell && onUpdateCell('active_leads', idx, 'company_name', val)}
                          className="font-bold text-left text-[#0a2540] dark:text-slate-100"
                          editable={editable}
                        />
                      </td>
                      {showCollegesCol && (
                        <td className="py-2 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                          <EditableReportCell
                            value={r.colleges || r.college_code}
                            onChange={(val) => onUpdateCell && onUpdateCell('active_leads', idx, 'colleges', val)}
                            editable={editable}
                          />
                        </td>
                      )}
                      {showRoleCol && (
                        <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                          <EditableReportCell
                            value={r.role || r.job_role}
                            onChange={(val) => onUpdateCell && onUpdateCell('active_leads', idx, 'role', val)}
                            editable={editable}
                          />
                        </td>
                      )}
                      {showCtcCol && (
                        <td className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-400">
                          <EditableReportCell
                            value={r.ctc || r.ctc_lpa}
                            onChange={(val) => onUpdateCell && onUpdateCell('active_leads', idx, 'ctc', val)}
                            className="font-bold text-emerald-700 dark:text-emerald-400"
                            editable={editable}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Daily Leads Reports Table (Positives / JD Received) ── */}
        {(report.template_type === 'daily_positives' || report.template_type === 'daily_jd_received') && (() => {
          const rows = report.sections?.daily_positives || report.sections?.daily_jd_received || report.sections?.daily_leads || [];
          const isPos = report.template_type === 'daily_positives';
          const secKey = isPos ? 'daily_positives' : 'daily_jd_received';

          if (rows.length === 0) return null;

          return (
            <div className="space-y-1.5 pt-1">
              <div className="overflow-x-auto rounded border border-border bg-surface">
                <table className="w-full text-[11px] border-collapse table-fixed bg-surface">
                  <colgroup>
                    <col style={{ width: '36px' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '85px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10px]">
                      <th className="py-2 px-1 text-center font-bold">#</th>
                      <th className="py-2 px-2 text-center font-bold">COMPANY NAME</th>
                      <th className="py-2 px-2 text-center font-bold">ROLE / DESIGNATION</th>
                      <th className="py-2 px-1 text-center font-bold">CTC</th>
                      <th className="py-2 px-1.5 text-center font-bold">TIME</th>
                      <th className="py-2 px-1.5 text-center font-bold">COLLEGE</th>
                      <th className="py-2 px-2 text-center font-bold">COORDINATOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r: any, idx: number) => (
                      <tr key={idx} className="bg-surface">
                        <td className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">{r.s_no || idx + 1}</td>
                        <td className="py-2 px-2 text-left font-bold text-[#0a2540] dark:text-slate-100">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) => onUpdateCell && onUpdateCell(secKey, idx, 'company_name', val)}
                            className="font-bold text-left text-[#0a2540] dark:text-slate-100"
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                          <EditableReportCell
                            value={r.role || r.job_role}
                            onChange={(val) => onUpdateCell && onUpdateCell(secKey, idx, 'role', val)}
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-400">
                          <EditableReportCell
                            value={r.ctc || r.ctc_lpa}
                            onChange={(val) => onUpdateCell && onUpdateCell(secKey, idx, 'ctc', val)}
                            className="font-bold text-emerald-700 dark:text-emerald-400"
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-1.5 text-center text-slate-700 dark:text-slate-300">
                          <EditableReportCell
                            value={r.time || r.time_stamp || r.event_time}
                            onChange={(val) => onUpdateCell && onUpdateCell(secKey, idx, 'time', val)}
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-1.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          <EditableReportCell
                            value={r.college_code || r.college_name}
                            onChange={(val) => onUpdateCell && onUpdateCell(secKey, idx, 'college_code', val)}
                            className="font-bold"
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">
                          <EditableReportCell
                            value={r.coordinator || 'Placement Team'}
                            onChange={(val) => onUpdateCell && onUpdateCell(secKey, idx, 'coordinator', val)}
                            editable={editable}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── Remarks Block (Only if included) ── */}
        {report.included_sections?.remarks !== false && report.remarks && (
          <div className="bg-surface-sunken/40 print:bg-slate-50 border border-border print:border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-fg-muted uppercase tracking-wider">
              <AlertCircle size={13} className="text-primary shrink-0" />
              <span>{report.template_type === 'active_leads' ? 'Notes' : 'Coordinator Remarks & Observations'}</span>
            </div>
            <p className="text-xs text-fg print:text-slate-800 leading-relaxed whitespace-pre-wrap">{report.remarks}</p>
          </div>
        )}
      </div>

      {/* 4. Signoff Footer */}
      {report.include_prepared_by !== false && (
        <div className="border-t border-border print:border-slate-300 pt-4 mt-auto flex items-center justify-between text-xs text-fg-subtle print:text-slate-500 avoid-break shrink-0">
          <div>
            <p className="text-[11px] text-fg-subtle print:text-slate-500 font-medium">© 2026 Infoziant. All rights reserved.</p>
          </div>
          {Boolean(report.generated_by || report.branding?.prepared_by) && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fg print:text-slate-800">
              <User size={13} className="text-primary shrink-0" />
              <span>Prepared by: <strong className="font-bold">{report.generated_by || report.branding?.prepared_by}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
