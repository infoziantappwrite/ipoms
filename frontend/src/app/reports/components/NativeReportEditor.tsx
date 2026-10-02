'use client';

import { useState, useEffect, useRef } from 'react';
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
  Zap,
  ChevronDown,
  Columns2,
  Image as ImageIcon,
  FileText,
  PhoneCall,
  Printer,
} from 'lucide-react';
import { A4PdfPreviewModal, type PreviewMode } from './A4PdfPreviewModal';
import { ReportDocumentView } from './ReportDocumentView';
import { sectionTitle, columnHeading, withSectionTitle, withColumnHeading } from '../lib/reportOverrides';


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

  // 3. Check if Daily Leads Report
  if (report.template_type === 'daily_positives' || report.template_type === 'daily_jd_received') {
    const rawDate = report.report_period || report.effective_date || report.date || report.generated_date;
    let formattedDate = 'Today';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        formattedDate = `${day} ${month} ${year}`;
      }
    }
    const reportLabel = report.template_type === 'daily_positives' ? 'Positives of the day' : 'JD received for the day';
    return `${cleanAcronym}- ${reportLabel} - ${formattedDate}`;
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

/**
 * An inline-editable title / column heading for the report PREVIEW. Presentation only: it renames what this
 * generated report shows and exports. Enter or clicking away saves; clearing it restores the default.
 */
