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
  ACEW: '/college-logos/annai mira.png',
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

  useEffect(() => {
    setReport(reportData);
    setLogoFailed(false);
  }, [reportData]);

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
          <tr><td colspan="8" class="header-title">${report.branding?.company_name || 'Infoziant IT Solutions'}</td></tr>
          <tr><td colspan="8" class="header-sub">${report.branding?.college_name || 'Partner Institutions'} — ${report.report_title}</td></tr>
          <tr><td colspan="8" style="color:#64748b;">Period: ${getCleanPeriod(report.report_period)} | Generated: ${report.generated_date || ''}</td></tr>
          <tr><td colspan="8"></td></tr>
    `;

    // KPI Summary
    if (report.kpi_summary) {
      if (report.template_type === 'pending_tasks' || report.kpi_summary.total_pending_tasks !== undefined) {
        html += `
          <tr><td colspan="8" class="sec-header">PENDING TASKS KPI SUMMARY</td></tr>
          <tr>
            <th>Total Tasks</th>
            <th>DB Shared</th>
            <th>DB Pending</th>
            <th>JDs Received</th>
            <th>Scheduled</th>
            <th>In Progress</th>
            <th>Awaiting TPO</th>
            <th>Awaiting HR</th>
          </tr>
          <tr>
            <td style="text-align:center; font-weight:bold;">${report.kpi_summary.total_pending_tasks || 0}</td>
            <td style="text-align:center; color:#059669;">${report.kpi_summary.db_shared_count || 0}</td>
            <td style="text-align:center; color:#d97706;">${report.kpi_summary.db_pending_count || 0}</td>
            <td style="text-align:center;">${report.kpi_summary.jds_received || 0}</td>
            <td style="text-align:center; color:#7c3aed;">${report.kpi_summary.drives_scheduled || 0}</td>
            <td style="text-align:center; color:#2563eb;">${report.kpi_summary.drives_in_progress || 0}</td>
            <td style="text-align:center; color:#ea580c;">${report.kpi_summary.awaiting_tpo || 0}</td>
            <td style="text-align:center; color:#e11d48;">${report.kpi_summary.awaiting_hr || 0}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
        `;
      } else if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
        html += `
          <tr><td colspan="8" class="sec-header">ACTIVE LEADS KPI SUMMARY</td></tr>
          <tr>
            <th colspan="3">Total Active Leads</th>
            <th colspan="3">Graduating Batch</th>
            <th colspan="2">Corporate Partners</th>
          </tr>
          <tr>
            <td colspan="3" style="text-align:center; font-weight:bold; font-size:13pt; color:#1e3a8a;">${report.kpi_summary.total_leads || 0}</td>
            <td colspan="3" style="text-align:center; font-weight:bold; font-size:13pt; color:#059669;">${report.kpi_summary.graduating_year || '2027'}</td>
            <td colspan="2" style="text-align:center; font-weight:bold; font-size:13pt; color:#d97706;">${report.kpi_summary.active_companies_count || 0}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
        `;
      } else {
        html += `
          <tr><td colspan="8" class="sec-header">EXECUTIVE PLACEMENT KPI SUMMARY</td></tr>
          <tr>
            <th>Calls</th>
            <th>Positives</th>
            <th>JDs</th>
            <th>Completed</th>
            <th>In Progress</th>
            <th>Pipeline</th>
            <th>Top Companies</th>
            <th>Offers Placed</th>
          </tr>
          <tr>
            <td style="text-align:center;">${report.kpi_summary.total_calls || 0}</td>
            <td style="text-align:center; color:#059669;">${report.kpi_summary.positive_responses || 0}</td>
            <td style="text-align:center; color:#0891b2;">${report.kpi_summary.jds_received || 0}</td>
            <td style="text-align:center; color:#059669;">${report.kpi_summary.drives_completed || 0}</td>
            <td style="text-align:center; color:#2563eb;">${report.kpi_summary.drives_in_progress || 0}</td>
            <td style="text-align:center; color:#0891b2;">${report.kpi_summary.pipeline_leads || 0}</td>
            <td style="text-align:center; color:#d97706;">${report.kpi_summary.top_companies_count || 0}</td>
            <td style="text-align:center; font-weight:bold; color:#059669;">${report.kpi_summary.total_offers || 0}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
        `;
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

    // Section: Placement Pending Tasks
    if (report.sections?.pending_tasks && report.sections.pending_tasks.length > 0) {
      html += `
        <tr><td colspan="8" class="sec-header">PLACEMENT PENDING TASKS (${report.sections.pending_tasks.length} Tasks)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>JD Received Date</th>
          <th>DB Shared Date</th>
          <th>Current Status</th>
          <th>Remarks / Next Action</th>
          <th>Drive Date</th>
          <th>Remarks</th>
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
            <td style="color:#7c3aed; font-weight:bold;">${r.drive_date || '—'}</td>
            <td>${r.remarks || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="8"></td></tr>`;
    }

    // Section: Active Leads
    if (report.sections?.active_leads && report.sections.active_leads.length > 0) {
      html += `
        <tr><td colspan="8" class="sec-header">ACTIVE CORPORATE LEADS (${report.sections.active_leads.length} Leads)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
          <th colspan="2">Company Name</th>
          <th colspan="2">Role(s)</th>
          <th>CTC</th>
          <th>Fall of Month</th>
          <th>Graduating Batch</th>
        </tr>
      `;
      report.sections.active_leads.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td colspan="2"><b>${r.company_name}</b></td>
            <td colspan="2">${r.role || '—'}</td>
            <td style="color:#059669; font-weight:bold;">${r.ctc || '—'}</td>
            <td>${r.followup_month || '—'}</td>
            <td>${r.academic_year || '2027'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="8"></td></tr>`;
    }

    // Remarks
    if (report.remarks) {
      html += `
        <tr><td colspan="7" class="sec-header">COORDINATOR REMARKS & OBSERVATIONS</td></tr>
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
    link.setAttribute('download', `${(report.report_title || 'Weekly_Report').replace(/\s+/g, '_')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print to PDF
  const handlePrintPdf = () => {
    window.print();
  };

  // Export as PNG Image
  const [exportingImage, setExportingImage] = useState(false);

  const handleExportImage = async () => {
    const el = document.getElementById('printable-report-canvas');
    if (!el) return;

    setExportingImage(true);
    try {
      const width = el.scrollWidth || el.offsetWidth || 800;
      const height = el.scrollHeight || el.offsetHeight || 1100;

      const clone = el.cloneNode(true) as HTMLElement;
      
      // Replace input values with clean text spans in clone
      const inputs = el.querySelectorAll('input, textarea');
      const cloneInputs = clone.querySelectorAll('input, textarea');
      inputs.forEach((orig: any, idx: number) => {
        if (cloneInputs[idx]) {
          const span = document.createElement('span');
          span.textContent = orig.value || '';
          span.style.fontWeight = window.getComputedStyle(orig).fontWeight;
          span.style.color = window.getComputedStyle(orig).color;
          span.style.fontSize = window.getComputedStyle(orig).fontSize;
          cloneInputs[idx].parentNode?.replaceChild(span, cloneInputs[idx]);
        }
      });

      const htmlContent = new XMLSerializer().serializeToString(clone);
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="background:#ffffff; font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              ${htmlContent}
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new window.Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = pngUrl;
              link.download = `${(report.report_title || 'Weekly_Report').replace(/\s+/g, '_')}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(pngUrl);
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(url);
        setExportingImage(false);
      };

      img.onerror = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(report.report_title || 'Weekly_Report').replace(/\s+/g, '_')}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExportingImage(false);
      };

      img.src = url;
    } catch (err) {
      console.error('Image export failed:', err);
      setExportingImage(false);
      alert('Could not export image. Please use Save PDF.');
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
        className="printable-report-canvas bg-surface border border-border rounded-2xl shadow-xs p-8 space-y-6 text-fg print:w-full print:p-0 print:border-none print:shadow-none print:bg-white print:text-black"
      >

        {/* 1. Header Branding Strip with Infoziant Logo (Left) & Target College Logo (Right) */}
        <div className="flex items-center justify-between border-b-2 border-border print:border-slate-300 pb-4 gap-4">
          {/* Left: Infoziant Logo & Report Title + College Name with Acronym */}
          <div className="flex items-center gap-3.5">
            {/* Smooth square white base for high contrast in dark mode */}
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
            <div>
              <input
                type="text"
                value={report.report_title || 'Weekly Report'}
                onChange={(e) => setReport({ ...report, report_title: e.target.value })}
                className="text-base sm:text-lg font-bold text-fg print:text-slate-900 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:bg-surface-sunken px-1 rounded transition-colors outline-none tracking-tight font-sans"
              />
              <p className="text-xs font-semibold text-fg-muted print:text-slate-700 mt-0.5 px-1">
                {collegeName}
              </p>
            </div>
          </div>

          {/* Right: Target College Logo */}
          <div className="flex items-center shrink-0">
            {!isConsolidated && !logoFailed ? (
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

        {/* 2. Report Metadata Sub-bar */}
        <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-8 text-xs text-fg-muted bg-surface-sunken border border-border rounded-xl px-4 py-2.5 font-medium print:bg-slate-50 print:text-slate-600 print:border-slate-200 text-center">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-primary shrink-0" />
            <span>Period: <strong className="text-fg print:text-slate-900 font-semibold">{getCleanPeriod(report.report_period)}</strong></span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-fg-subtle print:text-slate-400 shrink-0" />
            <span>Generated Date: <strong className="text-fg print:text-slate-900 font-semibold">{report.generated_date}</strong></span>
          </div>
        </div>

        {/* 3. Live KPI Summary Strip */}
        {report.included_sections?.kpi_summary && report.kpi_summary && (
          <>
            {report.template_type === 'pending_tasks' || report.kpi_summary.total_pending_tasks !== undefined ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
                <div className="bg-surface border border-blue-200 dark:border-blue-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">Total Tasks</span>
                  <span className="text-sm font-bold font-mono text-primary tabular-nums">{report.kpi_summary.total_pending_tasks}</span>
                </div>
                <div className="bg-surface border border-emerald-200/80 dark:border-emerald-900/60 p-2 rounded-xl text-center shadow-2xs bg-emerald-50/20 dark:bg-emerald-950/20">
                  <span className="text-micro text-emerald-700 dark:text-emerald-400 font-semibold uppercase block">DB Shared</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">{report.kpi_summary.db_shared_count || 0}</span>
                </div>
                <div className="bg-surface border border-amber-200/80 dark:border-amber-900/60 p-2 rounded-xl text-center shadow-2xs bg-amber-50/20 dark:bg-amber-950/20">
                  <span className="text-micro text-amber-700 dark:text-amber-400 font-semibold uppercase block">DB Pending</span>
                  <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums">{report.kpi_summary.db_pending_count || 0}</span>
                </div>
                <div className="bg-surface border border-cyan-200/80 dark:border-cyan-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">JDs Received</span>
                  <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">{report.kpi_summary.jds_received || 0}</span>
                </div>
                <div className="bg-surface border border-purple-200/80 dark:border-purple-900/60 p-2 rounded-xl text-center shadow-2xs bg-purple-50/20 dark:bg-purple-950/20">
                  <span className="text-micro text-purple-700 dark:text-purple-400 font-semibold uppercase block">Scheduled</span>
                  <span className="text-sm font-bold font-mono text-purple-700 dark:text-purple-400 tabular-nums">{report.kpi_summary.drives_scheduled || 0}</span>
                </div>
                <div className="bg-surface border border-blue-200/80 dark:border-blue-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">In Progress</span>
                  <span className="text-sm font-bold font-mono text-blue-700 dark:text-blue-400 tabular-nums">{report.kpi_summary.drives_in_progress || 0}</span>
                </div>
                <div className="bg-surface border border-orange-200/80 dark:border-orange-900/60 p-2 rounded-xl text-center shadow-2xs bg-orange-50/20 dark:bg-orange-950/20">
                  <span className="text-micro text-orange-700 dark:text-orange-400 font-semibold uppercase block">Awaiting TPO</span>
                  <span className="text-sm font-bold font-mono text-orange-700 dark:text-orange-400 tabular-nums">{report.kpi_summary.awaiting_tpo || 0}</span>
                </div>
                <div className="bg-surface border border-rose-200/80 dark:border-rose-900/60 p-2 rounded-xl text-center shadow-2xs bg-rose-50/20 dark:bg-rose-950/20">
                  <span className="text-micro text-rose-700 dark:text-rose-400 font-semibold uppercase block">Awaiting HR</span>
                  <span className="text-sm font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums">{report.kpi_summary.awaiting_hr || 0}</span>
                </div>
              </div>
            ) : report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="bg-surface border border-blue-200 dark:border-blue-900/60 p-2.5 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">Total Active Leads</span>
                  <span className="text-base font-bold font-mono text-primary tabular-nums">{report.kpi_summary.total_leads || 0}</span>
                </div>
                <div className="bg-surface border border-emerald-200/80 dark:border-emerald-900/60 p-2.5 rounded-xl text-center shadow-2xs bg-emerald-50/20 dark:bg-emerald-950/20">
                  <span className="text-micro text-emerald-700 dark:text-emerald-400 font-semibold uppercase block">Graduating Batch</span>
                  <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">{report.kpi_summary.graduating_year || '2027'}</span>
                </div>
                <div className="bg-surface border border-amber-200/80 dark:border-amber-900/60 p-2.5 rounded-xl text-center shadow-2xs bg-amber-50/20 dark:bg-amber-950/20">
                  <span className="text-micro text-amber-700 dark:text-amber-400 font-semibold uppercase block">Corporate Partners</span>
                  <span className="text-base font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums">{report.kpi_summary.active_companies_count || 0}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
                <div className="bg-surface border border-blue-200 dark:border-blue-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">Calls</span>
                  <span className="text-sm font-bold font-mono text-primary tabular-nums">{report.kpi_summary.total_calls || 0}</span>
                </div>
                <div className="bg-surface border border-emerald-200/80 dark:border-emerald-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">Positives</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">{report.kpi_summary.positive_responses || 0}</span>
                </div>
                <div className="bg-surface border border-cyan-200/80 dark:border-cyan-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">JDs Received</span>
                  <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">{report.kpi_summary.jds_received || 0}</span>
                </div>
                <div className="bg-surface border border-emerald-200/80 dark:border-emerald-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">Completed</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">{report.kpi_summary.drives_completed || 0}</span>
                </div>
                <div className="bg-surface border border-blue-200/80 dark:border-blue-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">In Progress</span>
                  <span className="text-sm font-bold font-mono text-blue-700 dark:text-blue-400 tabular-nums">{report.kpi_summary.drives_in_progress || 0}</span>
                </div>
                <div className="bg-surface border border-cyan-200/80 dark:border-cyan-900/60 p-2 rounded-xl text-center shadow-2xs">
                  <span className="text-micro text-fg-subtle font-semibold uppercase block">Pipeline</span>
                  <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">{report.kpi_summary.pipeline_leads || 0}</span>
                </div>
                <div className="bg-surface border border-amber-200/80 dark:border-amber-900/60 p-2 rounded-xl text-center shadow-2xs bg-amber-50/20 dark:bg-amber-950/20">
                  <span className="text-micro text-amber-700 dark:text-amber-400 font-semibold uppercase block">Top Companies</span>
                  <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums">{report.kpi_summary.top_companies_count || 0}</span>
                </div>
                <div className="bg-surface border border-emerald-300 dark:border-emerald-700 p-2 rounded-xl text-center shadow-2xs bg-emerald-50/40 dark:bg-emerald-950/40">
                  <span className="text-micro text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Offers</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">{report.kpi_summary.total_offers || 0}</span>
                </div>
              </div>
            )}
          </>
        )}

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

        {/* Section: Placement Pending Tasks */}
        {report.included_sections?.pending_tasks && report.sections?.pending_tasks && (
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
                      <th className="py-2 px-3 text-center">Drive Date</th>
                      <th className="py-2 px-3 text-center">Remarks</th>
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
                        <td className="py-2 px-3 text-fg-subtle text-center">
                          <input
                            type="text"
                            value={r.remarks}
                            onChange={(e) =>
                              handleUpdateCell('pending_tasks', idx, 'remarks', e.target.value)
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

        {/* Section: Active Corporate Leads */}
        {report.included_sections?.active_leads && report.sections?.active_leads && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp size={14} strokeWidth={2.25} className="text-emerald-700 dark:text-emerald-400" /> ACTIVE CORPORATE LEADS
              </span>
              <span className="font-mono text-micro bg-surface px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold">
                {report.sections.active_leads.length} Leads
              </span>
            </div>

            {report.sections.active_leads.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No active leads recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-center">
                  <thead>
                    <tr className="bg-surface-sunken text-fg-muted font-semibold border-b border-border text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3 text-center">Company Name</th>
                      <th className="py-2 px-3 text-center">Role(s)</th>
                      <th className="py-2 px-3 text-center">CTC</th>
                      <th className="py-2 px-3 text-center">Fall of Month</th>
                      <th className="py-2 px-3 text-center">Graduating Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-normal bg-surface text-center">
                    {report.sections.active_leads.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-sunken/60">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg text-center">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-muted text-center">
                          <input
                            type="text"
                            value={r.role}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'role', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-muted"
                          />
                        </td>
                        <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-semibold text-center">
                          <input
                            type="text"
                            value={r.ctc}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'ctc', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-emerald-600 dark:text-emerald-400 font-semibold"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-subtle text-center">
                          <input
                            type="text"
                            value={r.followup_month}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'followup_month', e.target.value)
                            }
                            className="bg-transparent w-full text-center focus:bg-surface focus:border focus:border-primary rounded px-1 outline-none text-fg-subtle"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-subtle text-center">
                          <input
                            type="text"
                            value={r.academic_year}
                            onChange={(e) =>
                              handleUpdateCell('active_leads', idx, 'academic_year', e.target.value)
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

        {/* 7. Key Operational Observations & Remarks */}
        {report.included_sections?.remarks && (
          <div className="space-y-2 pt-2">
            <div className="font-bold text-xs text-fg flex items-center gap-1.5">
              <PenLine size={14} strokeWidth={2} aria-hidden /> Coordinator Remarks & Observations
            </div>
            <textarea
              rows={3}
              value={report.remarks}
              onChange={(e) => setReport({ ...report, remarks: e.target.value })}
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:bg-surface rounded-xl p-3 text-xs text-fg outline-none"
            />
          </div>
        )}

        {/* 8. Footer */}
        <div className="border-t border-border pt-4 text-center text-xs text-fg-subtle">
          <p className="font-medium text-fg-muted">Prepared by Infoziant</p>
          <p className="mt-0.5">© 2026 Infoziant IT Solutions Inc. All rights reserved.</p>
        </div>

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
          <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Export Excel
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

    </div>
  );
}
