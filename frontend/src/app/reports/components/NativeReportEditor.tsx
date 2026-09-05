'use client';

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  PenLine,
  Download,
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
  Eye,
  XCircle,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Highlighter,
  Flame,
} from 'lucide-react';
import { A4PdfPreviewModal } from './A4PdfPreviewModal';
import { COLLEGE_LOGO_MAP, getCollegeLogoUrl } from '@/lib/collegeLogo';


export function getCleanPeriod(period?: string): string {
  if (!period) return '';
  const trimmed = String(period).trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'cumulative' ||
    trimmed.toLowerCase() === 'all dates (cumulative)' ||
    trimmed.toLowerCase() === 'all dates' ||
    trimmed.toLowerCase().includes('cumulative')
  ) {
    return '';
  }
  if (trimmed.includes(': ')) {
    const parts = trimmed.split(': ');
    const last = parts[parts.length - 1].trim();
    if (last.toLowerCase() === 'cumulative' || last.toLowerCase().includes('cumulative')) return '';
    return last;
  }
  if (trimmed.includes('(') && trimmed.includes(')')) {
    const match = trimmed.match(/\((.*?)\)/);
    if (match && match[1]) {
      const inside = match[1].trim();
      if (inside.toLowerCase() === 'cumulative' || inside.toLowerCase().includes('cumulative')) return '';
      return inside;
    }
  }
  return trimmed;
}

export function getReportExportBaseFileName(report: any): string {
  if (!report) return 'report';

  // 1. Extract College Acronym
  let acronym = (report.branding?.college_code || report.college_code || '').trim();
  if (!acronym || acronym.toUpperCase() === 'IPOMS' || acronym.toUpperCase() === 'COLLEGE') {
    const cName = report.branding?.college_name || report.college_name || report.institution_name || '';
    const parenMatch = cName.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1]) {
      acronym = parenMatch[1].trim();
    } else if (cName) {
      const words = cName.split(/\s+/);
      acronym = words[0] || 'college';
    } else {
      acronym = 'college';
    }
  }

  const cleanAcronym = acronym.toLowerCase();

  // 2. Check if Month-End Report
  const isMonthEnd =
    report.template_type === 'month_end' ||
    report.template_type === 'monthly_placement' ||
    (report.report_title && /month/i.test(report.report_title)) ||
    (report.template_name && /month/i.test(report.template_name));

  if (isMonthEnd) {
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    let detectedMonth = '';
    const searchSources = [
      report.report_period,
      report.period,
      report.week_label,
      report.report_title,
      report.title,
    ];

    for (const src of searchSources) {
      if (typeof src === 'string' && src.trim()) {
        for (const m of MONTHS) {
          if (new RegExp(`\\b${m}\\b`, 'i').test(src)) {
            detectedMonth = m;
            break;
          }
        }
        if (detectedMonth) break;
      }
    }

    if (!detectedMonth) {
      const rawDate = report.generated_date || report.created_at || report.updated_at;
      const d = rawDate ? new Date(rawDate) : new Date();
      if (!isNaN(d.getTime())) {
        detectedMonth = MONTHS[d.getMonth()];
      } else {
        detectedMonth = 'August';
      }
    }

    // Required filename format: "aiht- August month report" (for aiht- August month report.pdf)
    return `${cleanAcronym}- ${detectedMonth} month report`;
  }

  // Standard naming for weekly and other reports
  const baseTitle = (report.report_title || 'Weekly_Placement_Report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  return cleanAcronym && cleanAcronym !== 'ipoms' && cleanAcronym !== 'college'
    ? `${cleanAcronym}_${baseTitle}`
    : baseTitle;
}

