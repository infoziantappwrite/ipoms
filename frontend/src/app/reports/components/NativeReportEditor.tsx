import { useState } from 'react';
import {
  FileSpreadsheet,
  PenLine,
  Download,
  Trophy,
  Rocket,
  Inbox,
  Calendar,
  User,
  Building2,
} from 'lucide-react';

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

interface NativeReportEditorProps {
  reportData: any;
  onBackToBuilder?: () => void;
}

export function NativeReportEditor({ reportData, onBackToBuilder }: NativeReportEditorProps) {
  const [report, setReport] = useState(reportData);
  const [logoFailed, setLogoFailed] = useState(false);

  if (!report) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-sm">No report loaded in editor.</p>
        <button
          onClick={onBackToBuilder}
          className="mt-3 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
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
                <x:Name>${report.report_title || 'Weekly Report'}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
          th { background-color: #1E3A8A; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left; }
          td { border: 1px solid #E2E8F0; padding: 5px 8px; }
          .title { font-size: 16pt; font-weight: bold; color: #1E3A8A; }
          .meta { font-size: 10pt; color: #475569; }
          .sec-header { background-color: #F1F5F9; font-weight: bold; font-size: 12pt; color: #1E3A8A; border: 1px solid #CBD5E1; padding: 6px; }
          .kpi-th { background-color: #0F766E; color: #FFFFFF; font-weight: bold; text-align: center; }
          .kpi-val { font-size: 13pt; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="7" class="title">INFOZIANT — ${report.report_title || 'Weekly Report'}</td></tr>
          <tr><td colspan="7" class="meta">Institution: <b>${report.branding?.college_name || 'Consolidated Partner Institutions'} [${report.branding?.college_code || 'iPOMS'}]</b></td></tr>
          <tr><td colspan="7" class="meta">Period: <b>${report.report_period || '—'}</b> | Generated: <b>${report.generated_date || '—'}</b> | Prepared By: <b>${report.generated_by || '—'}</b></td></tr>
          <tr><td colspan="7"></td></tr>
    `;

    // KPI Summary
    if (report.kpi_summary) {
      html += `
        <tr><td colspan="7" class="sec-header">OPERATIONAL KPI SUMMARY</td></tr>
        <tr>
          <th class="kpi-th">Total Calls</th>
          <th class="kpi-th">Positives</th>
          <th class="kpi-th">JDs Received</th>
          <th class="kpi-th">Completed</th>
          <th class="kpi-th">In Progress</th>
          <th class="kpi-th">Pipeline</th>
          <th class="kpi-th">Offers Placed</th>
        </tr>
        <tr>
          <td class="kpi-val" style="color:#2563EB;">${report.kpi_summary.total_calls}</td>
          <td class="kpi-val" style="color:#059669;">${report.kpi_summary.positive_responses}</td>
          <td class="kpi-val" style="color:#0891B2;">${report.kpi_summary.jds_received}</td>
          <td class="kpi-val" style="color:#D97706;">${report.kpi_summary.drives_completed}</td>
          <td class="kpi-val" style="color:#7C3AED;">${report.kpi_summary.drives_in_progress}</td>
          <td class="kpi-val" style="color:#475569;">${report.kpi_summary.pipeline_leads}</td>
          <td class="kpi-val" style="color:#059669;">${report.kpi_summary.total_offers}</td>
        </tr>
        <tr><td colspan="7"></td></tr>
      `;
    }

    // Section 1: Companies Completed
    if (report.sections?.completed_companies && report.sections.completed_companies.length > 0) {
      html += `
        <tr><td colspan="7" class="sec-header">1. COMPANIES COMPLETED (${report.sections.completed_companies.length} Drives)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role(s)</th>
          <th>Type</th>
          <th>CTC</th>
          <th style="text-align:center;">Offers Placed</th>
          <th>Status Notes</th>
        </tr>
      `;
      report.sections.completed_companies.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td>${r.company_type || '—'}</td>
            <td>${r.ctc_lpa || '—'}</td>
            <td style="text-align:center; font-weight:bold; color:#059669;">${r.selected_count || 0}</td>
            <td>${r.current_status_text || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="7"></td></tr>`;
    }

    // Section 2: Companies In Progress
    if (report.sections?.in_progress && report.sections.in_progress.length > 0) {
      html += `
        <tr><td colspan="7" class="sec-header">2. COMPANIES IN PROGRESS (${report.sections.in_progress.length} Drives)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role(s)</th>
          <th>Type</th>
          <th>CTC</th>
          <th colspan="2">Status Remarks</th>
        </tr>
      `;
      report.sections.in_progress.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td>${r.company_type || '—'}</td>
            <td>${r.ctc_lpa || '—'}</td>
            <td colspan="2">${r.current_status_text || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="7"></td></tr>`;
    }

    // Section 3: Companies in Pipeline
    if (report.sections?.pipeline && report.sections.pipeline.length > 0) {
      html += `
        <tr><td colspan="7" class="sec-header">3. COMPANIES IN PIPELINE (${report.sections.pipeline.length} Leads)</td></tr>
        <tr>
          <th style="width:50px; text-align:center;">#</th>
          <th>Company Name</th>
          <th>Role(s)</th>
          <th>Type</th>
          <th colspan="3">Current Status</th>
        </tr>
      `;
      report.sections.pipeline.forEach((r: any) => {
        html += `
          <tr>
            <td style="text-align:center;">${r.s_no}</td>
            <td><b>${r.company_name}</b></td>
            <td>${r.job_role || '—'}</td>
            <td>${r.company_type || '—'}</td>
            <td colspan="3">${r.current_status_text || '—'}</td>
          </tr>
        `;
      });
      html += `<tr><td colspan="7"></td></tr>`;
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
    <div className="max-w-5xl mx-auto p-6 space-y-4 print:p-0 print:m-0 print:max-w-full">

      {/* ── Document Canvas (Printable Page) ────────────────────────────────── */}
      <div
        id="printable-report-canvas"
        className="printable-report-canvas bg-white border border-slate-200 rounded-2xl shadow-xs p-8 space-y-6 text-slate-800 print:w-full print:p-0 print:border-none print:shadow-none"
      >

        {/* 1. Header Branding Strip with Infoziant Logo (Left) & Target College Logo (Right) */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 gap-4">
          {/* Left: Infoziant Logo & Report Title + College Name with Acronym */}
          <div className="flex items-center gap-3.5">
            <img
              src="/infoziant-head.png"
              alt="Infoziant"
              className="h-14 w-auto object-contain shrink-0"
              onError={(e) => {
                // Fallback if direct root path fails
                (e.target as HTMLImageElement).src = '/college-logos/Infozianthead.png';
              }}
            />
            <div>
              <input
                type="text"
                value={report.report_title || 'Weekly Report'}
                onChange={(e) => setReport({ ...report, report_title: e.target.value })}
                className="text-base sm:text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:bg-slate-50 px-1 rounded transition-colors outline-none tracking-tight font-sans"
              />
              <p className="text-xs font-semibold text-slate-700 mt-0.5 px-1">
                {collegeName}
              </p>
            </div>
          </div>

          {/* Right: Target College Logo (Show only logo when present) */}
          <div className="flex items-center">
            {!isConsolidated && !logoFailed ? (
              <img
                key={collegeLogoUrl}
                src={collegeLogoUrl}
                alt={collegeName}
                className="h-12 w-auto max-w-[140px] object-contain shrink-0"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                <Building2 size={14} className="text-primary shrink-0" />
                <span>{isConsolidated ? 'iPOMS' : collegeCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Report Metadata Sub-bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2 font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-primary shrink-0" />
            <span>Period: <strong className="text-slate-900 font-semibold">{report.report_period}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>Generated Date: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={13} className="text-slate-400 shrink-0" />
            <span>Prepared By: <strong className="text-slate-900 font-semibold">{report.generated_by}</strong></span>
          </div>
        </div>

        {/* 3. Live KPI Summary Strip (Slim Single-Row Profile) */}
        {report.included_sections?.kpi_summary && report.kpi_summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
            <div className="bg-white border border-blue-200/80 p-2 rounded-xl text-center shadow-2xs">
              <span className="text-micro text-slate-500 font-semibold uppercase block">Calls</span>
              <span className="text-sm font-bold font-mono text-primary tabular-nums">{report.kpi_summary.total_calls}</span>
            </div>
            <div className="bg-white border border-emerald-200/80 p-2 rounded-xl text-center shadow-2xs">
              <span className="text-micro text-slate-500 font-semibold uppercase block">Positives</span>
              <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">{report.kpi_summary.positive_responses}</span>
            </div>
            <div className="bg-white border border-cyan-200/80 p-2 rounded-xl text-center shadow-2xs">
              <span className="text-micro text-slate-500 font-semibold uppercase block">JDs Received</span>
              <span className="text-sm font-bold font-mono text-cyan-700 tabular-nums">{report.kpi_summary.jds_received}</span>
            </div>
            <div className="bg-white border border-amber-200/80 p-2 rounded-xl text-center shadow-2xs">
              <span className="text-micro text-slate-500 font-semibold uppercase block">Completed</span>
              <span className="text-sm font-bold font-mono text-amber-700 tabular-nums">{report.kpi_summary.drives_completed}</span>
            </div>
            <div className="bg-white border border-purple-200/80 p-2 rounded-xl text-center shadow-2xs">
              <span className="text-micro text-slate-500 font-semibold uppercase block">In Progress</span>
              <span className="text-sm font-bold font-mono text-purple-700 tabular-nums">{report.kpi_summary.drives_in_progress}</span>
            </div>
            <div className="bg-white border border-slate-200 p-2 rounded-xl text-center shadow-2xs">
              <span className="text-micro text-slate-500 font-semibold uppercase block">Pipeline</span>
              <span className="text-sm font-bold font-mono text-slate-700 tabular-nums">{report.kpi_summary.pipeline_leads}</span>
            </div>
            <div className="bg-white border border-emerald-300 p-2 rounded-xl text-center shadow-2xs bg-emerald-50/40">
              <span className="text-micro text-emerald-800 font-bold uppercase block">Offers</span>
              <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">{report.kpi_summary.total_offers}</span>
            </div>
          </div>
        )}

        {/* 4. Section 1: Companies Completed */}
        {report.included_sections?.completed_companies && report.sections?.completed_companies && (
          <div className="space-y-2 pt-2">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 font-bold text-xs flex items-center justify-between text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Trophy size={14} strokeWidth={2.25} className="text-emerald-700" /> 1. COMPANIES COMPLETED
              </span>
              <span className="font-mono text-micro bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                {report.sections.completed_companies.length} Drives
              </span>
            </div>

            {report.sections.completed_companies.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No completed drives in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Role(s)</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">CTC</th>
                      <th className="py-2 px-3 text-center">Offers</th>
                      <th className="py-2 px-3">Status Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {report.sections.completed_companies.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2 text-center text-slate-400">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-white focus:border focus:border-primary rounded px-1 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          <input
                            type="text"
                            value={r.job_role}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'job_role', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-white focus:border focus:border-primary rounded px-1 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-500">{r.company_type}</td>
                        <td className="py-2 px-3 text-emerald-700 font-medium">{r.ctc_lpa}</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">
                          <input
                            type="number"
                            value={r.selected_count}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'selected_count', Number(e.target.value))
                            }
                            className="bg-transparent w-14 text-center focus:bg-white focus:border focus:border-primary rounded px-1 font-bold text-emerald-700 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          <input
                            type="text"
                            value={r.current_status_text}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'current_status_text', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-white focus:border focus:border-primary rounded px-1 outline-none"
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
            <div className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 font-bold text-xs flex items-center justify-between text-blue-800">
              <span className="flex items-center gap-1.5">
                <Rocket size={14} strokeWidth={2.25} className="text-blue-700" /> 2. COMPANIES IN PROGRESS
              </span>
              <span className="font-mono text-micro bg-white px-2 py-0.5 rounded-md border border-blue-200">
                {report.sections.in_progress.length} Drives
              </span>
            </div>

            {report.sections.in_progress.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No active drives currently in progress.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Role(s)</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">CTC</th>
                      <th className="py-2 px-3">Status Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {report.sections.in_progress.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2 text-center text-slate-400">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('in_progress', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-white focus:border focus:border-primary rounded px-1 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-600">{r.job_role}</td>
                        <td className="py-2 px-3 text-slate-500">{r.company_type}</td>
                        <td className="py-2 px-3 text-blue-700 font-medium">{r.ctc_lpa}</td>
                        <td className="py-2 px-3 text-slate-500">{r.current_status_text}</td>
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
            <div className="px-3 py-1.5 rounded-xl border border-cyan-200 bg-cyan-50/70 font-bold text-xs flex items-center justify-between text-cyan-800">
              <span className="flex items-center gap-1.5">
                <Inbox size={14} strokeWidth={2.25} className="text-cyan-700" /> 3. COMPANIES IN PIPELINE
              </span>
              <span className="font-mono text-micro bg-white px-2 py-0.5 rounded-md border border-cyan-200">
                {report.sections.pipeline.length} Leads
              </span>
            </div>

            {report.sections.pipeline.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No pipeline leads recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Role(s)</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {report.sections.pipeline.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2 text-center text-slate-400">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{r.company_name}</td>
                        <td className="py-2 px-3 text-slate-600">{r.job_role}</td>
                        <td className="py-2 px-3 text-slate-500">{r.company_type}</td>
                        <td className="py-2 px-3 text-slate-500">{r.current_status_text}</td>
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
            <div className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
              <PenLine size={14} strokeWidth={2} aria-hidden /> Coordinator Remarks & Observations
            </div>
            <textarea
              rows={3}
              value={report.remarks}
              onChange={(e) => setReport({ ...report, remarks: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 focus:border-primary focus:bg-white rounded-xl p-3 text-xs text-slate-800 outline-none"
            />
          </div>
        )}

        {/* 8. Confidential Footer */}
        <div className="border-t border-slate-200 pt-4 text-center text-micro text-slate-400">
          <p>{report.branding?.confidential_notice || 'CONFIDENTIAL: For placement office & institutional leadership review only.'}</p>
          <p className="mt-0.5">© 2026 Infoziant IT Solutions Inc. All rights reserved.</p>
        </div>

      </div>

      {/* ── Bottom Action Toolbar (Bottom Right Corner at End of Page) ────────── */}
      <div className="flex items-center justify-end gap-2.5 pt-2 pb-6 print:hidden">
        {/* 1. Back (Neutral Slate) */}
        <button
          type="button"
          onClick={onBackToBuilder}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
        >
          Back
        </button>

        {/* 2. Export Excel (Emerald Green) */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Export Excel
        </button>

        {/* 3. Image (Infoziant Sky / Cyan) */}
        <button
          type="button"
          onClick={handleExportImage}
          disabled={exportingImage}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <Download size={14} strokeWidth={2} aria-hidden /> {exportingImage ? 'Saving…' : 'Image'}
        </button>

        {/* 4. Save PDF (Infoziant Corporate Navy) */}
        <button
          type="button"
          onClick={handlePrintPdf}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <Download size={14} strokeWidth={2} aria-hidden /> Save PDF
        </button>
      </div>

    </div>
  );
}
