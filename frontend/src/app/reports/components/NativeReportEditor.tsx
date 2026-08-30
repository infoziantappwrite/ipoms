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
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { A4PdfPreviewModal } from './A4PdfPreviewModal';

const COLLEGE_LOGO_MAP: Record<string, string> = {
  ACET: '/college-logos/acet.png',
  KIOT: '/college-logos/kiot.jfif',
  KLU: '/college-logos/klu.png',
  KPR: '/college-logos/kpr.png',
  KARPAGAM: '/college-logos/karpagam.png',
  AIHT: '/college-logos/aiht.png',
  PSNA: '/college-logos/psna.png',
  SMVEC: '/college-logos/smvec.png',
  DSU: '/college-logos/dsu.png',
  MKCE: '/college-logos/mkce.png',
  SONA: '/college-logos/sona.png',
  KARUNYA: '/college-logos/karunya.png',
  KAMARAJ: '/college-logos/kamaraj.png',
  NPR: '/college-logos/npr.png',
  AVS: '/college-logos/avs.png',
  AAA: '/college-logos/aaa.png',
  KGISL: '/college-logos/kgisl.png',
  SSEI: '/college-logos/sri shanmuga.png',
  NGP: '/college-logos/ngp.png',
  HITS: '/college-logos/hits.png',
  MAR: '/college-logos/mar ephream.png',
  NGCE: '/college-logos/narayanaguru.png',
  ACEW: '/college-logos/ACEW.jfif',
  KCT: '/college-logos/kumaraguru.png',
  PSG: '/college-logos/psg.png',
  LICET: '/college-logos/layola.png',
  PEC: '/college-logos/panimalar.png',
  RTC: '/college-logos/Rathinam - RTC.png',
  SIT: '/college-logos/sethu institue.png',
  SECE: '/college-logos/srieshwar.png',
  SRM: '/college-logos/srm .png',
  VIT: '/college-logos/vit.png',
  KIT: '/college-logos/kit.png',
  EGS: '/college-logos/egs.png',
  GCT: '/college-logos/gnyanamani.png',
  IFET: '/college-logos/ifet.png',
  CHRIST: '/college-logos/christ.png',
  VCE: '/college-logos/vaigai.png',
};

