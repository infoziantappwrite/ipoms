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
} from 'lucide-react';
import { A4PdfPreviewModal, type PreviewMode } from './A4PdfPreviewModal';
import { COLLEGE_LOGO_MAP, getCollegeLogoUrl } from '@/lib/collegeLogo';
import { exportReportAsImage } from '../lib/reportCanvasRenderer';


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
  const [previewMode, setPreviewMode] = useState<PreviewMode>('both');
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

          if (colData.drive_in_progress && colData.drive_in_progress.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#fffbeb; color:#92400e;">2. DRIVE IN PROGRESS (${colData.drive_in_progress.length})</td></tr>
              <tr>
                <th style="width:38px; text-align:center;">#</th>
                <th>Company Name</th>
                <th>Role</th>
                <th>CTC</th>
                <th colspan="2">Status / Follow-up</th>
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
              <tr><td colspan="6" class="sec-header" style="background:#eef2ff; color:#3730a3;">3. UPCOMING DRIVES (${colData.companies_in_drive.length})</td></tr>
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
                  <td style="color:#4f46e5; font-weight:bold;">${r.ctc_lpa || r.ctc || '—'}</td>
                  <td colspan="2">${r.current_status_text || r.status || 'Upcoming Drive'}</td>
                </tr>
              `;
            });
          }

          if (colData.in_progress && colData.in_progress.length > 0) {
            html += `
              <tr><td colspan="6" class="sec-header" style="background:#eff6ff; color:#1e40af;">4. COMPANIES IN PROGRESS (${colData.in_progress.length})</td></tr>
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
      } else if (
        report.template_type !== 'pending_tasks' &&
        report.template_type !== 'month_end' &&
        report.template_type !== 'active_leads'
      ) {
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

    // Section 2: Drive in Progress
    if (report.sections?.drive_in_progress && report.sections.drive_in_progress.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fffbeb; color:#92400e;">2. DRIVE IN PROGRESS (${report.sections.drive_in_progress.length} Drives)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status / Follow-up</th>
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
        <tr><td colspan="5" class="sec-header" style="background:#eef2ff; color:#3730a3;">3. UPCOMING DRIVES (${upDrives.length} Drives)</td></tr>
        <tr>
          <th style="width:38px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role</th>
          <th>CTC</th>
          <th>Status / Drive Date</th>
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
        <tr><td colspan="5" class="sec-header">4. COMPANIES IN PROGRESS (${report.sections.in_progress.length} Drives)</td></tr>
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
        <tr><td colspan="5" class="sec-header">5. COMPANIES IN PIPELINE (${report.sections.pipeline.length} Leads)</td></tr>
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
        <tr><td colspan="5" class="sec-header">6. TOP COMPANIES (${report.sections.top_companies.length} Companies)</td></tr>
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
        <tr><td colspan="5" class="sec-header" style="background:#fef2f2; color:#991b1b;">7. REJECTED COMPANIES (${rejRows.length} Declined)</td></tr>
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

    // Section 8: Companies On Hold By College
    const holdColRows = report.sections?.on_hold_by_college || report.sections?.rejected_by_college;
    if (holdColRows && holdColRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fff7ed; color:#9a3412;">8. COMPANIES ON HOLD BY COLLEGE (${holdColRows.length} Holds)</td></tr>
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

    // Section 9: Companies On Hold By HR
    const holdHrRows = report.sections?.on_hold_by_hr;
    if (holdHrRows && holdHrRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#f1f5f9; color:#334155;">9. COMPANIES ON HOLD BY HR (${holdHrRows.length} Holds)</td></tr>
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
          <tr><td colspan="${colSpan}" class="sec-header">${secIdx + 1}. ${sec.title} (${sec.list.length} Companies)</td></tr>
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

  // Export as Ultra High-Definition PNG Image
  const [exportingImage, setExportingImage] = useState(false);

  const handleExportImage = async () => {
    setExportingImage(true);
    try {
      await exportReportAsImage(report);
    } catch (err) {
      console.error('High-res PNG export failed:', err);
    } finally {
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
            <div className="w-full flex items-center justify-center">
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
                  <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 bg-[#0a2540] text-white rounded-xl shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#007791] text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
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
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                        {colData.total_completed || 0} Completed
                      </span>
                      {(colData.total_drive_in_progress || (colData.drive_in_progress && colData.drive_in_progress.length) || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                          {colData.total_drive_in_progress || colData.drive_in_progress.length} Drive in Progress
                        </span>
                      )}
                      {((colData.total_upcoming_drives || colData.total_in_drive || 0) > 0 || (colData.upcoming_drives && colData.upcoming_drives.length > 0) || (colData.companies_in_drive && colData.companies_in_drive.length > 0)) && (
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-200 border border-orange-400/30">
                          {colData.total_upcoming_drives || colData.total_in_drive || colData.upcoming_drives?.length || colData.companies_in_drive?.length} Upcoming Drives
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                        {colData.total_in_progress || 0} In Progress
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/30 font-bold">
                        {colData.total_offers || 0} Offers
                      </span>
                    </div>
                  </div>

                  {/* 1. Companies Completed Table */}
                  {report.included_sections?.completed_companies !== false && (
                    <div className="space-y-1.5">
                      <div className="mb-1.5">
                        <h4 className="text-[12px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                          <Trophy size={13} className="text-[#007791] shrink-0" /> 1. COMPANIES COMPLETED {hasCompleted ? `(${colData.completed_companies.length})` : ''}
                        </h4>
                        <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                      </div>
                      {!hasCompleted ? (
                        <p className="text-[10.5px] text-slate-400 italic px-1 py-0.5">
                          No completed drives for this institution during this period.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <table className="w-full text-[10.5px] border-collapse table-fixed bg-white dark:bg-slate-900">
                            <colgroup>
                              <col style={{ width: '36px' }} />
                              <col style={{ width: '25%' }} />
                              <col style={{ width: '23%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '27%' }} />
                              <col style={{ width: '12%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                                <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                                <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                                <th className="py-1.5 px-2 text-center font-bold">Role</th>
                                <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                                <th className="py-1.5 px-2 text-center font-bold">Status</th>
                                <th className="py-1.5 px-1 text-center font-bold">Offers</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                              {colData.completed_companies.map((r: any, rIdx: number) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                                  <td className="py-1.5 px-1 text-center font-bold text-[#007791]">{r.s_no || rIdx + 1}</td>
                                  <td className="py-1.5 px-2 font-bold text-[#0a2540] dark:text-slate-100 text-center whitespace-normal break-words leading-snug">{r.company_name}</td>
                                  <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 text-center whitespace-normal break-words leading-snug">{r.job_role}</td>
                                  <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">{r.ctc_lpa}</td>
                                  <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 text-center whitespace-normal break-words leading-snug">{r.current_status_text}</td>
                                  <td className="py-1.5 px-1 font-bold text-emerald-600 dark:text-emerald-400 text-center whitespace-nowrap">{r.selected_count || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Drive in Progress Table */}
                  {report.included_sections?.drive_in_progress !== false && (colData.drive_in_progress || colData.drive_in_progress_companies) && (colData.drive_in_progress || colData.drive_in_progress_companies).length > 0 && (
                    <div className="space-y-1.5">
                      <div className="mb-1.5">
                        <h4 className="text-[12px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                          <Zap size={13} className="text-[#007791] shrink-0" /> 2. DRIVE IN PROGRESS ({(colData.drive_in_progress || colData.drive_in_progress_companies).length})
                        </h4>
                        <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                      </div>
                      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-[10.5px] border-collapse table-fixed bg-white dark:bg-slate-900">
                          <colgroup>
                            <col style={{ width: '36px' }} />
                            <col style={{ width: '27%' }} />
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '35%' }} />
                          </colgroup>
                          <thead>
                            <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                              <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                              <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                              <th className="py-1.5 px-2 text-center font-bold">Role</th>
                              <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                              <th className="py-1.5 px-2 text-center font-bold">Status / Follow-up</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                            {(colData.drive_in_progress || colData.drive_in_progress_companies).map((r: any, rIdx: number) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                                <td className="py-1.5 px-1 text-center font-bold text-[#007791]">{r.s_no || rIdx + 1}</td>
                                <td className="py-1.5 px-2 font-bold text-[#0a2540] dark:text-slate-100 text-center whitespace-normal break-words leading-snug">{r.company_name}</td>
                                <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 text-center whitespace-normal break-words leading-snug">{r.job_role || r.role || '—'}</td>
                                <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">{r.ctc_lpa || r.ctc || 'Competitive'}</td>
                                <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 text-center whitespace-normal break-words leading-snug">{r.current_status_text || r.status || 'Drive in progress'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. Upcoming Drives Table */}
                  {(report.included_sections?.upcoming_drives !== false && report.included_sections?.companies_in_drive !== false) && (colData.upcoming_drives || colData.companies_in_drive) && (colData.upcoming_drives || colData.companies_in_drive).length > 0 && (
                    <div className="space-y-1.5">
                      <div className="mb-1.5">
                        <h4 className="text-[12px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                          <Flame size={13} className="text-[#007791] shrink-0" /> 3. UPCOMING DRIVES ({(colData.upcoming_drives || colData.companies_in_drive).length})
                        </h4>
                        <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                      </div>
                      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-[10.5px] border-collapse table-fixed bg-white dark:bg-slate-900">
                          <colgroup>
                            <col style={{ width: '36px' }} />
                            <col style={{ width: '27%' }} />
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '35%' }} />
                          </colgroup>
                          <thead>
                            <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                              <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                              <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                              <th className="py-1.5 px-2 text-center font-bold">Role</th>
                              <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                              <th className="py-1.5 px-2 text-center font-bold">Status / Drive Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                            {(colData.upcoming_drives || colData.companies_in_drive).map((r: any, rIdx: number) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                                <td className="py-1.5 px-1 text-center font-bold text-[#007791]">{r.s_no || rIdx + 1}</td>
                                <td className="py-1.5 px-2 font-bold text-[#0a2540] dark:text-slate-100 text-center whitespace-normal break-words leading-snug">{r.company_name}</td>
                                <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 text-center whitespace-normal break-words leading-snug">{r.job_role || r.role || '—'}</td>
                                <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">{r.ctc_lpa || r.ctc || 'Competitive'}</td>
                                <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 text-center whitespace-normal break-words leading-snug">{r.current_status_text || r.status || 'Upcoming drive'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 4. In Progress Table */}
                  {report.included_sections?.in_progress !== false && (
                    <div className="space-y-1.5">
                      <div className="mb-1.5">
                        <h4 className="text-[12px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                          <Clock size={13} className="text-[#007791] shrink-0" /> 4. IN PROGRESS {hasProgress ? `(${colData.in_progress.length})` : ''}
                        </h4>
                        <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                      </div>
                      {!hasProgress ? (
                        <p className="text-[10.5px] text-slate-400 italic px-1 py-0.5">
                          No drives currently in progress for this institution.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <table className="w-full text-[10.5px] border-collapse table-fixed bg-white dark:bg-slate-900">
                            <colgroup>
                              <col style={{ width: '36px' }} />
                              <col style={{ width: '27%' }} />
                              <col style={{ width: '25%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '35%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                                <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                                <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                                <th className="py-1.5 px-2 text-center font-bold">Role</th>
                                <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                                <th className="py-1.5 px-2 text-center font-bold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                              {colData.in_progress.map((r: any, rIdx: number) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                                  <td className="py-1.5 px-1 text-center font-bold text-[#007791]">{r.s_no || rIdx + 1}</td>
                                  <td className="py-1.5 px-2 font-bold text-[#0a2540] dark:text-slate-100 text-center whitespace-normal break-words leading-snug">{r.company_name}</td>
                                  <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 text-center whitespace-normal break-words leading-snug">{r.job_role}</td>
                                  <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">{r.ctc_lpa}</td>
                                  <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 text-center whitespace-normal break-words leading-snug">{r.current_status_text}</td>
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

        {/* ── Single College Weekly Placement Report (Editable Tables) ── */}
        {!report.is_multi_college &&
          report.template_type !== 'pending_tasks' &&
          report.template_type !== 'month_end' &&
          report.template_type !== 'active_leads' && (
          <div className="space-y-4">
            {/* Section 1: Completed Companies */}
            {report.included_sections?.completed_companies && report.sections?.completed_companies && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Trophy size={14} className="text-[#007791] shrink-0" /> 1. COMPANIES COMPLETED
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {report.sections.completed_companies.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No completed companies recorded for this period.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '23%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '12%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status</th>
                          <th className="py-2 px-2 text-center font-bold">Offers Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {report.sections.completed_companies.map((r: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                            <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                            <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) => handleUpdateCell('completed_companies', idx, 'company_name', val)}
                                className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.job_role}
                                onChange={(val) => handleUpdateCell('completed_companies', idx, 'job_role', val)}
                                className="text-slate-700 dark:text-slate-300 text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.ctc_lpa}
                                onChange={(val) => handleUpdateCell('completed_companies', idx, 'ctc_lpa', val)}
                                className="font-bold text-[#007791] text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.current_status_text}
                                onChange={(val) => handleUpdateCell('completed_companies', idx, 'current_status_text', val)}
                                className="text-slate-600 dark:text-slate-400 text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.selected_count}
                                onChange={(val) => handleUpdateCell('completed_companies', idx, 'selected_count', val)}
                                className="font-bold text-emerald-600 dark:text-emerald-400 text-center"
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

            {/* Section 2: Drive in Progress */}
            {report.included_sections?.drive_in_progress !== false && report.sections?.drive_in_progress && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Zap size={14} className="text-[#007791] shrink-0" /> 2. DRIVE IN PROGRESS
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {report.sections.drive_in_progress.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No active drives in progress today.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status / Drive Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {report.sections.drive_in_progress.map((r: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                            <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                            <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) => handleUpdateCell('drive_in_progress', idx, 'company_name', val)}
                                className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.job_role || r.role || ''}
                                onChange={(val) => handleUpdateCell('drive_in_progress', idx, 'job_role', val)}
                                className="text-slate-700 dark:text-slate-300 text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.ctc_lpa || r.ctc || ''}
                                onChange={(val) => handleUpdateCell('drive_in_progress', idx, 'ctc_lpa', val)}
                                className="font-bold text-[#007791] text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.current_status_text || r.status || ''}
                                onChange={(val) => handleUpdateCell('drive_in_progress', idx, 'current_status_text', val)}
                                className="text-slate-600 dark:text-slate-400 text-center"
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

            {/* Section 3: Upcoming Drives */}
            {(report.included_sections?.upcoming_drives !== false && report.included_sections?.companies_in_drive !== false) && (report.sections?.upcoming_drives || report.sections?.companies_in_drive) && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Flame size={14} className="text-[#007791] shrink-0" /> 3. UPCOMING DRIVES
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {((report.sections?.upcoming_drives || report.sections?.companies_in_drive) || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No upcoming recruitment drives scheduled.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status / Drive Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {(report.sections?.upcoming_drives || report.sections?.companies_in_drive).map((r: any, idx: number) => {
                          const secKey = report.sections?.upcoming_drives ? 'upcoming_drives' : 'companies_in_drive';
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                              <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.company_name}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'company_name', val)}
                                  className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                                />
                              </td>
                              <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.job_role || r.role || ''}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'job_role', val)}
                                  className="text-slate-700 dark:text-slate-300 text-center"
                                />
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.ctc_lpa || r.ctc || ''}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'ctc_lpa', val)}
                                  className="font-bold text-[#007791] text-center"
                                />
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.current_status_text || r.status || ''}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'current_status_text', val)}
                                  className="text-slate-600 dark:text-slate-400 text-center"
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

            {/* Section 4: In Progress Drives */}
            {report.included_sections?.in_progress && report.sections?.in_progress && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Rocket size={14} className="text-[#007791] shrink-0" /> 4. COMPANIES IN PROGRESS
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {report.sections.in_progress.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No active drives currently in progress.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {report.sections.in_progress.map((r: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                            <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                            <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) => handleUpdateCell('in_progress', idx, 'company_name', val)}
                                className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.job_role}
                                onChange={(val) => handleUpdateCell('in_progress', idx, 'job_role', val)}
                                className="text-slate-700 dark:text-slate-300 text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.ctc_lpa}
                                onChange={(val) => handleUpdateCell('in_progress', idx, 'ctc_lpa', val)}
                                className="font-bold text-[#007791] text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.current_status_text}
                                onChange={(val) => handleUpdateCell('in_progress', idx, 'current_status_text', val)}
                                className="text-slate-600 dark:text-slate-400 text-center"
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

            {/* Section 5: Companies in Pipeline */}
            {report.included_sections?.pipeline && report.sections?.pipeline && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Inbox size={14} className="text-[#007791] shrink-0" /> 5. COMPANIES IN PIPELINE
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {report.sections.pipeline.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No pipeline leads recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {report.sections.pipeline.map((r: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                            <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                            <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) => handleUpdateCell('pipeline', idx, 'company_name', val)}
                                className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.job_role}
                                onChange={(val) => handleUpdateCell('pipeline', idx, 'job_role', val)}
                                className="text-slate-700 dark:text-slate-300 text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.ctc_lpa}
                                onChange={(val) => handleUpdateCell('pipeline', idx, 'ctc_lpa', val)}
                                className="font-bold text-[#007791] text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.current_status_text}
                                onChange={(val) => handleUpdateCell('pipeline', idx, 'current_status_text', val)}
                                className="text-slate-600 dark:text-slate-400 text-center"
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

            {/* Section 6: Top Companies */}
            {report.included_sections?.top_companies && report.sections?.top_companies && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Star size={14} className="text-[#007791] shrink-0" /> 6. TOP COMPANIES
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {report.sections.top_companies.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No top companies recorded for this period.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {report.sections.top_companies.map((r: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                            <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                            <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) => handleUpdateCell('top_companies', idx, 'company_name', val)}
                                className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.job_role}
                                onChange={(val) => handleUpdateCell('top_companies', idx, 'job_role', val)}
                                className="text-slate-700 dark:text-slate-300 text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.ctc_lpa}
                                onChange={(val) => handleUpdateCell('top_companies', idx, 'ctc_lpa', val)}
                                className="font-bold text-[#007791] text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.current_status_text}
                                onChange={(val) => handleUpdateCell('top_companies', idx, 'current_status_text', val)}
                                className="text-slate-600 dark:text-slate-400 text-center"
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

            {/* Section 7: Rejected Companies */}
            {(report.included_sections?.rejected_companies || report.included_sections?.rejected_by_hr) && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <XCircle size={14} className="text-[#007791] shrink-0" /> 7. REJECTED COMPANIES
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {(report.sections?.rejected_companies || report.sections?.rejected_by_hr || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No rejected companies recorded for this period.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status / Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {(report.sections?.rejected_companies || report.sections?.rejected_by_hr || []).map((r: any, idx: number) => {
                          const secKey = report.sections?.rejected_companies ? 'rejected_companies' : 'rejected_by_hr';
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                              <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.company_name}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'company_name', val)}
                                  className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                                />
                              </td>
                              <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.job_role}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'job_role', val)}
                                  className="text-slate-700 dark:text-slate-300 text-center"
                                />
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.ctc_lpa}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'ctc_lpa', val)}
                                  className="font-bold text-[#007791] text-center"
                                />
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.current_status_text}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'current_status_text', val)}
                                  className="text-slate-600 dark:text-slate-400 text-center"
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

            {/* Section 8: Companies On Hold By College */}
            {(report.included_sections?.on_hold_by_college || report.included_sections?.rejected_by_college) && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Clock size={14} className="text-[#007791] shrink-0" /> 8. COMPANIES ON HOLD BY COLLEGE
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {(report.sections?.on_hold_by_college || report.sections?.rejected_by_college || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No companies currently on hold by college.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status / Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {(report.sections?.on_hold_by_college || report.sections?.rejected_by_college || []).map((r: any, idx: number) => {
                          const secKey = report.sections?.on_hold_by_college ? 'on_hold_by_college' : 'rejected_by_college';
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                              <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.company_name}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'company_name', val)}
                                  className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                                />
                              </td>
                              <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.job_role}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'job_role', val)}
                                  className="text-slate-700 dark:text-slate-300 text-center"
                                />
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.ctc_lpa}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'ctc_lpa', val)}
                                  className="font-bold text-[#007791] text-center"
                                />
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                                <EditableReportCell
                                  value={r.current_status_text}
                                  onChange={(val) => handleUpdateCell(secKey, idx, 'current_status_text', val)}
                                  className="text-slate-600 dark:text-slate-400 text-center"
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

            {/* Section 9: Companies On Hold By HR */}
            {report.included_sections?.on_hold_by_hr && (
              <div className="space-y-1.5">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <Clock size={14} className="text-[#007791] shrink-0" /> 9. COMPANIES ON HOLD BY HR
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                {(report.sections?.on_hold_by_hr || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">No companies currently on hold by HR.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '32%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-3 text-center font-bold">Company Name</th>
                          <th className="py-2 px-3 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-3 text-center font-bold">Status / Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {(report.sections?.on_hold_by_hr || []).map((r: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                            <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                            <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.company_name}
                                onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'company_name', val)}
                                className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.job_role}
                                onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'job_role', val)}
                                className="text-slate-700 dark:text-slate-300 text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.ctc_lpa}
                                onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'ctc_lpa', val)}
                                className="font-bold text-[#007791] text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                              <EditableReportCell
                                value={r.current_status_text}
                                onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'current_status_text', val)}
                                className="text-slate-600 dark:text-slate-400 text-center"
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
          </div>
        )}

        {/* ── Section: Placement Pending Tasks (Section-wise 3 Tables with Row Highlights & Inline Editing) ── */}
        {report.included_sections?.pending_tasks && report.sections?.pending_tasks && (() => {
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
            { key: 'drive_in_progress', title: 'DRIVE IN PROGRESS', icon: Flame, list: sec1 },
            { key: 'companies_in_drive', title: 'COMPANIES IN DRIVE', icon: Calendar, list: sec2 },
            { key: 'company_in_progress', title: 'COMPANY IN PROGRESS', icon: Clock, list: sec3 },
          ].filter((s) => s.list.length > 0);

          if (pendingSections.length === 0) {
            return (
              <div className="space-y-1.5 pt-2">
                <div className="mb-2">
                  <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                    <ListTodo size={14} className="text-[#007791] shrink-0" /> PLACEMENT PENDING TASKS
                  </h3>
                  <div className="h-[2px] w-full bg-[#007791] mt-1" />
                </div>
                <p className="text-[11px] text-slate-400 italic py-1 pl-1">No pending tasks recorded for this period.</p>
              </div>
            );
          }

          return (
            <div className="space-y-6 pt-2">
              {pendingSections.map((sec, secIdx) => (
                <div key={sec.key} className="space-y-1.5">
                  <div className="mb-2">
                    <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                      <sec.icon size={14} className="text-[#007791] shrink-0" /> {secIdx + 1}. {sec.title}
                    </h3>
                    <div className="h-[2px] w-full bg-[#007791] mt-1" />
                  </div>
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-[10.5px] border-collapse table-fixed bg-white dark:bg-slate-900">
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '34%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                          <th className="py-2 px-1 text-center font-bold">#</th>
                          <th className="py-2 px-2.5 text-center font-bold">Company Name</th>
                          <th className="py-2 px-2 text-center font-bold">Role</th>
                          <th className="py-2 px-1.5 text-center font-bold">CTC</th>
                          <th className="py-2 px-2.5 text-center font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {sec.list.map((r: any, rowIdx: number) => {
                          const originalIdx = allTasks.findIndex(
                            (t: any) =>
                              t._id === r._id ||
                              (t.company_name === r.company_name && (t.role === r.role || t.job_role === r.job_role))
                          );
                          const targetIdx = originalIdx >= 0 ? originalIdx : rowIdx;
                          const isHl = Boolean(r.is_highlighted);
                          const hlBg = r.highlight_color || '#fef08a';
                          const roleVal = r.role || r.job_role || '';
                          const ctcVal = r.ctc || r.ctc_lpa || r.package_details || '';
                          const statusVal =
                            r.status ||
                            r.current_status_text ||
                            r.action_to_be_taken ||
                            r.current_status ||
                            r.remarks ||
                            '';
                          return (
                            <tr
                              key={r._id || rowIdx}
                              style={isHl ? { backgroundColor: hlBg } : undefined}
                              className={
                                isHl
                                  ? 'font-semibold text-slate-950'
                                  : 'bg-white dark:bg-slate-950'
                              }
                            >
                              <td
                                className="py-2 px-1 text-center font-bold text-[#007791]"
                                style={{ backgroundColor: isHl ? hlBg : undefined }}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    title={isHl ? 'Remove highlight' : 'Highlight this row'}
                                    onClick={() => {
                                      const next = !isHl;
                                      handleUpdateCell('pending_tasks', targetIdx, 'is_highlighted', next);
                                      if (next && !r.highlight_color) {
                                        handleUpdateCell('pending_tasks', targetIdx, 'highlight_color', '#fef08a');
                                      }
                                    }}
                                    className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 ${
                                      isHl
                                        ? 'border-amber-600 bg-amber-400'
                                        : 'border-slate-300 hover:border-slate-500 bg-transparent'
                                    }`}
                                  />
                                  <span>{rowIdx + 1}</span>
                                </div>
                              </td>
                              <td
                                className="py-2 px-2.5 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug"
                                style={{ backgroundColor: isHl ? hlBg : undefined }}
                              >
                                <EditableReportCell
                                  value={r.company_name}
                                  onChange={(val) =>
                                    handleUpdateCell('pending_tasks', targetIdx, 'company_name', val)
                                  }
                                  className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                                />
                              </td>
                              <td
                                className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug"
                                style={{ backgroundColor: isHl ? hlBg : undefined }}
                              >
                                <EditableReportCell
                                  value={roleVal}
                                  onChange={(val) => {
                                    handleUpdateCell('pending_tasks', targetIdx, 'role', val);
                                    handleUpdateCell('pending_tasks', targetIdx, 'job_role', val);
                                  }}
                                  className="text-slate-700 dark:text-slate-300 text-center"
                                />
                              </td>
                              <td
                                className="py-2 px-1.5 text-center text-slate-700 dark:text-slate-300 whitespace-nowrap leading-snug font-semibold"
                                style={{ backgroundColor: isHl ? hlBg : undefined }}
                              >
                                <EditableReportCell
                                  value={ctcVal}
                                  onChange={(val) => {
                                    handleUpdateCell('pending_tasks', targetIdx, 'ctc', val);
                                    handleUpdateCell('pending_tasks', targetIdx, 'ctc_lpa', val);
                                  }}
                                  className="text-slate-700 dark:text-slate-300 text-center font-semibold"
                                />
                              </td>
                              <td
                                className="py-2 px-2.5 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug"
                                style={{ backgroundColor: isHl ? hlBg : undefined }}
                              >
                                <EditableReportCell
                                  value={statusVal}
                                  onChange={(val) => {
                                    handleUpdateCell('pending_tasks', targetIdx, 'status', val);
                                    handleUpdateCell('pending_tasks', targetIdx, 'current_status', val);
                                    handleUpdateCell('pending_tasks', targetIdx, 'action_to_be_taken', val);
                                  }}
                                  className="text-slate-700 dark:text-slate-300 text-center"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Section: Active Corporate Leads ── */}
        {report.included_sections?.active_leads && report.sections?.active_leads && (
          <div className="space-y-1.5 pt-2">
            <div className="mb-2">
              <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#007791] shrink-0" /> ACTIVE CORPORATE LEADS — {String(report.kpi_summary?.graduating_year || report.academic_year || '2027').toUpperCase()}
              </h3>
              <div className="h-[2px] w-full bg-[#007791] mt-1" />
            </div>

            {report.sections.active_leads.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1 pl-1">No active leads recorded for this graduating batch.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                  <colgroup>
                    <col style={{ width: '42px' }} />
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '28%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                      <th className="py-2 px-1 text-center font-bold">S.No</th>
                      <th className="py-2 px-3 text-center font-bold">Company Name</th>
                      <th className="py-2 px-3 text-center font-bold">Role</th>
                      <th className="py-2 px-3 text-center font-bold">CTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                    {report.sections.active_leads.map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                        <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) => handleUpdateCell('active_leads', idx, 'company_name', val)}
                            className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.role}
                            onChange={(val) => handleUpdateCell('active_leads', idx, 'role', val)}
                            className="text-slate-700 dark:text-slate-300 text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.ctc}
                            onChange={(val) => handleUpdateCell('active_leads', idx, 'ctc', val)}
                            className="font-bold text-[#007791] text-center"
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

        {/* ── Month-End Section Tables (Editable) ── */}
        {/* Month-End Table 1: Completed Companies */}
        {report.template_type === 'month_end' && report.included_sections?.completed_companies && report.sections?.completed_companies && (
          <div className="space-y-1.5 pt-2">
            <div className="mb-2">
              <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <Trophy size={14} className="text-[#007791] shrink-0" /> 1. COMPANIES COMPLETED
              </h3>
              <div className="h-[2px] w-full bg-[#007791] mt-1" />
            </div>

            {report.sections.completed_companies.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1 pl-1">No completed drives recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                  <colgroup>
                    <col style={{ width: '42px' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '11%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                      <th className="py-2 px-1 text-center font-bold">S.No</th>
                      <th className="py-2 px-3 text-center font-bold">Company Name</th>
                      <th className="py-2 px-3 text-center font-bold">Role</th>
                      <th className="py-2 px-2 text-center font-bold">CTC</th>
                      <th className="py-2 px-3 text-center font-bold">Status</th>
                      <th className="py-2 px-2 text-center font-bold">Offers Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                    {report.sections.completed_companies.map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                        <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) => handleUpdateCell('completed_companies', idx, 'company_name', val)}
                            className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.role || r.job_role || ''}
                            onChange={(val) => handleUpdateCell('completed_companies', idx, 'role', val)}
                            className="text-slate-700 dark:text-slate-300 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.ctc || r.ctc_lpa || ''}
                            onChange={(val) => handleUpdateCell('completed_companies', idx, 'ctc', val)}
                            className="font-bold text-[#007791] text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.status || r.current_status_text || 'Drive Completed'}
                            onChange={(val) => handleUpdateCell('completed_companies', idx, 'status', val)}
                            className="text-slate-600 dark:text-slate-400 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.offers_received ?? r.selected_count ?? 0}
                            onChange={(val) => handleUpdateCell('completed_companies', idx, 'offers_received', val)}
                            className="font-bold text-emerald-600 dark:text-emerald-400 text-center"
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
          <div className="space-y-1.5 pt-2">
            <div className="mb-2">
              <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <Briefcase size={14} className="text-[#007791] shrink-0" /> 2. JD RECEIVED COMPANIES
              </h3>
              <div className="h-[2px] w-full bg-[#007791] mt-1" />
            </div>

            {report.sections.company_conversions.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1 pl-1">No JD received companies recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                  <colgroup>
                    <col style={{ width: '42px' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '11.5%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                      <th className="py-2 px-1 text-center font-bold">S.No</th>
                      <th className="py-2 px-3 text-center font-bold">Company Name</th>
                      <th className="py-2 px-3 text-center font-bold">Role</th>
                      <th className="py-2 px-2 text-center font-bold">CTC</th>
                      <th className="py-2 px-3 text-center font-bold">JD Received Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                    {report.sections.company_conversions.map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                        <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) => handleUpdateCell('company_conversions', idx, 'company_name', val)}
                            className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.role}
                            onChange={(val) => handleUpdateCell('company_conversions', idx, 'role', val)}
                            className="text-slate-700 dark:text-slate-300 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.ctc}
                            onChange={(val) => handleUpdateCell('company_conversions', idx, 'ctc', val)}
                            className="font-bold text-[#007791] text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.jd_received_date}
                            onChange={(val) => handleUpdateCell('company_conversions', idx, 'jd_received_date', val)}
                            className="text-slate-600 dark:text-slate-400 text-center"
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
          <div className="space-y-1.5 pt-2">
            <div className="mb-2">
              <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <Calendar size={14} className="text-[#007791] shrink-0" /> 3. COMPANIES IN DRIVE
              </h3>
              <div className="h-[2px] w-full bg-[#007791] mt-1" />
            </div>

            {(report.sections.companies_in_drive || report.sections.company_drives_scheduled).length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1 pl-1">No companies in drive recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                  <colgroup>
                    <col style={{ width: '42px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                      <th className="py-2 px-1 text-center font-bold">S.No</th>
                      <th className="py-2 px-3 text-center font-bold">Company Name</th>
                      <th className="py-2 px-3 text-center font-bold">Role</th>
                      <th className="py-2 px-2 text-center font-bold">CTC</th>
                      <th className="py-2 px-3 text-center font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                    {(report.sections.companies_in_drive || report.sections.company_drives_scheduled).map((r: any, idx: number) => {
                      const secKey = report.sections?.companies_in_drive ? 'companies_in_drive' : 'company_drives_scheduled';
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                          <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                          <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                            <EditableReportCell
                              value={r.company_name}
                              onChange={(val) => handleUpdateCell(secKey, idx, 'company_name', val)}
                              className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                            />
                          </td>
                          <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                            <EditableReportCell
                              value={r.role || ''}
                              onChange={(val) => handleUpdateCell(secKey, idx, 'role', val)}
                              className="text-slate-700 dark:text-slate-300 text-center"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                            <EditableReportCell
                              value={r.ctc || ''}
                              onChange={(val) => handleUpdateCell(secKey, idx, 'ctc', val)}
                              className="font-bold text-[#007791] text-center"
                            />
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                            <EditableReportCell
                              value={r.status || r.current_status_text || ''}
                              onChange={(val) => handleUpdateCell(secKey, idx, 'status', val)}
                              className="text-slate-600 dark:text-slate-400 text-center"
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
          <div className="space-y-1.5 pt-2">
            <div className="mb-2">
              <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <Clock size={14} className="text-[#007791] shrink-0" /> 4. COMPANIES ON HOLD BY TPO
              </h3>
              <div className="h-[2px] w-full bg-[#007791] mt-1" />
            </div>

            {report.sections.on_hold_by_college.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1 pl-1">No companies on hold by TPO recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                  <colgroup>
                    <col style={{ width: '42px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                      <th className="py-2 px-1 text-center font-bold">S.No</th>
                      <th className="py-2 px-3 text-center font-bold">Company Name</th>
                      <th className="py-2 px-3 text-center font-bold">Role</th>
                      <th className="py-2 px-2 text-center font-bold">CTC</th>
                      <th className="py-2 px-3 text-center font-bold">Status / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                    {report.sections.on_hold_by_college.map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                        <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) => handleUpdateCell('on_hold_by_college', idx, 'company_name', val)}
                            className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.role || ''}
                            onChange={(val) => handleUpdateCell('on_hold_by_college', idx, 'role', val)}
                            className="text-slate-700 dark:text-slate-300 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.ctc || ''}
                            onChange={(val) => handleUpdateCell('on_hold_by_college', idx, 'ctc', val)}
                            className="font-bold text-[#007791] text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.status || r.remarks || ''}
                            onChange={(val) => handleUpdateCell('on_hold_by_college', idx, 'status', val)}
                            className="text-slate-600 dark:text-slate-400 text-center"
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
          <div className="space-y-1.5 pt-2">
            <div className="mb-2">
              <h3 className="text-[13px] font-bold text-[#0a2540] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <AlertCircle size={14} className="text-[#007791] shrink-0" /> 5. COMPANIES ON HOLD BY HR
              </h3>
              <div className="h-[2px] w-full bg-[#007791] mt-1" />
            </div>

            {report.sections.on_hold_by_hr.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1 pl-1">No companies on hold by HR recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-[11px] border-collapse table-fixed bg-white dark:bg-slate-900">
                  <colgroup>
                    <col style={{ width: '42px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                      <th className="py-2 px-1 text-center font-bold">S.No</th>
                      <th className="py-2 px-3 text-center font-bold">Company Name</th>
                      <th className="py-2 px-3 text-center font-bold">Role</th>
                      <th className="py-2 px-2 text-center font-bold">CTC</th>
                      <th className="py-2 px-3 text-center font-bold">Status / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                    {report.sections.on_hold_by_hr.map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#f0f7f9] dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}>
                        <td className="py-2 px-1 text-center font-bold text-[#007791]">{r.s_no}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#0a2540] dark:text-slate-100 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.company_name}
                            onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'company_name', val)}
                            className="font-bold text-[#0a2540] dark:text-slate-100 text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.role || ''}
                            onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'role', val)}
                            className="text-slate-700 dark:text-slate-300 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.ctc || ''}
                            onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'ctc', val)}
                            className="font-bold text-[#007791] text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 whitespace-normal break-words leading-snug">
                          <EditableReportCell
                            value={r.status || r.remarks || ''}
                            onChange={(val) => handleUpdateCell('on_hold_by_hr', idx, 'status', val)}
                            className="text-slate-600 dark:text-slate-400 text-center"
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
          className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg border border-border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.992]"
        >
          Back
        </button>

        {/* 2. Interactive Preview Split Button with Dropdown (Side-by-Side, Image, PDF) */}
        <div ref={previewMenuRef} className="relative inline-flex rounded-xl shadow-xs">
          <button
            type="button"
            onClick={() => {
              setPreviewMode('both');
              setShowA4Preview(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-xl text-xs font-bold transition-all cursor-pointer active:scale-[0.992]"
            title="Preview Side-by-Side (Image & PDF)"
          >
            <Eye size={14} strokeWidth={2} aria-hidden /> Preview
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewMenu((prev) => !prev)}
            className="px-2 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-r-xl border-l border-indigo-500/60 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
            title="Choose Preview Mode"
            aria-label="Choose Preview Mode"
          >
            <ChevronDown size={14} className={showPreviewMenu ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200'} />
          </button>

          {/* Mode Dropdown Popover */}
          {showPreviewMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-56 bg-surface-raised border border-border shadow-2xl rounded-xl p-1.5 z-50 animate-fadeIn text-fg">
              <button
                type="button"
                onClick={() => {
                  setPreviewMode('both');
                  setShowA4Preview(true);
                  setShowPreviewMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-2 cursor-pointer mb-1"
              >
                <Columns2 size={14} className="text-indigo-600 shrink-0" />
                <div>
                  <div className="font-bold">Side-by-Side (Both)</div>
                  <div className="text-[10px] text-indigo-500">Image & PDF Split View</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewMode('image');
                  setShowA4Preview(true);
                  setShowPreviewMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-surface-sunken flex items-center gap-2 cursor-pointer text-fg"
              >
                <ImageIcon size={14} className="text-sky-500 shrink-0" />
                <div>
                  <div className="font-bold">Preview Image</div>
                  <div className="text-[10px] text-fg-subtle">Mobile & WhatsApp Canvas</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewMode('pdf');
                  setShowA4Preview(true);
                  setShowPreviewMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-surface-sunken flex items-center gap-2 cursor-pointer text-fg"
              >
                <FileText size={14} className="text-blue-500 shrink-0" />
                <div>
                  <div className="font-bold">Preview PDF</div>
                  <div className="text-[10px] text-fg-subtle">A4 Institutional Printout</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 3. Export Excel (Emerald Green) */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.992]"
        >
          <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Export XLSX
        </button>

        {/* 4. Save Image (Infoziant Sky / Cyan) */}
        <button
          type="button"
          onClick={handleExportImage}
          disabled={exportingImage}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.992]"
        >
          <Download size={14} strokeWidth={2} aria-hidden /> {exportingImage ? 'Saving…' : 'Save Image'}
        </button>

        {/* 5. Save PDF (Infoziant Corporate Navy) */}
        <button
          type="button"
          onClick={handlePrintPdf}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.992]"
        >
          <Download size={14} strokeWidth={2} aria-hidden /> Save PDF
        </button>
      </div>

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
