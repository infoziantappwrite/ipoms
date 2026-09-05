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
  Flame,
} from 'lucide-react';
import { COLLEGE_LOGO_MAP, getCollegeLogoUrl } from '@/lib/collegeLogo';


function getCleanPeriod(period?: string): string {
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
  const collegeLogoUrl = getCollegeLogoUrl(collegeCode, collegeName, report.branding?.college_logo);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 15, 140));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 15, 60));
  const handleResetZoom = () => setZoomLevel(100);

  const isActiveLeadsReport = report.template_type === 'active_leads';
  const allActiveLeads: any[] = report.sections?.active_leads || [];

  const hasPreparedBy = report.include_prepared_by !== false && Boolean(report.generated_by || report.branding?.prepared_by);
  const preparedByName = report.generated_by || report.branding?.prepared_by || 'Placement Coordinator';

  const activeCols = report.active_leads_columns || {};
  const showCollegesCol = Boolean(
    isActiveLeadsReport &&
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
      return { num: '36px', comp: '28%', colleges: '22%', role: '28%', ctc: '22%' };
    }
    if (showCollegesCol && showRoleCol && !showCtcCol) {
      return { num: '36px', comp: '36%', colleges: '30%', role: '34%', ctc: '0%' };
    }
    if (showCollegesCol && !showRoleCol && showCtcCol) {
      return { num: '36px', comp: '42%', colleges: '34%', role: '0%', ctc: '24%' };
    }
    if (showCollegesCol && !showRoleCol && !showCtcCol) {
      return { num: '38px', comp: '55%', colleges: '45%', role: '0%', ctc: '0%' };
    }
    if (!showCollegesCol && showRoleCol && showCtcCol) {
      return { num: '38px', comp: '34%', colleges: '0%', role: '38%', ctc: '28%' };
    }
    if (!showCollegesCol && showRoleCol && !showCtcCol) {
      return { num: '38px', comp: '50%', colleges: '0%', role: '50%', ctc: '0%' };
    }
    if (!showCollegesCol && !showRoleCol && showCtcCol) {
      return { num: '38px', comp: '65%', colleges: '0%', role: '0%', ctc: '35%' };
    }
    return { num: '38px', comp: '100%', colleges: '0%', role: '0%', ctc: '0%' };
  })();

  // Pagination for Active Leads Directory
  // Page 1: Branding header + Ribbon + KPI summary cards + Section title banner + Column headers (fits 22 rows)
  // Page 2+: Slim continuation header + Repeated column headers (fits 28 rows per page)
  const PAGE_1_ROWS = 22;
  const SUBSEQUENT_PAGE_ROWS = 28;

  const activeLeadsPages: any[][] = [];
  if (isActiveLeadsReport) {
    if (allActiveLeads.length === 0) {
      activeLeadsPages.push([]);
    } else {
      activeLeadsPages.push(allActiveLeads.slice(0, PAGE_1_ROWS));
      for (let i = PAGE_1_ROWS; i < allActiveLeads.length; i += SUBSEQUENT_PAGE_ROWS) {
        activeLeadsPages.push(allActiveLeads.slice(i, i + SUBSEQUENT_PAGE_ROWS));
      }
    }
  }

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
              {isActiveLeadsReport && activeLeadsPages.length > 1 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  {activeLeadsPages.length} Pages
                </span>
              )}
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
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-blue-700 text-primary-foreground rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
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
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center bg-slate-900/60 no-scrollbar gap-8">
        {isActiveLeadsReport ? (
          /* Multi-Page Render for Active Leads Pipeline Report */
          activeLeadsPages.map((pageRows, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const pageNum = pageIdx + 1;
            const totalPages = activeLeadsPages.length;

            return (
              <div
                key={pageIdx}
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  width: '794px',
                  minHeight: '1123px',
                }}
                className="bg-white text-slate-900 rounded-none sm:rounded-sm shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-slate-300 p-8 sm:p-12 transition-transform duration-200 select-text flex flex-col justify-between relative print:break-after-page print:min-h-screen"
              >
                <div className="space-y-4 flex-1 flex flex-col">
                  {isFirstPage ? (
                    <>
                      {/* 1. Header Branding Strip with Infoziant Logo (Left), Centered Title & Subtitle */}
                      <div className="flex items-center justify-between border-b-2 border-slate-300 pb-4 gap-4 mb-2">
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

                        <div className="flex-1 text-center min-w-0 px-2 flex flex-col items-center justify-center">
                          <h1 className="text-lg font-bold text-blue-900 tracking-tight font-sans text-center">
                            {report.report_title || 'Active Leads Pipeline Report'}
                          </h1>
                          {collegeName && collegeName !== 'Consolidated Partner Institutions' && report.template_type !== 'active_leads' && (
                            <p className="text-xs font-semibold text-slate-700 mt-0.5 text-center">
                              {collegeName}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center shrink-0 justify-end min-w-[100px]" />
                      </div>

                      {/* 2. Report Metadata Ribbon */}
                      <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-5 py-2.5 font-medium mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500 shrink-0" />
                          <span>Generated Date: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
                        </div>
                      </div>

                      {/* 3. KPI Summary Strip */}
                      {report.included_sections?.kpi_summary && report.kpi_summary && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-blue-50 border-blue-300">
                            <span className="text-[9.5px] font-bold uppercase block tracking-wider text-blue-800">Total Active Leads</span>
                            <span className="text-base font-extrabold font-mono text-blue-700">{report.kpi_summary.total_leads || allActiveLeads.length}</span>
                          </div>
                          {report.kpi_summary.hot_leads_count !== undefined && report.kpi_summary.hot_leads_count > 0 && (
                            <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-amber-50 border-amber-300">
                              <span className="text-[9.5px] font-bold uppercase block tracking-wider text-amber-800">Hot (JD Received)</span>
                              <span className="text-base font-extrabold font-mono text-amber-700">{report.kpi_summary.hot_leads_count}</span>
                            </div>
                          )}
                          {report.kpi_summary.warm_leads_count !== undefined && report.kpi_summary.warm_leads_count > 0 && (
                            <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-emerald-50 border-emerald-300">
                              <span className="text-[9.5px] font-bold uppercase block tracking-wider text-emerald-800">Warm (Positives)</span>
                              <span className="text-base font-extrabold font-mono text-emerald-700">{report.kpi_summary.warm_leads_count}</span>
                            </div>
                          )}
                          {report.kpi_summary.pipeline_leads_count !== undefined && report.kpi_summary.pipeline_leads_count > 0 && (
                            <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-indigo-50 border-indigo-300">
                              <span className="text-[9.5px] font-bold uppercase block tracking-wider text-indigo-800">Weekly Pipeline</span>
                              <span className="text-base font-extrabold font-mono text-indigo-700">{report.kpi_summary.pipeline_leads_count}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-slate-50 border-slate-300">
                            <span className="text-[9.5px] font-bold uppercase block tracking-wider text-slate-700">Batch</span>
                            <span className="text-base font-extrabold font-mono text-slate-800">{report.kpi_summary.graduating_year || report.academic_year || 'All Batches'}</span>
                          </div>
                        </div>
                      )}

                      {/* 4. Active Corporate Leads Section Banner */}
                      <div className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 font-bold text-[11px] flex items-center justify-between text-emerald-900 mb-1">
                        <span className="flex items-center gap-1.5 uppercase">
                          <TrendingUp size={13} className="text-emerald-700 shrink-0" />
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
                    </>
                  ) : (
                    /* Page 2+: Slim Continuation Header Strip */
                    <div className="flex items-center justify-between border-b-2 border-slate-300 pb-2.5 mb-2">
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/infoziant-head.png"
                          alt="Infoziant"
                          className="h-8 w-auto object-contain shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/college-logos/Infozianthead.png';
                          }}
                        />
                        <div>
                          <h2 className="text-xs font-bold text-blue-900 tracking-tight leading-tight uppercase">
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
                          </h2>
                          <p className="text-[9.5px] text-slate-500 font-semibold">
                            {collegeName && collegeName !== 'Consolidated Partner Institutions' && report.template_type !== 'active_leads' ? `${collegeName} • ` : ''}Directory (Continued)
                          </p>
                        </div>
                      </div>
                      <div className="text-[10.5px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
                        Page {pageNum} of {totalPages}
                      </div>
                    </div>
                  )}

                  {/* Table with Column Headers Repeated on Every Page */}
                  {pageRows.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 pl-2">No active leads recorded for this graduating batch.</p>
                  ) : (
                    <table className="w-full text-[11px] text-center border-collapse border border-slate-200 table-fixed">
                      <colgroup>
                        <col style={{ width: activeLeadsColWidths.num }} />
                        <col style={{ width: activeLeadsColWidths.comp }} />
                        {showCollegesCol && <col style={{ width: activeLeadsColWidths.colleges }} />}
                        {showRoleCol && <col style={{ width: activeLeadsColWidths.role }} />}
                        {showCtcCol && <col style={{ width: activeLeadsColWidths.ctc }} />}
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                          <th className="py-1.5 px-1 text-center border-r border-slate-200 font-mono" style={{ width: activeLeadsColWidths.num }}>#</th>
                          <th className="py-1.5 px-2.5 text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                          {showCollegesCol && (
                            <th className="py-1.5 px-2 text-center border-r border-slate-200 whitespace-normal text-blue-900 font-bold">Colleges</th>
                          )}
                          {showRoleCol && (
                            <th className="py-1.5 px-2.5 text-center border-r border-slate-200 whitespace-normal">Role</th>
                          )}
                          {showCtcCol && (
                            <th className="py-1.5 px-2 text-center whitespace-normal font-semibold">CTC</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-center">
                        {pageRows.map((r: any, rIdx: number) => (
                          <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-1.5 px-1 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: activeLeadsColWidths.num }}>{r.s_no}</td>
                            <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                            {showCollegesCol && (
                              <td className="py-1.5 px-2 text-center border-r border-slate-200 whitespace-normal leading-tight text-slate-700">
                                {r.colleges && r.colleges !== '—' ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold">
                                    {r.colleges}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-xs">—</span>
                                )}
                              </td>
                            )}
                            {showRoleCol && (
                              <td className="py-1.5 px-2.5 text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || '—'}</td>
                            )}
                            {showCtcCol && (
                              <td className="py-1.5 px-2 text-center text-emerald-700 font-semibold whitespace-normal break-words leading-tight">
                                {r.ctc ? (
                                  r.ctc.includes(',') ? (
                                    <div className="flex flex-col items-center justify-center gap-0.5 leading-tight py-0.5">
                                      {r.ctc.split(',').map((part: string, pIdx: number) => (
                                        <span key={pIdx} className="block whitespace-normal break-words text-[10.5px]">
                                          {part.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="block whitespace-normal break-words leading-tight text-[10.5px]">{r.ctc}</span>
                                  )
                                ) : (
                                  <span className="text-slate-400 italic font-normal text-xs">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* If Final Page and Notes/Remarks Exist */}
                  {pageIdx === totalPages - 1 && report.included_sections?.remarks && report.remarks && (
                    <div className="space-y-1 pt-2">
                      <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                        <PenLine size={13} className="text-slate-600" />
                        <span>Notes</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-800 leading-relaxed">
                        {report.remarks}
                      </div>
                    </div>
                  )}
                </div>

                {/* Master Institutional Footer on Every Page (Only when Footer & Sign-off Options enabled) */}
                {report.include_prepared_by !== false && (
                  <div className="border-t border-slate-300 pt-2.5 pb-0.5 mt-auto flex items-center justify-between text-[10px] text-slate-500 shrink-0">
                    <div>
                      <p className="mt-0.5">© 2026 Infoziant. All rights reserved.</p>
                    </div>
                    {/* Prepared by in Footer */}
                    {hasPreparedBy && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <User size={12} className="text-blue-900 shrink-0" />
                        <span>Prepared by: <strong className="font-bold">{preparedByName}</strong></span>
                      </div>
                    )}
                    <div className="font-semibold text-slate-600">
                      Page {pageNum} of {totalPages}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Standard Single/Multi-Section Paper Container for Other Report Types */
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
                    ? 'Pending Task Placement Report'
                    : report.template_type === 'active_leads'
                    ? 'Active Leads Pipeline Report'
                    : 'Weekly Placement Report')}
              </h1>
              <p className="text-xs font-semibold text-slate-700 mt-0.5 text-center">
                {collegeName}
              </p>
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
                <div className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
                  <Building2 size={15} className="text-blue-900 shrink-0" />
                  <span>{collegeCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Report Metadata Ribbon */}
          <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-5 py-2.5 font-medium mb-4">
            {report.template_type === 'weekly_placement' && getCleanPeriod(report.report_period) ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-700 shrink-0" />
                  <span>Period: <strong className="text-slate-900 font-semibold">{getCleanPeriod(report.report_period)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span>Generated Date: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
                </div>
              </>
            ) : (
              <div className="w-full flex items-center justify-end">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500 shrink-0" />
                  <span>Generated Date: <strong className="text-slate-900 font-semibold">{report.generated_date}</strong></span>
                </div>
              </div>
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
              } else if (report.is_multi_college) {
                const multiCards = [
                  { key: 'total_colleges', label: 'Colleges Included', val: report.kpi_summary.total_colleges || report.colleges_data?.length || 0, bg: 'bg-indigo-50/80 border-indigo-200', text: 'text-indigo-700', labelText: 'text-indigo-800' },
                  { key: 'drives_completed', label: 'Companies Completed', val: report.kpi_summary.drives_completed || 0, bg: 'bg-emerald-50/80 border-emerald-200', text: 'text-emerald-700', labelText: 'text-emerald-800' },
                  { key: 'drives_in_progress', label: 'Companies In Progress', val: report.kpi_summary.drives_in_progress || 0, bg: 'bg-blue-50/80 border-blue-200', text: 'text-blue-700', labelText: 'text-blue-800' },
                  { key: 'total_offers', label: 'Total Offers Placed', val: report.kpi_summary.total_offers || 0, bg: 'bg-purple-50/80 border-purple-200', text: 'text-purple-700', labelText: 'text-purple-800' },
                ];
                return (
                  <div className="flex flex-wrap gap-2">
                    {multiCards.map((c) => (
                      <div key={c.key} className={`flex-1 min-w-[80px] border p-2 rounded-lg text-center shadow-xs ${c.bg}`}>
                        <span className={`text-[10px] font-bold uppercase block truncate ${c.labelText}`}>{c.label}</span>
                        <span className={`text-sm font-bold font-mono ${c.text}`}>{c.val}</span>
                      </div>
                    ))}
                  </div>
                );
              } else {
                const wpCards = [
                  { key: 'total_calls', label: 'Total Calls Made', val: report.kpi_summary.total_calls || 0, bg: 'bg-blue-50/80 border-blue-200', text: 'text-blue-700', labelText: 'text-blue-800' },
                  { key: 'positive_responses', label: 'Positives', val: report.kpi_summary.positive_responses || 0, bg: 'bg-emerald-50/80 border-emerald-200', text: 'text-emerald-700', labelText: 'text-emerald-800' },
                  { key: 'not_hiring', label: 'Not Hiring', val: report.kpi_summary.not_hiring || 0, bg: 'bg-rose-50/80 border-rose-200', text: 'text-rose-700', labelText: 'text-rose-800' },
                  { key: 'jds_received', label: 'JD Received', val: report.kpi_summary.jds_received || 0, bg: 'bg-cyan-50/80 border-cyan-200', text: 'text-cyan-700', labelText: 'text-cyan-800' },
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

            {/* ── Multi-College Consolidated Weekly Report ── */}
            {report.is_multi_college && Array.isArray(report.colleges_data) && (
              <div className="space-y-6">
                {report.colleges_data.map((colData: any, cIdx: number) => {
                  const hasCompleted = colData.completed_companies && colData.completed_companies.length > 0;
                  const hasInDrive = colData.companies_in_drive && colData.companies_in_drive.length > 0;
                  const hasProgress = colData.in_progress && colData.in_progress.length > 0;

                  return (
                    <div
                      key={colData.college_id || cIdx}
                      className="space-y-2.5 print:break-inside-avoid break-inside-avoid border border-slate-200 rounded-xl p-3 bg-slate-50/30"
                    >
                      {/* Institution Banner */}
                      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-1.5 bg-blue-900 text-white rounded-lg shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                            {cIdx + 1}
                          </span>
                          <span className="font-bold text-xs">
                            {colData.college_name} {colData.college_code ? `(${colData.college_code})` : ''}
                          </span>
                          {colData.location && (
                            <span className="text-[10px] text-blue-200 font-normal">
                              • {colData.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                            {colData.total_completed || 0} Completed
                          </span>
                          {(colData.total_in_drive || 0) > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                              {colData.total_in_drive} In Drive
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
                        <div>
                          {!hasCompleted ? (
                            <p className="text-[10.5px] text-slate-400 italic px-2 py-0.5">
                              No completed drives for this institution during this period.
                            </p>
                          ) : (
                            <table className="w-full text-[10.5px] text-center border-collapse border border-slate-200 table-fixed bg-white rounded">
                              <colgroup>
                                <col style={{ width: '32px' }} />
                                <col style={{ width: '25%' }} />
                                <col style={{ width: '23%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '28%' }} />
                                <col style={{ width: '12%' }} />
                              </colgroup>
                              <thead>
                                <tr className="bg-emerald-50 text-emerald-900 border-b border-emerald-200 font-bold text-[10px]">
                                  <th colSpan={6} className="py-1 px-2.5 text-left bg-emerald-50 text-emerald-900">
                                    <span className="flex items-center gap-1.5">
                                      <Trophy size={11} className="text-emerald-700 shrink-0" /> 1. COMPANIES COMPLETED ({colData.completed_companies.length})
                                    </span>
                                  </th>
                                </tr>
                                <tr className="bg-slate-100 text-slate-700 font-semibold text-[9.5px] uppercase border-b border-slate-200">
                                  <th className="py-1 px-1 text-center border-r border-slate-200 font-mono">#</th>
                                  <th className="py-1 px-1.5 text-center border-r border-slate-200">Company Name</th>
                                  <th className="py-1 px-1.5 text-center border-r border-slate-200">Role</th>
                                  <th className="py-1 px-1 text-center border-r border-slate-200">CTC</th>
                                  <th className="py-1 px-1.5 text-center border-r border-slate-200">Status</th>
                                  <th className="py-1 px-1 text-center">Offers</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {colData.completed_companies.map((r: any, rIdx: number) => (
                                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="py-1 px-1 text-slate-500 font-mono border-r border-slate-200 text-[10px]">{r.s_no || rIdx + 1}</td>
                                    <td className="py-1 px-1.5 font-bold text-slate-900 border-r border-slate-200 text-[10.5px] leading-tight break-words">{r.company_name}</td>
                                    <td className="py-1 px-1.5 text-slate-700 border-r border-slate-200 text-[10px] leading-tight break-words">{r.job_role}</td>
                                    <td className="py-1 px-1 text-emerald-700 font-semibold border-r border-slate-200 whitespace-nowrap text-[10px]">{r.ctc_lpa}</td>
                                    <td className="py-1 px-1.5 text-slate-600 border-r border-slate-200 text-[10px] leading-tight break-words">{r.current_status_text}</td>
                                    <td className="py-1 px-1 font-bold text-emerald-700 whitespace-nowrap text-[10.5px]">{r.selected_count || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}

                      {/* Companies in Drive Table */}
                      {report.included_sections?.companies_in_drive !== false && hasInDrive && (
                        <div>
                          <table className="w-full text-[10.5px] text-center border-collapse border border-slate-200 table-fixed bg-white rounded">
                            <colgroup>
                              <col style={{ width: '32px' }} />
                              <col style={{ width: '27%' }} />
                              <col style={{ width: '25%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '35%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-amber-50 text-amber-900 border-b border-amber-200 font-bold text-[10px]">
                                <th colSpan={5} className="py-1 px-2.5 text-left bg-amber-50 text-amber-900">
                                  <span className="flex items-center gap-1.5">
                                    <Flame size={11} className="text-amber-700 shrink-0" /> 2. COMPANIES IN DRIVE ({colData.companies_in_drive.length})
                                  </span>
                                </th>
                              </tr>
                              <tr className="bg-slate-100 text-slate-700 font-semibold text-[9.5px] uppercase border-b border-slate-200">
                                <th className="py-1 px-1 text-center border-r border-slate-200 font-mono">#</th>
                                <th className="py-1 px-1.5 text-center border-r border-slate-200">Company Name</th>
                                <th className="py-1 px-1.5 text-center border-r border-slate-200">Role</th>
                                <th className="py-1 px-1 text-center border-r border-slate-200">CTC</th>
                                <th className="py-1 px-1.5 text-center">Status / Drive Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {colData.companies_in_drive.map((r: any, rIdx: number) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                  <td className="py-1 px-1 text-slate-500 font-mono border-r border-slate-200 text-[10px]">{r.s_no || rIdx + 1}</td>
                                  <td className="py-1 px-1.5 font-bold text-slate-900 border-r border-slate-200 text-[10.5px] leading-tight break-words">{r.company_name}</td>
                                  <td className="py-1 px-1.5 text-slate-700 border-r border-slate-200 text-[10px] leading-tight break-words">{r.job_role || r.role || '—'}</td>
                                  <td className="py-1 px-1 text-amber-700 font-semibold border-r border-slate-200 whitespace-nowrap text-[10px]">{r.ctc_lpa || r.ctc || 'Competitive'}</td>
                                  <td className="py-1 px-1.5 text-slate-600 text-[10px] leading-tight break-words">{r.current_status_text || r.status || 'Drive in progress'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* 3. Companies In Progress Table */}
                      {report.included_sections?.in_progress !== false && (
                        <div>
                          {!hasProgress ? (
                            <p className="text-[10.5px] text-slate-400 italic px-2 py-0.5">
                              No ongoing drives currently in progress for this institution.
                            </p>
                          ) : (
                            <table className="w-full text-[10.5px] text-center border-collapse border border-slate-200 table-fixed bg-white rounded">
                              <colgroup>
                                <col style={{ width: '32px' }} />
                                <col style={{ width: '27%' }} />
                                <col style={{ width: '25%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '35%' }} />
                              </colgroup>
                              <thead>
                                <tr className="bg-blue-50 text-blue-900 border-b border-blue-200 font-bold text-[10px]">
                                  <th colSpan={5} className="py-1 px-2.5 text-left bg-blue-50 text-blue-900">
                                    <span className="flex items-center gap-1.5">
                                      <Rocket size={11} className="text-blue-700 shrink-0" /> 3. COMPANIES IN PROGRESS ({colData.in_progress.length})
                                    </span>
                                  </th>
                                </tr>
                                <tr className="bg-slate-100 text-slate-700 font-semibold text-[9.5px] uppercase border-b border-slate-200">
                                  <th className="py-1 px-1 text-center border-r border-slate-200 font-mono">#</th>
                                  <th className="py-1 px-1.5 text-center border-r border-slate-200">Company Name</th>
                                  <th className="py-1 px-1.5 text-center border-r border-slate-200">Role</th>
                                  <th className="py-1 px-1 text-center border-r border-slate-200">CTC</th>
                                  <th className="py-1 px-1.5 text-center">Status / Follow-up</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {colData.in_progress.map((r: any, rIdx: number) => (
                                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="py-1 px-1 text-slate-500 font-mono border-r border-slate-200 text-[10px]">{r.s_no || rIdx + 1}</td>
                                    <td className="py-1 px-1.5 font-bold text-slate-900 border-r border-slate-200 text-[10.5px] leading-tight break-words">{r.company_name}</td>
                                    <td className="py-1 px-1.5 text-slate-700 border-r border-slate-200 text-[10px] leading-tight break-words">{r.job_role}</td>
                                    <td className="py-1 px-1 text-blue-700 font-semibold border-r border-slate-200 whitespace-nowrap text-[10px]">{r.ctc_lpa}</td>
                                    <td className="py-1 px-1.5 text-slate-600 text-[10px] leading-tight break-words">{r.current_status_text}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '11%' }} />
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
                        <th className="py-1.5 px-2 w-[24%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[26%] text-center border-r border-slate-200 whitespace-normal">Status</th>
                        <th className="py-1 px-1 w-[11%] text-center leading-tight">
                          <span className="block whitespace-nowrap">Offers</span>
                          <span className="block whitespace-nowrap">Received</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.completed_companies.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2 w-[25%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[24%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role}</td>
                          <td className="py-1.5 px-1 w-[11%] text-center text-emerald-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa}</td>
                          <td className="py-1.5 px-2 w-[26%] text-center text-slate-600 border-r border-slate-200 whitespace-normal leading-snug">{r.current_status_text}</td>
                          <td className="py-1.5 px-1 w-[11%] text-center font-bold text-emerald-700 whitespace-nowrap">{r.selected_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Section 2: Companies In Drive */}
            {report.included_sections?.companies_in_drive !== false && report.sections?.companies_in_drive && (
              <div className="space-y-1.5">
                {report.sections.companies_in_drive.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-amber-50 border border-amber-200 font-bold text-[11px] flex items-center text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <Flame size={13} className="text-amber-600 shrink-0" /> 2. COMPANIES IN DRIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No active drives conducting recruitment today.</p>
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
                            <Flame size={13} className="text-amber-600 shrink-0" /> 2. COMPANIES IN DRIVE
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-slate-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status / Drive Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.companies_in_drive.map((r: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2 w-[27%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[28%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.job_role || r.role || '—'}</td>
                          <td className="py-1.5 px-1 w-[11.5%] text-center text-amber-700 font-semibold border-r border-slate-200 whitespace-nowrap">{r.ctc_lpa || r.ctc || 'Competitive'}</td>
                          <td className="py-1.5 px-2 w-[30%] text-center text-slate-600 whitespace-normal leading-snug">{r.current_status_text || r.status || 'Drive in progress'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 5. Section 3: Companies In Progress */}
            {report.included_sections?.in_progress && report.sections?.in_progress && (
              <div className="space-y-1.5">
                {report.sections.in_progress.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-blue-50 border border-blue-200 font-bold text-[11px] flex items-center text-blue-900">
                      <span className="flex items-center gap-1.5">
                        <Rocket size={13} className="text-blue-700" /> 3. COMPANIES IN PROGRESS
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
                            <Rocket size={13} className="text-blue-700 shrink-0" /> 3. COMPANIES IN PROGRESS
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

            {/* 6. Section 4: Companies in Pipeline */}
            {report.included_sections?.pipeline && report.sections?.pipeline && (
              <div className="space-y-1.5">
                {report.sections.pipeline.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-cyan-50 border border-cyan-200 font-bold text-[11px] flex items-center text-cyan-900">
                      <span className="flex items-center gap-1.5">
                        <Inbox size={13} className="text-cyan-700" /> 4. COMPANIES IN PIPELINE
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
                            <Inbox size={13} className="text-cyan-700 shrink-0" /> 4. COMPANIES IN PIPELINE
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

            {/* 7. Section 5: Top Companies */}
            {report.included_sections?.top_companies && report.sections?.top_companies && (
              <div className="space-y-1.5">
                {report.sections.top_companies.length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-amber-50 border border-amber-200 font-bold text-[11px] flex items-center text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <Star size={13} className="text-amber-600" /> 5. TOP COMPANIES
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
                            <Star size={13} className="text-amber-600 shrink-0" /> 5. TOP COMPANIES
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

            {/* 8. Section 6: Rejected Companies */}
            {(report.included_sections?.rejected_companies || report.included_sections?.rejected_by_hr) && (
              <div className="space-y-1.5">
                {(report.sections?.rejected_companies || report.sections?.rejected_by_hr || []).length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-rose-50 border border-rose-200 font-bold text-[11px] flex items-center text-rose-900">
                      <span className="flex items-center gap-1.5">
                        <XCircle size={13} className="text-rose-600 shrink-0" /> 6. REJECTED COMPANIES
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No rejected companies recorded for this period.</p>
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
                            <XCircle size={13} className="text-rose-600 shrink-0" /> 6. REJECTED COMPANIES
                          </span>
                        </th>
                      </tr>
                      <tr className="bg-rose-100/60 text-rose-900 font-semibold text-[10px] uppercase border-b border-rose-200">
                        <th className="py-1.5 px-1 w-10 text-center border-r border-rose-200 font-mono" style={{ width: '38px' }}>#</th>
                        <th className="py-1.5 px-2 w-[27%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-2 w-[28%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11.5%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[30%] text-center whitespace-normal">Status / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-200 text-center">
                      {(report.sections?.rejected_companies || report.sections?.rejected_by_hr || []).map((r: any, idx: number) => (
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
                )}
              </div>
            )}

            {/* 9. Section 7: Companies On Hold By College */}
            {(report.included_sections?.on_hold_by_college || report.included_sections?.rejected_by_college) && (
              <div className="space-y-1.5">
                {(report.sections?.on_hold_by_college || report.sections?.rejected_by_college || []).length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-orange-50 border border-orange-200 font-bold text-[11px] flex items-center text-orange-900">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-orange-600 shrink-0" /> 7. COMPANIES ON HOLD BY COLLEGE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No companies currently on hold by college.</p>
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
                      <tr className="bg-orange-50 border-b border-orange-200 text-orange-900">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-orange-50 text-orange-900">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-orange-600 shrink-0" /> 7. COMPANIES ON HOLD BY COLLEGE
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
                      {(report.sections?.on_hold_by_college || report.sections?.rejected_by_college || []).map((r: any, idx: number) => (
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
                )}
              </div>
            )}

            {/* 10. Section 8: Companies On Hold By HR */}
            {report.included_sections?.on_hold_by_hr && (
              <div className="space-y-1.5">
                {(report.sections?.on_hold_by_hr || []).length === 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1 rounded-md bg-slate-100 border border-slate-300 font-bold text-[11px] flex items-center text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-600 shrink-0" /> 8. COMPANIES ON HOLD BY HR
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic py-1 pl-2">No companies currently on hold by HR.</p>
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
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                        <th colSpan={5} className="py-1.5 px-3 text-left font-bold text-[11px] bg-slate-100 text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-600 shrink-0" /> 8. COMPANIES ON HOLD BY HR
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
                      {(report.sections?.on_hold_by_hr || []).map((r: any, idx: number) => (
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
                        {report.sections.pending_tasks.map((r: any, idx: number) => {
                          const isHl = Boolean(r.is_highlighted);
                          const hlBg = r.highlight_color || '#fef08a';
                          return (
                            <tr
                              key={idx}
                              style={isHl ? { backgroundColor: hlBg, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : undefined}
                              className={isHl ? 'font-semibold text-slate-950 shadow-2xs' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}
                            >
                              <td className="py-1.5 px-1 w-10 text-center font-mono border-r border-slate-200" style={{ width: '38px', backgroundColor: isHl ? hlBg : undefined }}>{r.s_no}</td>
                              <td className={`py-1.5 px-2 ${hasDriveDate ? 'w-[25%]' : 'w-[29%]'} text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug`} style={{ backgroundColor: isHl ? hlBg : undefined }}>{r.company_name}</td>
                              <td className={`py-1.5 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center text-slate-700 border-r border-slate-200 whitespace-nowrap`} style={{ backgroundColor: isHl ? hlBg : undefined }}>{r.jd_received_date || '—'}</td>
                              <td className={`py-1.5 px-1.5 ${hasDriveDate ? 'w-[11%]' : 'w-[12%]'} text-center text-slate-700 border-r border-slate-200 whitespace-nowrap`} style={{ backgroundColor: isHl ? hlBg : undefined }}>{r.db_shared_date || '—'}</td>
                              <td className={`py-1.5 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center text-slate-800 border-r border-slate-200 whitespace-normal leading-snug`} style={{ backgroundColor: isHl ? hlBg : undefined }}>{r.current_status || '—'}</td>
                              <td className={`py-1.5 px-2 ${hasDriveDate ? 'w-[20%]' : 'w-[23%]'} text-center text-slate-950 font-medium border-r border-slate-200 whitespace-normal leading-snug`} style={{ backgroundColor: isHl ? hlBg : undefined }}>{r.action_to_be_taken || '—'}</td>
                              {hasDriveDate && (
                                <td className="py-1.5 px-1.5 w-[11%] text-center text-indigo-800 font-semibold whitespace-nowrap" style={{ backgroundColor: isHl ? hlBg : undefined }}>{r.drive_date || '—'}</td>
                              )}
                            </tr>
                          );
                        })}
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
                      <col style={{ width: '34%' }} />
                      <col style={{ width: '38%' }} />
                      <col style={{ width: '28%' }} />
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
                        <th className="py-1.5 px-3 w-[34%] text-center border-r border-slate-200 whitespace-normal">Company Name</th>
                        <th className="py-1.5 px-3 w-[38%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-2.5 w-[28%] text-center whitespace-normal font-semibold">CTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.active_leads.map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-3 w-[34%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-3 w-[38%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || '—'}</td>
                          <td className="py-1.5 px-2.5 w-[28%] text-center text-emerald-700 font-semibold whitespace-normal break-words leading-tight">
                            {r.ctc ? (
                              r.ctc.includes(',') ? (
                                <div className="flex flex-col items-center justify-center gap-0.5 leading-tight py-0.5">
                                  {r.ctc.split(',').map((part: string, pIdx: number) => (
                                    <span key={pIdx} className="block whitespace-normal break-words text-[10.5px]">
                                      {part.trim()}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="block whitespace-normal break-words leading-tight text-[10.5px]">{r.ctc}</span>
                              )
                            ) : (
                              <span className="text-slate-400 italic font-normal text-xs">—</span>
                            )}
                          </td>
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
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '11%' }} />
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
                        <th className="py-1.5 px-2 w-[24%] text-center border-r border-slate-200 whitespace-normal">Role</th>
                        <th className="py-1.5 px-1 w-[11%] text-center border-r border-slate-200 whitespace-nowrap">CTC</th>
                        <th className="py-1.5 px-2 w-[26%] text-center border-r border-slate-200 whitespace-normal">Status</th>
                        <th className="py-1 px-1 w-[11%] text-center leading-tight">
                          <span className="block whitespace-nowrap">Offers</span>
                          <span className="block whitespace-nowrap">Received</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center">
                      {report.sections.completed_companies.map((r: any, idx: number) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} avoid-break`}>
                          <td className="py-1.5 px-1 w-10 text-center text-slate-500 font-mono border-r border-slate-200" style={{ width: '38px' }}>{r.s_no}</td>
                          <td className="py-1.5 px-2.5 w-[25%] text-center font-bold text-slate-900 border-r border-slate-200 whitespace-normal leading-snug">{r.company_name}</td>
                          <td className="py-1.5 px-2 w-[24%] text-center text-slate-700 border-r border-slate-200 whitespace-normal leading-snug">{r.role || r.job_role || '—'}</td>
                          <td className="py-1.5 px-1 w-[11%] text-center text-slate-700 border-r border-slate-200 whitespace-nowrap">{r.ctc || r.ctc_lpa || '—'}</td>
                          <td className="py-1.5 px-2 w-[26%] text-center font-medium text-emerald-700 border-r border-slate-200 whitespace-normal leading-snug">{r.status || r.current_status_text || 'Drive Completed'}</td>
                          <td className="py-1.5 px-1 w-[11%] text-center font-bold text-emerald-700 whitespace-nowrap">{r.offers_received ?? r.selected_count ?? 0}</td>
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

          {/* 9. Master Institutional Footer — Always at the End of the Report (Only when Footer & Sign-off Options enabled) */}
          {report.include_prepared_by !== false && (
            <div className="border-t border-slate-300 pt-3 pb-1 mt-auto flex items-center justify-between text-[10px] text-slate-500 avoid-break shrink-0">
              <div>
                <p className="mt-0.5">© 2026 Infoziant. All rights reserved.</p>
              </div>
              {/* Prepared by in Footer */}
              {hasPreparedBy && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <User size={12} className="text-blue-900 shrink-0" />
                  <span>Prepared by: <strong className="font-bold">{preparedByName}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