export function getCleanPeriod(period?: string): string {
  if (!period) return '';
  if (period.includes(': ')) {
    const parts = period.split(': ');
    return parts[parts.length - 1].trim();
  }
  if (period.includes('(') && period.includes(')')) {
    const match = period.match(/\((.*?)\)/);
    if (match && match[1]) return match[1].trim();
  }
  return period.trim();
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
          className="mt-3 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold cursor-pointer"
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
          <tr><td colspan="8" style="color:#64748b;">${report.template_type !== 'pending_tasks' ? `Period: ${getCleanPeriod(report.report_period)} | ` : ''}Generated: ${report.generated_date || ''}</td></tr>
          <tr><td colspan="8"></td></tr>
    `;

    // KPI Summary (Excluded for Pending Tasks Report)
    if (report.kpi_summary && report.template_type !== 'pending_tasks') {
      const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
      if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
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
      } else {
        const wpCards = [
          { key: 'total_calls', label: 'Calls', val: report.kpi_summary.total_calls || 0, color: '#1e3a8a' },
          { key: 'positive_responses', label: 'Positives', val: report.kpi_summary.positive_responses || 0, color: '#059669' },
          { key: 'jds_received', label: 'JDs', val: report.kpi_summary.jds_received || 0, color: '#0891b2' },
          { key: 'drives_completed', label: 'Completed', val: report.kpi_summary.drives_completed || 0, color: '#059669' },
          { key: 'drives_in_progress', label: 'In Progress', val: report.kpi_summary.drives_in_progress || 0, color: '#2563eb' },
          { key: 'pipeline_leads', label: 'Pipeline', val: report.kpi_summary.pipeline_leads || 0, color: '#0891b2' },
          { key: 'top_companies_count', label: 'Top Companies', val: report.kpi_summary.top_companies_count || 0, color: '#d97706' },
          { key: 'total_offers', label: 'Offers Placed', val: report.kpi_summary.total_offers || 0, color: '#059669' },
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

    // Section 1: Companies Completed
    if (report.sections?.completed_companies && report.sections.completed_companies.length > 0) {
      html += `
        <tr><td colspan="6" class="sec-header">1. COMPANIES COMPLETED (${report.sections.completed_companies.length} Drives)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
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

    // Section 2: Companies In Progress
    if (report.sections?.in_progress && report.sections.in_progress.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">2. COMPANIES IN PROGRESS (${report.sections.in_progress.length} Drives)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
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

    // Section 3: Companies in Pipeline
    if (report.sections?.pipeline && report.sections.pipeline.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">3. COMPANIES IN PIPELINE (${report.sections.pipeline.length} Leads)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
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

    // Section 4: Top Companies
    if (report.sections?.top_companies && report.sections.top_companies.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header">4. TOP COMPANIES (${report.sections.top_companies.length} Companies)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
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

    // Section 5: Rejected Companies
    const rejRows = report.sections?.rejected_companies || report.sections?.rejected_by_hr;
    if (rejRows && rejRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fef2f2; color:#991b1b;">5. REJECTED COMPANIES (${rejRows.length} Declined)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
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

    // Section 6: Companies On Hold By College
    const holdColRows = report.sections?.on_hold_by_college || report.sections?.rejected_by_college;
    if (holdColRows && holdColRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#fff7ed; color:#9a3412;">6. COMPANIES ON HOLD BY COLLEGE (${holdColRows.length} Holds)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
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

    // Section 7: Companies On Hold By HR
    const holdHrRows = report.sections?.on_hold_by_hr;
    if (holdHrRows && holdHrRows.length > 0) {
      html += `
        <tr><td colspan="5" class="sec-header" style="background:#f1f5f9; color:#334155;">7. COMPANIES ON HOLD BY HR (${holdHrRows.length} Holds)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
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

    // Section: Placement Pending Tasks
    if (report.sections?.pending_tasks && report.sections.pending_tasks.length > 0) {
      const hasDriveDate = report.sections.pending_tasks.some(
        (r: any) => r.drive_date && String(r.drive_date).trim() !== '' && String(r.drive_date).trim() !== '—' && String(r.drive_date).trim() !== '-'
      );
      const colSpan = hasDriveDate ? 7 : 6;

      html += `
        <tr><td colspan="${colSpan}" class="sec-header">PLACEMENT PENDING TASKS (${report.sections.pending_tasks.length} Tasks)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>JD Received Date</th>
          <th>DB Shared Date</th>
          <th>Current Status</th>
          <th>Remarks / Next Action</th>
          ${hasDriveDate ? '<th>Drive Date</th>' : ''}
        </tr>
      `;
      report.sections.pending_tasks.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.jd_received_date || '—'}</td>
            <td>${r.db_shared_date || '—'}</td>
            <td>${r.current_status || '—'}</td>
            <td>${r.action_to_be_taken || '—'}</td>
            ${hasDriveDate ? `<td style="color:#7c3aed; font-weight:bold;">${r.drive_date || '—'}</td>` : ''}
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
          <th style="width:50px; text-align:center;">#</th>
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

    // Remarks
    if (report.remarks) {
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

    let excelAcronym = (report.branding?.college_code || '').trim().toUpperCase();
    if (!excelAcronym || excelAcronym === 'IPOMS' || excelAcronym === 'COLLEGE') {
      const cName = report.branding?.college_name || '';
      const parenMatch = cName.match(/\((.*?)\)/);
      if (parenMatch && parenMatch[1]) {
        excelAcronym = parenMatch[1].trim().toUpperCase();
      }
    }
    const excelBaseTitle = (report.report_title || 'Weekly_Report').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const excelFileName = excelAcronym && excelAcronym !== 'IPOMS' && excelAcronym !== 'COLLEGE'
      ? `${excelAcronym}_${excelBaseTitle}`
      : excelBaseTitle;

    link.setAttribute('download', `${excelFileName}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print to PDF
  const handlePrintPdf = () => {
    window.print();
  };

  // Export as Ultra High-Definition PNG Image (100% WhatsApp & Print Shareable)
  const [exportingImage, setExportingImage] = useState(false);

  const handleExportImage = async () => {
    setExportingImage(true);

    let imgAcronym = (report.branding?.college_code || '').trim().toUpperCase();
    if (!imgAcronym || imgAcronym === 'IPOMS' || imgAcronym === 'COLLEGE') {
      const cName = report.branding?.college_name || '';
      const parenMatch = cName.match(/\((.*?)\)/);
      if (parenMatch && parenMatch[1]) {
        imgAcronym = parenMatch[1].trim().toUpperCase();
      }
    }
    const baseTitle = (report.report_title || 'Weekly_Placement_Report')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const fileName = imgAcronym && imgAcronym !== 'IPOMS' && imgAcronym !== 'COLLEGE'
      ? `${imgAcronym}_${baseTitle}`
      : baseTitle;

    try {
      const W = 1200;
      const PADDING = 40;
      const CONTENT_W = W - PADDING * 2; // 1120px
      const SCALE = 2.5; // Ultra-HD 3000px output resolution

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
      let totalH = 40; // Top padding

      // 1. Header height
      const headerH = 90;
      totalH += headerH + 20;

      // 2. Metadata pill
      const metaH = 38;
      totalH += metaH + 20;

      // 3. KPI Summary
      const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
      const hasKpis = report.template_type !== 'pending_tasks' && report.included_sections?.kpi_summary && report.kpi_summary;
      let kpiCards: Array<{ label: string; val: any; color: string; key?: string }> = [];
      if (hasKpis) {
        if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
          kpiCards = [
            { label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, color: '#2563eb', key: 'total_leads' },
            { label: 'Graduating Batch', val: report.kpi_summary.graduating_year || '2027', color: '#059669', key: 'graduating_year' },
          ];
        } else {
          kpiCards = [
            { label: 'Calls', val: report.kpi_summary.total_calls || 0, color: '#2563eb', key: 'total_calls' },
            { label: 'Positives', val: report.kpi_summary.positive_responses || 0, color: '#059669', key: 'positive_responses' },
            { label: 'JDs Received', val: report.kpi_summary.jds_received || 0, color: '#0891b2', key: 'jds_received' },
            { label: 'Completed', val: report.kpi_summary.drives_completed || 0, color: '#059669', key: 'drives_completed' },
            { label: 'In Progress', val: report.kpi_summary.drives_in_progress || 0, color: '#2563eb', key: 'drives_in_progress' },
            { label: 'Pipeline', val: report.kpi_summary.pipeline_leads || 0, color: '#0891b2', key: 'pipeline_leads' },
            { label: 'Top Companies', val: report.kpi_summary.top_companies_count || 0, color: '#d97706', key: 'top_companies_count' },
            { label: 'Offers', val: report.kpi_summary.total_offers || 0, color: '#059669', key: 'total_offers' },
          ];
        }
        kpiCards = kpiCards.filter((c: any) => activeKpis[c.key] !== false);
        if (kpiCards.length > 0) {
          totalH += 68 + 20;
        }
      }

      // ── Helper: Multi-Line Word Wrapping Engine ──
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
              currentLine = word;
            } else {
              // Word is longer than max width: break character by character
              let partial = '';
              for (const ch of word) {
                if (measureCtx.measureText(partial + ch).width <= maxW) {
                  partial += ch;
                } else {
                  if (partial) lines.push(partial);
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

      // Pending Tasks
      if (report.included_sections?.pending_tasks && report.sections?.pending_tasks) {
        const pTasks = report.sections.pending_tasks;
        const hasDriveDate = pTasks.some(
          (r: any) => r.drive_date && String(r.drive_date).trim() !== '' && String(r.drive_date).trim() !== '—' && String(r.drive_date).trim() !== '-'
        );
        const headers = hasDriveDate
          ? ['#', 'Company Name', 'JD Received Date', 'DB Shared Date', 'Current Status', 'Remarks / Next Action', 'Drive Date']
          : ['#', 'Company Name', 'JD Received Date', 'DB Shared Date', 'Current Status', 'Remarks / Next Action'];
        const colWidths = hasDriveDate
          ? [40, 200, 120, 120, 130, 380, 130]
          : [40, 220, 130, 130, 150, 450];

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

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 16;
            const font = cIdx === 1
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '500 11px monospace'
              : (headers[cIdx] === 'Drive Date')
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : '500 11px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx === 1
              ? '#0f172a'
              : cIdx === 0
              ? '#64748b'
              : (headers[cIdx] === 'Drive Date')
              ? '#4f46e5'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(34, maxLines * 16 + 14);
          return { cells, height };
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

      // Completed Companies
      if (report.included_sections?.completed_companies && report.sections?.completed_companies) {
        const cRows = report.sections.completed_companies;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status', 'Offers Received'];
        const colWidths = [40, 280, 240, 140, 280, 140];
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
            const maxCellW = colW - 16;
            const font = cIdx === 1 || cIdx === 5
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '500 11px monospace'
              : (cIdx === 3)
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : '500 11px system-ui, -apple-system, sans-serif';
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
          const height = Math.max(34, maxLines * 16 + 14);
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

      // In Progress Drives
      if (report.included_sections?.in_progress && report.sections?.in_progress) {
        const ipRows = report.sections.in_progress;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [40, 300, 260, 160, 360];
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
            const maxCellW = colW - 16;
            const font = cIdx === 1
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '500 11px monospace'
              : (cIdx === 3)
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : '500 11px system-ui, -apple-system, sans-serif';
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
          const height = Math.max(34, maxLines * 16 + 14);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '2. COMPANIES IN PROGRESS',
          badge: `${ipRows.length} Drives`,
          accentBg: '#eff6ff',
          accentBorder: '#bfdbfe',
          accentText: '#1e40af',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Pipeline Leads
      if (report.included_sections?.pipeline && report.sections?.pipeline) {
        const pipRows = report.sections.pipeline;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [40, 300, 260, 160, 360];
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
            const maxCellW = colW - 16;
            const font = cIdx === 1
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '500 11px monospace'
              : (cIdx === 3)
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : '500 11px system-ui, -apple-system, sans-serif';
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
          const height = Math.max(34, maxLines * 16 + 14);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '3. COMPANIES IN PIPELINE',
          badge: `${pipRows.length} Leads`,
          accentBg: '#ecfeff',
          accentBorder: '#a5f3fc',
          accentText: '#155e75',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Top Companies
      if (report.included_sections?.top_companies && report.sections?.top_companies) {
        const topRows = report.sections.top_companies;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [40, 300, 260, 160, 360];
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
            const maxCellW = colW - 16;
            const font = cIdx === 1
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '500 11px monospace'
              : (cIdx === 3)
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : '500 11px system-ui, -apple-system, sans-serif';
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
          const height = Math.max(34, maxLines * 16 + 14);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: '4. TOP COMPANIES',
          badge: `${topRows.length} Companies`,
          accentBg: '#fffbeb',
          accentBorder: '#fde68a',
          accentText: '#92400e',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // 5. Companies On Hold / Rejected by College
      if ((report.included_sections?.on_hold_by_college && report.sections?.on_hold_by_college) ||
          (report.included_sections?.rejected_by_college && report.sections?.rejected_by_college)) {
        const hRows = report.sections.on_hold_by_college || report.sections.rejected_by_college || [];
        if (hRows.length > 0) {
          const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
          const colWidths = [40, 300, 260, 160, 360];
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
              const maxCellW = colW - 16;
              const font = cIdx === 1
                ? 'bold 11px system-ui, -apple-system, sans-serif'
                : cIdx === 0
                ? '500 11px monospace'
                : (cIdx === 3)
                ? 'bold 11px system-ui, -apple-system, sans-serif'
                : '500 11px system-ui, -apple-system, sans-serif';
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
            const height = Math.max(34, maxLines * 16 + 14);
            return { cells, height };
          });

          sectionsToDraw.push({
            title: '5. COMPANIES ON HOLD BY COLLEGE',
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

      // 6. Companies On Hold by HR
      if (report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr) {
        const hrHoldRows = report.sections.on_hold_by_hr || [];
        if (hrHoldRows.length > 0) {
          const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
          const colWidths = [40, 300, 260, 160, 360];
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
              const maxCellW = colW - 16;
              const font = cIdx === 1
                ? 'bold 11px system-ui, -apple-system, sans-serif'
                : cIdx === 0
                ? '500 11px monospace'
                : (cIdx === 3)
                ? 'bold 11px system-ui, -apple-system, sans-serif'
                : '500 11px system-ui, -apple-system, sans-serif';
              const fillStyle = cIdx === 1
                ? '#0f172a'
                : cIdx === 0
                ? '#64748b'
                : '#475569';

              const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
              if (lines.length > maxLines) maxLines = lines.length;
              return { lines, font, fillStyle };
            });
            const height = Math.max(34, maxLines * 16 + 14);
            return { cells, height };
          });

          sectionsToDraw.push({
            title: '6. COMPANIES ON HOLD BY HR',
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

      // 7. Active Corporate Leads (Strictly 4 columns: #, Company Name, Role, CTC)
      if (report.included_sections?.active_leads && report.sections?.active_leads) {
        const alRows = report.sections.active_leads;
        const headers = ['#', 'Company Name', 'Role', 'CTC'];
        const colWidths = [50, 420, 420, 230];
        const rawRows = alRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.role || '—'),
          String(r.ctc || 'Competitive'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
            const colW = colWidths[cIdx];
            const maxCellW = colW - 16;
            const font = cIdx === 1
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : cIdx === 0
              ? '500 11px monospace'
              : (cIdx === 3)
              ? 'bold 11px system-ui, -apple-system, sans-serif'
              : '500 11px system-ui, -apple-system, sans-serif';
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
          const height = Math.max(34, maxLines * 16 + 14);
          return { cells, height };
        });

        const batchLabel = report.kpi_summary?.graduating_year || (report.academic_year ? `${report.academic_year} Graduating Batch` : '2027 Graduating Batch');
        sectionsToDraw.push({
          title: `ACTIVE CORPORATE LEADS — ${batchLabel.toUpperCase()}`,
          badge: `${alRows.length} Leads`,
          accentBg: '#ecfdf5',
          accentBorder: '#a7f3d0',
          accentText: '#065f46',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Calculate total sections height using exact measured rows
      sectionsToDraw.forEach((sec) => {
        totalH += 34; // Section title bar
        totalH += 32; // Table header
        if (sec.measuredRows.length === 0) {
          totalH += 34; // Empty row
        } else {
          sec.measuredRows.forEach((r) => {
            totalH += r.height;
          });
        }
        totalH += 24; // Margin bottom
      });

      // Observations Box Multi-Line Calculation
      const obsText = (report.remarks || report.observations || '').trim();
      const hasObservations = Boolean(obsText);
      let obsLines: string[] = [];
      let obsBoxH = 80;
      if (hasObservations) {
        obsLines = measureTextLines(
          scratchCtx,
          obsText,
          CONTENT_W - 32,
          '500 11px system-ui, -apple-system, sans-serif'
        );
        obsBoxH = Math.max(70, obsLines.length * 18 + 40);
        totalH += obsBoxH + 20;
      }

      // Footer
      totalH += 60;

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
      // Infoziant Logo (Left)
      drawRoundRect(PADDING, currentY, 150, 60, 10, '#ffffff', '#e2e8f0', 1);
      if (infoziantImg) {
        const aspect = infoziantImg.width / infoziantImg.height;
        const imgH = 46;
        const imgW = Math.min(130, imgH * aspect);
        ctx.drawImage(infoziantImg, PADDING + (150 - imgW) / 2, currentY + (60 - imgH) / 2, imgW, imgH);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Infoziant', PADDING + 75, currentY + 36);
      }

      // Title & Subtitle (Center)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      const mainTitle = report.report_title || (report.template_type === 'pending_tasks' ? 'Pending Tasks Action Report' : report.template_type === 'active_leads' ? 'Active Leads Pipeline Report' : 'Weekly Placement Report');
      ctx.fillText(mainTitle, W / 2, currentY + 28);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(collegeName, W / 2, currentY + 52);

      // College Logo / Code Badge (Right) — Hidden for Active Leads
      if (report.template_type !== 'active_leads') {
        const rightLogoX = W - PADDING - 150;
        drawRoundRect(rightLogoX, currentY, 150, 60, 10, '#ffffff', '#e2e8f0', 1);
        if (!isConsolidated && collegeImg) {
          const aspect = collegeImg.width / collegeImg.height;
          const imgH = 46;
          const imgW = Math.min(130, imgH * aspect);
          ctx.drawImage(collegeImg, rightLogoX + (150 - imgW) / 2, currentY + (60 - imgH) / 2, imgW, imgH);
        } else {
          ctx.fillStyle = '#0284c7';
          ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(isConsolidated ? 'iPOMS' : collegeCode, rightLogoX + 75, currentY + 36);
        }
      }

      // Header Bottom Line
      currentY += headerH;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PADDING, currentY);
      ctx.lineTo(W - PADDING, currentY);
      ctx.stroke();

      currentY += 16;

      // ── 3. Metadata Strip ──
      drawRoundRect(PADDING, currentY, CONTENT_W, metaH, 8, '#f8fafc', '#e2e8f0', 1);
      ctx.fillStyle = '#334155';
      ctx.font = '500 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';

      let metaText = '';
      if (report.template_type === 'weekly_placement') {
        metaText += `Period: ${getCleanPeriod(report.report_period)}    •    `;
      }
      metaText += `Generated Date: ${report.generated_date || new Date().toLocaleDateString('en-IN')}`;
      ctx.fillText(metaText, W / 2, currentY + 24);

      currentY += metaH + 18;

      // ── 4. KPI Cards Strip ──
      if (kpiCards.length > 0) {
        const kpiCardW = (CONTENT_W - (kpiCards.length - 1) * 10) / kpiCards.length;
        kpiCards.forEach((kpi, idx) => {
          const cardX = PADDING + idx * (kpiCardW + 10);
          drawRoundRect(cardX, currentY, kpiCardW, 60, 8, '#f8fafc', '#e2e8f0', 1);

          ctx.textAlign = 'center';
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(kpi.label.toUpperCase(), cardX + kpiCardW / 2, currentY + 22);

          ctx.fillStyle = kpi.color;
          ctx.font = 'bold 18px system-ui, -apple-system, monospace';
          ctx.fillText(String(kpi.val), cardX + kpiCardW / 2, currentY + 48);
        });
        currentY += 60 + 20;
      }

      // ── 5. Render Section Tables (With Multi-Line Wrapped Cells) ──
      sectionsToDraw.forEach((sec) => {
        // Section Title Pill
        drawRoundRect(PADDING, currentY, CONTENT_W, 30, 6, sec.accentBg, sec.accentBorder, 1);
        ctx.textAlign = 'left';
        ctx.fillStyle = sec.accentText;
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(sec.title, PADDING + 12, currentY + 20);

        // Badge on right
        ctx.textAlign = 'right';
        ctx.fillStyle = sec.accentText;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(sec.badge, W - PADDING - 12, currentY + 20);

        currentY += 34;

        // Table Header
        drawRoundRect(PADDING, currentY, CONTENT_W, 30, 0, '#f1f5f9', '#cbd5e1', 1);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';

        let curColX = PADDING;
        sec.headers.forEach((hName, hIdx) => {
          const colW = sec.colWidths[hIdx];
          ctx.fillText(hName.toUpperCase(), curColX + colW / 2, currentY + 19);
          if (hIdx < sec.headers.length - 1) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(curColX + colW, currentY);
            ctx.lineTo(curColX + colW, currentY + 30);
            ctx.stroke();
          }
          curColX += colW;
        });

        currentY += 30;

        // Table Rows (With Vertically Centered Multi-Line Text)
        if (sec.measuredRows.length === 0) {
          drawRoundRect(PADDING, currentY, CONTENT_W, 32, 0, '#ffffff', '#e2e8f0', 1);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'italic 11px system-ui, -apple-system, sans-serif';
          ctx.fillText('No records found for this section.', W / 2, currentY + 20);
          currentY += 32;
        } else {
          sec.measuredRows.forEach((mRow, rIdx) => {
            const rowBg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
            const rowH = mRow.height;
            drawRoundRect(PADDING, currentY, CONTENT_W, rowH, 0, rowBg, '#e2e8f0', 1);

            let rowColX = PADDING;
            mRow.cells.forEach((cell, cIdx) => {
              const colW = sec.colWidths[cIdx];
              ctx.textAlign = 'center';
              ctx.fillStyle = cell.fillStyle;
              ctx.font = cell.font;

              const lineHeight = 15;
              const totalTextH = cell.lines.length * lineHeight;
              const startY = currentY + (rowH - totalTextH) / 2 + lineHeight * 0.78;

              cell.lines.forEach((line, lineIdx) => {
                ctx.fillText(line, rowColX + colW / 2, startY + lineIdx * lineHeight);
              });

              // Column divider
              if (cIdx < mRow.cells.length - 1) {
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(rowColX + colW, currentY);
                ctx.lineTo(rowColX + colW, currentY + rowH);
                ctx.stroke();
              }
              rowColX += colW;
            });

            currentY += rowH;
          });
        }

        currentY += 18;
      });

      // ── 6. Observations Box (Multi-Line Wrapped) ──
      if (hasObservations) {
        drawRoundRect(PADDING, currentY, CONTENT_W, obsBoxH, 8, '#f8fafc', '#e2e8f0', 1);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        const obsHeader = report.template_type === 'active_leads' ? 'Notes' : 'Key Placement Observations';
        ctx.fillText(obsHeader, PADDING + 16, currentY + 24);

        ctx.fillStyle = '#475569';
        ctx.font = '500 11px system-ui, -apple-system, sans-serif';
        obsLines.forEach((line, lIdx) => {
          ctx.fillText(line, PADDING + 16, currentY + 46 + lIdx * 18);
        });

        currentY += obsBoxH + 20;
      }

      // ── 7. Footer ──
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING, currentY);
      ctx.lineTo(W - PADDING, currentY);
      ctx.stroke();

      currentY += 24;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Prepared by Infoziant  •  © 2026 Infoziant. All rights reserved.', W / 2, currentY);

      // ── 8. Export High-Res PNG (3000px Ultra-HD for WhatsApp) ──
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
  const collegeLogoUrl = COLLEGE_LOGO_MAP[collegeCode] || `/college-logos/${collegeCode.toLowerCase()}.png`;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4 print:p-0 print:m-0 print:max-w-full text-fg">

      {/* ── Document Canvas (Editable In-App View & Printable Page) ────────────────────────────────── */}
      <div
        id="printable-report-canvas"
        className="printable-report-canvas bg-surface border border-border rounded-2xl shadow-xs p-8 text-fg print:w-full print:p-0 print:border-none print:shadow-none print:bg-white print:text-black"
      >
        <table className="w-full border-collapse border-none print-layout-table">
          {/* Master Print Header — Repeats at the top of every printed page */}
          <thead className="print-page-header">
            <tr>
              <th className="font-normal text-left p-0 border-none">
                {/* 1. Header Branding Strip with Infoziant Logo (Left), Centered Title & Subtitle, & Target College Logo (Right) */}
                <div className="flex items-center justify-between border-b-2 border-border print:border-slate-300 pb-4 gap-4 mb-4">
                  {/* Left: Infoziant Logo */}
                  <div className="flex items-center shrink-0">
                    <div className="bg-white rounded-xl p-1.5 shadow-xs border border-slate-200/80 dark:border-white/20 flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/infoziant-head.png"
                        alt="Infoziant"
                        className="h-12 w-auto object-contain shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/college-logos/Infozianthead.png';
                        }}
                      />
                    </div>
                  </div>

                  {/* Center: Main Title and Subtitle (Center-Aligned) */}
                  <div className="flex-1 text-center min-w-0 px-2 flex flex-col items-center justify-center">
                    <input
                      type="text"
                      value={report.report_title || (report.template_type === 'pending_tasks' ? 'Pending Tasks Action Report' : report.template_type === 'active_leads' ? 'Active Leads Pipeline Report' : 'Weekly Placement Report')}
                      onChange={(e) => setReport({ ...report, report_title: e.target.value })}
                      className="text-base sm:text-lg font-bold text-fg print:text-slate-900 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-2 rounded transition-colors outline-none tracking-tight font-sans text-center w-full max-w-lg"
                    />
                    <p className="text-xs font-semibold text-fg-muted print:text-slate-700 mt-0.5 px-1 text-center">
                      {collegeName}
                    </p>
                  </div>

                  {/* Right: Target College Logo (Hidden for Active Leads) */}
                  <div className="flex items-center shrink-0 justify-end min-w-[100px]">
                    {report.template_type === 'active_leads' ? null : !isConsolidated && !logoFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={collegeLogoUrl}
                        src={collegeLogoUrl}
                        alt={collegeName}
                        className="h-12 w-auto max-w-[140px] object-contain shrink-0"
                        onError={() => setLogoFailed(true)}
                      />
                    ) : (
                      <div className="h-9 px-3 bg-surface-sunken border border-border rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-fg shadow-2xs">
                        <Building2 size={14} className="text-primary shrink-0" />
                        <span>{isConsolidated ? 'iPOMS' : collegeCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          {/* Master Print Body — Holds all report content and section tables */}
          <tbody>
            <tr>
              <td className="p-0 border-none space-y-6">

                {/* 2. Report Metadata Sub-bar */}
                <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-8 text-xs text-fg-muted bg-surface-sunken border border-border rounded-xl px-4 py-2.5 font-medium print:bg-slate-50 print:text-slate-600 print:border-slate-200 text-center">
                  {report.template_type === 'weekly_placement' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-primary shrink-0" />
                        <span>Period: <strong className="text-fg print:text-slate-900 font-semibold">{getCleanPeriod(report.report_period)}</strong></span>
                      </div>
                      <span className="text-border">|</span>
                    </>
                  )}
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-fg-subtle print:text-slate-400 shrink-0" />
            <span>Generated Date: <strong className="text-fg print:text-slate-900 font-semibold">{report.generated_date}</strong></span>
          </div>
        </div>

        {/* 3. Live KPI Summary Strip (Excluded for Pending Tasks) */}
        {report.template_type !== 'pending_tasks' && report.included_sections?.kpi_summary && report.kpi_summary && (() => {
          const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
          if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
            const alCards = [
              { key: 'total_leads', label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, border: 'border-blue-200 dark:border-blue-900/60', text: 'text-primary' },
              { key: 'graduating_year', label: 'Graduating Batch', val: report.kpi_summary.graduating_year || '2027', border: 'border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400' },
            ].filter((c) => activeKpis[c.key] !== false);

            if (alCards.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {alCards.map((card) => (
                  <div key={card.key} className={`flex-1 min-w-[120px] bg-surface border p-2.5 rounded-xl text-center shadow-2xs ${card.border}`}>
                    <span className="text-micro text-fg-subtle font-semibold uppercase block">{card.label}</span>
                    <span className={`text-base font-bold font-mono tabular-nums ${card.text}`}>{card.val}</span>
                  </div>
                ))}
              </div>
            );
          } else {
            const wpCards = [
              { key: 'total_calls', label: 'Calls', val: report.kpi_summary.total_calls || 0, border: 'border-blue-200 dark:border-blue-900/60', text: 'text-primary' },
              { key: 'positive_responses', label: 'Positives', val: report.kpi_summary.positive_responses || 0, border: 'border-emerald-200/80 dark:border-emerald-900/60', text: 'text-emerald-700 dark:text-emerald-400' },
              { key: 'jds_received', label: 'JDs Received', val: report.kpi_summary.jds_received || 0, border: 'border-cyan-200/80 dark:border-cyan-900/60', text: 'text-cyan-700 dark:text-cyan-400' },
              { key: 'drives_completed', label: 'Completed', val: report.kpi_summary.drives_completed || 0, border: 'border-emerald-200/80 dark:border-emerald-900/60', text: 'text-emerald-700 dark:text-emerald-400' },
              { key: 'drives_in_progress', label: 'In Progress', val: report.kpi_summary.drives_in_progress || 0, border: 'border-blue-200/80 dark:border-blue-900/60', text: 'text-blue-700 dark:text-blue-400' },
              { key: 'pipeline_leads', label: 'Pipeline', val: report.kpi_summary.pipeline_leads || 0, border: 'border-cyan-200/80 dark:border-cyan-900/60', text: 'text-cyan-700 dark:text-cyan-400' },
              { key: 'top_companies_count', label: 'Top Companies', val: report.kpi_summary.top_companies_count || 0, border: 'border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400' },
              { key: 'total_offers', label: 'Offers', val: report.kpi_summary.total_offers || 0, border: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
            ].filter((c) => activeKpis[c.key] !== false);

            if (wpCards.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 pt-1">
                {wpCards.map((card) => (
                  <div key={card.key} className={`flex-1 min-w-[90px] bg-surface border p-2 rounded-xl text-center shadow-2xs ${card.border}`}>
                    <span className="text-micro text-fg-subtle font-semibold uppercase block truncate">{card.label}</span>
                    <span className={`text-sm font-bold font-mono tabular-nums ${card.text}`}>{card.val}</span>
                  </div>
                ))}
              </div>
            );
          }
        })()}

        {/* 4. Section 1: Companies Completed */}
        {report.included_sections?.completed_companies && report.sections?.completed_companies && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Trophy size={14} strokeWidth={2.25} className="text-emerald-700 dark:text-emerald-400" /> 1. COMPANIES COMPLETED
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                {report.sections.completed_companies.length} Drives
              </span>
            </div>

            {report.sections.completed_companies.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No completed drives in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center">
                  <thead>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3 text-center">Company Name</th>
                      <th className="py-2 px-3 text-center">Role</th>
                      <th className="py-2 px-3 text-center">CTC</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Offers Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.completed_companies.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg text-center">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-muted text-center">
                          <input
                            type="text"
                            value={r.job_role}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'job_role', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                          />
                        </td>
                        <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-medium text-center">{r.ctc_lpa}</td>
                        <td className="py-2 px-3 text-fg-subtle text-center">
                          <input
                            type="text"
                            value={r.current_status_text}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'current_status_text', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-subtle"
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          <input
                            type="number"
                            value={r.selected_count}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'selected_count', Number(e.target.value))
                            }
                            className="bg-transparent w-14 text-center focus:bg-surface focus:border focus:border-primary rounded px-1 font-bold text-emerald-600 dark:text-emerald-400 outline-none mx-auto"
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

        {/* 5. Section 2: Companies In Progress */}
        {report.included_sections?.in_progress && report.sections?.in_progress && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 font-bold text-xs flex items-center justify-between text-blue-800 dark:text-blue-300">
              <span className="flex items-center gap-1.5">
                <Rocket size={14} strokeWidth={2.25} className="text-blue-700 dark:text-blue-400" /> 2. COMPANIES IN PROGRESS
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                {report.sections.in_progress.length} Drives
              </span>
            </div>

            {report.sections.in_progress.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No active drives currently in progress.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center">
                  <thead>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3 text-center">Company Name</th>
                      <th className="py-2 px-3 text-center">Role</th>
                      <th className="py-2 px-3 text-center">CTC</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.in_progress.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg text-center">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('in_progress', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-muted text-center">{r.job_role}</td>
                        <td className="py-2 px-3 text-blue-600 dark:text-blue-400 font-medium text-center">{r.ctc_lpa}</td>
                        <td className="py-2 px-3 text-fg-subtle text-center">{r.current_status_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. Section 3: Companies in Pipeline */}
        {report.included_sections?.pipeline && report.sections?.pipeline && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/70 dark:bg-cyan-950/40 font-bold text-xs flex items-center justify-between text-cyan-800 dark:text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Inbox size={14} strokeWidth={2.25} className="text-cyan-700 dark:text-cyan-400" /> 3. COMPANIES IN PIPELINE
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800">
                {report.sections.pipeline.length} Leads
              </span>
            </div>

            {report.sections.pipeline.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No pipeline leads recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center">
                  <thead>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3 text-center">Company Name</th>
                      <th className="py-2 px-3 text-center">Role</th>
                      <th className="py-2 px-3 text-center">CTC</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.pipeline.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg text-center">{r.company_name}</td>
                        <td className="py-2 px-3 text-fg-muted text-center">{r.job_role}</td>
                        <td className="py-2 px-3 text-cyan-600 dark:text-cyan-400 font-medium text-center">{r.ctc_lpa || '—'}</td>
                        <td className="py-2 px-3 text-fg-subtle text-center">{r.current_status_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. Section 4: Top Companies */}
        {report.included_sections?.top_companies && report.sections?.top_companies && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 font-bold text-xs flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <Star size={14} strokeWidth={2.25} className="text-amber-600 dark:text-amber-400" /> 4. TOP COMPANIES
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                {report.sections.top_companies.length} Companies
              </span>
            </div>

            {report.sections.top_companies.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No top companies recorded for this institution.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center">
                  <thead>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3 text-center">Company Name</th>
                      <th className="py-2 px-3 text-center">Role</th>
                      <th className="py-2 px-3 text-center">CTC</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.top_companies.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg text-center">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('top_companies', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-muted text-center">
                          <input
                            type="text"
                            value={r.job_role}
                            onChange={(e) =>
                              handleUpdateCell('top_companies', idx, 'job_role', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                          />
                        </td>
                        <td className="py-2 px-3 text-amber-600 dark:text-amber-400 font-medium text-center">{r.ctc_lpa}</td>
                        <td className="py-2 px-3 text-fg-subtle text-center">
                          <input
                            type="text"
                            value={r.current_status_text}
                            onChange={(e) =>
                              handleUpdateCell('top_companies', idx, 'current_status_text', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-subtle"
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

        {/* 7. Section 5: Rejected Companies */}
        {((report.included_sections?.rejected_companies && report.sections?.rejected_companies && report.sections.rejected_companies.length > 0) ||
          (report.included_sections?.rejected_by_hr && report.sections?.rejected_by_hr && report.sections.rejected_by_hr.length > 0)) && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/40 font-bold text-xs flex items-center justify-between text-rose-800 dark:text-rose-300">
              <span className="flex items-center gap-1.5">
                <XCircle size={14} strokeWidth={2.25} className="text-rose-600 dark:text-rose-400" /> 5. REJECTED COMPANIES
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                {(report.sections.rejected_companies || report.sections.rejected_by_hr).length} Declined
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs text-center">
                <thead>
                  <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-3 text-center">Company Name</th>
                    <th className="py-2 px-3 text-center">Role</th>
                    <th className="py-2 px-3 text-center">CTC</th>
                    <th className="py-2 px-3 text-center">Status / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                  {(report.sections.rejected_companies || report.sections.rejected_by_hr).map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-sunken/60">
                      <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                      <td className="py-2 px-3 font-semibold text-fg text-center">
                        <input
                          type="text"
                          value={r.company_name}
                          onChange={(e) =>
                            handleUpdateCell(report.sections.rejected_companies ? 'rejected_companies' : 'rejected_by_hr', idx, 'company_name', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                        />
                      </td>
                      <td className="py-2 px-3 text-fg-muted text-center">
                        <input
                          type="text"
                          value={r.job_role}
                          onChange={(e) =>
                            handleUpdateCell(report.sections.rejected_companies ? 'rejected_companies' : 'rejected_by_hr', idx, 'job_role', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                        />
                      </td>
                      <td className="py-2 px-3 text-rose-600 dark:text-rose-400 font-medium text-center">{r.ctc_lpa || '—'}</td>
                      <td className="py-2 px-3 text-rose-600 dark:text-rose-400 text-center font-medium">
                        <input
                          type="text"
                          value={r.current_status_text}
                          onChange={(e) =>
                            handleUpdateCell(report.sections.rejected_companies ? 'rejected_companies' : 'rejected_by_hr', idx, 'current_status_text', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-rose-600 dark:text-rose-400 font-medium"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. Section 6: Companies On Hold By College */}
        {((report.included_sections?.on_hold_by_college && report.sections?.on_hold_by_college && report.sections.on_hold_by_college.length > 0) ||
          (report.included_sections?.rejected_by_college && report.sections?.rejected_by_college && report.sections.rejected_by_college.length > 0)) && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/70 dark:bg-orange-950/40 font-bold text-xs flex items-center justify-between text-orange-800 dark:text-orange-300">
              <span className="flex items-center gap-1.5">
                <Clock size={14} strokeWidth={2.25} className="text-orange-600 dark:text-orange-400" /> 6. COMPANIES ON HOLD BY COLLEGE
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
                {(report.sections.on_hold_by_college || report.sections.rejected_by_college).length} Holds
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs text-center">
                <thead>
                  <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-3 text-center">Company Name</th>
                    <th className="py-2 px-3 text-center">Role</th>
                    <th className="py-2 px-3 text-center">CTC</th>
                    <th className="py-2 px-3 text-center">Status / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                  {(report.sections.on_hold_by_college || report.sections.rejected_by_college).map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-sunken/60">
                      <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                      <td className="py-2 px-3 font-semibold text-fg text-center">
                        <input
                          type="text"
                          value={r.company_name}
                          onChange={(e) =>
                            handleUpdateCell(report.sections.on_hold_by_college ? 'on_hold_by_college' : 'rejected_by_college', idx, 'company_name', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                        />
                      </td>
                      <td className="py-2 px-3 text-fg-muted text-center">
                        <input
                          type="text"
                          value={r.job_role}
                          onChange={(e) =>
                            handleUpdateCell(report.sections.on_hold_by_college ? 'on_hold_by_college' : 'rejected_by_college', idx, 'job_role', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                        />
                      </td>
                      <td className="py-2 px-3 text-orange-600 dark:text-orange-400 font-medium text-center">{r.ctc_lpa || '—'}</td>
                      <td className="py-2 px-3 text-orange-600 dark:text-orange-400 text-center font-medium">
                        <input
                          type="text"
                          value={r.current_status_text}
                          onChange={(e) =>
                            handleUpdateCell(report.sections.on_hold_by_college ? 'on_hold_by_college' : 'rejected_by_college', idx, 'current_status_text', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-orange-600 dark:text-orange-400 font-medium"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. Section 7: Companies On Hold By HR */}
        {report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && report.sections.on_hold_by_hr.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/40 font-bold text-xs flex items-center justify-between text-slate-800 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock size={14} strokeWidth={2.25} className="text-slate-600 dark:text-slate-400" /> 7. COMPANIES ON HOLD BY HR
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                {report.sections.on_hold_by_hr.length} Holds
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs text-center">
                <thead>
                  <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-3 text-center">Company Name</th>
                    <th className="py-2 px-3 text-center">Role</th>
                    <th className="py-2 px-3 text-center">CTC</th>
                    <th className="py-2 px-3 text-center">Status / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                  {report.sections.on_hold_by_hr.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-sunken/60">
                      <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                      <td className="py-2 px-3 font-semibold text-fg text-center">
                        <input
                          type="text"
                          value={r.company_name}
                          onChange={(e) =>
                            handleUpdateCell('on_hold_by_hr', idx, 'company_name', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                        />
                      </td>
                      <td className="py-2 px-3 text-fg-muted text-center">
                        <input
                          type="text"
                          value={r.job_role}
                          onChange={(e) =>
                            handleUpdateCell('on_hold_by_hr', idx, 'job_role', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium text-center">{r.ctc_lpa || '—'}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 text-center font-medium">
                        <input
                          type="text"
                          value={r.current_status_text}
                          onChange={(e) =>
                            handleUpdateCell('on_hold_by_hr', idx, 'current_status_text', e.target.value)
                          }
                          className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-slate-700 dark:text-slate-300 font-medium"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section: Placement Pending Tasks */}
        {report.included_sections?.pending_tasks && report.sections?.pending_tasks && (() => {
          const hasDriveDate = report.sections.pending_tasks.some(
            (r: any) => r.drive_date && String(r.drive_date).trim() !== '' && String(r.drive_date).trim() !== '—' && String(r.drive_date).trim() !== '-'
          );

          return (
            <div className="space-y-2 pt-2">
              <div className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-xs flex items-center justify-between text-indigo-900 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <ListTodo size={14} strokeWidth={2.25} className="text-indigo-700 dark:text-indigo-400" /> PLACEMENT PENDING TASKS
                </span>
                <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold">
                  {report.sections.pending_tasks.length} Tasks
                </span>
              </div>

              {report.sections.pending_tasks.length === 0 ? (
                <p className="text-xs text-fg-subtle italic py-2">No pending tasks recorded for this institution.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs text-center">
                    <thead>
                      <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                        <th className="py-2 px-2 w-8 text-center">#</th>
                        <th className="py-2 px-3 text-center">Company Name</th>
                        <th className="py-2 px-3 text-center">JD Received Date</th>
                        <th className="py-2 px-3 text-center">DB Shared Date</th>
                        <th className="py-2 px-3 text-center">Current Status</th>
                        <th className="py-2 px-3 text-center">Remarks / Next Action</th>
                        {hasDriveDate && <th className="py-2 px-3 text-center">Drive Date</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                      {report.sections.pending_tasks.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-surface-sunken/60">
                          <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                          <td className="py-2 px-3 font-semibold text-fg text-center">
                            <input
                              type="text"
                              value={r.company_name}
                              onChange={(e) =>
                                handleUpdateCell('pending_tasks', idx, 'company_name', e.target.value)
                              }
                              className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                            />
                          </td>
                          <td className="py-2 px-3 text-fg-muted text-center">
                            <input
                              type="text"
                              value={r.jd_received_date}
                              onChange={(e) =>
                                handleUpdateCell('pending_tasks', idx, 'jd_received_date', e.target.value)
                              }
                              className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                            />
                          </td>
                          <td className="py-2 px-3 text-fg-muted text-center">
                            <input
                              type="text"
                              value={r.db_shared_date}
                              onChange={(e) =>
                                handleUpdateCell('pending_tasks', idx, 'db_shared_date', e.target.value)
                              }
                              className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                            />
                          </td>
                          <td className="py-2 px-3 text-fg text-center">
                            <input
                              type="text"
                              value={r.current_status}
                              onChange={(e) =>
                                handleUpdateCell('pending_tasks', idx, 'current_status', e.target.value)
                              }
                              className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                            />
                          </td>
                          <td className="py-2 px-3 text-fg font-medium text-center">
                            <input
                              type="text"
                              value={r.action_to_be_taken}
                              onChange={(e) =>
                                handleUpdateCell('pending_tasks', idx, 'action_to_be_taken', e.target.value)
                              }
                              className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                            />
                          </td>
                          {hasDriveDate && (
                            <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-semibold text-center">
                              <input
                                type="text"
                                value={r.drive_date}
                                onChange={(e) =>
                                  handleUpdateCell('pending_tasks', idx, 'drive_date', e.target.value)
                                }
                                className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-indigo-600 dark:text-indigo-400"
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
          );
        })()}

        {/* Section: Active Corporate Leads */}
        {report.included_sections?.active_leads && report.sections?.active_leads && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp size={14} strokeWidth={2.25} className="text-emerald-700 dark:text-emerald-400" /> ACTIVE CORPORATE LEADS — {String(report.kpi_summary?.graduating_year || report.academic_year || '2027').toUpperCase()}
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold">
                {report.sections.active_leads.length} Leads
              </span>
            </div>

            {report.sections.active_leads.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No active leads recorded for this graduating batch.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="print:table-header-group">
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-2 w-10 text-center">#</th>
                      <th className="py-2 px-4 text-center">Company Name</th>
                      <th className="py-2 px-4 text-center">Role</th>
                      <th className="py-2 px-4 text-center">CTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.active_leads.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60 avoid-break">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-4 font-semibold text-fg text-center">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg font-semibold"
                          />
                        </td>
                        <td className="py-2 px-4 text-fg-muted text-center">
                          <input
                            type="text"
                            value={r.role}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'role', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                          />
                        </td>
                        <td className="py-2 px-4 text-emerald-600 dark:text-emerald-400 font-semibold text-center">
                          <input
                            type="text"
                            value={r.ctc}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'ctc', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-emerald-600 dark:text-emerald-400 font-semibold"
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
              </td>
            </tr>
          </tbody>

          {/* Master Print Footer — Repeats at the bottom of every printed page */}
          <tfoot className="print-page-footer">
            <tr>
              <td className="p-0 border-none pt-4">
                <div className="border-t border-border print:border-slate-300 pt-3 text-center text-xs text-fg-subtle print:text-slate-500">
                  <p className="font-medium text-fg-muted print:text-slate-700">Prepared by Infoziant</p>
                  <p className="mt-0.5">© 2026 Infoziant. All rights reserved.</p>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>

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
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
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
            className="w-11 h-11 rounded-full bg-primary hover:bg-primary-hover text-white border border-primary/40 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-primary/30 group"
          >
            <ArrowDown size={19} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        )}
      </aside>

    </div>
  );
}