function EditableReportCell({
  value,
  onChange,
  className = '',
  placeholder = '',
  type = 'text',
  nowrap = false,
}: {
  value: any;
  onChange: (val: any) => void;
  className?: string;
  placeholder?: string;
  type?: 'text' | 'number';
  nowrap?: boolean;
}) {
  const rawText = value !== undefined && value !== null ? String(value) : '';
  const isNowrap = nowrap || className.includes('whitespace-nowrap');

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const text = e.currentTarget.innerText.trim();
        if (type === 'number') {
          onChange(Number(text) || 0);
        } else {
          onChange(text === '—' ? '' : text);
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

interface NativeReportEditorProps {
  reportData: any;
  onBackToBuilder?: () => void;
}

export function NativeReportEditor({ reportData, onBackToBuilder }: NativeReportEditorProps) {
  const [report, setReport] = useState(reportData);
  const [logoFailed, setLogoFailed] = useState(false);
  const [showA4Preview, setShowA4Preview] = useState(false);

  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    setReport(reportData);
    setLogoFailed(false);
  }, [reportData]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowH = window.innerHeight;
      const fullH = document.documentElement.scrollHeight || document.body.scrollHeight;
      setIsNearBottom(scrollY + windowH >= fullH - 350);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight || document.body.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!report) {
    return (
      <div className="p-12 text-center text-fg-subtle">
        <p className="text-sm">No report loaded in editor.</p>
        <button
          onClick={onBackToBuilder}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold cursor-pointer"
        >
          Open Builder Wizard
        </button>
      </div>
    );
  }

  // Cell editing helper for presentation tables
  const handleUpdateCell = (sectionKey: string, rowIndex: number, field: string, value: any) => {
    setReport((prev: any) => {
      const updated = { ...prev };
      if (!updated.sections[sectionKey]) return updated;
      const sec = [...updated.sections[sectionKey]];
      sec[rowIndex] = { ...sec[rowIndex], [field]: value };
      updated.sections[sectionKey] = sec;
      return updated;
    });
  };

  // Export directly to Excel (.xls / .xlsx compatible spreadsheet)
  const handleExportExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${report.report_title || 'Report'}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .header-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
          .header-sub { font-size: 11pt; color: #475569; }
          .sec-header { background-color: #f1f5f9; font-weight: bold; font-size: 12pt; color: #0f172a; padding: 8px; border: 1px solid #94a3b8; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="8" class="header-title">${report.branding?.company_name || 'Infoziant'}</td></tr>
          <tr><td colspan="8" class="header-sub">${report.branding?.college_name || 'Partner Institutions'} — ${report.report_title}</td></tr>
          <tr><td colspan="8" style="color:#64748b;">${report.template_type === 'weekly_placement' ? `Period: ${getCleanPeriod(report.report_period)} | ` : (report.template_type === 'month_end' ? `Month: ${report.report_period || 'August 2026'} | ` : '')}${report.include_prepared_by !== false && (report.generated_by || report.branding?.prepared_by) ? `Prepared by: ${report.generated_by || report.branding?.prepared_by} | ` : ''}Generated: ${report.generated_date || ''}</td></tr>
          <tr><td colspan="8"></td></tr>
    `;

    // KPI Summary (Excluded for Pending Tasks Report)
    if (report.kpi_summary && report.template_type !== 'pending_tasks') {
      const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
      if (report.template_type === 'month_end') {
        const meCards = [
          { key: 'total_conversion_count', label: 'Total Conversions', val: report.kpi_summary.total_conversion_count || 0, color: '#059669' },
          { key: 'total_companies_scheduled', label: 'Companies Scheduled', val: report.kpi_summary.total_companies_scheduled || 0, color: '#d97706' },
          { key: 'total_offers_moved', label: 'Offers Received', val: report.kpi_summary.total_offers_moved || 0, color: '#7c3aed' },
        ].filter((c) => activeKpis[c.key] !== false);

        if (meCards.length > 0) {
          const colSpan = Math.max(1, Math.floor(8 / meCards.length));
          html += `
            <tr><td colspan="8" class="sec-header">MONTH-END KPI SUMMARY</td></tr>
            <tr>
              ${meCards.map((c) => `<th colspan="${colSpan}">${c.label}</th>`).join('')}
            </tr>
            <tr>
              ${meCards.map((c) => `<td colspan="${colSpan}" style="text-align:center; font-weight:bold; font-size:13pt; color:${c.color};">${c.val}</td>`).join('')}
            </tr>
            <tr><td colspan="8"></td></tr>
          `;
        }
      } else if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
        const alCards = [
          { key: 'total_leads', label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, color: '#1e3a8a' },
          { key: 'graduating_year', label: 'Graduating Batch', val: report.kpi_summary.graduating_year || '2027', color: '#059669' },
          { key: 'active_companies_count', label: 'Corporate Partners', val: report.kpi_summary.active_companies_count || 0, color: '#d97706' },
        ].filter((c) => activeKpis[c.key] !== false);

        if (alCards.length > 0) {
          const colSpan = Math.max(1, Math.floor(8 / alCards.length));
          html += `
            <tr><td colspan="8" class="sec-header">ACTIVE LEADS KPI SUMMARY</td></tr>
            <tr>
              ${alCards.map((c) => `<th colspan="${colSpan}">${c.label}</th>`).join('')}
            </tr>
            <tr>
              ${alCards.map((c) => `<td colspan="${colSpan}" style="text-align:center; font-weight:bold; font-size:13pt; color:${c.color};">${c.val}</td>`).join('')}
            </tr>
            <tr><td colspan="8"></td></tr>
          `;
        }
      } else if (report.is_multi_college) {
        const multiCards = [
          { key: 'total_colleges', label: 'Colleges Included', val: report.kpi_summary.total_colleges || report.colleges_data?.length || 0, color: '#1e3a8a' },
          { key: 'drives_completed', label: 'Drives Completed', val: report.kpi_summary.drives_completed || 0, color: '#059669' },
          { key: 'drives_in_progress', label: 'In Progress', val: report.kpi_summary.drives_in_progress || 0, color: '#2563eb' },
          { key: 'total_offers', label: 'Offers Placed', val: report.kpi_summary.total_offers || 0, color: '#7c3aed' },
        ].filter((c) => activeKpis[c.key] !== false);

        if (multiCards.length > 0) {
          html += `
            <tr><td colspan="8" class="sec-header">CONSOLIDATED KPI SUMMARY</td></tr>
            <tr>
              ${multiCards.map((c) => `<th>${c.label}</th>`).join('')}
            </tr>
            <tr>
              ${multiCards.map((c) => `<td style="text-align:center; color:${c.color}; font-weight:bold;">${c.val}</td>`).join('')}
            </tr>
            <tr><td colspan="8"></td></tr>
          `;
        }
      } else {
        const wpCards = [
          { key: 'total_calls', label: 'Total Calls Made', val: report.kpi_summary.total_calls || 0, color: '#1e3a8a' },
          { key: 'positive_responses', label: 'Positives', val: report.kpi_summary.positive_responses || 0, color: '#059669' },
          { key: 'not_hiring', label: 'Not Hiring', val: report.kpi_summary.not_hiring || 0, color: '#e11d48' },
          { key: 'jds_received', label: 'JD Received', val: report.kpi_summary.jds_received || 0, color: '#0891b2' },
        ].filter((c) => activeKpis[c.key] !== false);

        if (wpCards.length > 0) {
          html += `
            <tr><td colspan="8" class="sec-header">EXECUTIVE PLACEMENT KPI SUMMARY</td></tr>
            <tr>
              ${wpCards.map((c) => `<th>${c.label}</th>`).join('')}
            </tr>
            <tr>
              ${wpCards.map((c) => `<td style="text-align:center; color:${c.color}; font-weight:bold;">${c.val}</td>`).join('')}
            </tr>
            <tr><td colspan="8"></td></tr>
          `;
        }
      }
    }

    // Weekly Placement Report Tables (Sections 1 through 7)
    if (!report.template_type || report.template_type === 'weekly_placement') {
      if (report.is_multi_college && Array.isArray(report.colleges_data)) {
        report.colleges_data.forEach((colData: any, cIdx: number) => {
          html += `
            <tr>
              <td colspan="6" class="sec-header" style="background:#1e3a8a; color:#ffffff; font-size:11pt; padding:8px 12px; font-weight:bold;">
                ${cIdx + 1}. ${colData.college_name.toUpperCase()} ${colData.college_code ? `(${colData.college_code})` : ''} — ${colData.total_completed || 0} COMPLETED, ${colData.total_in_drive ? colData.total_in_drive + ' IN DRIVE, ' : ''}${colData.total_in_progress || 0} IN PROGRESS, ${colData.total_offers || 0} OFFERS
              </td>
            </tr>
          `;

          if (colData.completed_companies && colData.completed_companies.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#ecfdf5; color:#065f46;">1. COMPANIES COMPLETED (${colData.completed_companies.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th>Status</th>
                <th style="text-align:center;">Offers Received</th>
              </tr>
            `;
            colData.completed_companies.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || '—'}</td>
                  <td style="color:#059669; font-weight:bold;">${r.ctc_lpa || '—'}</td>
                  <td>${r.current_status_text || '—'}</td>
                  <td style="text-align:center; font-weight:bold; color:#059669;">${r.selected_count || 0}</td>
                </tr>
              `;
            });
          }

          if (colData.companies_in_drive && colData.companies_in_drive.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#fffbeb; color:#92400e;">2. COMPANIES IN DRIVE (${colData.companies_in_drive.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status / Drive Date</th>
              </tr>
            `;
            colData.companies_in_drive.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || r.role || '—'}</td>
                  <td style="color:#d97706; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || 'Drive in progress'}</td>
                </tr>
              `;
            });
          }

          if (colData.in_progress && colData.in_progress.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#eff6ff; color:#1e40af;">3. COMPANIES IN PROGRESS (${colData.in_progress.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status / Follow-up</th>
              </tr>
            `;
            colData.in_progress.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || '—'}</td>
                  <td style="color:#2563eb; font-weight:bold;">${r.ctc_lpa || '—'}</td>
                  <td colspan="2">${r.current_status_text || '—'}</td>
                </tr>
              `;
            });
          }

          html += `<tr><td colspan="6"></td></tr>`;
        });
      } else {
        // Section 1: Companies Completed
        if (report.sections?.completed_companies && report.sections.completed_companies.length > 0) {
        html += `
          <tr><td colspan="6" class="sec-header">1. COMPANIES COMPLETED (${report.sections.completed_companies.length} Drives)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
          <th style="text-align:center;">Offers Received</th>
        </tr>
      `;
      report.sections.completed_companies.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td>${r.ctc_lpa || '—'}</td>
            <td>${r.current_status_text || '—'}</td>
            <td style="text-align:center; font-weight:bold; color:#059669;">${r.selected_count || 0}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="6"></td></tr>`;
    }

    // Section 2: Companies In Drive
    if (report.sections?.companies_in_drive && report.sections.companies_in_drive.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fffbeb; color:#92400e;">2. COMPANIES IN DRIVE (${report.sections.companies_in_drive.length} Drives)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status / Drive Date</th>
        </tr>
      `;
      report.sections.companies_in_drive.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || r.role || '—'}</td>
            <td style="color:#d97706; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
            <td>${r.current_status_text || r.status || 'Drive in progress'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Section 3: Companies In Progress
    if (report.sections?.in_progress && report.sections.in_progress.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">3. COMPANIES IN PROGRESS (${report.sections.in_progress.length} Drives)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
        </tr>
      `;
      report.sections.in_progress.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td>${r.ctc_lpa || '—'}</td>
            <td>${r.current_status_text || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Section 4: Companies in Pipeline
    if (report.sections?.pipeline && report.sections.pipeline.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">4. COMPANIES IN PIPELINE (${report.sections.pipeline.length} Leads)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
        </tr>
      `;
      report.sections.pipeline.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td>${r.ctc_lpa || '—'}</td>
            <td>${r.current_status_text || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Section 5: Top Companies
    if (report.sections?.top_companies && report.sections.top_companies.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">5. TOP COMPANIES (${report.sections.top_companies.length} Companies)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
        </tr>
      `;
      report.sections.top_companies.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td style="color:#d97706; font-weight:bold;">${r.ctc_lpa || '—'}</td>
            <td>${r.current_status_text || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Section 6: Rejected Companies
    const rejRows = report.sections?.rejected_companies || report.sections?.rejected_by_hr;
    if (rejRows && rejRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fef2f2; color:#991b1b;">6. REJECTED COMPANIES (${rejRows.length} Declined)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status / Reason</th>
        </tr>
      `;
      rejRows.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td style="color:#991b1b;">${r.ctc_lpa || '—'}</td>
            <td style="color:#991b1b;">${r.current_status_text || 'Rejected Company'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Section 7: Companies On Hold By College
    const holdColRows = report.sections?.on_hold_by_college || report.sections?.rejected_by_college;
    if (holdColRows && holdColRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fff7ed; color:#9a3412;">7. COMPANIES ON HOLD BY COLLEGE (${holdColRows.length} Holds)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status / Reason</th>
        </tr>
      `;
      holdColRows.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td style="color:#9a3412;">${r.ctc_lpa || '—'}</td>
            <td style="color:#9a3412;">${r.current_status_text || 'On Hold By College'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Section 8: Companies On Hold By HR
    const holdHrRows = report.sections?.on_hold_by_hr;
    if (holdHrRows && holdHrRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#f1f5f9; color:#334155;">8. COMPANIES ON HOLD BY HR (${holdHrRows.length} Holds)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status / Reason</th>
        </tr>
      `;
      holdHrRows.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td style="color:#334155;">${r.ctc_lpa || '—'}</td>
            <td style="color:#334155;">${r.current_status_text || 'On Hold By HR'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }
    }
    }

    // Section: Placement Pending Tasks
    if (report.sections?.pending_tasks && report.sections.pending_tasks.length > 0) {
      const hasDriveDate = report.sections.pending_tasks.some(
        (r: any) => r.drive_date && String(r.drive_date).trim() !== '' && String(r.drive_date).trim() !== '—' && String(r.drive_date).trim() !== '-'
      );
      const colSpan = hasDriveDate ? 7 : 6;

      html += `
        <tr><td colspan="${colSpan}" class="sec-header">PLACEMENT PENDING TASKS (${report.sections.pending_tasks.length} Tasks)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>JD Received Date</th>
          <th>DB Shared Date</th>
          <th>Current Status</th>
          <th>Remarks / Next Action</th>
          ${hasDriveDate ? '<th>Drive Date</th>' : ''}
        </tr>
      `;
      report.sections.pending_tasks.forEach((r: any) => {
        const isHl = Boolean(r.is_highlighted);
        const hlBg = r.highlight_color || '#fef08a';
        const trHl = isHl ? `style="background-color:${hlBg} !important;" bgcolor="${hlBg}"` : '';
        const tdHl = isHl ? `style="background-color:${hlBg} !important;" bgcolor="${hlBg}"` : '';

        html += `
          <tr ${trHl}>
            <td ${tdHl} style="text-align:center;${isHl ? `background-color:${hlBg} !important;` : ''}">${r.s_no}</td>
            <td ${tdHl}><b>${r.company_name}</b></td>
            <td ${tdHl}>${r.jd_received_date || '—'}</td>
            <td ${tdHl}>${r.db_shared_date || '—'}</td>
            <td ${tdHl}>${r.current_status || '—'}</td>
            <td ${tdHl}>${r.action_to_be_taken || '—'}</td>
            ${hasDriveDate ? `<td ${tdHl} style="color:#7c3aed; font-weight:bold;${isHl ? `background-color:${hlBg} !important;` : ''}">${r.drive_date || '—'}</td>` : ''}
          </tr>
        `;
      });
      html += `<tr><td colspan="${colSpan}"></td></tr>`;
    }

    // Section: Active Leads
    if (report.sections?.active_leads && report.sections.active_leads.length > 0) {
      html += `
        <tr><td colspan="4" class="sec-header">ACTIVE CORPORATE LEADS (${report.sections.active_leads.length} Leads)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
        </tr>
      `;
      report.sections.active_leads.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.role || '—'}</td>
            <td style="color:#059669; font-weight:bold;">${r.ctc || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="4"></td></tr>`;
    }

    // Month-End Section 1: Companies Completed
    if (report.template_type === 'month_end' && report.sections?.completed_companies && report.sections.completed_companies.length > 0) {
      html += `
        <tr><td colspan="6" class="sec-header">COMPANIES COMPLETED (${report.sections.completed_companies.length} Companies)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th style="text-align:center;">Status</th>
          <th style="text-align:center;">Offers Received</th>
        </tr>
      `;
      report.sections.completed_companies.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.role || r.job_role || '—'}</td>
            <td style="color:#059669; font-weight:bold;">${r.ctc || r.ctc_lpa || '—'}</td>
            <td style="text-align:center; color:#059669; font-weight:500;">${r.status || r.current_status_text || 'Drive Completed'}</td>
            <td style="text-align:center; font-weight:bold; color:#059669;">${r.offers_received ?? r.selected_count ?? 0}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="6"></td></tr>`;
    }

    // Month-End Section 2: JD Received Companies
    if (report.template_type === 'month_end' && report.sections?.company_conversions && report.sections.company_conversions.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">JD RECEIVED COMPANIES (${report.sections.company_conversions.length} Companies)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th style="text-align:center;">JD Received Date</th>
        </tr>
      `;
      report.sections.company_conversions.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.role || '—'}</td>
            <td style="color:#059669; font-weight:bold;">${r.ctc || '—'}</td>
            <td style="text-align:center;">${r.jd_received_date || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Month-End Section 2: Companies in Drive
    const inDriveRows = report.sections?.companies_in_drive || report.sections?.company_drives_scheduled;
    if (report.template_type === 'month_end' && inDriveRows && inDriveRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">COMPANIES IN DRIVE (${inDriveRows.length} Companies in Drive)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th style="text-align:center;">Role</th>
          <th style="text-align:center;">CTC</th>
          <th style="text-align:center;">Status</th>
        </tr>
      `;
      inDriveRows.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td style="text-align:center;">${r.role || '—'}</td>
            <td style="text-align:center;">${r.ctc || '—'}</td>
            <td style="text-align:center; color:#4338ca; font-weight:500;">${r.status || r.current_status_text || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Month-End Section 3: Companies on Hold by TPO
    const onHoldCollegeRows = report.sections?.on_hold_by_college;
    if (report.template_type === 'month_end' && onHoldCollegeRows && onHoldCollegeRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">COMPANIES ON HOLD BY TPO (${onHoldCollegeRows.length} Companies)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th style="text-align:center;">Role</th>
          <th style="text-align:center;">CTC</th>
          <th style="text-align:center;">Status / Remarks</th>
        </tr>
      `;
      onHoldCollegeRows.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td style="text-align:center;">${r.role || '—'}</td>
            <td style="text-align:center;">${r.ctc || '—'}</td>
            <td style="text-align:center; color:#d97706; font-weight:500;">${r.status || r.remarks || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Month-End Section 4: Companies on Hold by HR
    const onHoldHrRows = report.sections?.on_hold_by_hr;
    if (report.template_type === 'month_end' && onHoldHrRows && onHoldHrRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">COMPANIES ON HOLD BY HR (${onHoldHrRows.length} Companies)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th style="text-align:center;">Role</th>
          <th style="text-align:center;">CTC</th>
          <th style="text-align:center;">Status / Remarks</th>
        </tr>
      `;
      onHoldHrRows.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td style="text-align:center;">${r.role || '—'}</td>
            <td style="text-align:center;">${r.ctc || '—'}</td>
            <td style="text-align:center; color:#dc2626; font-weight:500;">${r.status || r.remarks || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Remarks (Only if selected)
    if (report.included_sections?.remarks && report.remarks) {
      html += `
        <tr><td colspan="7" class="sec-header">${report.template_type === 'active_leads' ? 'NOTES' : 'COORDINATOR REMARKS & OBSERVATIONS'}</td></tr>
        <tr><td colspan="7">${report.remarks}</td></tr>
        <tr><td colspan="7"></td></tr>
      `;
    }

    html += `
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const excelFileName = getReportExportBaseFileName(report);

    link.setAttribute('download', `${excelFileName}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print to PDF with custom document.title matching required export format (e.g. "aiht- August month report.pdf")
  const handlePrintPdf = () => {
    const originalTitle = document.title;
    const customTitle = getReportExportBaseFileName(report);
    document.title = customTitle;

    window.print();

    // Restore original document title after print dialog closes
    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    setTimeout(restoreTitle, 2000);
  };

  // Export as Ultra High-Definition PNG Image (100% WhatsApp & Print Shareable)
  const [exportingImage, setExportingImage] = useState(false);

  const handleExportImage = async () => {
    setExportingImage(true);

    const fileName = getReportExportBaseFileName(report);

    try {
      // ── Portrait Document Proportion Layout (Ultra-HD & Mobile-Friendly) ──
      // W=860 with CONTENT_W=800 matches vertical document proportions (like A4 portrait)
      // preventing the image from becoming an ultra-wide horizontally compressed banner on mobile.
      const W = 860;
      const PADDING = 30;
      const CONTENT_W = W - PADDING * 2; // 800px
      const SCALE = 2.5; // 2150px Ultra-HD output resolution for razor-sharp rendering on Retina mobile & 4K laptop screens

      // ── Helper: Safe Image Loader ──
      const loadImg = (url: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      // Preload Branding Logos
      const [infoziantImg, collegeImg] = await Promise.all([
        loadImg('/infoziant-head.png'),
        loadImg(collegeLogoUrl),
      ]);

      // ── Calculate Layout Coordinates & Height ──
      let totalH = 30; // Top padding

      // 1. Header height
      const headerH = 74;
      totalH += headerH + 16;

      // 2. Metadata pill
      const metaH = 34;
      totalH += metaH + 16;

      // 3. KPI Summary (for non-pending reports)
      const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
      const hasKpis = report.template_type !== 'pending_tasks' && report.included_sections?.kpi_summary && report.kpi_summary;
      let kpiCards: Array<{ label: string; val: any; color: string; bg?: string; border?: string; labelColor?: string; key?: string }> = [];
      if (hasKpis) {
        if (report.template_type === 'month_end') {
          kpiCards = [
            { label: 'Total Conversions', val: report.kpi_summary.total_conversion_count || 0, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', labelColor: '#065f46', key: 'total_conversion_count' },
            { label: 'Companies Scheduled', val: report.kpi_summary.total_companies_scheduled || 0, color: '#d97706', bg: '#fffbeb', border: '#fcd34d', labelColor: '#92400e', key: 'total_companies_scheduled' },
            { label: 'Offers Received', val: report.kpi_summary.total_offers_moved || 0, color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', labelColor: '#6b21a8', key: 'total_offers_moved' },
          ];
        } else if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
          kpiCards = [
            { label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', labelColor: '#1e40af', key: 'total_leads' },
            { label: 'Graduating Batch', val: report.kpi_summary.graduating_year || '2027', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', labelColor: '#065f46', key: 'graduating_year' },
          ];
        } else if (report.is_multi_college) {
          kpiCards = [
            { label: 'Colleges Included', val: report.kpi_summary?.total_colleges || report.colleges_data?.length || 0, color: '#1e3a8a', bg: '#eff6ff', border: '#bfdbfe', labelColor: '#1e40af', key: 'total_colleges' },
            { label: 'Drives Completed', val: report.kpi_summary?.drives_completed || 0, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', labelColor: '#065f46', key: 'drives_completed' },
            { label: 'In Progress', val: report.kpi_summary?.drives_in_progress || 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', labelColor: '#1e40af', key: 'drives_in_progress' },
            { label: 'Offers Placed', val: report.kpi_summary?.total_offers || 0, color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', labelColor: '#6b21a8', key: 'total_offers' },
          ];
        } else {
          kpiCards = [
            { label: 'Total Calls Made', val: report.kpi_summary.total_calls || 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', labelColor: '#1e40af', key: 'total_calls' },
            { label: 'Positives', val: report.kpi_summary.positive_responses || 0, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', labelColor: '#065f46', key: 'positive_responses' },
            { label: 'Not Hiring', val: report.kpi_summary.not_hiring || 0, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', labelColor: '#9f1239', key: 'not_hiring' },
            { label: 'JD Received', val: report.kpi_summary.jds_received || 0, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', labelColor: '#155e75', key: 'jds_received' },
          ];
        }
        kpiCards = kpiCards.filter((c: any) => activeKpis[c.key] !== false);
        if (kpiCards.length > 0) {
          totalH += 58 + 18;
        }
      }

      // ── Helper: Multi-Line Word Wrapping Engine (Strict Whole-Word Wrapping) ──
      // Wraps strictly word by word on whitespace boundaries without letter-by-letter truncation.
      // Preserves grammatical sentences and natural phrase flow.
      const measureTextLines = (
        measureCtx: CanvasRenderingContext2D,
        text: string,
        maxW: number,
        font: string
      ): string[] => {
        if (!text || text.trim() === '' || text.trim() === '—' || text.trim() === '-') {
          return ['—'];
        }
        measureCtx.font = font;
        const words = text.trim().split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testW = measureCtx.measureText(testLine).width;
          if (testW <= maxW) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              // Check if the single word itself fits in the column
              if (measureCtx.measureText(word).width <= maxW) {
                currentLine = word;
              } else {
                // Rare edge case: unbroken token exceeding entire column width (e.g. ultra-long URL)
                let partial = '';
                for (const ch of word) {
                  if (measureCtx.measureText(partial + ch + '-').width <= maxW) {
                    partial += ch;
                  } else {
                    if (partial) lines.push(partial + '-');
                    partial = ch;
                  }
                }
                currentLine = partial;
              }
            } else {
              // Word on fresh line exceeds maxW
              let partial = '';
              for (const ch of word) {
                if (measureCtx.measureText(partial + ch + '-').width <= maxW) {
                  partial += ch;
                } else {
                  if (partial) lines.push(partial + '-');
                  partial = ch;
                }
              }
              currentLine = partial;
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines.length > 0 ? lines : ['—'];
      };

      // ── Measure Sections & Dynamic Row Heights ──
      interface MeasuredCell {
        lines: string[];
        font: string;
        fillStyle: string;
      }

      interface MeasuredRow {
        cells: MeasuredCell[];
        height: number;
        bg?: string;
      }

      interface SectionDef {
        title: string;
        badge: string;
        accentBg: string;
        accentBorder: string;
        accentText: string;
        headers: string[];
        colWidths: number[];
        measuredRows: MeasuredRow[];
      }
      const sectionsToDraw: SectionDef[] = [];

      // Create a scratch canvas for text measurement
      const scratchCanvas = document.createElement('canvas');
      const scratchCtx = scratchCanvas.getContext('2d')!;

      // 1. Pending Tasks (CONTENT_W = 800px)
      if (report.included_sections?.pending_tasks && report.sections?.pending_tasks) {
        const pTasks = report.sections.pending_tasks;
        const hasDriveDate = pTasks.some(
          (r: any) => r.drive_date && String(r.drive_date).trim() !== '' && String(r.drive_date).trim() !== '—' && String(r.drive_date).trim() !== '-'
        );
        const headers = hasDriveDate
          ? ['#', 'Company Name', 'JD Received Date', 'DB Shared Date', 'Current Status', 'Remarks / Next Action', 'Drive Date']
          : ['#', 'Company Name', 'JD Received Date', 'DB Shared Date', 'Current Status', 'Remarks / Next Action'];
        // Precise column widths totaling exactly 800px with generous space for remarks and company names
        const colWidths = hasDriveDate
          ? [36, 188, 88, 88, 110, 195, 95]
          : [36, 214, 100, 100, 120, 230];

        const rawRows = pTasks.map((r: any) => {
          const base = [
            String(r.s_no || ''),
            String(r.company_name || '—'),
            String(r.jd_received_date || '—'),
            String(r.db_shared_date || '—'),
            String(r.current_status || '—'),
            String(r.action_to_be_taken || '—'),
          ];
          if (hasDriveDate) {
            base.push(String(r.drive_date || '—'));
          }
          return base;
        });

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[], rIdx: number) => {
          const taskObj = pTasks[rIdx];
          const isHl = Boolean(taskObj?.is_highlighted);
          const hlColor = taskObj?.highlight_color || '#fef08a';
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            // Enhanced, larger readable typography: 12.5px bold for company, 12px for status & actions
            const font = cIdx === 1
              ? 'bold 12.5px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (headers[cIdx] === 'Drive Date')
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? (isHl ? '#09090b' : '#0f172a')
              : cIdx === 0
              ? (isHl ? '#27272a' : '#64748b')
              : (headers[cIdx] === 'Drive Date')
              ? (isHl ? '#312e81' : '#4f46e5')
              : (isHl ? '#18181b' : '#334155');

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          // Comfortable row height with vertical breathing room
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height, bg: isHl ? hlColor : undefined };
        });

        sectionsToDraw.push({
          title: 'PLACEMENT PENDING TASKS',
          badge: `${pTasks.length} Tasks`,
          accentBg: '#eef2ff',
          accentBorder: '#c7d2fe',
          accentText: '#4338ca',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Multi-College Consolidated Weekly Placement Sections
      if (report.is_multi_college && Array.isArray(report.colleges_data)) {
        report.colleges_data.forEach((colData: any, cIdx: number) => {
          if (report.included_sections?.completed_companies !== false && colData.completed_companies && colData.completed_companies.length > 0) {
            const cRows = colData.completed_companies;
            const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status', 'Offers'];
            const colWidths = [36, 200, 174, 90, 180, 120];
            const rawRows = cRows.map((r: any) => [
              String(r.s_no || ''),
              String(r.company_name || '—'),
              String(r.job_role || '—'),
              String(r.ctc_lpa || '—'),
              String(r.current_status_text || '—'),
              String(r.selected_count || 0),
            ]);

            const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
              let maxLines = 1;
              const cells: MeasuredCell[] = row.map((cellText, cIdx2) => {
                const colW = colWidths[cIdx2];
                const maxCellW = colW - 14;
                const font = cIdx2 === 1 || cIdx2 === 5
                  ? 'bold 12px system-ui, -apple-system, sans-serif'
                  : cIdx2 === 0
                  ? '600 12px monospace'
                  : (cIdx2 === 3)
                  ? 'bold 12px system-ui, -apple-system, sans-serif'
                  : '500 12px system-ui, -apple-system, sans-serif';
                const fillStyle = cIdx2 === 1
                  ? '#0f172a'
                  : cIdx2 === 0
                  ? '#64748b'
                  : (cIdx2 === 3 || cIdx2 === 5)
                  ? '#059669'
                  : '#334155';

                const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
                if (lines.length > maxLines) maxLines = lines.length;
                return { lines, font, fillStyle };
              });
              const height = Math.max(38, maxLines * 17 + 16);
              return { cells, height };
            });

            sectionsToDraw.push({
              title: `${cIdx + 1}. ${colData.college_name.toUpperCase()} — COMPLETED`,
              badge: `${cRows.length} Drives`,
              accentBg: '#ecfdf5',
              accentBorder: '#a7f3d0',
              accentText: '#065f46',
              headers,
              colWidths,
              measuredRows,
            });
          }

          if (report.included_sections?.companies_in_drive !== false && colData.companies_in_drive && colData.companies_in_drive.length > 0) {
            const cidRows = colData.companies_in_drive;
            const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Drive Date'];
            const colWidths = [36, 224, 200, 110, 230];
            const rawRows = cidRows.map((r: any) => [
              String(r.s_no || ''),
              String(r.company_name || '—'),
              String(r.job_role || r.role || '—'),
              String(r.ctc_lpa || r.ctc || '—'),
              String(r.current_status_text || r.status || 'Drive in progress'),
            ]);

            const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
              let maxLines = 1;
              const cells: MeasuredCell[] = row.map((cellText, cIdx2) => {
                const colW = colWidths[cIdx2];
                const maxCellW = colW - 14;
                const font = cIdx2 === 1
                  ? 'bold 12px system-ui, -apple-system, sans-serif'
                  : cIdx2 === 0
                  ? '600 12px monospace'
                  : (cIdx2 === 3)
                  ? 'bold 12px system-ui, -apple-system, sans-serif'
                  : '500 12px system-ui, -apple-system, sans-serif';
                const fillStyle = cIdx2 === 1
                  ? '#0f172a'
                  : cIdx2 === 0
                  ? '#64748b'
                  : (cIdx2 === 3)
                  ? '#d97706'
                  : '#334155';

                const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
                if (lines.length > maxLines) maxLines = lines.length;
                return { lines, font, fillStyle };
              });
              const height = Math.max(38, maxLines * 17 + 16);
              return { cells, height };
            });

            sectionsToDraw.push({
              title: `${cIdx + 1}. ${colData.college_name.toUpperCase()} — IN DRIVE`,
              badge: `${cidRows.length} Drives`,
              accentBg: '#fffbeb',
              accentBorder: '#fde68a',
              accentText: '#92400e',
              headers,
              colWidths,
              measuredRows,
            });
          }

          if (report.included_sections?.in_progress !== false && colData.in_progress && colData.in_progress.length > 0) {
            const ipRows = colData.in_progress;
            const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
            const colWidths = [36, 224, 200, 110, 230];
            const rawRows = ipRows.map((r: any) => [
              String(r.s_no || ''),
              String(r.company_name || '—'),
              String(r.job_role || '—'),
              String(r.ctc_lpa || '—'),
              String(r.current_status_text || '—'),
            ]);

            const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
              let maxLines = 1;
              const cells: MeasuredCell[] = row.map((cellText, cIdx2) => {
                const colW = colWidths[cIdx2];
                const maxCellW = colW - 14;
                const font = cIdx2 === 1
                  ? 'bold 12px system-ui, -apple-system, sans-serif'
                  : cIdx2 === 0
                  ? '600 12px monospace'
                  : (cIdx2 === 3)
                  ? 'bold 12px system-ui, -apple-system, sans-serif'
                  : '500 12px system-ui, -apple-system, sans-serif';
                const fillStyle = cIdx2 === 1
                  ? '#0f172a'
                  : cIdx2 === 0
                  ? '#64748b'
                  : (cIdx2 === 3)
                  ? '#2563eb'
                  : '#334155';

                const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
                if (lines.length > maxLines) maxLines = lines.length;
                return { lines, font, fillStyle };
              });
              const height = Math.max(38, maxLines * 17 + 16);
              return { cells, height };
            });

            sectionsToDraw.push({
              title: `${cIdx + 1}. ${colData.college_name.toUpperCase()} — IN PROGRESS`,
              badge: `${ipRows.length} Drives`,
              accentBg: '#eff6ff',
              accentBorder: '#bfdbfe',
              accentText: '#1e40af',
              headers,
              colWidths,
              measuredRows,
            });
          }
        });
      }

      // 2. Completed Companies (CONTENT_W = 800px)
      if (report.included_sections?.completed_companies && report.sections?.completed_companies) {
        const cRows = report.sections.completed_companies;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status', 'Offers Received'];
        const colWidths = [36, 200, 174, 90, 180, 120];
        const rawRows = cRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || '—'),
          String(r.ctc_lpa || '—'),
          String(r.current_status_text || '—'),
          String(r.selected_count || 0),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1 || cIdx === 5
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3 || cIdx === 5)
              ? '#059669'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '1. COMPANIES COMPLETED',
          badge: `${cRows.length} Drives`,
          accentBg: '#ecfdf5',
          accentBorder: '#a7f3d0',
          accentText: '#065f46',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Section 2: Companies In Drive (CONTENT_W = 800px)
      if (report.included_sections?.companies_in_drive !== false && report.sections?.companies_in_drive) {
        const cidRows = report.sections.companies_in_drive;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Drive Date'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = cidRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || r.role || '—'),
          String(r.ctc_lpa || r.ctc || '—'),
          String(r.current_status_text || r.status || 'Drive in progress'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3)
              ? '#d97706'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '2. COMPANIES IN DRIVE',
          badge: `${cidRows.length} Drives`,
          accentBg: '#fffbeb',
          accentBorder: '#fde68a',
          accentText: '#92400e',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // 3. In Progress Drives (CONTENT_W = 800px)
      if (report.included_sections?.in_progress && report.sections?.in_progress) {
        const ipRows = report.sections.in_progress;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = ipRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || '—'),
          String(r.ctc_lpa || '—'),
          String(r.current_status_text || '—'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3)
              ? '#2563eb'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '3. COMPANIES IN PROGRESS',
          badge: `${ipRows.length} Drives`,
          accentBg: '#eff6ff',
          accentBorder: '#bfdbfe',
          accentText: '#1e40af',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // 4. Pipeline Leads (CONTENT_W = 800px)
      if (report.included_sections?.pipeline && report.sections?.pipeline) {
        const pipRows = report.sections.pipeline;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = pipRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || '—'),
          String(r.ctc_lpa || '—'),
          String(r.current_status_text || '—'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3)
              ? '#0891b2'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '4. COMPANIES IN PIPELINE',
          badge: `${pipRows.length} Leads`,
          accentBg: '#ecfeff',
          accentBorder: '#a5f3fc',
          accentText: '#155e75',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // 5. Top Companies (CONTENT_W = 800px)
      if (report.included_sections?.top_companies && report.sections?.top_companies) {
        const topRows = report.sections.top_companies;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = topRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || '—'),
          String(r.ctc_lpa || '—'),
          String(r.current_status_text || '—'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3)
              ? '#d97706'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '5. TOP COMPANIES',
          badge: `${topRows.length} Companies`,
          accentBg: '#fffbeb',
          accentBorder: '#fde68a',
          accentText: '#92400e',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // 6. Rejected Companies (CONTENT_W = 800px)
      const rejCanvasRows = report.sections?.rejected_companies || report.sections?.rejected_by_hr;
      if (rejCanvasRows && rejCanvasRows.length > 0) {
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = rejCanvasRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || '—'),
          String(r.ctc_lpa || '—'),
          String(r.current_status_text || '—'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3 || cIdx === 4)
              ? '#dc2626'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '6. REJECTED COMPANIES',
          badge: `${rejCanvasRows.length} Declined`,
          accentBg: '#fef2f2',
          accentBorder: '#fecaca',
          accentText: '#991b1b',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // 7. Companies On Hold / Rejected by College (CONTENT_W = 800px)
      if ((report.included_sections?.on_hold_by_college && report.sections?.on_hold_by_college) ||
          (report.included_sections?.rejected_by_college && report.sections?.rejected_by_college)) {
        const hRows = report.sections.on_hold_by_college || report.sections.rejected_by_college || [];
        if (hRows.length > 0) {
          const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
          const colWidths = [36, 224, 200, 110, 230];
          const rawRows = hRows.map((r: any) => [
            String(r.s_no || ''),
            String(r.company_name || '—'),
            String(r.job_role || '—'),
            String(r.ctc_lpa || '—'),
            String(r.current_status_text || '—'),
          ]);

          const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
            let maxLines = 1;
            const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
              const colW = colWidths[cIdx];
              const maxCellW = colW - 14;
              const font = cIdx === 1
                ? 'bold 12px system-ui, -apple-system, sans-serif'
                : cIdx === 0
                ? '600 12px monospace'
                : (cIdx === 3)
                ? 'bold 12px system-ui, -apple-system, sans-serif'
                : '500 12px system-ui, -apple-system, sans-serif';
              const fillStyle = cIdx === 1
                ? '#0f172a'
                : cIdx === 0
                ? '#64748b'
                : (cIdx === 3 || cIdx === 4)
                ? '#ea580c'
                : '#334155';

              const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
              if (lines.length > maxLines) maxLines = lines.length;
              return { lines, font, fillStyle };
            });
            const height = Math.max(38, maxLines * 17 + 16);
            return { cells, height };
          });

          sectionsToDraw.push({
            title: '7. COMPANIES ON HOLD BY COLLEGE',
            badge: `${hRows.length} Holds`,
            accentBg: '#fff7ed',
            accentBorder: '#ffedd5',
            accentText: '#9a3412',
            headers,
            colWidths,
            measuredRows,
          });
        }
      }

      // 8. Companies On Hold by HR (CONTENT_W = 800px)
      if (report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr) {
        const hrHoldRows = report.sections.on_hold_by_hr || [];
        if (hrHoldRows.length > 0) {
          const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
          const colWidths = [36, 224, 200, 110, 230];
          const rawRows = hrHoldRows.map((r: any) => [
            String(r.s_no || ''),
            String(r.company_name || '—'),
            String(r.job_role || '—'),
            String(r.ctc_lpa || '—'),
            String(r.current_status_text || '—'),
          ]);

          const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
            let maxLines = 1;
            const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
              const colW = colWidths[cIdx];
              const maxCellW = colW - 14;
              const font = cIdx === 1
                ? 'bold 12px system-ui, -apple-system, sans-serif'
                : cIdx === 0
                ? '600 12px monospace'
                : (cIdx === 3)
                ? 'bold 12px system-ui, -apple-system, sans-serif'
                : '500 12px system-ui, -apple-system, sans-serif';
              const fillStyle = cIdx === 1
                ? '#0f172a'
                : cIdx === 0
                ? '#64748b'
                : '#475569';

              const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
              if (lines.length > maxLines) maxLines = lines.length;
              return { lines, font, fillStyle };
            });
            const height = Math.max(38, maxLines * 17 + 16);
            return { cells, height };
          });

          sectionsToDraw.push({
            title: '8. COMPANIES ON HOLD BY HR',
            badge: `${hrHoldRows.length} Holds`,
            accentBg: '#f1f5f9',
            accentBorder: '#e2e8f0',
            accentText: '#334155',
            headers,
            colWidths,
            measuredRows,
          });
        }
      }

      // 8. Active Corporate Leads (CONTENT_W = 800px)
      if (report.included_sections?.active_leads && report.sections?.active_leads) {
        const alRows = report.sections.active_leads;
        const isCanvasJdOnly = Boolean(
          (report.kpi_summary?.selected_streams?.jd_received && !report.kpi_summary?.selected_streams?.positives && !report.kpi_summary?.selected_streams?.weekly_tracker) ||
          report.kpi_summary?.tier_focus?.includes('Hot Leads (JD Received)') ||
          report.report_title?.includes('Hot Leads') ||
          alRows.some((r: any) => r.colleges && r.colleges !== '—' && r.source === 'jd_received')
        );

        const activeCols = report.active_leads_columns || {};
        const showCanvasColleges = activeCols.colleges !== undefined ? activeCols.colleges : isCanvasJdOnly;
        const showCanvasRole = activeCols.role !== false;
        const showCanvasCtc = activeCols.ctc !== false;

        const headers: string[] = ['#', 'Company Name'];
        if (showCanvasColleges) headers.push('Colleges');
        if (showCanvasRole) headers.push('Role');
        if (showCanvasCtc) headers.push('CTC');

        // Total available width: 800px
        let colWidths: number[];
        if (showCanvasColleges && showCanvasRole && showCanvasCtc) {
          colWidths = [40, 230, 190, 210, 130];
        } else if (showCanvasColleges && showCanvasRole && !showCanvasCtc) {
          colWidths = [40, 280, 220, 260];
        } else if (showCanvasColleges && !showCanvasRole && showCanvasCtc) {
          colWidths = [40, 330, 270, 160];
        } else if (showCanvasColleges && !showCanvasRole && !showCanvasCtc) {
          colWidths = [40, 420, 340];
        } else if (!showCanvasColleges && showCanvasRole && showCanvasCtc) {
          colWidths = [40, 280, 320, 160];
        } else if (!showCanvasColleges && showCanvasRole && !showCanvasCtc) {
          colWidths = [40, 380, 380];
        } else if (!showCanvasColleges && !showCanvasRole && showCanvasCtc) {
          colWidths = [40, 520, 240];
        } else {
          colWidths = [40, 760];
        }

        const rawRows = alRows.map((r: any) => {
          const row: string[] = [String(r.s_no || ''), String(r.company_name || '—')];
          if (showCanvasColleges) row.push(String(r.colleges || '—'));
          if (showCanvasRole) row.push(String(r.role || '—'));
          if (showCanvasCtc) row.push(String(r.ctc || 'Competitive'));
          return row;
        });

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const isLastCtc = showCanvasCtc && cIdx === headers.length - 1;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : isLastCtc
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : isLastCtc
              ? '#059669'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        const batchLabel = report.kpi_summary?.graduating_year || (report.academic_year ? `${report.academic_year} Graduating Batch` : '2027 Graduating Batch');
        const canvasTitle = isCanvasJdOnly ? 'HOT LEADS (JD RECEIVED)' : `ACTIVE CORPORATE LEADS — ${batchLabel.toUpperCase()}`;
        sectionsToDraw.push({
          title: canvasTitle,
          badge: `${alRows.length} Leads`,
          accentBg: '#ecfdf5',
          accentBorder: '#a7f3d0',
          accentText: '#065f46',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // 9. Month-End Sections (CONTENT_W = 800px)
      if (report.template_type === 'month_end' && report.included_sections?.completed_companies && report.sections?.completed_companies) {
        const compRows = report.sections.completed_companies;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status', 'Offers'];
        const colWidths = [36, 204, 180, 100, 180, 100];
        const rawRows = compRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.role || r.job_role || '—'),
          String(r.ctc || r.ctc_lpa || '—'),
          String(r.status || r.current_status_text || 'Drive Completed'),
          String(r.offers_received ?? r.selected_count ?? '0'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3 || cIdx === 5)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3 || cIdx === 4 || cIdx === 5)
              ? '#059669'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: 'COMPANIES COMPLETED',
          badge: `${compRows.length} Companies`,
          accentBg: '#ecfdf5',
          accentBorder: '#a7f3d0',
          accentText: '#065f46',
          headers,
          colWidths,
          measuredRows,
        });
      }

      if (report.template_type === 'month_end' && report.included_sections?.company_conversions && report.sections?.company_conversions) {
        const convRows = report.sections.company_conversions;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'JD Received Date'];
        const colWidths = [36, 234, 210, 110, 210];
        const rawRows = convRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.role || '—'),
          String(r.ctc || '—'),
          String(r.jd_received_date || '—'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 3)
              ? '#059669'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: 'JD RECEIVED COMPANIES',
          badge: `${convRows.length} Companies`,
          accentBg: '#ecfdf5',
          accentBorder: '#a7f3d0',
          accentText: '#065f46',
          headers,
          colWidths,
          measuredRows,
        });
      }

      const inDriveCanvasRows = report.sections?.companies_in_drive || report.sections?.company_drives_scheduled;
      if (report.template_type === 'month_end' && (report.included_sections?.companies_in_drive || report.included_sections?.company_drives_scheduled) && inDriveCanvasRows) {
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = inDriveCanvasRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.role || '—'),
          String(r.ctc || '—'),
          String(r.status || r.current_status_text || '—'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 14;
            const font = cIdx === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '600 12px monospace'
              : (cIdx === 4)
              ? '500 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (cIdx === 4)
              ? '#4338ca'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: 'COMPANIES IN DRIVE',
          badge: `${inDriveCanvasRows.length} Companies in Drive`,
          accentBg: '#eef2ff',
          accentBorder: '#c7d2fe',
          accentText: '#3730a3',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Calculate total sections height using exact measured rows
      sectionsToDraw.forEach((sec) => {
        totalH += 32; // Section title bar
        totalH += 38; // Table header (38px for clean two-line header wrapping)
        if (sec.measuredRows.length === 0) {
          totalH += 36; // Empty row
        } else {
          sec.measuredRows.forEach((r) => {
            totalH += r.height;
          });
        }
        totalH += 18; // Margin bottom between sections
      });

      // Observations Box Multi-Line Calculation (Only if Coordinator Remarks & Observations is selected)
      const hasObservations = Boolean(
        report.included_sections?.remarks !== false &&
        report.included_sections?.remarks &&
        (report.remarks || report.observations)?.trim()
      );
      const obsText = hasObservations ? (report.remarks || report.observations || '').trim() : '';
      let obsLines: string[] = [];
      let obsBoxH = 75;
      if (hasObservations) {
        obsLines = measureTextLines(
          scratchCtx,
          obsText,
          CONTENT_W - 32,
          '500 12px system-ui, -apple-system, sans-serif'
        );
        obsBoxH = Math.max(68, obsLines.length * 19 + 38);
        totalH += obsBoxH + 18;
      }

      // Footer (Only if Footer & Sign-off Options enabled)
      const hasFooter = report.include_prepared_by !== false;
      if (hasFooter) {
        totalH += 50;
      } else {
        totalH += 20; // Clean bottom padding when footer is omitted
      }

      // ── Create High-Resolution Canvas ──
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(W * SCALE);
      canvas.height = Math.round(totalH * SCALE);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('2D Context failed');

      ctx.scale(SCALE, SCALE);

      // ── Helper: Draw Rounded Rectangle ──
      const drawRoundRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill?: string,
        stroke?: string,
        lineWidth = 1
      ) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // ── 1. Background (Pure Clean White Canvas) ──
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, totalH);

      let currentY = PADDING;

      // ── 2. Header: Logos & Centered Title ──
      // Infoziant Logo (Left) — Clean logo without any surrounding border box
      const logoBoxW = 154;
      const logoBoxH = 66;
      if (infoziantImg) {
        const aspect = infoziantImg.width / infoziantImg.height;
        const imgH = 56;
        const imgW = Math.min(150, imgH * aspect);
        ctx.drawImage(infoziantImg, PADDING, currentY + (logoBoxH - imgH) / 2, imgW, imgH);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Infoziant', PADDING, currentY + 39);
      }

      // Title & Subtitle (Center)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18.5px system-ui, -apple-system, sans-serif';
      let rawTitle =
        report.report_title ||
        (report.template_type === 'month_end'
          ? `${report.report_period?.split(' ')[0] || 'August'} Month Placement Operations Report`
          : report.template_type === 'pending_tasks'
          ? 'Pending Task Placement Report'
          : report.template_type === 'active_leads'
          ? 'Active Leads Pipeline Report'
          : 'Weekly Placement Report');
      
      // Ensure Pending Task Placement Report always has each word capitalized
      if (/pending\s*task/i.test(rawTitle)) {
        rawTitle = 'Pending Task Placement Report';
      }
      ctx.fillText(rawTitle, W / 2, currentY + 32);

      if (collegeName && collegeName !== 'Consolidated Partner Institutions' && report.template_type !== 'active_leads') {
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
        ctx.fillText(collegeName, W / 2, currentY + 55);
      }

      // College Logo / Code Badge (Right) — Clean logo without any surrounding border box
      if (!report.is_multi_college && !isConsolidated) {
        if (collegeImg) {
          const aspect = collegeImg.width / collegeImg.height;
          const imgH = 56;
          const imgW = Math.min(150, imgH * aspect);
          ctx.drawImage(collegeImg, W - PADDING - imgW, currentY + (logoBoxH - imgH) / 2, imgW, imgH);
        } else {
          ctx.fillStyle = '#0284c7';
          ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(collegeCode, W - PADDING, currentY + 39);
        }
      }

      // Header Bottom Line
      currentY += headerH;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(PADDING, currentY);
      ctx.lineTo(W - PADDING, currentY);
      ctx.stroke();

      currentY += 14;

      // ── 3. Metadata Strip ──
      drawRoundRect(PADDING, currentY, CONTENT_W, metaH, 6, '#f8fafc', '#e2e8f0', 1);
      ctx.fillStyle = '#334155';
      ctx.font = '500 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';

      let metaText = '';
      const cleanPeriod = getCleanPeriod(report.report_period);
      if (report.template_type === 'weekly_placement' && cleanPeriod) {
        metaText = `Period: ${cleanPeriod}    •    Generated Date: ${report.generated_date || new Date().toLocaleDateString('en-IN')}`;
      } else {
        metaText = `Generated Date: ${report.generated_date || new Date().toLocaleDateString('en-IN')}`;
      }
      ctx.fillText(metaText, W / 2, currentY + 21);

      currentY += metaH + 16;

      // ── 4. KPI Cards Strip ──
      if (kpiCards.length > 0) {
        const kpiCardW = (CONTENT_W - (kpiCards.length - 1) * 8) / kpiCards.length;
        kpiCards.forEach((kpi, idx) => {
          const cardX = PADDING + idx * (kpiCardW + 8);
          drawRoundRect(cardX, currentY, kpiCardW, 58, 6, kpi.bg || '#f8fafc', kpi.border || '#e2e8f0', 1);

          ctx.textAlign = 'center';
          ctx.fillStyle = kpi.labelColor || '#64748b';
          ctx.font = 'bold 9.5px system-ui, -apple-system, sans-serif';
          ctx.fillText(kpi.label.toUpperCase(), cardX + kpiCardW / 2, currentY + 20);

          ctx.fillStyle = kpi.color;
          ctx.font = 'bold 17px system-ui, -apple-system, monospace';
          ctx.fillText(String(kpi.val), cardX + kpiCardW / 2, currentY + 46);
        });
        currentY += 58 + 18;
      }

      // ── 5. Render Section Tables (With Excel-Style Full Borders & Two-Line Headers) ──
      sectionsToDraw.forEach((sec) => {
        // Section Title Pill
        drawRoundRect(PADDING, currentY, CONTENT_W, 30, 6, sec.accentBg, sec.accentBorder, 1);
        ctx.textAlign = 'left';
        ctx.fillStyle = sec.accentText;
        ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
        ctx.fillText(sec.title, PADDING + 12, currentY + 20);

        // Badge on right
        if (report.template_type !== 'month_end' && sec.badge) {
          ctx.textAlign = 'right';
          ctx.fillStyle = sec.accentText;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(sec.badge, W - PADDING - 12, currentY + 20);
        }

        currentY += 32;
        const tableTopY = currentY;
        const tableHeaderH = 38;

        // Table Header Background Fill
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(PADDING, currentY, CONTENT_W, tableHeaderH);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';

        let curColX = PADDING;
        sec.headers.forEach((hName, hIdx) => {
          const colW = sec.colWidths[hIdx];
          const maxCellW = colW - 8;
          let hLines: string[];
          const upper = hName.trim().toUpperCase();

          // Explicit two-line wrapping for date & compound headers to strictly prevent crossing column boundaries
          if (upper === 'JD RECEIVED DATE') {
            hLines = ['JD RECEIVED', 'DATE'];
          } else if (upper === 'DB SHARED DATE') {
            hLines = ['DB SHARED', 'DATE'];
          } else if (upper === 'REMARKS / NEXT ACTION' && maxCellW < 180) {
            hLines = ['REMARKS /', 'NEXT ACTION'];
          } else if (upper === 'CURRENT STATUS' && maxCellW < 95) {
            hLines = ['CURRENT', 'STATUS'];
          } else if (upper === 'OFFERS RECEIVED' && maxCellW < 110) {
            hLines = ['OFFERS', 'RECEIVED'];
          } else if (upper === 'STATUS / REASON' && maxCellW < 130) {
            hLines = ['STATUS /', 'REASON'];
          } else {
            hLines = measureTextLines(scratchCtx, upper, maxCellW, 'bold 10px system-ui, -apple-system, sans-serif');
          }

          const hLineHeight = 13;
          const totalTextH = hLines.length * hLineHeight;
          const startY = currentY + (tableHeaderH - totalTextH) / 2 + hLineHeight * 0.76;

          hLines.forEach((line, lIdx) => {
            ctx.fillText(line, curColX + colW / 2, startY + lIdx * hLineHeight);
          });

          curColX += colW;
        });

        currentY += tableHeaderH;

        // Table Rows (With Vertically Centered Multi-Line Text and Row Highlight Support)
        if (sec.measuredRows.length === 0) {
          const emptyH = 34;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(PADDING, currentY, CONTENT_W, emptyH);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'italic 11.5px system-ui, -apple-system, sans-serif';
          ctx.fillText('No records found for this section.', W / 2, currentY + 21);
          currentY += emptyH;
        } else {
          sec.measuredRows.forEach((mRow, rIdx) => {
            const rowBg = mRow.bg || (rIdx % 2 === 0 ? '#ffffff' : '#f8fafc');
            const rowH = mRow.height;
            ctx.fillStyle = rowBg;
            ctx.fillRect(PADDING, currentY, CONTENT_W, rowH);

            let rowColX = PADDING;
            mRow.cells.forEach((cell, cIdx) => {
              const colW = sec.colWidths[cIdx];
              ctx.textAlign = 'center';
              ctx.fillStyle = cell.fillStyle;
              ctx.font = cell.font;

              const lineHeight = 17;
              const totalTextH = cell.lines.length * lineHeight;
              const startY = currentY + (rowH - totalTextH) / 2 + lineHeight * 0.76;

              cell.lines.forEach((line, lineIdx) => {
                ctx.fillText(line, rowColX + colW / 2, startY + lineIdx * lineHeight);
              });

              rowColX += colW;
            });

            currentY += rowH;
          });
        }

        const tableBottomY = currentY;

        // ── Full Excel-Style Grid Borders (Minimal Charcoal-Black Grid) ──
        // Minimal, crisp thin border (#374151) like Excel "All Borders"
        // Ensures complete framing of every single row and column without being excessively dark or thick
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;

        // 1. Outer perimeter border around the entire table
        ctx.strokeRect(PADDING, tableTopY, CONTENT_W, tableBottomY - tableTopY);

        // 2. Horizontal divider line below table header
        ctx.beginPath();
        ctx.moveTo(PADDING, tableTopY + tableHeaderH);
        ctx.lineTo(PADDING + CONTENT_W, tableTopY + tableHeaderH);
        ctx.stroke();

        // 3. Horizontal divider lines between each data row
        let rowYTracker = tableTopY + tableHeaderH;
        if (sec.measuredRows.length > 0) {
          sec.measuredRows.forEach((mRow, rIdx) => {
            if (rIdx < sec.measuredRows.length - 1) {
              rowYTracker += mRow.height;
              ctx.beginPath();
              ctx.moveTo(PADDING, rowYTracker);
              ctx.lineTo(PADDING + CONTENT_W, rowYTracker);
              ctx.stroke();
            }
          });
        }

        // 4. Vertical column divider lines (spanning from top of header to bottom of table)
        let colXTracker = PADDING;
        sec.colWidths.forEach((colW, cIdx) => {
          if (cIdx < sec.colWidths.length - 1) {
            colXTracker += colW;
            ctx.beginPath();
            ctx.moveTo(colXTracker, tableTopY);
            ctx.lineTo(colXTracker, tableBottomY);
            ctx.stroke();
          }
        });

        currentY += 18;
      });

      // ── 6. Observations Box (Multi-Line Wrapped, ONLY if selected) ──
      if (hasObservations) {
        drawRoundRect(PADDING, currentY, CONTENT_W, obsBoxH, 6, '#f8fafc', '#e2e8f0', 1);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
        const obsHeader = report.template_type === 'active_leads' ? 'Notes' : 'Key Placement Observations';
        ctx.fillText(obsHeader, PADDING + 16, currentY + 24);

        ctx.fillStyle = '#475569';
        ctx.font = '500 12px system-ui, -apple-system, sans-serif';
        obsLines.forEach((line, lIdx) => {
          ctx.fillText(line, PADDING + 16, currentY + 46 + lIdx * 19);
        });

        currentY += obsBoxH + 18;
      }

      // ── 7. Footer (ONLY if Footer & Sign-off Options enabled) ──
      if (hasFooter) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING, currentY);
        ctx.lineTo(W - PADDING, currentY);
        ctx.stroke();

        currentY += 22;
        ctx.fillStyle = '#64748b';
        ctx.font = '500 11.5px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('© 2026 Infoziant. All rights reserved.', PADDING, currentY);

        if (Boolean(report.generated_by || report.branding?.prepared_by)) {
          ctx.textAlign = 'right';
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
          ctx.fillText(`Prepared by: ${report.generated_by || report.branding?.prepared_by}`, W - PADDING, currentY);
        }
      }

      // ── 8. Export High-Res PNG (2150px Ultra-HD for Mobile & WhatsApp) ──
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }
          setExportingImage(false);
        },
        'image/png'
      );
    } catch (err) {
      console.error('High-res PNG export failed:', err);
      setExportingImage(false);
    }
  };

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
         report.kpi_summary?.tier_focus?.includes('Hot Leads (JD Received)') ||
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4 print:p-0 print:m-0 print:max-w-full text-fg">

      {/* ── Document Canvas (Editable In-App View & Printable Page) ────────────────────────────────── */}
      <div
        id="printable-report-canvas"
        className="printable-report-canvas bg-surface border border-border rounded-2xl shadow-xs p-8 sm:p-12 text-fg min-h-[1123px] flex flex-col justify-between print:w-full print:p-0 print:border-none print:shadow-none print:bg-white print:text-black print:min-h-screen"
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
            <input
              type="text"
              value={
                report.report_title ||
                (report.template_type === 'month_end'
                  ? `${report.report_period?.split(' ')[0] || 'August'} Month Placement Operations Report`
                  : report.template_type === 'pending_tasks'
                  ? 'Pending Task Placement Report'
                  : report.template_type === 'active_leads'
                  ? 'Active Leads Pipeline Report'
                  : 'Weekly Placement Report')
              }
              onChange={(e) => setReport({ ...report, report_title: e.target.value })}
              className="text-base sm:text-lg font-bold text-fg print:text-slate-900 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-2 rounded transition-colors outline-none tracking-tight font-sans text-center w-full max-w-lg"
            />
            {collegeName && collegeName !== 'Consolidated Partner Institutions' && report.template_type !== 'active_leads' && (
              <p className="text-xs font-semibold text-fg-muted print:text-slate-700 mt-0.5 px-1 text-center">
                {collegeName}
              </p>
            )}
          </div>

          {/* Right: Target College Logo (Hidden for Multi-College Weekly Reports and Consolidated reports) */}
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
              <div className="h-10 px-3.5 bg-surface-sunken border border-border rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-fg shadow-2xs">
                <Building2 size={15} className="text-primary shrink-0" />
                <span>{collegeCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Report Metadata Sub-bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-fg-muted bg-surface-sunken border border-border rounded-xl px-5 py-2.5 font-medium print:bg-slate-50 print:text-slate-600 print:border-slate-200 mb-4">
          {report.template_type === 'weekly_placement' && getCleanPeriod(report.report_period) ? (
            <>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-primary shrink-0" />
                <span>Period: <strong className="text-fg print:text-slate-900 font-semibold">{getCleanPeriod(report.report_period)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-fg-subtle print:text-slate-400 shrink-0" />
                <span>Generated Date: <strong className="text-fg print:text-slate-900 font-semibold">{report.generated_date}</strong></span>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-end">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-fg-subtle print:text-slate-500 shrink-0" />
                <span>Generated Date: <strong className="text-fg print:text-slate-900 font-semibold">{report.generated_date}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Main Document Content */}
        <div className="flex-1 space-y-6 flex flex-col pt-1">

        {/* 3. Live KPI Summary Strip (Excluded for Pending Tasks) */}
        {report.template_type !== 'pending_tasks' && report.included_sections?.kpi_summary && report.kpi_summary && (() => {
          const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
          if (report.template_type === 'month_end') {
            const meCards = [
              {
                key: 'total_conversion_count',
                label: 'Total Conversions',
                val: report.kpi_summary.total_conversion_count || 0,
                bgClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/80',
                labelText: 'text-emerald-800 dark:text-emerald-300 font-bold',
                valText: 'text-emerald-700 dark:text-emerald-400 font-extrabold text-xl',
              },
              {
                key: 'total_companies_scheduled',
                label: 'Companies Scheduled',
                val: report.kpi_summary.total_companies_scheduled || 0,
                bgClass: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80',
                labelText: 'text-amber-800 dark:text-amber-300 font-bold',
                valText: 'text-amber-700 dark:text-amber-400 font-extrabold text-xl',
              },
              {
                key: 'total_offers_moved',
                label: 'Offers Received',
                val: report.kpi_summary.total_offers_moved || 0,
                bgClass: 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700/80',
                labelText: 'text-purple-800 dark:text-purple-300 font-bold',
                valText: 'text-purple-700 dark:text-purple-400 font-extrabold text-xl',
              },
            ].filter((c) => activeKpis[c.key] !== false);

            if (meCards.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {meCards.map((card) => (
                  <div key={card.key} className={`flex-1 min-w-[120px] border p-3 rounded-xl text-center shadow-xs ${card.bgClass}`}>
                    <span className={`text-micro uppercase block tracking-wider ${card.labelText}`}>{card.label}</span>
                    <span className={`font-mono tabular-nums ${card.valText}`}>{card.val}</span>
                  </div>
                ))}
              </div>
            );
          } else if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
            const alCards = [
              {
                key: 'total_leads',
                label: 'Total Active Leads',
                val: report.kpi_summary.total_leads || 0,
                bgClass: 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700/80',
                labelText: 'text-blue-800 dark:text-blue-300 font-bold',
                valText: 'text-blue-700 dark:text-blue-400 font-extrabold text-xl',
              },
              {
                key: 'hot_leads_count',
                label: 'Hot (JD Received)',
                val: report.kpi_summary.hot_leads_count || 0,
                bgClass: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80',
                labelText: 'text-amber-800 dark:text-amber-300 font-bold',
                valText: 'text-amber-700 dark:text-amber-400 font-extrabold text-xl',
              },
              {
                key: 'warm_leads_count',
                label: 'Warm (Positives)',
                val: report.kpi_summary.warm_leads_count || 0,
                bgClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/80',
                labelText: 'text-emerald-800 dark:text-emerald-300 font-bold',
                valText: 'text-emerald-700 dark:text-emerald-400 font-extrabold text-xl',
              },
              {
                key: 'pipeline_leads_count',
                label: 'Weekly Pipeline',
                val: report.kpi_summary.pipeline_leads_count || 0,
                bgClass: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700/80',
                labelText: 'text-indigo-800 dark:text-indigo-300 font-bold',
                valText: 'text-indigo-700 dark:text-indigo-400 font-extrabold text-xl',
              },
              {
                key: 'graduating_year',
                label: 'Graduating Batch',
                val: report.kpi_summary.graduating_year || 'All Batches',
                bgClass: 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700',
                labelText: 'text-slate-800 dark:text-slate-300 font-bold',
                valText: 'text-slate-700 dark:text-slate-400 font-extrabold text-xl',
              },
            ].filter((c) => activeKpis[c.key] !== false && (c.val !== 0 || c.key === 'total_leads' || c.key === 'graduating_year'));

            if (alCards.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {alCards.map((card) => (
                  <div key={card.key} className={`flex-1 min-w-[120px] border p-3 rounded-xl text-center shadow-xs ${card.bgClass}`}>
                    <span className={`text-micro uppercase block tracking-wider ${card.labelText}`}>{card.label}</span>
                    <span className={`font-mono tabular-nums ${card.valText}`}>{card.val}</span>
                  </div>
                ))}
              </div>
            );
          } else if (report.is_multi_college) {
            const multiCards = [
              { key: 'total_colleges', label: 'Colleges Included', val: report.kpi_summary.total_colleges || report.colleges_data?.length || 0, bgClass: 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800', labelText: 'text-indigo-800 dark:text-indigo-300 font-bold', valText: 'text-indigo-700 dark:text-indigo-400 font-bold' },
              { key: 'drives_completed', label: 'Companies Completed', val: report.kpi_summary.drives_completed || 0, bgClass: 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', labelText: 'text-emerald-800 dark:text-emerald-300 font-bold', valText: 'text-emerald-700 dark:text-emerald-400 font-bold' },
              { key: 'drives_in_progress', label: 'Companies In Progress', val: report.kpi_summary.drives_in_progress || 0, bgClass: 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800', labelText: 'text-blue-800 dark:text-blue-300 font-bold', valText: 'text-blue-700 dark:text-blue-400 font-bold' },
              { key: 'total_offers', label: 'Total Offers Placed', val: report.kpi_summary.total_offers || 0, bgClass: 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800', labelText: 'text-purple-800 dark:text-purple-300 font-bold', valText: 'text-purple-700 dark:text-purple-400 font-bold' },
            ];
            return (
              <div className="flex flex-wrap gap-2 pt-1">
                {multiCards.map((card) => (
                  <div key={card.key} className={`flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs ${card.bgClass}`}>
                    <span className={`text-micro uppercase block truncate ${card.labelText}`}>{card.label}</span>
                    <span className={`text-sm font-mono tabular-nums ${card.valText}`}>{card.val}</span>
                  </div>
                ))}
              </div>
            );
          } else {
            const wpCards = [
              { key: 'total_calls', label: 'Total Calls Made', val: report.kpi_summary.total_calls || 0, bgClass: 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800', labelText: 'text-blue-800 dark:text-blue-300 font-bold', valText: 'text-blue-700 dark:text-blue-400 font-bold' },
              { key: 'positive_responses', label: 'Positives', val: report.kpi_summary.positive_responses || 0, bgClass: 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', labelText: 'text-emerald-800 dark:text-emerald-300 font-bold', valText: 'text-emerald-700 dark:text-emerald-400 font-bold' },
              { key: 'not_hiring', label: 'Not Hiring', val: report.kpi_summary.not_hiring || 0, bgClass: 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', labelText: 'text-rose-800 dark:text-rose-300 font-bold', valText: 'text-rose-700 dark:text-rose-400 font-bold' },
              { key: 'jds_received', label: 'JD Received', val: report.kpi_summary.jds_received || 0, bgClass: 'bg-cyan-50/80 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800', labelText: 'text-cyan-800 dark:text-cyan-300 font-bold', valText: 'text-cyan-700 dark:text-cyan-400 font-bold' },
            ].filter((c) => activeKpis[c.key] !== false);

            if (wpCards.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 pt-1">
                {wpCards.map((card) => (
                  <div key={card.key} className={`flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs ${card.bgClass}`}>
                    <span className={`text-micro uppercase block truncate ${card.labelText}`}>{card.label}</span>
                    <span className={`text-sm font-mono tabular-nums ${card.valText}`}>{card.val}</span>
                  </div>
                ))}
              </div>
            );
          }
        })()}

        {/* ── Multi-College Consolidated Weekly Report ── */}
        {report.is_multi_college && Array.isArray(report.colleges_data) && (
          <div className="space-y-6 pt-2">
            {report.colleges_data.map((colData: any, cIdx: number) => {
              const hasCompleted = colData.completed_companies && colData.completed_companies.length > 0;
              const hasProgress = colData.in_progress && colData.in_progress.length > 0;

              return (
                <div
                  key={colData.college_id || cIdx}
                  className="space-y-3 print:break-inside-avoid break-inside-avoid border border-border rounded-2xl p-4 bg-surface-sunken/30 shadow-xs"
                >
                  {/* Institution Banner */}
                  <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                        {cIdx + 1}
                      </span>
                      <span className="font-bold text-xs sm:text-sm">
                        {colData.college_name} {colData.college_code ? `(${colData.college_code})` : ''}
                      </span>
                      {colData.location && (
                        <span className="text-xs text-blue-200 font-normal">
                          • {colData.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
                        {colData.total_completed || 0} Completed
                      </span>
                      {(colData.total_in_drive || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-100 border border-amber-400/30">
                          {colData.total_in_drive} In Drive
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-100 border border-blue-400/30">
                        {colData.total_in_progress || 0} In Progress
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-100 border border-purple-400/30 font-bold">
                        {colData.total_offers || 0} Offers
                      </span>
                    </div>
                  </div>

                  {/* 1. Companies Completed Table */}
                  {report.included_sections?.completed_companies !== false && (
                    <div className="space-y-1.5">
                      {!hasCompleted ? (
                        <p className="text-xs text-fg-subtle italic px-2 py-1">
                          No completed drives for this institution during this period.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                          <table className="w-full text-xs text-center border-collapse table-fixed">
                            <colgroup>
                              <col style={{ width: '38px' }} />
                              <col style={{ width: '25%' }} />
                              <col style={{ width: '23%' }} />
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '28%' }} />
                              <col style={{ width: '12%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-b border-border font-bold text-xs">
                                <th colSpan={6} className="py-1.5 px-3 text-left">
                                  <span className="flex items-center gap-1.5">
                                    <Trophy size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> 1. COMPANIES COMPLETED ({colData.completed_companies.length})
                                  </span>
                                </th>
                              </tr>
                              <tr className="bg-surface-sunken text-fg-muted font-semibold text-micro uppercase border-b border-border">
                                <th className="py-1.5 px-1 text-center border-r border-border/80 font-mono">#</th>
                                <th className="py-1.5 px-2 text-center border-r border-border/80">Company Name</th>
                                <th className="py-1.5 px-2 text-center border-r border-border/80">Role</th>
                                <th className="py-1.5 px-1 text-center border-r border-border/80">CTC</th>
                                <th className="py-1.5 px-2 text-center border-r border-border/80">Status</th>
                                <th className="py-1.5 px-1 text-center">Offers</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {colData.completed_companies.map((r: any, rIdx: number) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-sunken/40'}>
                                  <td className="py-1.5 px-1 text-fg-subtle font-mono border-r border-border/60">{r.s_no || rIdx + 1}</td>
                                  <td className="py-1.5 px-2 font-bold text-fg border-r border-border/60 text-left leading-tight break-words">{r.company_name}</td>
                                  <td className="py-1.5 px-2 text-fg-muted border-r border-border/60 text-left leading-tight break-words">{r.job_role}</td>
                                  <td className="py-1.5 px-1 text-emerald-600 dark:text-emerald-400 font-semibold border-r border-border/60 whitespace-nowrap">{r.ctc_lpa}</td>
                                  <td className="py-1.5 px-2 text-fg-muted border-r border-border/60 text-left leading-tight break-words">{r.current_status_text}</td>
                                  <td className="py-1.5 px-1 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{r.selected_count || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Companies in Drive Table */}
                  {report.included_sections?.companies_in_drive !== false && colData.companies_in_drive && colData.companies_in_drive.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                        <table className="w-full text-xs text-center border-collapse table-fixed">
                          <colgroup>
                            <col style={{ width: '38px' }} />
                            <col style={{ width: '27%' }} />
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '35%' }} />
                          </colgroup>
                          <thead>
                            <tr className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-b border-border font-bold text-xs">
                              <th colSpan={5} className="py-1.5 px-3 text-left">
                                <span className="flex items-center gap-1.5">
                                  <Flame size={13} className="text-amber-600 dark:text-amber-400 shrink-0" /> 2. COMPANIES IN DRIVE ({colData.companies_in_drive.length})
                                </span>
                              </th>
                            </tr>
                            <tr className="bg-surface-sunken text-fg-muted font-semibold text-micro uppercase border-b border-border">
                              <th className="py-1.5 px-1 text-center border-r border-border/80 font-mono">#</th>
                              <th className="py-1.5 px-2 text-center border-r border-border/80">Company Name</th>
                              <th className="py-1.5 px-2 text-center border-r border-border/80">Role</th>
                              <th className="py-1.5 px-1 text-center border-r border-border/80">CTC</th>
                              <th className="py-1.5 px-2 text-center">Status / Drive Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {colData.companies_in_drive.map((r: any, rIdx: number) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-sunken/40'}>
                                <td className="py-1.5 px-1 text-fg-subtle font-mono border-r border-border/60">{r.s_no || rIdx + 1}</td>
                                <td className="py-1.5 px-2 font-bold text-fg border-r border-border/60 text-left leading-tight break-words">{r.company_name}</td>
                                <td className="py-1.5 px-2 text-fg-muted border-r border-border/60 text-left leading-tight break-words">{r.job_role || r.role || '—'}</td>
                                <td className="py-1.5 px-1 text-amber-600 dark:text-amber-400 font-semibold border-r border-border/60 whitespace-nowrap">{r.ctc_lpa || r.ctc || 'Competitive'}</td>
                                <td className="py-1.5 px-2 text-fg-muted text-left leading-tight break-words">{r.current_status_text || r.status || 'Drive in progress'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. Companies In Progress Table */}
                  {report.included_sections?.in_progress !== false && (
                    <div className="space-y-1.5">
                      {!hasProgress ? (
                        <p className="text-xs text-fg-subtle italic px-2 py-1">
                          No ongoing drives currently in progress for this institution.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                          <table className="w-full text-xs text-center border-collapse table-fixed">
                            <colgroup>
                              <col style={{ width: '38px' }} />
                              <col style={{ width: '27%' }} />
                              <col style={{ width: '25%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '35%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-b border-border font-bold text-xs">
                                <th colSpan={5} className="py-1.5 px-3 text-left">
                                  <span className="flex items-center gap-1.5">
                                    <Rocket size={13} className="text-blue-600 dark:text-blue-400 shrink-0" /> 3. COMPANIES IN PROGRESS ({colData.in_progress.length})
                                  </span>
                                </th>
                              </tr>
                              <tr className="bg-surface-sunken text-fg-muted font-semibold text-micro uppercase border-b border-border">
                                <th className="py-1.5 px-1 text-center border-r border-border/80 font-mono">#</th>
                                <th className="py-1.5 px-2 text-center border-r border-border/80">Company Name</th>
                                <th className="py-1.5 px-2 text-center border-r border-border/80">Role</th>
                                <th className="py-1.5 px-1 text-center border-r border-border/80">CTC</th>
                                <th className="py-1.5 px-2 text-center">Status / Follow-up</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {colData.in_progress.map((r: any, rIdx: number) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-sunken/40'}>
                                  <td className="py-1.5 px-1 text-fg-subtle font-mono border-r border-border/60">{r.s_no || rIdx + 1}</td>
                                  <td className="py-1.5 px-2 font-bold text-fg border-r border-border/60 text-left leading-tight break-words">{r.company_name}</td>
                                  <td className="py-1.5 px-2 text-fg-muted border-r border-border/60 text-left leading-tight break-words">{r.job_role}</td>
                                  <td className="py-1.5 px-1 text-primary font-semibold border-r border-border/60 whitespace-nowrap">{r.ctc_lpa}</td>
                                  <td className="py-1.5 px-2 text-fg-muted text-left leading-tight break-words">{r.current_status_text}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Weekly Placement Report Standard Sections 1-8 ── */}
        {(!report.template_type || report.template_type === 'weekly_placement') && !report.is_multi_college && (
          <>
            {/* 4. Section 1: Companies Completed */}
            {report.included_sections?.completed_companies && report.sections?.completed_companies && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-xs flex items-center text-emerald-800 dark:text-emerald-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Trophy size={14} strokeWidth={2.25} className="text-emerald-700 dark:text-emerald-400" /> 1. COMPANIES COMPLETED
              </span>
            </div>

            {report.sections.completed_companies.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No completed drives in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-emerald-50 border-b border-emerald-200 text-emerald-900">
                      <th colSpan={6} className="py-1.5 px-3 text-left font-bold text-[11px] bg-emerald-50 text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <Trophy size={13} className="text-emerald-700 shrink-0" /> 1. COMPANIES COMPLETED
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[25%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[25%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1 w-[11%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Status</th>
                      <th className="py-1 px-1 w-[8%] text-center whitespace-normal leading-tight">Offers<br />Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.completed_companies.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[25%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[25%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.job_role}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'job_role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1 w-[11%] text-emerald-600 dark:text-emerald-400 font-medium text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc_lpa}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'ctc_lpa', val)
                            }
                            nowrap={true}
                            className="text-emerald-600 dark:text-emerald-400 font-medium text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-subtle text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.current_status_text}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'current_status_text', val)
                            }
                            className="text-fg-subtle text-center"
                          />
                        </td>
                        <td className="py-2 px-1 w-[8%] text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          <EditableReportCell
                            type="number"
                            value={r.selected_count}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'selected_count', val)
                            }
                            nowrap={true}
                            className="font-bold text-emerald-600 dark:text-emerald-400 max-w-[3.5rem] mx-auto text-center whitespace-nowrap"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Companies In Drive */}
        {report.included_sections?.companies_in_drive !== false && report.sections?.companies_in_drive && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 font-bold text-xs flex items-center text-amber-800 dark:text-amber-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Flame size={14} strokeWidth={2.25} className="text-amber-600 dark:text-amber-400" /> 2. COMPANIES IN DRIVE
              </span>
            </div>

            {report.sections.companies_in_drive.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No active drives conducting recruitment today.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-amber-50 border-b border-amber-200 text-amber-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-amber-50 text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <Flame size={13} className="text-amber-600 shrink-0" /> 2. COMPANIES IN DRIVE
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status / Drive Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.companies_in_drive.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('companies_in_drive', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.job_role || r.role || ''}
                            onChange={(val) =>
                              handleUpdateCell('companies_in_drive', idx, 'job_role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-amber-600 dark:text-amber-400 font-medium text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc_lpa || r.ctc || ''}
                            onChange={(val) =>
                              handleUpdateCell('companies_in_drive', idx, 'ctc_lpa', val)
                            }
                            nowrap={true}
                            className="text-amber-600 dark:text-amber-400 font-medium text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2.5 w-[30%] text-fg-subtle text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.current_status_text || r.status || ''}
                            onChange={(val) =>
                              handleUpdateCell('companies_in_drive', idx, 'current_status_text', val)
                            }
                            className="text-fg-subtle text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. Section 3: Companies In Progress */}
        {report.included_sections?.in_progress && report.sections?.in_progress && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 font-bold text-xs flex items-center text-blue-800 dark:text-blue-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Rocket size={14} strokeWidth={2.25} className="text-blue-700 dark:text-blue-400" /> 3. COMPANIES IN PROGRESS
              </span>
            </div>

            {report.sections.in_progress.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No active drives currently in progress.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-blue-50 border-b border-blue-200 text-blue-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-blue-50 text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <Rocket size={13} className="text-blue-700 shrink-0" /> 3. COMPANIES IN PROGRESS
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.in_progress.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('in_progress', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.job_role}
                            onChange={(val) =>
                              handleUpdateCell('in_progress', idx, 'job_role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-blue-600 dark:text-blue-400 font-medium text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc_lpa}
                            onChange={(val) =>
                              handleUpdateCell('in_progress', idx, 'ctc_lpa', val)
                            }
                            nowrap={true}
                            className="text-blue-600 dark:text-blue-400 font-medium text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2.5 w-[30%] text-fg-subtle text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.current_status_text}
                            onChange={(val) =>
                              handleUpdateCell('in_progress', idx, 'current_status_text', val)
                            }
                            className="text-fg-subtle text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. Section 4: Companies in Pipeline */}
        {report.included_sections?.pipeline && report.sections?.pipeline && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/70 dark:bg-cyan-950/40 font-bold text-xs flex items-center text-cyan-800 dark:text-cyan-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Inbox size={14} strokeWidth={2.25} className="text-cyan-700 dark:text-cyan-400" /> 4. COMPANIES IN PIPELINE
              </span>
            </div>

            {report.sections.pipeline.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No pipeline leads recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-cyan-50 border-b border-cyan-200 text-cyan-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-cyan-50 text-cyan-900">
                        <span className="flex items-center gap-1.5">
                          <Inbox size={13} className="text-cyan-700 shrink-0" /> 4. COMPANIES IN PIPELINE
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.pipeline.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('pipeline', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.job_role}
                            onChange={(val) =>
                              handleUpdateCell('pipeline', idx, 'job_role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-cyan-600 dark:text-cyan-400 font-medium text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc_lpa || '—'}
                            onChange={(val) =>
                              handleUpdateCell('pipeline', idx, 'ctc_lpa', val)
                            }
                            nowrap={true}
                            className="text-cyan-600 dark:text-cyan-400 font-medium text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2.5 w-[30%] text-fg-subtle text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.current_status_text}
                            onChange={(val) =>
                              handleUpdateCell('pipeline', idx, 'current_status_text', val)
                            }
                            className="text-fg-subtle text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. Section 5: Top Companies */}
        {report.included_sections?.top_companies && report.sections?.top_companies && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 font-bold text-xs flex items-center text-amber-800 dark:text-amber-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Star size={14} strokeWidth={2.25} className="text-amber-600 dark:text-amber-400" /> 5. TOP COMPANIES
              </span>
            </div>

            {report.sections.top_companies.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No top companies recorded for this institution.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-amber-50 border-b border-amber-200 text-amber-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-amber-50 text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <Star size={13} className="text-amber-600 shrink-0" /> 5. TOP COMPANIES
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.top_companies.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('top_companies', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.job_role}
                            onChange={(val) =>
                              handleUpdateCell('top_companies', idx, 'job_role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-amber-600 dark:text-amber-400 font-medium text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc_lpa}
                            onChange={(val) =>
                              handleUpdateCell('top_companies', idx, 'ctc_lpa', val)
                            }
                            nowrap={true}
                            className="text-amber-600 dark:text-amber-400 font-medium text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2.5 w-[30%] text-fg-subtle text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.current_status_text}
                            onChange={(val) =>
                              handleUpdateCell('top_companies', idx, 'current_status_text', val)
                            }
                            className="text-fg-subtle text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. Section 6: Rejected Companies */}
        {(report.included_sections?.rejected_companies || report.included_sections?.rejected_by_hr) && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/40 font-bold text-xs flex items-center text-rose-800 dark:text-rose-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <XCircle size={14} strokeWidth={2.25} className="text-rose-600 dark:text-rose-400" /> 6. REJECTED COMPANIES
              </span>
            </div>

            {(report.sections?.rejected_companies || report.sections?.rejected_by_hr || []).length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No rejected companies recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-rose-50 border-b border-rose-200 text-rose-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-rose-50 text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <XCircle size={13} className="text-rose-600 shrink-0" /> 6. REJECTED COMPANIES
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {(report.sections?.rejected_companies || report.sections?.rejected_by_hr || []).map((r: any, idx: number) => {
                      const secKey = report.sections?.rejected_companies ? 'rejected_companies' : 'rejected_by_hr';
                      return (
                        <tr key={idx} className="hover:bg-surface-sunken/60">
                          <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                            <EditableReportCell
                              value={r.company_name}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'company_name', val)
                              }
                              className="font-semibold text-fg text-center"
                            />
                          </td>
                          <td className="py-2 px-2 w-[28%] text-fg-muted text-center whitespace-normal">
                            <EditableReportCell
                              value={r.job_role}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'job_role', val)
                              }
                              className="text-fg-muted text-center"
                            />
                          </td>
                          <td className="py-2 px-1.5 w-[11.5%] text-rose-600 dark:text-rose-400 font-medium text-center whitespace-nowrap">
                            <EditableReportCell
                              value={r.ctc_lpa || '—'}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'ctc_lpa', val)
                              }
                              nowrap={true}
                              className="text-rose-600 dark:text-rose-400 font-medium text-center whitespace-nowrap"
                            />
                          </td>
                          <td className="py-2 px-2.5 w-[30%] text-rose-600 dark:text-rose-400 text-center font-medium whitespace-normal leading-snug">
                            <EditableReportCell
                              value={r.current_status_text}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'current_status_text', val)
                              }
                              className="text-rose-600 dark:text-rose-400 font-medium text-center"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 8. Section 7: Companies On Hold By College */}
        {(report.included_sections?.on_hold_by_college || report.included_sections?.rejected_by_college) && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/70 dark:bg-orange-950/40 font-bold text-xs flex items-center text-orange-800 dark:text-orange-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Clock size={14} strokeWidth={2.25} className="text-orange-600 dark:text-orange-400" /> 7. COMPANIES ON HOLD BY COLLEGE
              </span>
            </div>

            {(report.sections?.on_hold_by_college || report.sections?.rejected_by_college || []).length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No companies currently on hold by college.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-orange-50 border-b border-orange-200 text-orange-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-orange-50 text-orange-900">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-orange-600 shrink-0" /> 7. COMPANIES ON HOLD BY COLLEGE
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {(report.sections?.on_hold_by_college || report.sections?.rejected_by_college || []).map((r: any, idx: number) => {
                      const secKey = report.sections?.on_hold_by_college ? 'on_hold_by_college' : 'rejected_by_college';
                      return (
                        <tr key={idx} className="hover:bg-surface-sunken/60">
                          <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                            <EditableReportCell
                              value={r.company_name}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'company_name', val)
                              }
                              className="font-semibold text-fg text-center"
                            />
                          </td>
                          <td className="py-2 px-2 w-[28%] text-fg-muted text-center whitespace-normal">
                            <EditableReportCell
                              value={r.job_role}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'job_role', val)
                              }
                              className="text-fg-muted text-center"
                            />
                          </td>
                          <td className="py-2 px-1.5 w-[11.5%] text-orange-600 dark:text-orange-400 font-medium text-center whitespace-nowrap">
                            <EditableReportCell
                              value={r.ctc_lpa || '—'}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'ctc_lpa', val)
                              }
                              nowrap={true}
                              className="text-orange-600 dark:text-orange-400 font-medium text-center whitespace-nowrap"
                            />
                          </td>
                          <td className="py-2 px-2.5 w-[30%] text-orange-600 dark:text-orange-400 text-center font-medium whitespace-normal leading-snug">
                            <EditableReportCell
                              value={r.current_status_text}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'current_status_text', val)
                              }
                              className="text-orange-600 dark:text-orange-400 font-medium text-center"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 9. Section 8: Companies On Hold By HR */}
        {report.included_sections?.on_hold_by_hr && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/40 font-bold text-xs flex items-center text-slate-800 dark:text-slate-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Clock size={14} strokeWidth={2.25} className="text-slate-600 dark:text-slate-400" /> 8. COMPANIES ON HOLD BY HR
              </span>
            </div>

            {(report.sections?.on_hold_by_hr || []).length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No companies currently on hold by HR.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-slate-100 border-b border-slate-300 text-slate-800">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-slate-100 text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-600 shrink-0" /> 8. COMPANIES ON HOLD BY HR
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {(report.sections?.on_hold_by_hr || []).map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.job_role}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'job_role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-slate-700 dark:text-slate-300 font-medium text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc_lpa || '—'}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'ctc_lpa', val)
                            }
                            nowrap={true}
                            className="text-slate-700 dark:text-slate-300 font-medium text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2.5 w-[30%] text-slate-700 dark:text-slate-300 text-center font-medium whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.current_status_text}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'current_status_text', val)
                            }
                            className="text-slate-700 dark:text-slate-300 font-medium text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Section: Placement Pending Tasks */}
        {report.included_sections?.pending_tasks && report.sections?.pending_tasks && (() => {
          const hasDriveDate = report.sections.pending_tasks.some(
            (r: any) => r.drive_date && String(r.drive_date).trim() !== '' && String(r.drive_date).trim() !== '—' && String(r.drive_date).trim() !== '-'
          );

          return (
            <div className="space-y-2 pt-2">
              <div className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-xs flex items-center text-indigo-900 dark:text-indigo-300 print:hidden">
                <span className="flex items-center gap-1.5">
                  <ListTodo size={14} strokeWidth={2.25} className="text-indigo-700 dark:text-indigo-400" /> PLACEMENT PENDING TASKS
                </span>
              </div>

              {report.sections.pending_tasks.length === 0 ? (
                <p className="text-xs text-fg-subtle italic py-2">No pending tasks recorded for this institution.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs text-center border-collapse table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: hasDriveDate ? '25%' : '29%' }} />
                      <col style={{ width: hasDriveDate ? '11%' : '12%' }} />
                      <col style={{ width: hasDriveDate ? '11%' : '12%' }} />
                      <col style={{ width: hasDriveDate ? '20%' : '23%' }} />
                      <col style={{ width: hasDriveDate ? '20%' : '23%' }} />
                      {hasDriveDate && <col style={{ width: '11%' }} />}
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="hidden print:table-row bg-indigo-50 border-b border-indigo-200 text-indigo-900">
                        <th colSpan={hasDriveDate ? 7 : 6} className="py-1.5 px-3 text-left font-bold text-[11px] bg-indigo-50 text-indigo-900">
                          <span className="flex items-center gap-1.5">
                            <ListTodo size={13} className="text-indigo-700 shrink-0" /> PLACEMENT PENDING TASKS
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                        <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                        <th className={`py-2 px-2.5 ${hasDriveDate ? 'w-[25%]' : 'w-[29%]'} text-center whitespace-normal font-semibold`}>Company Name</th>
                        <th className={`py-2 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center whitespace-normal leading-tight`}>JD Received<br />Date</th>
                        <th className={`py-2 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center whitespace-nowrap`}>DB Shared Date</th>
                        <th className={`py-2 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center whitespace-normal`}>Current Status</th>
                        <th className={`py-2 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center whitespace-normal`}>Remarks / Next Action</th>
                        {hasDriveDate && <th className="py-2 px-1.5 w-[11%] text-center whitespace-nowrap">Drive Date</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                      {report.sections.pending_tasks.map((r: any, idx: number) => {
                        const isHl = Boolean(r.is_highlighted);
                        const hlBg = r.highlight_color || '#fef08a';
                        return (
                          <tr
                            key={idx}
                            style={isHl ? { backgroundColor: hlBg, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : undefined}
                            className={isHl ? 'font-semibold text-slate-950 transition-colors shadow-2xs' : 'hover:bg-surface-sunken/60'}
                          >
                            <td className="py-2 px-1 w-10 text-center font-mono relative group" style={{ width: '38px', backgroundColor: isHl ? hlBg : undefined }}>
                              <div className="flex items-center justify-center gap-1">
                                <span className={isHl ? 'text-slate-900 font-bold' : 'text-fg-subtle'}>{r.s_no}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = !isHl;
                                    handleUpdateCell('pending_tasks', idx, 'is_highlighted', next);
                                    if (next && !r.highlight_color) {
                                      handleUpdateCell('pending_tasks', idx, 'highlight_color', '#fef08a');
                                    }
                                  }}
                                  title={isHl ? 'Click to remove row highlight' : 'Click to highlight row (pending from college side)'}
                                  className={`print:hidden p-1 rounded-md transition-all cursor-pointer ${
                                    isHl
                                      ? 'text-amber-900 bg-amber-300/80 hover:bg-amber-400'
                                      : 'text-fg-subtle/40 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/60 opacity-0 group-hover:opacity-100 focus:opacity-100'
                                  }`}
                                >
                                  <Highlighter size={12} className={isHl ? 'fill-amber-400' : ''} />
                                </button>
                              </div>
                            </td>
                            <td className={`py-2 px-2.5 ${hasDriveDate ? 'w-[25%]' : 'w-[29%]'} font-semibold text-center whitespace-normal`} style={{ backgroundColor: isHl ? hlBg : undefined }}>
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) =>
                                  handleUpdateCell('pending_tasks', idx, 'company_name', val)
                                }
                                className={`font-semibold text-center ${isHl ? 'text-slate-950 font-bold' : 'text-fg'}`}
                              />
                            </td>
                            <td className={`py-2 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center whitespace-nowrap`} style={{ backgroundColor: isHl ? hlBg : undefined }}>
                              <EditableReportCell
                                value={r.jd_received_date}
                                onChange={(val) =>
                                  handleUpdateCell('pending_tasks', idx, 'jd_received_date', val)
                                }
                                className={`text-center ${isHl ? 'text-slate-800 font-medium' : 'text-fg-muted'}`}
                              />
                            </td>
                            <td className={`py-2 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center whitespace-nowrap`} style={{ backgroundColor: isHl ? hlBg : undefined }}>
                              <EditableReportCell
                                value={r.db_shared_date}
                                onChange={(val) =>
                                  handleUpdateCell('pending_tasks', idx, 'db_shared_date', val)
                                }
                                className={`text-center ${isHl ? 'text-slate-800 font-medium' : 'text-fg-muted'}`}
                              />
                            </td>
                            <td className={`py-2 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center whitespace-normal leading-snug`} style={{ backgroundColor: isHl ? hlBg : undefined }}>
                              <EditableReportCell
                                value={r.current_status}
                                onChange={(val) =>
                                  handleUpdateCell('pending_tasks', idx, 'current_status', val)
                                }
                                className={`text-center font-medium ${isHl ? 'text-slate-900 font-bold' : 'text-fg'}`}
                              />
                            </td>
                            <td className={`py-2 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center whitespace-normal leading-snug`} style={{ backgroundColor: isHl ? hlBg : undefined }}>
                              <EditableReportCell
                                value={r.action_to_be_taken}
                                onChange={(val) =>
                                  handleUpdateCell('pending_tasks', idx, 'action_to_be_taken', val)
                                }
                                className={`text-center font-medium ${isHl ? 'text-slate-950 font-bold' : 'text-fg'}`}
                              />
                            </td>
                            {hasDriveDate && (
                              <td className="py-2 px-1.5 w-[11%] font-semibold text-center whitespace-nowrap" style={{ backgroundColor: isHl ? hlBg : undefined }}>
                                <EditableReportCell
                                  value={r.drive_date}
                                  onChange={(val) =>
                                    handleUpdateCell('pending_tasks', idx, 'drive_date', val)
                                  }
                                  className={`font-semibold text-center ${isHl ? 'text-indigo-900 font-bold' : 'text-indigo-600 dark:text-indigo-400'}`}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Section: Active Corporate Leads */}
        {report.included_sections?.active_leads && report.sections?.active_leads && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-xs flex items-center text-emerald-900 dark:text-emerald-300 print:hidden">
              <span className="flex items-center gap-1.5 uppercase">
                <TrendingUp size={14} strokeWidth={2.25} className="text-emerald-700 dark:text-emerald-400" />
                {(() => {
                  const tier = report.kpi_summary?.tier_focus || '';
                  const batchSuffix = report.kpi_summary?.graduating_year && report.kpi_summary.graduating_year !== 'All Batches'
                    ? ` — ${report.kpi_summary.graduating_year}`
                    : '';
                  if (tier.includes('Hot Leads') || report.report_title?.includes('Hot Leads')) {
                    return `HOT LEADS (JD RECEIVED)${batchSuffix}`;
                  }
                  if (tier.includes('Positive') || report.report_title?.includes('Positive')) {
                    return `POSITIVE LEADS${batchSuffix}`;
                  }
                  if (tier.includes('Weekly Tracker') || report.report_title?.includes('Weekly Tracker')) {
                    return `WEEKLY TRACKER PIPELINE${batchSuffix}`;
                  }
                  return `ACTIVE CORPORATE LEADS${batchSuffix}`;
                })()}
              </span>
            </div>

            {report.sections.active_leads.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No active leads recorded for this graduating batch.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: activeLeadsColWidths.comp }} />
                    {showCollegesCol && <col style={{ width: activeLeadsColWidths.colleges }} />}
                    {showRoleCol && <col style={{ width: activeLeadsColWidths.role }} />}
                    {showCtcCol && <col style={{ width: activeLeadsColWidths.ctc }} />}
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-3 text-center whitespace-normal font-semibold">Company Name</th>
                      {showCollegesCol && (
                        <th className="py-2 px-2 text-center whitespace-normal font-bold text-primary">Colleges</th>
                      )}
                      {showRoleCol && (
                        <th className="py-2 px-3 text-center whitespace-normal">Role</th>
                      )}
                      {showCtcCol && (
                        <th className="py-2 px-2.5 text-center whitespace-normal font-semibold">CTC</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.active_leads.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60 avoid-break">
                        <td className="py-2 px-1 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('active_leads', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        {showCollegesCol && (
                          <td className="py-2 px-2 text-center whitespace-normal">
                            <EditableReportCell
                              value={r.colleges || '—'}
                              onChange={(val) =>
                                handleUpdateCell('active_leads', idx, 'colleges', val)
                              }
                              className="text-primary font-semibold text-center text-xs"
                            />
                          </td>
                        )}
                        {showRoleCol && (
                          <td className="py-2 px-3 text-fg-muted text-center whitespace-normal">
                            <EditableReportCell
                              value={r.role}
                              onChange={(val) =>
                                handleUpdateCell('active_leads', idx, 'role', val)
                              }
                              className="text-fg-muted text-center"
                            />
                          </td>
                        )}
                        {showCtcCol && (
                          <td className="py-2 px-2.5 text-emerald-600 dark:text-emerald-400 font-semibold text-center whitespace-normal break-words">
                            <EditableReportCell
                              value={r.ctc}
                              onChange={(val) =>
                                handleUpdateCell('active_leads', idx, 'ctc', val)
                              }
                              nowrap={false}
                              className="text-emerald-600 dark:text-emerald-400 font-semibold text-center whitespace-normal break-words leading-tight"
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Month-End Table 1: Companies Completed */}
        {report.template_type === 'month_end' && report.included_sections?.completed_companies && report.sections?.completed_companies && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-xs flex items-center text-emerald-800 dark:text-emerald-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Trophy size={14} strokeWidth={2.25} className="text-emerald-700 dark:text-emerald-400" /> COMPANIES COMPLETED
              </span>
            </div>

            {report.sections.completed_companies.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No completed drives recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '11%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-emerald-50 border-b border-emerald-200 text-emerald-900">
                      <th colSpan={6} className="py-1.5 px-3 text-left font-bold text-[11px] bg-emerald-50 text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <Trophy size={13} className="text-emerald-700 shrink-0" /> COMPANIES COMPLETED
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[25%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[24%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1 w-[11%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2 w-[26%] text-center whitespace-normal">Status</th>
                      <th className="py-1 px-1 w-[11%] text-center leading-tight">
                        <span className="block whitespace-nowrap">Offers</span>
                        <span className="block whitespace-nowrap">Received</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.completed_companies.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60 avoid-break">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[25%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[24%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.role || r.job_role || ''}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1 w-[11%] text-fg-muted text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc || r.ctc_lpa || ''}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'ctc', val)
                            }
                            nowrap={true}
                            className="text-fg-muted text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2 w-[26%] text-emerald-600 dark:text-emerald-400 font-medium text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.status || r.current_status_text || 'Drive Completed'}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'status', val)
                            }
                            className="text-emerald-600 dark:text-emerald-400 font-medium text-center"
                          />
                        </td>
                        <td className="py-2 px-1 w-[11%] text-emerald-600 dark:text-emerald-400 font-bold text-center whitespace-nowrap">
                          <EditableReportCell
                            value={String(r.offers_received ?? r.selected_count ?? 0)}
                            onChange={(val) =>
                              handleUpdateCell('completed_companies', idx, 'offers_received', Number(val) || 0)
                            }
                            nowrap={true}
                            className="text-emerald-600 dark:text-emerald-400 font-bold text-center whitespace-nowrap"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Month-End Table 2: JD Received Companies */}
        {report.template_type === 'month_end' && report.included_sections?.company_conversions && report.sections?.company_conversions && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-xs flex items-center text-emerald-800 dark:text-emerald-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Briefcase size={14} strokeWidth={2.25} className="text-emerald-700 dark:text-emerald-400" /> JD RECEIVED COMPANIES
              </span>
            </div>

            {report.sections.company_conversions.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No JD received companies recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '11.5%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-emerald-50 border-b border-emerald-200 text-emerald-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-emerald-50 text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <Briefcase size={13} className="text-emerald-700 shrink-0" /> JD RECEIVED COMPANIES
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[36%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[38%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-1 px-1.5 w-[11.5%] text-center whitespace-normal leading-tight">JD Received<br />Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.company_conversions.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60 avoid-break">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[36%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('company_conversions', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[38%] text-fg-muted text-center whitespace-normal">
                          <EditableReportCell
                            value={r.role}
                            onChange={(val) =>
                              handleUpdateCell('company_conversions', idx, 'role', val)
                            }
                            className="text-fg-muted text-center"
                          />
                        </td>
                        <td className="py-2 px-1 w-[11.5%] text-emerald-600 dark:text-emerald-400 font-semibold text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc}
                            onChange={(val) =>
                              handleUpdateCell('company_conversions', idx, 'ctc', val)
                            }
                            nowrap={true}
                            className="text-emerald-600 dark:text-emerald-400 font-semibold text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-fg-subtle text-center whitespace-nowrap leading-snug">
                          <EditableReportCell
                            value={r.jd_received_date}
                            onChange={(val) =>
                              handleUpdateCell('company_conversions', idx, 'jd_received_date', val)
                            }
                            nowrap={true}
                            className="text-fg-subtle text-center whitespace-nowrap"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Month-End Table 3: Companies in Drive */}
        {report.template_type === 'month_end' && (report.included_sections?.companies_in_drive || report.included_sections?.company_drives_scheduled) && (report.sections?.companies_in_drive || report.sections?.company_drives_scheduled) && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-xs flex items-center text-indigo-900 dark:text-indigo-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} strokeWidth={2.25} className="text-indigo-700 dark:text-indigo-400" /> COMPANIES IN DRIVE
              </span>
            </div>

            {(report.sections.companies_in_drive || report.sections.company_drives_scheduled).length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No companies in drive recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-indigo-50 border-b border-indigo-200 text-indigo-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-indigo-50 text-indigo-900">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-indigo-700 shrink-0" /> COMPANIES IN DRIVE
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {(report.sections.companies_in_drive || report.sections.company_drives_scheduled).map((r: any, idx: number) => {
                      const secKey = report.sections?.companies_in_drive ? 'companies_in_drive' : 'company_drives_scheduled';
                      return (
                        <tr key={idx} className="hover:bg-surface-sunken/60 avoid-break">
                          <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                            <EditableReportCell
                              value={r.company_name}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'company_name', val)
                              }
                              className="font-semibold text-fg text-center"
                            />
                          </td>
                          <td className="py-2 px-2 w-[28%] text-fg-subtle text-center whitespace-normal">
                            <EditableReportCell
                              value={r.role || ''}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'role', val)
                              }
                              className="text-fg-subtle text-center"
                            />
                          </td>
                          <td className="py-2 px-1.5 w-[11.5%] text-fg-subtle text-center whitespace-nowrap">
                            <EditableReportCell
                              value={r.ctc || ''}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'ctc', val)
                              }
                              nowrap={true}
                              className="text-fg-subtle text-center whitespace-nowrap"
                            />
                          </td>
                          <td className="py-2 px-2.5 w-[30%] text-indigo-600 dark:text-indigo-400 font-medium text-center whitespace-normal leading-snug">
                            <EditableReportCell
                              value={r.status || r.current_status_text || ''}
                              onChange={(val) =>
                                handleUpdateCell(secKey, idx, 'status', val)
                              }
                              className="text-indigo-600 dark:text-indigo-400 font-medium text-center"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Month-End Table 4: Companies on Hold by TPO */}
        {report.template_type === 'month_end' && report.included_sections?.on_hold_by_college && report.sections?.on_hold_by_college && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 font-bold text-xs flex items-center text-amber-900 dark:text-amber-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <Clock size={14} strokeWidth={2.25} className="text-amber-700 dark:text-amber-400" /> COMPANIES ON HOLD BY TPO
              </span>
            </div>

            {report.sections.on_hold_by_college.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No companies on hold by TPO recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-amber-50 border-b border-amber-200 text-amber-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-amber-50 text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-amber-700 shrink-0" /> COMPANIES ON HOLD BY TPO
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.on_hold_by_college.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60 avoid-break">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_college', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-subtle text-center whitespace-normal">
                          <EditableReportCell
                            value={r.role || ''}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_college', idx, 'role', val)
                            }
                            className="text-fg-subtle text-center"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-fg-subtle text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc || ''}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_college', idx, 'ctc', val)
                            }
                            nowrap={true}
                            className="text-fg-subtle text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2.5 w-[30%] text-amber-700 dark:text-amber-400 font-medium text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.status || r.remarks || ''}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_college', idx, 'status', val)
                            }
                            className="text-amber-700 dark:text-amber-400 font-medium text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Month-End Table 5: Companies on Hold by HR */}
        {report.template_type === 'month_end' && report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/40 font-bold text-xs flex items-center text-rose-900 dark:text-rose-300 print:hidden">
              <span className="flex items-center gap-1.5">
                <AlertCircle size={14} strokeWidth={2.25} className="text-rose-700 dark:text-rose-400" /> COMPANIES ON HOLD BY HR
              </span>
            </div>

            {report.sections.on_hold_by_hr.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No companies on hold by HR recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="hidden print:table-row bg-rose-50 border-b border-rose-200 text-rose-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-rose-50 text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-rose-700 shrink-0" /> COMPANIES ON HOLD BY HR
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-1 w-10 text-center font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-2 px-2.5 w-[27%] text-center whitespace-normal font-semibold">Company Name</th>
                      <th className="py-2 px-2 w-[28%] text-center whitespace-normal">Role</th>
                      <th className="py-2 px-1.5 w-[11.5%] text-center whitespace-nowrap">CTC</th>
                      <th className="py-2 px-2.5 w-[30%] text-center whitespace-normal">Status / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.on_hold_by_hr.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60 avoid-break">
                        <td className="py-2 px-1 w-10 text-center text-fg-subtle font-mono" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-2 px-2.5 w-[27%] font-semibold text-fg text-center whitespace-normal">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'company_name', val)
                            }
                            className="font-semibold text-fg text-center"
                          />
                        </td>
                        <td className="py-2 px-2 w-[28%] text-fg-subtle text-center whitespace-normal">
                          <EditableReportCell
                            value={r.role || ''}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'role', val)
                            }
                            className="text-fg-subtle text-center"
                          />
                        </td>
                        <td className="py-2 px-1.5 w-[11.5%] text-fg-subtle text-center whitespace-nowrap">
                          <EditableReportCell
                            value={r.ctc || ''}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'ctc', val)
                            }
                            nowrap={true}
                            className="text-fg-subtle text-center whitespace-nowrap"
                          />
                        </td>
                        <td className="py-2 px-2.5 w-[30%] text-rose-700 dark:text-rose-400 font-medium text-center whitespace-normal leading-snug">
                          <EditableReportCell
                            value={r.status || r.remarks || ''}
                            onChange={(val) =>
                              handleUpdateCell('on_hold_by_hr', idx, 'status', val)
                            }
                            className="text-rose-700 dark:text-rose-400 font-medium text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. Key Operational Observations & Remarks */}
        {report.included_sections?.remarks && (
          <div className="space-y-2 pt-2">
            <div className="font-bold text-xs text-fg flex items-center gap-1.5">
              <PenLine size={14} strokeWidth={2} aria-hidden />
              <span>{report.template_type === 'active_leads' ? 'Notes' : 'Coordinator Remarks & Observations'}</span>
            </div>
            <textarea
              rows={3}
              value={report.remarks}
              onChange={(e) => setReport({ ...report, remarks: e.target.value })}
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:bg-surface rounded-xl p-3 text-xs text-fg outline-none"
            />
          </div>
        )}

        </div>

        {/* 8. Master Institutional Footer — Always at the End of the Report (Only when Footer & Sign-off Options enabled) */}
        {report.include_prepared_by !== false && (
          <div className="border-t border-border print:border-slate-300 pt-4 mt-auto flex items-center justify-between text-xs text-fg-subtle print:text-slate-500 avoid-break shrink-0">
            <div>
              <p className="text-[11px] text-fg-subtle print:text-slate-500 font-medium">© 2026 Infoziant. All rights reserved.</p>
            </div>
            {/* Prepared By in Footer Area */}
            {Boolean(report.generated_by || report.branding?.prepared_by) && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg print:text-slate-800">
                <User size={13} className="text-primary shrink-0" />
                <span>Prepared by: <strong className="font-bold">{report.generated_by || report.branding?.prepared_by}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Action Toolbar (Bottom Right Corner at End of Page) ────────── */}
      <div className="flex items-center justify-end gap-2.5 pt-2 pb-6 print:hidden">
        {/* 1. Back (Neutral Slate) */}
        <button
          type="button"
          onClick={onBackToBuilder}
          className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg border border-border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
        >
          Back
        </button>

        {/* 2. Preview A4 PDF Button */}
        <button
          type="button"
          onClick={() => setShowA4Preview(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          title="Preview exactly how this report will look printed on an A4 sheet"
        >
          <Eye size={14} strokeWidth={2} aria-hidden /> Preview
        </button>

        {/* 3. Export Excel (Emerald Green) */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Export XLSX
        </button>

        {/* 4. Save Image (Infoziant Sky / Cyan) */}
        <button
          type="button"
          onClick={handleExportImage}
          disabled={exportingImage}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <Download size={14} strokeWidth={2} aria-hidden /> {exportingImage ? 'Saving…' : 'Save Image'}
        </button>

        {/* 5. Save PDF (Infoziant Corporate Navy) */}
        <button
          type="button"
          onClick={handlePrintPdf}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <Download size={14} strokeWidth={2} aria-hidden /> Save PDF
        </button>
      </div>

      {/* ── Interactive A4 Light-Themed Print Preview Modal ── */}
      <A4PdfPreviewModal
        report={report}
        isOpen={showA4Preview}
        onClose={() => setShowA4Preview(false)}
        onPrint={handlePrintPdf}
      />

      {/* ── Quick Scroll Floating Action Widget (Bottom-Right Corner) ── */}
      <aside aria-label="Page scroll controls" className="fixed bottom-6 right-6 z-50 print:hidden flex flex-col items-center gap-2">
        {isNearBottom ? (
          <button
            type="button"
            onClick={handleScrollToTop}
            title="Scroll to Top of Report"
            aria-label="Scroll to Top of Report"
            className="w-11 h-11 rounded-full bg-surface/95 hover:bg-surface text-primary hover:text-primary-hover border border-border shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-black/5 dark:ring-white/10 group"
          >
            <ArrowUp size={19} strokeWidth={2.5} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleScrollToBottom}
            title="Jump to End of Report"
            aria-label="Jump to End of Report"
            className="w-11 h-11 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground border border-primary/40 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-primary/30 group"
          >
            <ArrowDown size={19} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        )}
      </aside>

    </div>
  );
}