function EditableLabel({ value, onCommit, className = '' }: { value: string; onCommit: (v: string) => void; className?: string }) {
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
        if (!t) e.currentTarget.innerText = value; // an emptied label goes back to its default
        onCommit(t);
      }}
      className={`outline-none cursor-text rounded-sm px-0.5 hover:bg-primary/10 focus:bg-primary/10 focus:ring-1 focus:ring-primary/40 print:hover:bg-transparent print:focus:bg-transparent print:focus:ring-0 ${className}`}
      title="Click to rename - changes this report only"
    >
      {value}
    </span>
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
  const [previewMode, setPreviewMode] = useState<PreviewMode>('image');
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const previewMenuRef = useRef<HTMLDivElement>(null);

  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    setReport(reportData);
    setLogoFailed(false);
  }, [reportData]);

  // Click outside to close preview dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewMenuRef.current && !previewMenuRef.current.contains(event.target as Node)) {
        setShowPreviewMenu(false);
      }
    };
    if (showPreviewMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPreviewMenu]);

  // Global ESC key listener to close preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) && showA4Preview) {
        e.preventDefault();
        setShowA4Preview(false);
      }
    };
    if (showA4Preview) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showA4Preview]);

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

  // Renaming a section title / column heading in the preview (presentation only - see lib/reportOverrides)
  const handleSectionTitle = (key: string, value: string) => setReport((prev: any) => withSectionTitle(prev, key, value));
  const handleColumnHeading = (key: string, index: number, value: string) =>
    setReport((prev: any) => withColumnHeading(prev, key, index, value));

  // Cell editing helper for presentation tables
  const handleUpdateCell = (sectionKey: string, rowIndex: number, field: string, value: any) => {
    setReport((prev: any) => {
      const updated = { ...prev };
      if (!updated.sections?.[sectionKey]) return updated;
      const sec = [...updated.sections[sectionKey]];
      sec[rowIndex] = { ...sec[rowIndex], [field]: value };
      updated.sections[sectionKey] = sec;
      return updated;
    });
  };

  // Multi-college cell editing helper
  const handleUpdateMultiCollegeCell = (
    collegeIdx: number,
    tableKey: string,
    rowIndex: number,
    field: string,
    value: any
  ) => {
    setReport((prev: any) => {
      if (!prev.colleges_data || !prev.colleges_data[collegeIdx]) return prev;
      const newCollegesData = [...prev.colleges_data];
      const college = { ...newCollegesData[collegeIdx] };
      if (!college[tableKey]) return prev;
      const tableRows = [...college[tableKey]];
      tableRows[rowIndex] = { ...tableRows[rowIndex], [field]: value };
      college[tableKey] = tableRows;
      newCollegesData[collegeIdx] = college;
      return { ...prev, colleges_data: newCollegesData };
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
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
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
          { key: 'total_calls', label: 'Total Calls Made', val: report.kpi_summary.total_calls ?? 0, color: '#2563eb' },
          { key: 'positive_responses', label: 'Positives Received', val: report.kpi_summary.positive_responses ?? 0, color: '#059669' },
          { key: 'total_duration', label: 'Duration Spent', val: report.kpi_summary.total_duration || '0m', color: '#0891b2' },
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
      } else if (report.template_type === 'daily_positives' || report.template_type === 'daily_jd_received') {
        const isPositives = report.template_type === 'daily_positives';
        const dailyCards = [
          { key: isPositives ? 'total_positives' : 'total_jds', label: isPositives ? 'Total Positives' : 'Total JDs Received', val: isPositives ? (report.kpi_summary.total_positives || 0) : (report.kpi_summary.total_jds || 0), color: isPositives ? '#059669' : '#d97706' },
          { key: 'active_colleges_count', label: isPositives ? 'Colleges Reached' : 'Beneficiary Colleges', val: report.kpi_summary.active_colleges_count || 0, color: '#2563eb' },
          { key: 'distinct_companies_count', label: 'Distinct Companies', val: report.kpi_summary.distinct_companies_count || 0, color: '#4f46e5' },
          { key: 'highest_ctc', label: 'Highest Package', val: report.kpi_summary.highest_ctc || '—', color: '#7c3aed' },
        ];

        html += `
          <tr><td colspan="9" class="sec-header">${isPositives ? 'POSITIVES OF THE DAY' : 'JD RECEIVED FOR THE DAY'} KPI SUMMARY</td></tr>
          <tr>
            ${dailyCards.map((c) => `<th>${c.label}</th>`).join('')}
          </tr>
          <tr>
            ${dailyCards.map((c) => `<td style="text-align:center; font-weight:bold; font-size:12pt; color:${c.color};">${c.val}</td>`).join('')}
          </tr>
          <tr><td colspan="9"></td></tr>
        `;
      } else if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
        const alCards = [
          { key: 'total_leads', label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, color: '#1e3a8a' },
          { key: 'hot_leads_count', label: 'JD Received Companies', val: report.kpi_summary.hot_leads_count ?? report.kpi_summary.jd_received_count ?? 0, color: '#d97706' },
          { key: 'pipeline_leads_count', label: 'Companies in Pipeline', val: report.kpi_summary.pipeline_leads_count ?? report.kpi_summary.pipeline_count ?? 0, color: '#2563eb' },
          { key: 'graduating_year', label: 'Graduating Batch', val: report.kpi_summary.graduating_year || 'All Batches', color: '#059669' },
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
                ${colData.college_name.toUpperCase()} ${colData.college_code ? `(${colData.college_code})` : ''} — ${colData.total_completed || 0} COMPLETED, ${colData.total_in_drive ? colData.total_in_drive + ' IN DRIVE, ' : ''}${colData.total_in_progress || 0} IN PROGRESS, ${colData.total_offers || 0} OFFERS
              </td>
            </tr>
          `;

          if (colData.completed_companies && colData.completed_companies.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#ecfdf5; color:#065f46;">COMPANIES COMPLETED (${colData.completed_companies.length})</td></tr>
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

          if (colData.drive_in_progress && colData.drive_in_progress.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#fffbeb; color:#92400e;">DRIVE IN PROGRESS (${colData.drive_in_progress.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
              </tr>
            `;
            colData.drive_in_progress.forEach((r: any) => {
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

          if (colData.companies_in_drive && colData.companies_in_drive.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#eef2ff; color:#3730a3;">UPCOMING DRIVES (${colData.companies_in_drive.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
              </tr>
            `;
            colData.companies_in_drive.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || r.role || '—'}</td>
                  <td style="color:#4f46e5; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || 'Upcoming Drive'}</td>
                </tr>
              `;
            });
          }

          if (colData.in_progress && colData.in_progress.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#eff6ff; color:#1e40af;">COMPANIES IN PROGRESS (${colData.in_progress.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
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

          if (colData.pipeline && colData.pipeline.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#ecfeff; color:#155e75;">COMPANIES IN PIPELINE (${colData.pipeline.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
              </tr>
            `;
            colData.pipeline.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || r.role || '—'}</td>
                  <td style="color:#0891b2; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || '—'}</td>
                </tr>
              `;
            });
          }

          if (colData.top_companies && colData.top_companies.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#fefce8; color:#854d0e;">TOP COMPANIES (${colData.top_companies.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
              </tr>
            `;
            colData.top_companies.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || r.role || '—'}</td>
                  <td style="color:#ca8a04; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || '—'}</td>
                </tr>
              `;
            });
          }

          const rejList = colData.rejected_companies || colData.rejected_by_hr;
          if (rejList && rejList.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#fff1f2; color:#9f1239;">REJECTED COMPANIES (${rejList.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
              </tr>
            `;
            rejList.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || r.role || '—'}</td>
                  <td style="color:#e11d48; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || '—'}</td>
                </tr>
              `;
            });
          }

          const holdColList = colData.on_hold_by_college || colData.rejected_by_college;
          if (holdColList && holdColList.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#fffbeb; color:#92400e;">COMPANIES ON HOLD BY COLLEGE (${holdColList.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
              </tr>
            `;
            holdColList.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || r.role || '—'}</td>
                  <td style="color:#d97706; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || '—'}</td>
                </tr>
              `;
            });
          }

          if (colData.on_hold_by_hr && colData.on_hold_by_hr.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#fff1f2; color:#9f1239;">COMPANIES ON HOLD BY HR (${colData.on_hold_by_hr.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status</th>
              </tr>
            `;
            colData.on_hold_by_hr.forEach((r: any) => {
              html += `
                <tr>
                  <td style="text-align:center;">${r.s_no}</td>
                  <td><b>${r.company_name}</b></td>
                  <td>${r.job_role || r.role || '—'}</td>
                  <td style="color:#e11d48; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || '—'}</td>
                </tr>
              `;
            });
          }

          html += `<tr><td colspan="6"></td></tr>`;
        });
      } else if (
        report.template_type !== 'pending_tasks' &&
        report.template_type !== 'active_leads'
      ) {
        // Section 1: Companies Completed
        if (report.sections?.completed_companies && report.sections.completed_companies.length > 0) {
        html += `
          <tr><td colspan="6" class="sec-header">COMPANIES COMPLETED</td></tr>
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

    // Section 2: Drive in Progress
    if (report.sections?.drive_in_progress && report.sections.drive_in_progress.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fffbeb; color:#92400e;">DRIVE IN PROGRESS</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
        </tr>
      `;
      report.sections.drive_in_progress.forEach((r: any) => {
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

    // Section 3: Upcoming Drives
    const upDrives = report.sections?.companies_in_drive || report.sections?.upcoming_drives;
    if (upDrives && upDrives.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#eef2ff; color:#3730a3;">UPCOMING DRIVES</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
        </tr>
      `;
      upDrives.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || r.role || '—'}</td>
            <td style="color:#4f46e5; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
            <td>${r.current_status_text || r.status || 'Upcoming Drive'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="5"></td></tr>`;
    }

    // Section 4: Companies In Progress
    if (report.sections?.in_progress && report.sections.in_progress.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">COMPANIES IN PROGRESS</td></tr>
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

    // Section 5: Companies in Pipeline
    if (report.sections?.pipeline && report.sections.pipeline.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">COMPANIES IN PIPELINE</td></tr>
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

    // Section 6: Top Companies
    if (report.sections?.top_companies && report.sections.top_companies.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">TOP COMPANIES</td></tr>
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

    // Section 7: Rejected Companies
    const rejRows = report.sections?.rejected_companies || report.sections?.rejected_by_hr;
    if (rejRows && rejRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fef2f2; color:#991b1b;">REJECTED COMPANIES</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
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

    // Section 8: Companies On Hold By College
    const holdColRows = report.sections?.on_hold_by_college || report.sections?.rejected_by_college;
    if (holdColRows && holdColRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fff7ed; color:#9a3412;">COMPANIES ON HOLD BY COLLEGE</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
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

    // Section 9: Companies On Hold By HR
    const holdHrRows = report.sections?.on_hold_by_hr;
    if (holdHrRows && holdHrRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#f1f5f9; color:#334155;">COMPANIES ON HOLD BY HR</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status</th>
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

    // Section: Placement Pending Tasks (Section-wise 3 Tables)
    if (report.sections?.pending_tasks && report.sections.pending_tasks.length > 0) {
      const colSpan = 5;
      const allTasks = report.sections.pending_tasks;
      const sec1 =
        report.sections?.drive_in_progress && report.sections.drive_in_progress.length > 0
          ? report.sections.drive_in_progress
          : allTasks.filter((t: any) => t.task_section === 'drive_in_progress');
      const sec2 =
        report.sections?.companies_in_drive && report.sections.companies_in_drive.length > 0
          ? report.sections.companies_in_drive
          : allTasks.filter((t: any) => t.task_section === 'companies_in_drive');
      const sec3 =
        report.sections?.company_in_progress && report.sections.company_in_progress.length > 0
          ? report.sections.company_in_progress
          : allTasks.filter(
              (t: any) =>
                t.task_section === 'company_in_progress' ||
                (!t.task_section && !sec1.includes(t) && !sec2.includes(t))
            );

      const pendingSections = [
        { title: 'DRIVE IN PROGRESS', list: sec1 },
        { title: 'COMPANIES IN DRIVE', list: sec2 },
        { title: 'COMPANY IN PROGRESS', list: sec3 },
      ].filter((s) => s.list.length > 0);

      pendingSections.forEach((sec, secIdx) => {
        html += `
          <tr><td colspan="${colSpan}" class="sec-header">${sec.title}</td></tr>
          <tr>
            <th style="width:36px; text-align:center;">#</th>
            <th>Company Name</th>
            <th>Role</th>
            <th style="text-align:center;">CTC</th>
            <th>Status</th>
          </tr>
        `;
        sec.list.forEach((r: any, idx: number) => {
          const isHl = Boolean(r.is_highlighted);
          const hlBg = r.highlight_color || '#fef08a';
          const trHl = isHl ? `style="background-color:${hlBg} !important;" bgcolor="${hlBg}"` : '';
          const tdHl = isHl ? `style="background-color:${hlBg} !important;" bgcolor="${hlBg}"` : '';
          const roleVal = r.role || r.job_role || '—';
          const ctcVal = r.ctc || r.ctc_lpa || r.package_details || '—';
          const statusVal =
            r.status ||
            r.current_status_text ||
            r.action_to_be_taken ||
            r.current_status ||
            r.remarks ||
            '—';

          html += `
            <tr ${trHl}>
              <td ${tdHl} style="text-align:center;${isHl ? `background-color:${hlBg} !important;` : ''}">${idx + 1}</td>
              <td ${tdHl}><b>${r.company_name}</b></td>
              <td ${tdHl}>${roleVal}</td>
              <td ${tdHl} style="text-align:center;">${ctcVal}</td>
              <td ${tdHl}>${statusVal}</td>
            </tr>
          `;
        });
        html += `<tr><td colspan="${colSpan}"></td></tr>`;
      });
    }

    // Section: Active Leads
    if (report.sections?.active_leads && report.sections.active_leads.length > 0) {
      html += `
        <tr><td colspan="4" class="sec-header">ACTIVE CORPORATE LEADS</td></tr>
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



    // Daily Leads Report Table (daily_positives and daily_jd_received)
    const dailyLeadsRows = report.sections?.daily_positives || report.sections?.daily_jd_received || report.sections?.daily_leads;
    if ((report.template_type === 'daily_positives' || report.template_type === 'daily_jd_received') && dailyLeadsRows && dailyLeadsRows.length > 0) {
      const isPos = report.template_type === 'daily_positives';
      html += `
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role / Designation</th>
          <th>CTC</th>
          <th>Time</th>
          <th>College</th>
          <th>Coordinator</th>
        </tr>
      `;
      dailyLeadsRows.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td style="text-align:center;"><b>${r.company_name}</b></td>
            <td style="text-align:center;">${r.role || r.job_role || '—'}</td>
            <td style="text-align:center; color:#059669; font-weight:bold;">${r.ctc || '—'}</td>
            <td style="text-align:center;">${r.time || r.time_stamp || r.event_time || '—'}</td>
            <td style="text-align:center; font-weight:bold;">${r.college_code || r.college_name || '—'}</td>
            <td style="text-align:center;">${r.coordinator || 'Placement Team'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="7"></td></tr>`;
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

  // Print to PDF with custom document.title (fallback for physical print)
  const handlePrintPdf = () => {
    setShowA4Preview(false);
    setTimeout(() => {
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
    }, 100);
  };

  // Listen for top-bar Preview button click
  useEffect(() => {
    const handleOpenPreview = () => {
      setPreviewMode('both');
      setShowA4Preview(true);
    };
    window.addEventListener('ipoms:open-report-preview', handleOpenPreview);
    return () => {
      window.removeEventListener('ipoms:open-report-preview', handleOpenPreview);
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4 print:p-0 print:m-0 print:max-w-full text-fg">
      {/* ── Document Canvas (Editable In-App View & Printable Page) ────────────────────────────────── */}
      <ReportDocumentView
        report={report}
        editable={true}
        onUpdateCell={handleUpdateCell}
        onUpdateMultiCollegeCell={handleUpdateMultiCollegeCell}
        onUpdateTitle={(val: string) => setReport((prev: any) => ({ ...prev, report_title: val }))}
        onUpdateSubtitle={(val: string) =>
          setReport((prev: any) => ({
            ...prev,
            branding: {
              ...(prev.branding || {}),
              college_name: val,
            },
          }))
        }
        onRenameSection={handleSectionTitle}
        onRenameColumn={handleColumnHeading}
        id="printable-report-canvas"
      />

      {/* ── Interactive A4 Dual Preview Modal (Side-by-Side, Image, PDF) ── */}
      <A4PdfPreviewModal
        report={report}
        isOpen={showA4Preview}
        initialMode={previewMode}
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
            className="w-11 h-11 rounded-full bg-surface/95 hover:bg-surface text-primary hover:text-primary-hover border border-border shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-[0.992] cursor-pointer ring-1 ring-black/5 dark:ring-white/10 group"
          >
            <ArrowUp size={19} strokeWidth={2.5} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleScrollToBottom}
            title="Jump to End of Report"
            aria-label="Jump to End of Report"
            className="w-11 h-11 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground border border-primary/40 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-[0.992] cursor-pointer ring-2 ring-primary/30 group"
          >
            <ArrowDown size={19} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        )}
      </aside>

    </div>
  );
}
