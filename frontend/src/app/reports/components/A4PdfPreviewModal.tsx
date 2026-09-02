'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trophy,
  Rocket,
  Inbox,
  Star,
  ListTodo,
  TrendingUp,
  Calendar,
  User,
  Building2,
  FileSpreadsheet,
  PenLine,
  XCircle,
  Clock,
  Briefcase,
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
  MCET: '/college-logos/MCET.png',
  MEC: '/college-logos/MEC.png',
};

function getCleanPeriod(period?: string): string {
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

interface Props {
  report: any;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function A4PdfPreviewModal({ report, isOpen, onClose, onPrint }: Props) {
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75%, 100%, 125%
  const [logoFailed, setLogoFailed] = useState(false);
  const [paperPages, setPaperPages] = useState(1);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paperRef.current) {
      const scrollH = paperRef.current.scrollHeight;
      const computedPages = Math.max(1, Math.ceil(scrollH / 1123));
      setPaperPages(computedPages);
    }
  }, [report, zoomLevel, isOpen]);

  useEffect(() => {
    setLogoFailed(false);
  }, [report?.branding?.college_code]);

  if (!isOpen || !report) return null;

  const collegeName = report.branding?.college_name || 'Consolidated Partner Institutions';
  const collegeCode = (report.branding?.college_code || 'iPOMS').toUpperCase();
  const isConsolidated = !collegeCode || collegeCode === 'IPOMS';
  const collegeLogoUrl = COLLEGE_LOGO_MAP[collegeCode] || `/college-logos/${collegeCode.toLowerCase()}.png`;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 15, 140));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 15, 60));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      {/* ── Top Floating Action Bar ────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between shadow-lg z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileSpreadsheet size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>A4 PDF Print Preview</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                210mm × 297mm Sheet
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Standard light-themed institutional layout as printed on paper
            </p>
          </div>
        </div>

        {/* Center: Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700 rounded flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 text-xs font-mono font-semibold text-slate-300 hover:text-white"
            title="Reset Zoom"
          >
            {zoomLevel}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700 rounded flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Right: Print / Save PDF & Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              setTimeout(() => {
                onPrint();
              }, 100);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Save PDF / Print</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
            title="Close Preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Scrollable Preview Viewport (Emulating Standard Paper Desk) ─────── */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-slate-900/60 no-scrollbar">
        {/* ── Simulated A4 White Paper Container ────────────────────────────── */}
        <div
          ref={paperRef}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            width: '794px', // 210mm at 96 DPI
            minHeight: `${Math.max(1, paperPages) * 1123}px`, // Exact multiple of A4 page height (1123px, 2246px, etc.)
          }}
          className="bg-white text-slate-900 rounded-none sm:rounded-sm shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-slate-300 p-8 sm:p-12 transition-transform duration-200 select-text flex flex-col justify-between relative"
        >
          {/* 1. Header Branding Strip with Infoziant Logo (Left), Centered Title & Subtitle, & Target College Logo (Right) */}
          <div className="flex items-center justify-between border-b-2 border-slate-300 pb-4 gap-4 mb-2">
            {/* Left: Infoziant Corporate Header */}
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
              <h1 className="text-lg font-bold text-blue-900 tracking-tight font-sans text-center">
                {report.report_title ||
                  (report.template_type === 'month_end'
                    ? `${report.report_period?.split(' ')[0] || 'August'} Month Placement Operations Report`
                    : report.template_type === 'pending_tasks'
                    ? 'Pending Tasks Action Report'
                    : report.template_type === 'active_leads'
                    ? 'Active Leads Pipeline Report'
                    : 'Weekly Placement Report')}
              </h1>
              <p className="text-xs font-semibold text-slate-700 mt-0.5 text-center">
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
                <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
                  <Building2 size={14} className="text-blue-900 shrink-0" />
                  <span>{isConsolidated ? 'iPOMS' : collegeCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Report Metadata Ribbon */}
          <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-5 py-2.5 font-medium mb-4">
            {report.template_type === 'month_end' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-blue-900 shrink-0" />
                  <span>Prepared by: <strong className="text-slate-900 font-semibold">{report.generated_by || report.branding?.prepared_by || 'Placement Coordinator'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500 shrink-0" />
                  <span>Generated Date: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
                </div>
              </>
            ) : report.template_type === 'weekly_placement' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-700 shrink-0" />
                  <span>Period: <strong className="text-slate-900 font-semibold">{getCleanPeriod(report.report_period)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-emerald-700 shrink-0" />
                  <span>Prepared by: <strong className="text-slate-900 font-semibold">{report.generated_by || report.branding?.prepared_by || 'Placement Coordinator'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span>Generated Date: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-emerald-700 shrink-0" />
                  <span>Prepared by: <strong className="text-slate-900 font-semibold">{report.generated_by || report.branding?.prepared_by || 'Placement Coordinator'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span>Generated Date: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
                </div>
              </>
            )}
          </div>

          {/* Main Paper Content */}
          <div className="space-y-6 flex-1 flex flex-col pt-1">

            {/* 3. KPI Summary Strip (Excluded for Pending Tasks) */}
            {report.template_type !== 'pending_tasks' && report.included_sections?.kpi_summary && report.kpi_summary && (() => {
              const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
              if (report.template_type === 'month_end') {
                const meCards = [
                  { key: 'total_conversion_count', label: 'Total Conversions', val: report.kpi_summary.total_conversion_count || 0, bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-700', labelText: 'text-emerald-800' },
                  { key: 'total_companies_scheduled', label: 'Companies Scheduled', val: report.kpi_summary.total_companies_scheduled || 0, bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', labelText: 'text-amber-800' },
                  { key: 'total_offers_moved', label: 'Offers Received', val: report.kpi_summary.total_offers_moved || 0, bg: 'bg-purple-50 border-purple-300', text: 'text-purple-700', labelText: 'text-purple-800' },
                ].filter((c) => activeKpis[c.key] !== false);

                if (meCards.length === 0) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {meCards.map((c) => (
                      <div key={c.key} className={`border p-3 rounded-xl text-center shadow-xs ${c.bg}`}>
                        <span className={`text-[10px] font-bold uppercase block tracking-wider ${c.labelText}`}>{c.label}</span>
                        <span className={`text-lg font-extrabold font-mono ${c.text}`}>{c.val}</span>
                      </div>
                    ))}
                  </div>
                );
              } else if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
                const alCards = [
                  { key: 'total_leads', label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, bg: 'bg-blue-50 border-blue-300', text: 'text-blue-700', labelText: 'text-blue-800' },
                  { key: 'graduating_year', label: 'Graduating Batch', val: report.kpi_summary.graduating_year || '2027', bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-700', labelText: 'text-emerald-800' },
                ].filter((c) => activeKpis[c.key] !== false);

                if (alCards.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {alCards.map((c) => (
                      <div key={c.key} className={`flex-1 min-w-[100px] border p-2.5 rounded-xl text-center shadow-xs ${c.bg}`}>
                        <span className={`text-[10px] font-bold uppercase block tracking-wider ${c.labelText}`}>{c.label}</span>
                        <span className={`text-base font-extrabold font-mono ${c.text}`}>{c.val}</span>
                      </div>
                    ))}
                  </div>
                );
              } else {
                const wpCards = [
                  { key: 'total_calls', label: 'Calls', val: report.kpi_summary.total_calls || 0, bg: 'bg-blue-50/80 border-blue-200', text: 'text-blue-700', labelText: 'text-blue-800' },
                  { key: 'positive_responses', label: 'Positives', val: report.kpi_summary.positive_responses || 0, bg: 'bg-emerald-50/80 border-emerald-200', text: 'text-emerald-700', labelText: 'text-emerald-800' },
                  { key: 'jds_received', label: 'JDs', val: report.kpi_summary.jds_received || 0, bg: 'bg-cyan-50/80 border-cyan-200', text: 'text-cyan-700', labelText: 'text-cyan-800' },
                  { key: 'drives_completed', label: 'Completed', val: report.kpi_summary.drives_completed || 0, bg: 'bg-emerald-50/80 border-emerald-200', text: 'text-emerald-700', labelText: 'text-emerald-800' },
                  { key: 'drives_in_progress', label: 'In Progress', val: report.kpi_summary.drives_in_progress || 0, bg: 'bg-blue-50/80 border-blue-200', text: 'text-blue-700', labelText: 'text-blue-800' },
                  { key: 'pipeline_leads', label: 'Pipeline', val: report.kpi_summary.pipeline_leads || 0, bg: 'bg-cyan-50/80 border-cyan-200', text: 'text-cyan-700', labelText: 'text-cyan-800' },
                  { key: 'top_companies_count', label: 'Top Cos', val: report.kpi_summary.top_companies_count || 0, bg: 'bg-purple-50/80 border-purple-200', text: 'text-purple-700', labelText: 'text-purple-800' },
                  { key: 'total_offers', label: 'Offers', val: report.kpi_summary.total_offers || 0, bg: 'bg-emerald-50/80 border-emerald-200', text: 'text-emerald-700', labelText: 'text-emerald-800' },
                ].filter((c) => activeKpis[c.key] !== false);

                if (wpCards.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {wpCards.map((c) => (
                      <div key={c.key} className={`flex-1 min-w-[80px] border p-2 rounded-lg text-center shadow-xs ${c.bg}`}>
                        <span className={`text-[10px] font-bold uppercase block truncate ${c.labelText}`}>{c.label}</span>
                        <span className={`text-sm font-bold font-mono ${c.text}`}>{c.val}</span>
                      </div>
                    ))}
                  </div>
                );
              }
            })()}

            {/* ── Weekly Placement Report Standard Sections 1-7 ── */}
            {(!report.template_type || report.template_type === 'weekly_placement') && (
              <>
                {/* 4. Section 1: Companies Completed */}
                {report.included_sections?.completed_companies && report.sections?.completed_companies && (
                  <div className="space-y-1.5">
                    {report.sections.completed_companies.length === 0 ? (
                      <div className="space-y-1">
                        <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 font-bold text-[11px] flex items-center text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <Trophy size={13} className="text-emerald-700" /> 1. COMPANIES COMPLETED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic py-1 pl-2">No completed drives in this period.</p>
                      </div>
                    ) : (
                      <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '8%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-emerald-50 border-b border-emerald-200 text-emerald-900">
                        <th colSpan={6} className="py-1.5 px-3 text-left font-bold text-[11px] bg-emerald-50 text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <Trophy size={13} className="text-emerald-700 shrink-0" /> 1. COMPANIES COMPLETED
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2 w-[25%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[25%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Status</th>
                        <th className="py-1 px-1 w-[8%] text-center whitespace-normal leading-tight">Offers<br />Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.completed_companies.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2 w-[25%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[25%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role}</td>
                          <td className="py-1.5 px-1 w-[11%] text-center text-emerald-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-600 border-r border-slate-200 whitespace-normal leading-snug">{r.current_status_text}</td>
                          <td className="py-1.5 px-1 w-[8%] text-center font-bold text-emerald-700 whitespace-nowrap">{r.selected_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 5. Section 2: Companies In Progress */}
            {report.included_sections?.in_progress && report.sections?.in_progress && (
              <div className="space-y-1.5">
                {report.sections.in_progress.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-blue-50 border border-blue-200 font-bold text-[11px] flex items-center text-blue-900">
                      <span className="flex items-center gap-1.5">
                        <Rocket size={13} className="text-blue-700" /> 2. COMPANIES IN PROGRESS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No active drives currently in progress.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-blue-50 border-b border-blue-200 text-blue-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-blue-50 text-blue-900">
                          <span className="flex items-center gap-1.5">
                            <Rocket size={13} className="text-blue-700 shrink-0" /> 2. COMPANIES IN PROGRESS
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.in_progress.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-blue-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa}</td>
                          <td className="py-1.5 px-2 w-[30%] text-center text-slate-600 whitespace-normal leading-snug">{r.current_status_text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 6. Section 3: Companies in Pipeline */}
            {report.included_sections?.pipeline && report.sections?.pipeline && (
              <div className="space-y-1.5">
                {report.sections.pipeline.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-cyan-50 border border-cyan-200 font-bold text-[11px] flex items-center text-cyan-900">
                      <span className="flex items-center gap-1.5">
                        <Inbox size={13} className="text-cyan-700" /> 3. COMPANIES IN PIPELINE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No pipeline leads recorded.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-cyan-50 border-b border-cyan-200 text-cyan-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-cyan-50 text-cyan-900">
                          <span className="flex items-center gap-1.5">
                            <Inbox size={13} className="text-cyan-700 shrink-0" /> 3. COMPANIES IN PIPELINE
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.pipeline.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-cyan-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa || '—'}</td>
                          <td className="py-1.5 px-2 w-[30%] text-center text-slate-600 whitespace-normal leading-snug">{r.current_status_text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 7. Section 4: Top Companies */}
            {report.included_sections?.top_companies && report.sections?.top_companies && (
              <div className="space-y-1.5">
                {report.sections.top_companies.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-amber-50 border border-amber-200 font-bold text-[11px] flex items-center text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <Star size={13} className="text-amber-600" /> 4. TOP COMPANIES
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No top companies recorded for this period.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-amber-50 border-b border-amber-200 text-amber-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-amber-50 text-amber-900">
                          <span className="flex items-center gap-1.5">
                            <Star size={13} className="text-amber-600 shrink-0" /> 4. TOP COMPANIES
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.top_companies.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-amber-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa}</td>
                          <td className="py-1.5 px-2 w-[30%] text-center text-slate-600 whitespace-normal leading-snug">{r.current_status_text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 8. Section 5: Rejected Companies */}
            {((report.included_sections?.rejected_companies && report.sections?.rejected_companies && report.sections.rejected_companies.length > 0) ||
              (report.included_sections?.rejected_by_hr && report.sections?.rejected_by_hr && report.sections.rejected_by_hr.length > 0)) && (
              <div className="space-y-1.5">
                <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="bg-rose-50 border-b border-rose-200 text-rose-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-rose-50 text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <XCircle size={13} className="text-rose-600 shrink-0" /> 5. REJECTED COMPANIES
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-rose-100/60 text-rose-900 font-semibold text-[10px] uppercase border-b border-rose-200">
                      <th className="py-1.5 px-1 w-10 text-center border-r border-rose-200 font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-1.5 px-2 w-[27%] text-center border-r border-rose-200 whitespace-normal">Company Name</th>
                      <th className="py-1.5 px-2 w-[28%] text-center border-r border-rose-200 whitespace-normal">Role</th>
                      <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-rose-200 whitespace-nowrap">CTC</th>
                      <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200 text-center">
                    {(report.sections.rejected_companies || report.sections.rejected_by_hr).map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-rose-50/30'}>
                        <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-1.5 px-2 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                        <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role}</td>
                        <td className="py-1.5 px-1 w-[11.5%] text-center text-rose-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa || '—'}</td>
                        <td className="py-1.5 px-2 w-[30%] text-center text-rose-700 font-medium whitespace-normal leading-snug">{r.current_status_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 9. Section 6: Companies On Hold By College */}
            {((report.included_sections?.on_hold_by_college && report.sections?.on_hold_by_college && report.sections.on_hold_by_college.length > 0) ||
              (report.included_sections?.rejected_by_college && report.sections?.rejected_by_college && report.sections.rejected_by_college.length > 0)) && (
              <div className="space-y-1.5">
                <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="bg-orange-50 border-b border-orange-200 text-orange-900">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-orange-50 text-orange-900">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-orange-600 shrink-0" /> 6. COMPANIES ON HOLD BY COLLEGE
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-orange-100/60 text-orange-900 font-semibold text-[10px] uppercase border-b border-orange-200">
                      <th className="py-1.5 px-1 w-10 text-center border-r border-orange-200 font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-1.5 px-2 w-[27%] text-center border-r border-orange-200 whitespace-normal">Company Name</th>
                      <th className="py-1.5 px-2 w-[28%] text-center border-r border-orange-200 whitespace-normal">Role</th>
                      <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                      <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-200 text-center">
                    {(report.sections.on_hold_by_college || report.sections.rejected_by_college).map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                        <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-1.5 px-2 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                        <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role}</td>
                        <td className="py-1.5 px-1 w-[11.5%] text-orange-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa || '—'}</td>
                        <td className="py-1.5 px-2 w-[30%] text-center text-orange-700 font-medium whitespace-normal leading-snug">{r.current_status_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 10. Section 7: Companies On Hold By HR */}
            {report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && report.sections.on_hold_by_hr.length > 0 && (
              <div className="space-y-1.5">
                <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                  <colgroup>
                    <col style={{ width: '38px' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '11.5%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="print:table-header-group">
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                      <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-slate-100 text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-600 shrink-0" /> 7. COMPANIES ON HOLD BY HR
                        </span>
                      </th>
                    </tr>
                    <tr className="bg-slate-200/70 text-slate-800 font-semibold text-[10px] uppercase border-b border-slate-300">
                      <th className="py-1.5 px-1 w-10 text-center border-r border-slate-300 font-mono" style={{ width: '38px' }}>#</th>
                      <th className="py-1.5 px-2 w-[27%] text-center border-r border-slate-300 whitespace-normal">Company Name</th>
                      <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-300 whitespace-normal">Role</th>
                      <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-300 whitespace-nowrap">CTC</th>
                      <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-center">
                    {report.sections.on_hold_by_hr.map((r: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-300" style={{ width: '38px' }}>{r.s_no}</td>
                        <td className="py-1.5 px-2 w-[27%] text-center font-bold text-slate-900 border-r border-slate-300 whitespace-normal leading-snug">{r.company_name}</td>
                        <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-300 whitespace-normal leading-snug">{r.job_role}</td>
                        <td className="py-1.5 px-1 w-[11.5%] text-center text-slate-700 font-semibold border-r border-slate-300 whitespace-nowrap">{r.ctc_lpa || '—'}</td>
                        <td className="py-1.5 px-2 w-[30%] text-center text-slate-700 font-medium whitespace-normal leading-snug">{r.current_status_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <div className="space-y-1.5">
                  {report.sections.pending_tasks.length === 0 ? (
                    <div className="space-y-1">
                      <div className="px-3 py-1 rounded-md bg-indigo-50 border border-indigo-200 font-bold text-[11px] flex items-center text-indigo-900">
                        <span className="flex items-center gap-1.5">
                          <ListTodo size={13} className="text-indigo-700" /> PLACEMENT PENDING TASKS
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 italic py-1 pl-2">No pending tasks recorded for this period.</p>
                    </div>
                  ) : (
                    <table className="w-full text-[10px] text-center border-collapse border border-slate-200 table-fixed">
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
                        <tr className="bg-indigo-50 border-b border-indigo-200 text-indigo-900">
                          <th colSpan={hasDriveDate ? 7 : 6} className="py-1.5 px-3 text-left font-bold text-[11px] bg-indigo-50 text-indigo-900">
                            <span className="flex items-center gap-1.5">
                              <ListTodo size={13} className="text-indigo-700 shrink-0" /> PLACEMENT PENDING TASKS
                            </span>
                          </th>
                        </tr>
                        <tr className="bg-slate-100 text-slate-700 font-semibold text-[9px] uppercase border-b border-slate-200">
                          <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                          <th className={`py-1.5 px-2 ${hasDriveDate ? 'w-[25%]' : 'w-[29%]'} text-center border-r border-slate-200 whitespace-normal`}>Company Name</th>
                          <th className={`py-1.5 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center border-r border-slate-200 whitespace-nowrap`}>JD Date</th>
                          <th className={`py-1.5 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center border-r border-slate-200 whitespace-nowrap`}>DB Date</th>
                          <th className={`py-1.5 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center border-r border-slate-200 whitespace-normal`}>Current Status</th>
                          <th className={`py-1.5 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center border-r border-slate-200 whitespace-normal`}>Remarks / Next Action</th>
                          {hasDriveDate && <th className="py-1.5 px-1.5 w-[11%] text-center whitespace-nowrap">Drive Date</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-center">
                        {report.sections.pending_tasks.map((r: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                            <td className={`py-1.5 px-2 ${hasDriveDate ? 'w-[25%]' : 'w-[29%]'} text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug`}>{r.company_name}</td>
                            <td className={`py-1.5 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center text-slate-600 border-r border-slate-200 whitespace-nowrap`}>{r.jd_received_date || '—'}</td>
                            <td className={`py-1.5 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center text-slate-600 border-r border-slate-200 whitespace-nowrap`}>{r.db_shared_date || '—'}</td>
                            <td className={`py-1.5 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug`}>{r.current_status || '—'}</td>
                            <td className={`py-1.5 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center text-slate-900 font-medium border-r border-slate-200 whitespace-normal leading-snug`}>{r.action_to_be_taken || '—'}</td>
                            {hasDriveDate && (
                              <td className="py-1.5 px-1.5 w-[11%] text-center text-indigo-700 font-semibold whitespace-nowrap">{r.drive_date || '—'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

            {/* Section: Active Corporate Leads */}
            {report.included_sections?.active_leads && report.sections?.active_leads && (
              <div className="space-y-1.5">
                {report.sections.active_leads.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 font-bold text-[11px] flex items-center text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp size={13} className="text-emerald-700" /> ACTIVE CORPORATE LEADS — {String(report.kpi_summary?.graduating_year || report.academic_year || '2027').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No active leads recorded for this graduating batch.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '39%' }} />
                      <col style={{ width: '39%' }} />
                      <col style={{ width: '18%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-emerald-50 border-b border-emerald-200 text-emerald-900">
                        <th colSpan={4} className="py-1.5 px-3 text-left font-bold text-[11px] bg-emerald-50 text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-emerald-700 shrink-0" /> ACTIVE CORPORATE LEADS — {String(report.kpi_summary?.graduating_year || report.academic_year || '2027').toUpperCase()}
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-3 w-[39%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-3 w-[39%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-2 w-[18%] text-center whitespace-nowrap">CTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.active_leads.map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-3 w-[39%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-3 w-[39%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || '—'}</td>
                          <td className="py-1.5 px-2 w-[18%] text-center text-emerald-700 font-semibold whitespace-nowrap">{r.ctc || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Month-End Table 1: Companies Completed */}
            {report.template_type === 'month_end' && report.included_sections?.completed_companies && report.sections?.completed_companies && (
              <div className="space-y-1.5">
                {report.sections.completed_companies.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 font-bold text-[11px] flex items-center text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <Trophy size={13} className="text-emerald-700" /> COMPANIES COMPLETED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No completed drives recorded for this month.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '8%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-emerald-50 border-b border-emerald-200 text-emerald-900">
                        <th colSpan={6} className="py-1.5 px-3 text-left font-bold text-[11px] bg-emerald-50 text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <Trophy size={13} className="text-emerald-700 shrink-0" /> COMPANIES COMPLETED
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2.5 w-[25%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[25%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Status</th>
                        <th className="py-1 px-1 w-[8%] text-center whitespace-normal leading-tight">Offers<br />Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.completed_companies.map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2.5 w-[25%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[25%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || r.job_role || '—'}</td>
                          <td className="py-1.5 px-1 w-[11%] text-center text-slate-700 border-r border-slate-200 whitespace-nowrap">{r.ctc || r.ctc_lpa || '—'}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center font-medium text-emerald-700 border-r border-slate-200 whitespace-normal leading-snug">{r.status || r.current_status_text || 'Drive Completed'}</td>
                          <td className="py-1.5 px-1 w-[8%] text-center font-bold text-emerald-700 whitespace-nowrap">{r.offers_received ?? r.selected_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Month-End Table 2: JD Received Companies */}
            {report.template_type === 'month_end' && report.included_sections?.company_conversions && report.sections?.company_conversions && (
              <div className="space-y-1.5">
                {report.sections.company_conversions.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 font-bold text-[11px] flex items-center text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <Briefcase size={13} className="text-emerald-700" /> JD RECEIVED COMPANIES
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No JD received companies recorded for this month.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '36%' }} />
                      <col style={{ width: '38%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '11.5%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-emerald-50 border-b border-emerald-200 text-emerald-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-emerald-50 text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <Briefcase size={13} className="text-emerald-700 shrink-0" /> JD RECEIVED COMPANIES
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2.5 w-[36%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[38%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1 px-1.5 w-[11.5%] text-center whitespace-normal leading-tight">JD Received<br />Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.company_conversions.map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2.5 w-[36%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[38%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-emerald-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc}</td>
                          <td className="py-1.5 px-1.5 w-[11.5%] text-center text-slate-600 whitespace-nowrap leading-snug">{r.jd_received_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Month-End Table 3: Companies in Drive */}
            {report.template_type === 'month_end' && (report.included_sections?.companies_in_drive || report.included_sections?.company_drives_scheduled) && (report.sections?.companies_in_drive || report.sections?.company_drives_scheduled) && (
              <div className="space-y-1.5">
                {(report.sections.companies_in_drive || report.sections.company_drives_scheduled).length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-indigo-50 border border-indigo-200 font-bold text-[11px] flex items-center text-indigo-900">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-indigo-700" /> COMPANIES IN DRIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No companies in drive recorded for this month.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-indigo-50 border-b border-indigo-200 text-indigo-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-indigo-50 text-indigo-900">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-indigo-700 shrink-0" /> COMPANIES IN DRIVE
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2.5 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {(report.sections.companies_in_drive || report.sections.company_drives_scheduled).map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2.5 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || '—'}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-slate-700 border-r border-slate-200 whitespace-nowrap">{r.ctc || '—'}</td>
                          <td className="py-1.5 px-2 w-[30%] text-center font-medium text-indigo-700 whitespace-normal leading-snug">{r.status || r.current_status_text || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Month-End Table 4: Companies on Hold by TPO */}
            {report.template_type === 'month_end' && report.included_sections?.on_hold_by_college && report.sections?.on_hold_by_college && (
              <div className="space-y-1.5">
                {report.sections.on_hold_by_college.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-amber-50 border border-amber-200 font-bold text-[11px] flex items-center text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-700" /> COMPANIES ON HOLD BY TPO
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No companies on hold by TPO recorded for this month.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-amber-50 border-b border-amber-200 text-amber-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-amber-50 text-amber-900">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-700 shrink-0" /> COMPANIES ON HOLD BY TPO
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2.5 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.on_hold_by_college.map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2.5 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || '—'}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-slate-700 border-r border-slate-200 whitespace-nowrap">{r.ctc || '—'}</td>
                          <td className="py-1.5 px-2 w-[30%] text-center font-medium text-amber-700 whitespace-normal leading-snug">{r.status || r.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Month-End Table 5: Companies on Hold by HR */}
            {report.template_type === 'month_end' && report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && (
              <div className="space-y-1.5">
                {report.sections.on_hold_by_hr.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-rose-50 border border-rose-200 font-bold text-[11px] flex items-center text-rose-900">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-rose-700" /> COMPANIES ON HOLD BY HR
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No companies on hold by HR recorded for this month.</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                    <colgroup>
                      <col style={{ width: '38px' }} />
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead className="print:table-header-group">
                      <tr className="bg-rose-50 border-b border-rose-200 text-rose-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-rose-50 text-rose-900">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-rose-700 shrink-0" /> COMPANIES ON HOLD BY HR
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2.5 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.on_hold_by_hr.map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2.5 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || '—'}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-slate-700 border-r border-slate-200 whitespace-nowrap">{r.ctc || '—'}</td>
                          <td className="py-1.5 px-2 w-[30%] text-center font-medium text-rose-700 whitespace-normal leading-snug">{r.status || r.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 8. Coordinator Observations & Remarks */}
            {report.included_sections?.remarks && report.remarks && (
              <div className="space-y-1 pt-1">
                <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                  <PenLine size={13} className="text-slate-600" />
                  <span>{report.template_type === 'active_leads' ? 'Notes' : 'Coordinator Remarks & Observations'}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 leading-relaxed">
                  {report.remarks}
                </div>
              </div>
            )}

          </div>

          {/* 9. Master Institutional Footer — Always at the End of the Report */}
          <div className="border-t border-slate-300 pt-3 pb-1 mt-auto flex items-center justify-between text-[10px] text-slate-500 avoid-break shrink-0">
            <div>
              <p className="mt-0.5">© 2026 Infoziant. All rights reserved.</p>
            </div>
            <div className="font-mono text-slate-400 font-medium">
              Placement Operations Report • iPOMS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
