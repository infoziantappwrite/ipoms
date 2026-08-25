'use client';

import { useState } from 'react';
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
  ListTodo,
  Calendar,
  User,
  Building2,
  FileSpreadsheet,
  PenLine,
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

interface Props {
  report: any;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function A4PdfPreviewModal({ report, isOpen, onClose, onPrint }: Props) {
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75%, 100%, 125%
  const [logoFailed, setLogoFailed] = useState(false);

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
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            width: '794px', // 210mm at 96 DPI
            minHeight: '1123px', // 297mm at 96 DPI
          }}
          className="bg-white text-slate-900 rounded-none sm:rounded-sm shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-slate-300 p-8 sm:p-12 transition-transform duration-200 select-text flex flex-col justify-between"
        >
          {/* Main Paper Content */}
          <div className="space-y-6">

            {/* 1. Header Branding Strip */}
            <div className="flex items-center justify-between border-b-2 border-slate-300 pb-4 gap-4">
              {/* Left: Infoziant Corporate Header */}
              <div className="flex items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/infoziant-head.png"
                  alt="Infoziant"
                  className="h-14 w-auto object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/college-logos/Infozianthead.png';
                  }}
                />
                <div>
                  <h1 className="text-lg font-bold text-blue-900 tracking-tight font-sans">
                    {report.report_title || 'Weekly Placement Report'}
                  </h1>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
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
                  <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
                    <Building2 size={14} className="text-blue-900 shrink-0" />
                    <span>{isConsolidated ? 'iPOMS' : collegeCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Report Metadata Ribbon */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-700 shrink-0" />
                <span>Period: <strong className="text-slate-900 font-semibold">{report.report_period}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>Generated: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-slate-400 shrink-0" />
                <span>Prepared By: <strong className="text-slate-900 font-semibold">{report.generated_by}</strong></span>
              </div>
            </div>

            {/* 3. KPI Summary Strip */}
            {report.included_sections?.kpi_summary && report.kpi_summary && (
              <>
                {report.kpi_summary.total_pending_tasks !== undefined ? (
                  <div className="grid grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 border border-blue-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Tasks</span>
                      <span className="text-base font-bold font-mono text-blue-900">{report.kpi_summary.total_pending_tasks}</span>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-emerald-800 font-semibold uppercase block">DB Shared</span>
                      <span className="text-base font-bold font-mono text-emerald-700">{report.kpi_summary.db_shared_count || 0}</span>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-amber-800 font-semibold uppercase block">DB Pending</span>
                      <span className="text-base font-bold font-mono text-amber-700">{report.kpi_summary.db_pending_count || 0}</span>
                    </div>
                    <div className="bg-purple-50/50 border border-purple-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-purple-800 font-semibold uppercase block">Drives Scheduled</span>
                      <span className="text-base font-bold font-mono text-purple-700">{report.kpi_summary.drives_scheduled || 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5">
                    <div className="bg-slate-50 border border-blue-200 p-1.5 rounded-lg text-center">
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">Calls</span>
                      <span className="text-xs font-bold font-mono text-blue-900">{report.kpi_summary.total_calls}</span>
                    </div>
                    <div className="bg-slate-50 border border-emerald-200 p-1.5 rounded-lg text-center">
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">Positives</span>
                      <span className="text-xs font-bold font-mono text-emerald-700">{report.kpi_summary.positive_responses}</span>
                    </div>
                    <div className="bg-slate-50 border border-cyan-200 p-1.5 rounded-lg text-center">
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">JDs</span>
                      <span className="text-xs font-bold font-mono text-cyan-700">{report.kpi_summary.jds_received}</span>
                    </div>
                    <div className="bg-slate-50 border border-amber-200 p-1.5 rounded-lg text-center">
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">Completed</span>
                      <span className="text-xs font-bold font-mono text-amber-700">{report.kpi_summary.drives_completed}</span>
                    </div>
                    <div className="bg-slate-50 border border-purple-200 p-1.5 rounded-lg text-center">
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">In Progress</span>
                      <span className="text-xs font-bold font-mono text-purple-700">{report.kpi_summary.drives_in_progress}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-center">
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">Pipeline</span>
                      <span className="text-xs font-bold font-mono text-slate-700">{report.kpi_summary.pipeline_leads}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-300 p-1.5 rounded-lg text-center">
                      <span className="text-[9px] text-emerald-800 font-bold uppercase block">Offers</span>
                      <span className="text-xs font-bold font-mono text-emerald-700">{report.kpi_summary.total_offers}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 4. Section 1: Companies Completed */}
            {report.included_sections?.completed_companies && report.sections?.completed_companies && (
              <div className="space-y-1.5">
                <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 font-bold text-[11px] flex items-center justify-between text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <Trophy size={13} className="text-emerald-700" /> 1. COMPANIES COMPLETED
                  </span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {report.sections.completed_companies.length} Drives
                  </span>
                </div>

                {report.sections.completed_companies.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-2">No completed drives in this period.</p>
                ) : (
                  <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-2 w-8 text-center border-r border-slate-200">#</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Company Name</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Role(s)</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">Type</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">CTC</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-200">Offers</th>
                        <th className="py-1.5 px-2.5">Status Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.sections.completed_companies.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{r.s_no}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-200">{r.company_name}</td>
                          <td className="py-1.5 px-2.5 text-slate-700 border-r border-slate-200">{r.job_role}</td>
                          <td className="py-1.5 px-2 text-slate-600 border-r border-slate-200">{r.company_type}</td>
                          <td className="py-1.5 px-2 text-emerald-700 font-semibold border-r border-slate-200">{r.ctc_lpa}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-emerald-700 border-r border-slate-200">{r.selected_count || 0}</td>
                          <td className="py-1.5 px-2.5 text-slate-600">{r.current_status_text}</td>
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
                <div className="px-3 py-1 rounded-md bg-blue-50 border border-blue-200 font-bold text-[11px] flex items-center justify-between text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <Rocket size={13} className="text-blue-700" /> 2. COMPANIES IN PROGRESS
                  </span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200">
                    {report.sections.in_progress.length} Drives
                  </span>
                </div>

                {report.sections.in_progress.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-2">No active drives currently in progress.</p>
                ) : (
                  <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-2 w-8 text-center border-r border-slate-200">#</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Company Name</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Role(s)</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">Type</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">CTC</th>
                        <th className="py-1.5 px-2.5">Status Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.sections.in_progress.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{r.s_no}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-200">{r.company_name}</td>
                          <td className="py-1.5 px-2.5 text-slate-700 border-r border-slate-200">{r.job_role}</td>
                          <td className="py-1.5 px-2 text-slate-600 border-r border-slate-200">{r.company_type}</td>
                          <td className="py-1.5 px-2 text-blue-700 font-semibold border-r border-slate-200">{r.ctc_lpa}</td>
                          <td className="py-1.5 px-2.5 text-slate-600">{r.current_status_text}</td>
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
                <div className="px-3 py-1 rounded-md bg-cyan-50 border border-cyan-200 font-bold text-[11px] flex items-center justify-between text-cyan-900">
                  <span className="flex items-center gap-1.5">
                    <Inbox size={13} className="text-cyan-700" /> 3. COMPANIES IN PIPELINE
                  </span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-cyan-200">
                    {report.sections.pipeline.length} Leads
                  </span>
                </div>

                {report.sections.pipeline.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-2">No pipeline leads recorded.</p>
                ) : (
                  <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-2 w-8 text-center border-r border-slate-200">#</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Company Name</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Role(s)</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">Type</th>
                        <th className="py-1.5 px-2.5">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.sections.pipeline.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{r.s_no}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-200">{r.company_name}</td>
                          <td className="py-1.5 px-2.5 text-slate-700 border-r border-slate-200">{r.job_role}</td>
                          <td className="py-1.5 px-2 text-slate-600 border-r border-slate-200">{r.company_type}</td>
                          <td className="py-1.5 px-2.5 text-slate-600">{r.current_status_text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 7. Section: Placement Pending Tasks */}
            {report.included_sections?.pending_tasks && report.sections?.pending_tasks && (
              <div className="space-y-1.5">
                <div className="px-3 py-1 rounded-md bg-indigo-50 border border-indigo-200 font-bold text-[11px] flex items-center justify-between text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    <ListTodo size={13} className="text-indigo-700" /> PLACEMENT PENDING TASKS
                  </span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-800 font-bold">
                    {report.sections.pending_tasks.length} Tasks
                  </span>
                </div>

                {report.sections.pending_tasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1 pl-2">No pending tasks recorded for this institution.</p>
                ) : (
                  <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-2 w-8 text-center border-r border-slate-200">#</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Company Name</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">JD Date</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">DB Shared</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Status</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-200">Remarks / Action</th>
                        <th className="py-1.5 px-2.5">Drive Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.sections.pending_tasks.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{r.s_no}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-200">{r.company_name}</td>
                          <td className="py-1.5 px-2.5 text-slate-700 border-r border-slate-200">{r.jd_received_date || '—'}</td>
                          <td className="py-1.5 px-2.5 text-slate-700 border-r border-slate-200">{r.db_shared_date || '—'}</td>
                          <td className="py-1.5 px-2.5 text-slate-800 border-r border-slate-200">{r.current_status || '—'}</td>
                          <td className="py-1.5 px-2.5 text-slate-800 font-medium border-r border-slate-200">{r.action_to_be_taken || '—'}</td>
                          <td className="py-1.5 px-2.5 text-indigo-700 font-semibold">{r.drive_date || '—'}</td>
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
                  <PenLine size={13} className="text-slate-600" /> Coordinator Remarks & Observations
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 leading-relaxed">
                  {report.remarks}
                </div>
              </div>
            )}

          </div>

          {/* 9. Institutional Confidential Footer with Page Number */}
          <div className="border-t border-slate-300 pt-4 mt-8 flex items-center justify-between text-[10px] text-slate-500">
            <div>
              <p>{report.branding?.confidential_notice || 'CONFIDENTIAL: For placement office & institutional leadership review only.'}</p>
              <p className="mt-0.5">© 2026 Infoziant IT Solutions Inc. All rights reserved.</p>
            </div>
            <div className="font-mono text-slate-400 font-medium">
              Page 1 of 1
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
