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
  Zap,
  Columns2,
  Image as ImageIcon,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { COLLEGE_LOGO_MAP, getCollegeLogoUrl } from '@/lib/collegeLogo';
import {
  generateReportCanvas,
  exportReportAsImage,
  getReportExportBaseFileName,
} from '../lib/reportCanvasRenderer';

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

export type PreviewMode = 'both' | 'image' | 'pdf';

interface Props {
  report: any;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  initialMode?: PreviewMode;
}

export function A4PdfPreviewModal({
  report,
  isOpen,
  onClose,
  onPrint,
  initialMode = 'both',
}: Props) {
  const [mode, setMode] = useState<PreviewMode>(initialMode);
  const [zoomPdf, setZoomPdf] = useState<number>(100);
  const [zoomImage, setZoomImage] = useState<number>(100);
  const [logoFailed, setLogoFailed] = useState(false);
  const [paperPages, setPaperPages] = useState(1);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'both');
      // Set comfortable initial zoom depending on mode
      if (initialMode === 'both') {
        setZoomPdf(85);
        setZoomImage(85);
      } else {
        setZoomPdf(100);
        setZoomImage(100);
      }
    }
  }, [isOpen, initialMode]);

  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Auto focus modal on mount for immediate keyboard accessibility
  useEffect(() => {
    if (isOpen) {
      modalContainerRef.current?.focus();
    }
  }, [isOpen]);

  // Robust ESC key listener to reliably close the modal from any focused element
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Generate Image preview from canvas when modal is opened or report changes
  useEffect(() => {
    if (!isOpen || !report) return;
    let isMounted = true;
    setImageLoading(true);

    generateReportCanvas(report)
      .then((canvas) => {
        if (!isMounted) return;
        if (canvas) {
          setImageSrc(canvas.toDataURL('image/png'));
        }
        setImageLoading(false);
      })
      .catch((err) => {
        console.error('Error generating report canvas preview:', err);
        if (isMounted) setImageLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, report]);

  // Calculate paper height / pages for A4 layout
  useEffect(() => {
    if (paperRef.current) {
      const scrollH = paperRef.current.scrollHeight;
      const computedPages = Math.max(1, Math.ceil(scrollH / 1123));
      setPaperPages(computedPages);
    }
  }, [report, zoomPdf, isOpen, mode]);

  useEffect(() => {
    setLogoFailed(false);
  }, [report?.branding?.college_code]);

  if (!isOpen || !report) return null;

  const collegeName = report.branding?.college_name || 'Consolidated Partner Institutions';
  const collegeCode = (report.branding?.college_code || 'iPOMS').toUpperCase();
  const isConsolidated = !collegeCode || collegeCode === 'IPOMS';
  const collegeLogoUrl = getCollegeLogoUrl(collegeCode, collegeName, report.branding?.college_logo);

  const handleDownloadImage = async () => {
    if (imageSrc) {
      const fileName = getReportExportBaseFileName(report);
      const a = document.createElement('a');
      a.href = imageSrc;
      a.download = `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      await exportReportAsImage(report);
    }
  };

  const isActiveLeadsReport = report.template_type === 'active_leads';
  const allActiveLeads: any[] = report.sections?.active_leads || [];

  const hasPreparedBy =
    report.include_prepared_by !== false &&
    Boolean(report.generated_by || report.branding?.prepared_by);
  const preparedByName =
    report.generated_by || report.branding?.prepared_by || 'Placement Coordinator';

  const activeCols = report.active_leads_columns || {};
  const showCollegesCol = Boolean(
    isActiveLeadsReport &&
      (activeCols.colleges !== undefined
        ? activeCols.colleges
        : (report.kpi_summary?.selected_streams?.jd_received &&
            !report.kpi_summary?.selected_streams?.positives &&
            !report.kpi_summary?.selected_streams?.weekly_tracker) ||
          report.kpi_summary?.tier_focus?.includes('Hot Leads (JD Received)') ||
          report.report_title?.includes('Hot Leads') ||
          (report.sections?.active_leads &&
            report.sections.active_leads.some(
              (r: any) => r.colleges && r.colleges !== '—' && r.source === 'jd_received'
            )))
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

  // Helper to render the A4 PDF Document
  const renderPdfDocument = () => {
    if (isActiveLeadsReport) {
      return (
        <div className="flex flex-col items-center gap-8 w-full py-2">
          {activeLeadsPages.map((pageRows, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const pageNum = pageIdx + 1;
            const totalPages = activeLeadsPages.length;

            return (
              <div
                key={pageIdx}
                style={{
                  transform: `scale(${zoomPdf / 100})`,
                  transformOrigin: 'top center',
                  width: '794px',
                  minHeight: '1123px',
                }}
                className="bg-white text-slate-900 rounded-none sm:rounded-sm shadow-xl shadow-slate-900/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-slate-800 p-8 sm:p-12 transition-transform duration-150 select-text flex flex-col justify-between relative print:break-after-page print:min-h-screen shrink-0"
              >
                <div className="space-y-4 flex-1 flex flex-col">
                  {isFirstPage ? (
                    <>
                      {/* Header Branding */}
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
                          {collegeName &&
                            collegeName !== 'Consolidated Partner Institutions' &&
                            report.template_type !== 'active_leads' && (
                              <p className="text-xs font-semibold text-slate-700 mt-0.5 text-center">
                                {collegeName}
                              </p>
                            )}
                        </div>

                        <div className="flex items-center shrink-0 justify-end min-w-[100px]" />
                      </div>

                      {/* Metadata Ribbon */}
                      <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-5 py-2.5 font-medium mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500 shrink-0" />
                          <span>
                            Generated Date:{' '}
                            <strong className="text-slate-900 font-semibold">
                              {report.generated_date}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* KPI Summary */}
                      {report.included_sections?.kpi_summary && report.kpi_summary && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-blue-50 border-blue-300">
                            <span className="text-[9.5px] font-bold uppercase block tracking-wider text-blue-800">
                              Total Active Leads
                            </span>
                            <span className="text-base font-extrabold font-mono text-blue-700">
                              {report.kpi_summary.total_leads || allActiveLeads.length}
                            </span>
                          </div>
                          {report.kpi_summary.hot_leads_count !== undefined &&
                            report.kpi_summary.hot_leads_count > 0 && (
                              <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-amber-50 border-amber-300">
                                <span className="text-[9.5px] font-bold uppercase block tracking-wider text-amber-800">
                                  Hot (JD Received)
                                </span>
                                <span className="text-base font-extrabold font-mono text-amber-700">
                                  {report.kpi_summary.hot_leads_count}
                                </span>
                              </div>
                            )}
                          {report.kpi_summary.warm_leads_count !== undefined &&
                            report.kpi_summary.warm_leads_count > 0 && (
                              <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-emerald-50 border-emerald-300">
                                <span className="text-[9.5px] font-bold uppercase block tracking-wider text-emerald-800">
                                  Warm (Positives)
                                </span>
                                <span className="text-base font-extrabold font-mono text-emerald-700">
                                  {report.kpi_summary.warm_leads_count}
                                </span>
                              </div>
                            )}
                          {report.kpi_summary.pipeline_leads_count !== undefined &&
                            report.kpi_summary.pipeline_leads_count > 0 && (
                              <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-indigo-50 border-indigo-300">
                                <span className="text-[9.5px] font-bold uppercase block tracking-wider text-indigo-800">
                                  Weekly Pipeline
                                </span>
                                <span className="text-base font-extrabold font-mono text-indigo-700">
                                  {report.kpi_summary.pipeline_leads_count}
                                </span>
                              </div>
                            )}
                          <div className="flex-1 min-w-[90px] border p-2 rounded-xl text-center shadow-xs bg-slate-50 border-slate-300">
                            <span className="text-[9.5px] font-bold uppercase block tracking-wider text-slate-700">
                              Batch
                            </span>
                            <span className="text-base font-extrabold font-mono text-slate-800">
                              {report.kpi_summary.graduating_year ||
                                report.academic_year ||
                                'All Batches'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Section Title */}
                      <div className="mb-2">
                        <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5 uppercase">
                          <TrendingUp size={14} className="text-[#007791] shrink-0" />
                          {(() => {
                            const tier = report.kpi_summary?.tier_focus || '';
                            const batchSuffix =
                              report.kpi_summary?.graduating_year &&
                              report.kpi_summary.graduating_year !== 'All Batches'
                                ? ` — ${report.kpi_summary.graduating_year}`
                                : '';
                            if (
                              tier.includes('Hot Leads') ||
                              report.report_title?.includes('Hot Leads')
                            ) {
                              return `HOT LEADS (JD RECEIVED)${batchSuffix}`;
                            }
                            if (
                              tier.includes('Positive') ||
                              report.report_title?.includes('Positive')
                            ) {
                              return `POSITIVE LEADS${batchSuffix}`;
                            }
                            if (
                              tier.includes('Weekly Tracker') ||
                              report.report_title?.includes('Weekly Tracker')
                            ) {
                              return `WEEKLY TRACKER PIPELINE${batchSuffix}`;
                            }
                            return `ACTIVE CORPORATE LEADS${batchSuffix}`;
                          })()}
                        </h3>
                        <div className="h-[2px] w-full bg-[#007791] mt-1" />
                      </div>
                    </>
                  ) : (
                    /* Page 2+: Slim Continuation Header Strip */
                    <div className="flex items-center justify-between border-b-2 border-slate-300 pb-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/infoziant-head.png"
                          alt="Infoziant"
                          className="h-7 w-auto object-contain shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/college-logos/Infozianthead.png';
                          }}
                        />
                        <div>
                          <h2 className="text-xs font-bold text-[#0a2540] tracking-tight leading-tight uppercase">
                            {(() => {
                              const tier = report.kpi_summary?.tier_focus || '';
                              const batchSuffix =
                                report.kpi_summary?.graduating_year &&
                                report.kpi_summary.graduating_year !== 'All Batches'
                                  ? ` — ${report.kpi_summary.graduating_year}`
                                  : '';
                              if (
                                tier.includes('Hot Leads') ||
                                report.report_title?.includes('Hot Leads')
                              ) {
                                return `HOT LEADS (JD RECEIVED)${batchSuffix}`;
                              }
                              if (
                                tier.includes('Positive') ||
                                report.report_title?.includes('Positive')
                              ) {
                                return `POSITIVE LEADS${batchSuffix}`;
                              }
                              if (
                                tier.includes('Weekly Tracker') ||
                                report.report_title?.includes('Weekly Tracker')
                              ) {
                                return `WEEKLY TRACKER PIPELINE${batchSuffix}`;
                              }
                              return `ACTIVE CORPORATE LEADS${batchSuffix}`;
                            })()}
                          </h2>
                          <p className="text-[9px] text-slate-500 font-semibold">
                            {collegeName &&
                            collegeName !== 'Consolidated Partner Institutions' &&
                            report.template_type !== 'active_leads'
                              ? `${collegeName} • `
                              : ''}
                            Directory (Continued)
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Page {pageNum} of {totalPages}
                      </div>
                    </div>
                  )}

                  {/* Active Leads Table */}
                  {pageRows.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 pl-2">
                      No active leads recorded for this graduating batch.
                    </p>
                  ) : (
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                      <colgroup>
                        <col style={{ width: activeLeadsColWidths.num }} />
                        <col style={{ width: activeLeadsColWidths.comp }} />
                        {showCollegesCol && <col style={{ width: activeLeadsColWidths.colleges }} />}
                        {showRoleCol && <col style={{ width: activeLeadsColWidths.role }} />}
                        {showCtcCol && <col style={{ width: activeLeadsColWidths.ctc }} />}
                      </colgroup>
                      <thead className="print:table-header-group">
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th
                            className="py-2 px-1 text-center font-bold"
                            style={{ width: activeLeadsColWidths.num }}
                          >
                            S.No
                          </th>
                          <th className="py-2 px-2 text-center font-bold">Company Name</th>
                          {showCollegesCol && (
                            <th className="py-2 px-2 text-center font-bold">Colleges</th>
                          )}
                          {showRoleCol && <th className="py-2 px-2 text-center font-bold">Role</th>}
                          {showCtcCol && <th className="py-2 px-2 text-center font-bold">CTC</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {pageRows.map((r: any, rIdx: number) => (
                          <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}>
                            <td
                              className="py-2 px-1 text-center font-bold text-[#007791]"
                              style={{ width: activeLeadsColWidths.num }}
                            >
                              {r.s_no}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                              {r.company_name}
                            </td>
                            {showCollegesCol && (
                              <td className="py-2 px-2 text-center whitespace-normal break-words leading-tight text-slate-700">
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
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.role || '—'}
                              </td>
                            )}
                            {showCtcCol && (
                              <td className="py-2 px-2 text-center text-[#007791] font-bold whitespace-normal break-words leading-tight">
                                {r.ctc ? (
                                  r.ctc.includes(',') ? (
                                    <div className="flex flex-col items-center justify-center gap-0.5 leading-tight py-0.5">
                                      {r.ctc.split(',').map((part: string, pIdx: number) => (
                                        <span
                                          key={pIdx}
                                          className="block whitespace-normal break-words text-[10.5px]"
                                        >
                                          {part.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="block whitespace-normal break-words leading-tight text-[10.5px]">
                                      {r.ctc}
                                    </span>
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

                  {/* Remarks on Final Page */}
                  {pageIdx === totalPages - 1 &&
                    report.included_sections?.remarks &&
                    report.remarks && (
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

                {/* Footer */}
                {report.include_prepared_by !== false && (
                  <div className="border-t border-slate-300 pt-2.5 pb-0.5 mt-auto flex items-center justify-between text-[10px] text-slate-500 shrink-0">
                    <div>
                      <p className="mt-0.5">© 2026 Infoziant. All rights reserved.</p>
                    </div>
                    {hasPreparedBy && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <User size={12} className="text-blue-900 shrink-0" />
                        <span>
                          Prepared by: <strong className="font-bold">{preparedByName}</strong>
                        </span>
                      </div>
                    )}
                    <div className="font-semibold text-slate-600">
                      Page {pageNum} of {totalPages}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Standard Single/Multi-Section Paper Container for Other Report Types
    return (
      <div
        ref={paperRef}
        style={{
          transform: `scale(${zoomPdf / 100})`,
          transformOrigin: 'top center',
          width: '794px',
          minHeight: `${Math.max(1, paperPages) * 1123}px`,
        }}
        className="bg-white text-slate-900 rounded-none sm:rounded-sm shadow-xl shadow-slate-900/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-slate-800 p-8 sm:p-12 transition-transform duration-150 select-text flex flex-col justify-between relative shrink-0"
      >
        {/* Header Branding */}
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
              {report.report_title ||
                (report.template_type === 'month_end'
                  ? `${report.report_period?.split(' ')[0] || 'August'} Month Placement Operations Report`
                  : report.template_type === 'pending_tasks'
                  ? 'Pending Task Placement Report'
                  : report.template_type === 'active_leads'
                  ? 'Active Leads Pipeline Report'
                  : 'Weekly Placement Report')}
            </h1>
            <p className="text-xs font-semibold text-slate-700 mt-0.5 text-center">{collegeName}</p>
          </div>

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

        {/* Metadata Ribbon */}
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-5 py-2.5 font-medium mb-4">
          {report.template_type === 'weekly_placement' && getCleanPeriod(report.report_period) ? (
            <>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-700 shrink-0" />
                <span>
                  Period:{' '}
                  <strong className="text-slate-900 font-semibold">
                    {getCleanPeriod(report.report_period)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>
                  Generated Date:{' '}
                  <strong className="text-slate-900 font-semibold">
                    {report.generated_date}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-500 shrink-0" />
                <span>
                  Generated Date:{' '}
                  <strong className="text-slate-900 font-semibold">
                    {report.generated_date}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Sections */}
        <div className="space-y-6 flex-1 flex flex-col pt-1">
          {/* KPI Summary */}
          {report.template_type !== 'pending_tasks' &&
            report.included_sections?.kpi_summary &&
            report.kpi_summary &&
            (() => {
              const activeKpis =
                report.included_kpi_cards || report.included_sections?.kpi_cards || {};
              if (report.template_type === 'month_end') {
                const meCards = [
                  {
                    key: 'total_conversion_count',
                    label: 'Total Conversions',
                    val: report.kpi_summary.total_conversion_count || 0,
                    bg: 'bg-emerald-50 border-emerald-300',
                    text: 'text-emerald-700',
                    labelText: 'text-emerald-800',
                  },
                  {
                    key: 'total_companies_scheduled',
                    label: 'Companies Scheduled',
                    val: report.kpi_summary.total_companies_scheduled || 0,
                    bg: 'bg-amber-50 border-amber-300',
                    text: 'text-amber-700',
                    labelText: 'text-amber-800',
                  },
                  {
                    key: 'total_offers_moved',
                    label: 'Offers Received',
                    val: report.kpi_summary.total_offers_moved || 0,
                    bg: 'bg-purple-50 border-purple-300',
                    text: 'text-purple-700',
                    labelText: 'text-purple-800',
                  },
                ].filter((c) => activeKpis[c.key] !== false);

                if (meCards.length === 0) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {meCards.map((c) => (
                      <div
                        key={c.key}
                        className={`border p-3 rounded-xl text-center shadow-xs ${c.bg}`}
                      >
                        <span
                          className={`text-[10px] font-bold uppercase block tracking-wider ${c.labelText}`}
                        >
                          {c.label}
                        </span>
                        <span className={`text-lg font-extrabold font-mono ${c.text}`}>
                          {c.val}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              } else if (
                report.template_type === 'active_leads' ||
                report.kpi_summary.total_leads !== undefined
              ) {
                const alCards = [
                  {
                    key: 'total_leads',
                    label: 'Total Active Leads',
                    val: report.kpi_summary.total_leads || 0,
                    bg: 'bg-blue-50 border-blue-300',
                    text: 'text-blue-700',
                    labelText: 'text-blue-800',
                  },
                  {
                    key: 'graduating_year',
                    label: 'Graduating Batch',
                    val: report.kpi_summary.graduating_year || '2027',
                    bg: 'bg-emerald-50 border-emerald-300',
                    text: 'text-emerald-700',
                    labelText: 'text-emerald-800',
                  },
                ].filter((c) => activeKpis[c.key] !== false);

                if (alCards.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {alCards.map((c) => (
                      <div
                        key={c.key}
                        className={`flex-1 min-w-[100px] border p-2.5 rounded-xl text-center shadow-xs ${c.bg}`}
                      >
                        <span
                          className={`text-[10px] font-bold uppercase block tracking-wider ${c.labelText}`}
                        >
                          {c.label}
                        </span>
                        <span className={`text-base font-extrabold font-mono ${c.text}`}>
                          {c.val}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              } else if (report.is_multi_college) {
                const multiCards = [
                  {
                    key: 'total_colleges',
                    label: 'Colleges Included',
                    val:
                      report.kpi_summary.total_colleges || report.colleges_data?.length || 0,
                    bg: 'bg-indigo-50/80 border-indigo-200',
                    text: 'text-indigo-700',
                    labelText: 'text-indigo-800',
                  },
                  {
                    key: 'drives_completed',
                    label: 'Companies Completed',
                    val: report.kpi_summary.drives_completed || 0,
                    bg: 'bg-emerald-50/80 border-emerald-200',
                    text: 'text-emerald-700',
                    labelText: 'text-emerald-800',
                  },
                  {
                    key: 'drives_in_progress',
                    label: 'Companies In Progress',
                    val: report.kpi_summary.drives_in_progress || 0,
                    bg: 'bg-blue-50/80 border-blue-200',
                    text: 'text-blue-700',
                    labelText: 'text-blue-800',
                  },
                  {
                    key: 'total_offers',
                    label: 'Total Offers Placed',
                    val: report.kpi_summary.total_offers || 0,
                    bg: 'bg-purple-50/80 border-purple-200',
                    text: 'text-purple-700',
                    labelText: 'text-purple-800',
                  },
                ];
                return (
                  <div className="flex flex-wrap gap-2">
                    {multiCards.map((c) => (
                      <div
                        key={c.key}
                        className={`flex-1 min-w-[80px] border p-2 rounded-lg text-center shadow-xs ${c.bg}`}
                      >
                        <span
                          className={`text-[10px] font-bold uppercase block truncate ${c.labelText}`}
                        >
                          {c.label}
                        </span>
                        <span className={`text-sm font-bold font-mono ${c.text}`}>{c.val}</span>
                      </div>
                    ))}
                  </div>
                );
              } else {
                const wpCards = [
                  {
                    key: 'total_calls',
                    label: 'Total Calls Made',
                    val: report.kpi_summary.total_calls || 0,
                    bg: 'bg-blue-50/80 border-blue-200',
                    text: 'text-blue-700',
                    labelText: 'text-blue-800',
                  },
                  {
                    key: 'positive_responses',
                    label: 'Positives',
                    val: report.kpi_summary.positive_responses || 0,
                    bg: 'bg-emerald-50/80 border-emerald-200',
                    text: 'text-emerald-700',
                    labelText: 'text-emerald-800',
                  },
                  {
                    key: 'not_hiring',
                    label: 'Not Hiring',
                    val: report.kpi_summary.not_hiring || 0,
                    bg: 'bg-rose-50/80 border-rose-200',
                    text: 'text-rose-700',
                    labelText: 'text-rose-800',
                  },
                  {
                    key: 'jds_received',
                    label: 'JD Received',
                    val: report.kpi_summary.jds_received || 0,
                    bg: 'bg-cyan-50/80 border-cyan-200',
                    text: 'text-cyan-700',
                    labelText: 'text-cyan-800',
                  },
                ].filter((c) => activeKpis[c.key] !== false);

                if (wpCards.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {wpCards.map((c) => (
                      <div
                        key={c.key}
                        className={`flex-1 min-w-[80px] border p-2 rounded-lg text-center shadow-xs ${c.bg}`}
                      >
                        <span
                          className={`text-[10px] font-bold uppercase block truncate ${c.labelText}`}
                        >
                          {c.label}
                        </span>
                        <span className={`text-sm font-bold font-mono ${c.text}`}>{c.val}</span>
                      </div>
                    ))}
                  </div>
                );
              }
            })()}

          {/* Multi-College Sections */}
          {report.is_multi_college && Array.isArray(report.colleges_data) && (
            <div className="space-y-6">
              {report.colleges_data.map((colData: any, cIdx: number) => {
                const hasCompleted =
                  colData.completed_companies && colData.completed_companies.length > 0;
                const hasDriveInProgress =
                  (colData.drive_in_progress && colData.drive_in_progress.length > 0) ||
                  (colData.drive_in_progress_companies &&
                    colData.drive_in_progress_companies.length > 0);
                const hasInDrive =
                  (colData.upcoming_drives && colData.upcoming_drives.length > 0) ||
                  (colData.companies_in_drive && colData.companies_in_drive.length > 0);
                const hasProgress = colData.in_progress && colData.in_progress.length > 0;

                return (
                  <div
                    key={colData.college_id || cIdx}
                    className="space-y-2.5 print:break-inside-avoid break-inside-avoid border border-slate-200 rounded-xl p-3 bg-slate-50/30"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-1.5 bg-blue-900 text-white rounded-lg shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                          {cIdx + 1}
                        </span>
                        <span className="font-bold text-xs">
                          {colData.college_name}{' '}
                          {colData.college_code ? `(${colData.college_code})` : ''}
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
                        {(colData.total_drive_in_progress ||
                          (colData.drive_in_progress && colData.drive_in_progress.length) ||
                          0) > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                            {colData.total_drive_in_progress || colData.drive_in_progress.length}{' '}
                            Drive in Progress
                          </span>
                        )}
                        {((colData.total_upcoming_drives || colData.total_in_drive || 0) > 0 ||
                          (colData.upcoming_drives && colData.upcoming_drives.length > 0) ||
                          (colData.companies_in_drive &&
                            colData.companies_in_drive.length > 0)) && (
                          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-200 border border-orange-400/30">
                            {colData.total_upcoming_drives ||
                              colData.total_in_drive ||
                              colData.upcoming_drives?.length ||
                              colData.companies_in_drive?.length}{' '}
                            Upcoming Drives
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

                    {/* Multi-College Completed */}
                    {report.included_sections?.completed_companies !== false && (
                      <div>
                        <div className="mb-1.5">
                          <h4 className="text-[12px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                            <Trophy size={13} className="text-[#007791] shrink-0" /> 1. COMPANIES
                            COMPLETED {hasCompleted ? `(${colData.completed_companies.length})` : ''}
                          </h4>
                          <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                        </div>
                        {!hasCompleted ? (
                          <p className="text-[10.5px] text-slate-400 italic px-1 py-0.5">
                            No completed drives for this institution during this period.
                          </p>
                        ) : (
                          <table className="w-full text-[10.5px] border-collapse table-fixed bg-white rounded">
                            <colgroup>
                              <col style={{ width: '36px' }} />
                              <col style={{ width: '25%' }} />
                              <col style={{ width: '23%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '27%' }} />
                              <col style={{ width: '12%' }} />
                            </colgroup>
                            <thead className="print:table-header-group">
                              <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                                <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                                <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                                <th className="py-1.5 px-2 text-center font-bold">Role</th>
                                <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                                <th className="py-1.5 px-2 text-center font-bold">Status</th>
                                <th className="py-1.5 px-1 text-center font-bold">Offers</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80">
                              {colData.completed_companies.map((r: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                                >
                                  <td className="py-1.5 px-1 text-center font-bold text-[#007791]">
                                    {r.s_no}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                    {r.company_name}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                    {r.job_role || r.role || '—'}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                    {r.ctc_lpa || r.ctc || '—'}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                    {r.current_status_text || r.status || 'Drive Completed'}
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-extrabold text-[#059669]">
                                    {r.selected_count || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* Multi-College Drive in Progress */}
                    {report.included_sections?.drive_in_progress !== false &&
                      hasDriveInProgress && (
                        <div>
                          <div className="mb-1.5">
                            <h4 className="text-[12px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                              <Flame size={13} className="text-[#007791] shrink-0" /> 2. DRIVE IN
                              PROGRESS (
                              {(colData.drive_in_progress || colData.drive_in_progress_companies)
                                .length}
                              )
                            </h4>
                            <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                          </div>
                          <table className="w-full text-[10.5px] border-collapse table-fixed bg-white rounded">
                            <colgroup>
                              <col style={{ width: '36px' }} />
                              <col style={{ width: '28%' }} />
                              <col style={{ width: '26%' }} />
                              <col style={{ width: '14%' }} />
                              <col style={{ width: '32%' }} />
                            </colgroup>
                            <thead className="print:table-header-group">
                              <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                                <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                                <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                                <th className="py-1.5 px-2 text-center font-bold">Role</th>
                                <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                                <th className="py-1.5 px-2 text-center font-bold">Status / Follow-up</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80">
                              {(
                                colData.drive_in_progress || colData.drive_in_progress_companies
                              ).map((r: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                                >
                                  <td className="py-1.5 px-1 text-center font-bold text-[#007791]">
                                    {r.s_no}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                    {r.company_name}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                    {r.job_role || r.role || '—'}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                    {r.ctc_lpa || r.ctc || 'Competitive'}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                    {r.current_status_text || r.status || 'Drive in progress'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    {/* Multi-College Upcoming Drives */}
                    {report.included_sections?.upcoming_drives !== false &&
                      report.included_sections?.companies_in_drive !== false &&
                      hasInDrive && (
                        <div>
                          <div className="mb-1.5">
                            <h4 className="text-[12px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                              <Rocket size={13} className="text-[#007791] shrink-0" /> 3. UPCOMING
                              DRIVES (
                              {(colData.upcoming_drives || colData.companies_in_drive).length})
                            </h4>
                            <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                          </div>
                          <table className="w-full text-[10.5px] border-collapse table-fixed bg-white rounded">
                            <colgroup>
                              <col style={{ width: '36px' }} />
                              <col style={{ width: '28%' }} />
                              <col style={{ width: '26%' }} />
                              <col style={{ width: '14%' }} />
                              <col style={{ width: '32%' }} />
                            </colgroup>
                            <thead className="print:table-header-group">
                              <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                                <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                                <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                                <th className="py-1.5 px-2 text-center font-bold">Role</th>
                                <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                                <th className="py-1.5 px-2 text-center font-bold">Status / Drive Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80">
                              {(colData.upcoming_drives || colData.companies_in_drive).map(
                                (r: any, idx: number) => (
                                  <tr
                                    key={idx}
                                    className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                                  >
                                    <td className="py-1.5 px-1 text-center font-bold text-[#007791]">
                                      {r.s_no}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                      {r.company_name}
                                    </td>
                                    <td className="py-1.5 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                      {r.job_role || r.role || '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                      {r.ctc_lpa || r.ctc || 'Competitive'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                      {r.current_status_text || r.status || 'Upcoming Drive'}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                    {/* Multi-College In Progress */}
                    {report.included_sections?.in_progress !== false && hasProgress && (
                      <div>
                        <div className="mb-1.5">
                          <h4 className="text-[12px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-[#007791] shrink-0" /> 4. IN
                            PROGRESS ({colData.in_progress.length})
                          </h4>
                          <div className="h-[2px] w-full bg-[#007791] mt-0.5" />
                        </div>
                        <table className="w-full text-[10.5px] border-collapse table-fixed bg-white rounded">
                          <colgroup>
                            <col style={{ width: '36px' }} />
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '26%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '32%' }} />
                          </colgroup>
                          <thead className="print:table-header-group">
                            <tr className="bg-[#0a2540] text-white font-semibold text-[10px]">
                              <th className="py-1.5 px-1 text-center font-bold">S.No</th>
                              <th className="py-1.5 px-2 text-center font-bold">Company Name</th>
                              <th className="py-1.5 px-2 text-center font-bold">Role</th>
                              <th className="py-1.5 px-2 text-center font-bold">CTC</th>
                              <th className="py-1.5 px-2 text-center font-bold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80">
                            {colData.in_progress.map((r: any, idx: number) => (
                              <tr
                                key={idx}
                                className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                              >
                                <td className="py-1.5 px-1 text-center font-bold text-[#007791]">
                                  {r.s_no}
                                </td>
                                <td className="py-1.5 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                  {r.company_name}
                                </td>
                                <td className="py-1.5 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                  {r.job_role || r.role || '—'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                  {r.ctc_lpa || r.ctc || '—'}
                                </td>
                                <td className="py-1.5 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                  {r.current_status_text || r.status || 'In Progress'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Single-College Weekly Placement Tables */}
          {!report.is_multi_college &&
            report.template_type !== 'month_end' &&
            report.template_type !== 'active_leads' &&
            report.template_type !== 'pending_tasks' && (
              <>
                {/* 1. Companies Completed */}
                {report.included_sections?.completed_companies &&
                  report.sections?.completed_companies && (
                    <div className="space-y-1.5">
                      <div className="mb-2">
                        <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                          <Trophy size={14} className="text-[#007791] shrink-0" /> 1. COMPANIES
                          COMPLETED
                        </h3>
                        <div className="h-[2px] w-full bg-[#007791] mt-1" />
                      </div>
                      {report.sections.completed_companies.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                          No completed drives recorded for this period.
                        </p>
                      ) : (
                        <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                          <colgroup>
                            <col style={{ width: '38px' }} />
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '14%' }} />
                          </colgroup>
                          <thead className="print:table-header-group">
                            <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                              <th className="py-2 px-1 text-center font-bold">S.No</th>
                              <th className="py-2 px-2 text-center font-bold">Company Name</th>
                              <th className="py-2 px-2 text-center font-bold">Role</th>
                              <th className="py-2 px-2 text-center font-bold">CTC</th>
                              <th className="py-2 px-2 text-center font-bold">Status</th>
                              <th className="py-2 px-1 text-center font-bold">Offers</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80">
                            {report.sections.completed_companies.map((r: any, idx: number) => (
                              <tr
                                key={idx}
                                className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                              >
                                <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                  {r.s_no}
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                  {r.company_name}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                  {r.job_role || r.role || '—'}
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                  {r.ctc_lpa || r.ctc || '—'}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                  {r.current_status_text || r.status || 'Drive Completed'}
                                </td>
                                <td className="py-2 px-1 text-center font-extrabold text-[#059669]">
                                  {r.selected_count || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                {/* 2. Drive in Progress */}
                {report.included_sections?.drive_in_progress !== false &&
                  report.sections?.drive_in_progress &&
                  report.sections.drive_in_progress.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="mb-2">
                        <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                          <Flame size={14} className="text-[#007791] shrink-0" /> 2. DRIVE IN
                          PROGRESS
                        </h3>
                        <div className="h-[2px] w-full bg-[#007791] mt-1" />
                      </div>
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '31%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status / Follow-up</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.drive_in_progress.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.job_role || r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc_lpa || r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.current_status_text || r.status || 'Drive in progress'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* 3. Upcoming Drives */}
                {report.included_sections?.companies_in_drive !== false &&
                  (report.sections?.companies_in_drive || report.sections?.upcoming_drives) &&
                  (report.sections?.companies_in_drive || report.sections?.upcoming_drives)
                    .length > 0 && (
                    <div className="space-y-1.5">
                      <div className="mb-2">
                        <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                          <Rocket size={14} className="text-[#007791] shrink-0" /> 3. UPCOMING
                          DRIVES
                        </h3>
                        <div className="h-[2px] w-full bg-[#007791] mt-1" />
                      </div>
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '31%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status / Drive Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {(
                            report.sections.companies_in_drive || report.sections.upcoming_drives
                          ).map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.job_role || r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc_lpa || r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.current_status_text || r.status || 'Upcoming Drive'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* 4. In Progress */}
                {report.included_sections?.in_progress && report.sections?.in_progress && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-[#007791] shrink-0" /> 4. COMPANIES IN
                        PROGRESS
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {report.sections.in_progress.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No in-progress drives recorded for this period.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '31%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.in_progress.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.job_role || r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc_lpa || r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.current_status_text || r.status || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 5. Pipeline */}
                {report.included_sections?.pipeline && report.sections?.pipeline && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <Inbox size={14} className="text-[#007791] shrink-0" /> 5. COMPANIES IN
                        PIPELINE
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {report.sections.pipeline.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No pipeline companies recorded.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '31%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.pipeline.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.job_role || r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc_lpa || r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.current_status_text || r.status || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 6. Top Companies */}
                {report.included_sections?.top_companies && report.sections?.top_companies && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <Star size={14} className="text-[#007791] shrink-0" /> 6. TOP COMPANIES
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {report.sections.top_companies.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No top companies recorded.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '31%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.top_companies.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.job_role || r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc_lpa || r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.current_status_text || r.status || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 7. Rejected Companies */}
                {(report.included_sections?.rejected_companies ||
                  report.included_sections?.rejected_by_hr) &&
                  (report.sections?.rejected_companies || report.sections?.rejected_by_hr) && (
                    <div className="space-y-1.5">
                      <div className="mb-2">
                        <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                          <XCircle size={14} className="text-[#007791] shrink-0" /> 7. REJECTED
                          COMPANIES
                        </h3>
                        <div className="h-[2px] w-full bg-[#007791] mt-1" />
                      </div>
                      {(report.sections.rejected_companies || report.sections.rejected_by_hr)
                        .length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                          No rejected companies recorded.
                        </p>
                      ) : (
                        <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                          <colgroup>
                            <col style={{ width: '38px' }} />
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '26%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '31%' }} />
                          </colgroup>
                          <thead className="print:table-header-group">
                            <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                              <th className="py-2 px-1 text-center font-bold">S.No</th>
                              <th className="py-2 px-2 text-center font-bold">Company Name</th>
                              <th className="py-2 px-2 text-center font-bold">Role</th>
                              <th className="py-2 px-2 text-center font-bold">CTC</th>
                              <th className="py-2 px-2 text-center font-bold">Status / Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80">
                            {(
                              report.sections.rejected_companies ||
                              report.sections.rejected_by_hr
                            ).map((r: any, idx: number) => (
                              <tr
                                key={idx}
                                className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                              >
                                <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                  {r.s_no}
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                  {r.company_name}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                  {r.job_role || r.role || '—'}
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                  {r.ctc_lpa || r.ctc || '—'}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                  {r.current_status_text || r.status || r.reason || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                {/* 8. On Hold by College */}
                {(report.included_sections?.on_hold_by_college ||
                  report.included_sections?.rejected_by_college) &&
                  (report.sections?.on_hold_by_college ||
                    report.sections?.rejected_by_college) && (
                    <div className="space-y-1.5">
                      <div className="mb-2">
                        <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                          <Clock size={14} className="text-[#007791] shrink-0" /> 8. ON HOLD BY
                          COLLEGE
                        </h3>
                        <div className="h-[2px] w-full bg-[#007791] mt-1" />
                      </div>
                      {(report.sections.on_hold_by_college ||
                        report.sections.rejected_by_college).length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                          No companies on hold by college.
                        </p>
                      ) : (
                        <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                          <colgroup>
                            <col style={{ width: '38px' }} />
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '26%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '31%' }} />
                          </colgroup>
                          <thead className="print:table-header-group">
                            <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                              <th className="py-2 px-1 text-center font-bold">S.No</th>
                              <th className="py-2 px-2 text-center font-bold">Company Name</th>
                              <th className="py-2 px-2 text-center font-bold">Role</th>
                              <th className="py-2 px-2 text-center font-bold">CTC</th>
                              <th className="py-2 px-2 text-center font-bold">Status / Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80">
                            {(
                              report.sections.on_hold_by_college ||
                              report.sections.rejected_by_college
                            ).map((r: any, idx: number) => (
                              <tr
                                key={idx}
                                className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                              >
                                <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                  {r.s_no}
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                  {r.company_name}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                  {r.job_role || r.role || '—'}
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                  {r.ctc_lpa || r.ctc || '—'}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                  {r.current_status_text || r.status || r.reason || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                {/* 9. On Hold by HR */}
                {report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <Clock size={14} className="text-[#007791] shrink-0" /> 9. ON HOLD BY HR
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {report.sections.on_hold_by_hr.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No companies on hold by HR.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '31%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status / Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.on_hold_by_hr.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.job_role || r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc_lpa || r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.current_status_text || r.status || r.reason || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}

          {/* Placement Pending Tasks (Section-wise 3 Tables) */}
          {report.template_type === 'pending_tasks' && (() => {
            const allTasks = report.sections?.pending_tasks || [];
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

            const sections = [
              { num: 1, title: 'DRIVE IN PROGRESS', icon: Flame, list: sec1, key: 'drive_in_progress' },
              { num: 2, title: 'COMPANIES IN DRIVE', icon: Calendar, list: sec2, key: 'companies_in_drive' },
              { num: 3, title: 'COMPANY IN PROGRESS', icon: Clock, list: sec3, key: 'company_in_progress' },
            ].filter((s) => s.list.length > 0);

            if (sections.length === 0) {
              return (
                <div className="space-y-1.5">
                  <div className="mb-2">
                    <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                      <ListTodo size={14} className="text-[#007791] shrink-0" /> PLACEMENT PENDING
                      TASKS
                    </h3>
                    <div className="h-[2px] w-full bg-[#007791] mt-1" />
                  </div>
                  <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                    No pending tasks recorded for this period.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {sections.map((sec, secIdx) => (
                  <div key={sec.key} className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <sec.icon size={14} className="text-[#007791] shrink-0" /> {secIdx + 1}.{' '}
                        {sec.title}
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                      <colgroup>
                        <col style={{ width: '36px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '34%' }} />
                      </colgroup>
                      <thead className="print:table-header-group">
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">#</th>
                          <th className="py-2 px-2 text-center font-bold">Company Name</th>
                          <th className="py-2 px-2 text-center font-bold">Role</th>
                          <th className="py-2 px-1 text-center font-bold">CTC</th>
                          <th className="py-2 px-2 text-center font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {sec.list.map((r: any, idx: number) => {
                          const isHl = Boolean(r.is_highlighted);
                          const hlBg = r.highlight_color || '#fef08a';
                          const roleVal = r.role || r.job_role || '—';
                          const ctcVal = r.ctc || r.ctc_lpa || r.package_details || '—';
                          const statusVal =
                            r.status ||
                            r.current_status_text ||
                            r.action_to_be_taken ||
                            r.current_status ||
                            r.remarks ||
                            '—';
                          return (
                            <tr
                              key={idx}
                              style={isHl ? { backgroundColor: hlBg } : undefined}
                              className={!isHl ? 'bg-white' : ''}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {roleVal}
                              </td>
                              <td className="py-2 px-1 text-center font-semibold text-slate-700 whitespace-nowrap leading-snug">
                                {ctcVal}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {statusVal}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Month-End Tables */}
          {report.template_type === 'month_end' && (
            <>
              {/* Completed */}
              {report.included_sections?.completed_companies &&
                report.sections?.completed_companies && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <Trophy size={14} className="text-[#007791] shrink-0" /> 1. COMPANIES
                        COMPLETED
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {report.sections.completed_companies.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No completed drives recorded for this month.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '22%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '14%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status</th>
                            <th className="py-2 px-1 text-center font-bold">Offers</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.completed_companies.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.role || r.job_role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc || r.ctc_lpa || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.status || r.current_status_text || 'Drive Completed'}
                              </td>
                              <td className="py-2 px-1 text-center font-extrabold text-[#059669]">
                                {r.offers_received ?? r.selected_count ?? 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

              {/* Conversions / JD Received */}
              {report.included_sections?.company_conversions &&
                report.sections?.company_conversions && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <Inbox size={14} className="text-[#007791] shrink-0" /> 2. JD RECEIVED
                        COMPANIES
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {report.sections.company_conversions.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No JD received conversions recorded for this month.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '28%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">JD Received Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.company_conversions.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.jd_received_date || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

              {/* Companies in Drive */}
              {report.included_sections?.companies_in_drive &&
                (report.sections?.companies_in_drive ||
                  report.sections?.company_drives_scheduled) && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <Rocket size={14} className="text-[#007791] shrink-0" /> 3. COMPANIES IN
                        DRIVE
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {(
                      report.sections.companies_in_drive ||
                      report.sections.company_drives_scheduled
                    ).length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No companies in drive recorded for this month.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '27%' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '11.5%' }} />
                          <col style={{ width: '30%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {(
                            report.sections.companies_in_drive ||
                            report.sections.company_drives_scheduled
                          ).map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.status || r.current_status_text || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

              {/* On Hold by TPO */}
              {report.included_sections?.on_hold_by_college &&
                report.sections?.on_hold_by_college && (
                  <div className="space-y-1.5">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                        <Clock size={14} className="text-[#007791] shrink-0" /> 4. COMPANIES ON
                        HOLD BY TPO
                      </h3>
                      <div className="h-[2px] w-full bg-[#007791] mt-1" />
                    </div>
                    {report.sections.on_hold_by_college.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        No companies on hold by TPO recorded for this month.
                      </p>
                    ) : (
                      <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                        <colgroup>
                          <col style={{ width: '38px' }} />
                          <col style={{ width: '27%' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '11.5%' }} />
                          <col style={{ width: '30%' }} />
                        </colgroup>
                        <thead className="print:table-header-group">
                          <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                            <th className="py-2 px-1 text-center font-bold">S.No</th>
                            <th className="py-2 px-2 text-center font-bold">Company Name</th>
                            <th className="py-2 px-2 text-center font-bold">Role</th>
                            <th className="py-2 px-2 text-center font-bold">CTC</th>
                            <th className="py-2 px-2 text-center font-bold">Status / Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {report.sections.on_hold_by_college.map((r: any, idx: number) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                            >
                              <td className="py-2 px-1 text-center font-bold text-[#007791]">
                                {r.s_no}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                                {r.company_name}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                                {r.role || '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                                {r.ctc || '—'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                                {r.status || r.remarks || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

              {/* On Hold by HR */}
              {report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && (
                <div className="space-y-1.5">
                  <div className="mb-2">
                    <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5">
                      <Clock size={14} className="text-[#007791] shrink-0" /> 5. COMPANIES ON
                      HOLD BY HR
                    </h3>
                    <div className="h-[2px] w-full bg-[#007791] mt-1" />
                  </div>
                  {report.sections.on_hold_by_hr.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                      No companies on hold by HR recorded for this month.
                    </p>
                  ) : (
                    <table className="w-full text-[11px] border-collapse table-fixed bg-white">
                      <colgroup>
                        <col style={{ width: '38px' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '11.5%' }} />
                        <col style={{ width: '30%' }} />
                      </colgroup>
                      <thead className="print:table-header-group">
                        <tr className="bg-[#0a2540] text-white font-semibold text-[10.5px]">
                          <th className="py-2 px-1 text-center font-bold">S.No</th>
                          <th className="py-2 px-2 text-center font-bold">Company Name</th>
                          <th className="py-2 px-2 text-center font-bold">Role</th>
                          <th className="py-2 px-2 text-center font-bold">CTC</th>
                          <th className="py-2 px-2 text-center font-bold">Status / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {report.sections.on_hold_by_hr.map((r: any, idx: number) => (
                          <tr
                            key={idx}
                            className={idx % 2 === 0 ? 'bg-[#f0f7f9]' : 'bg-white'}
                          >
                            <td className="py-2 px-1 text-center font-bold text-[#007791]">
                              {r.s_no}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#0a2540] whitespace-normal break-words leading-snug">
                              {r.company_name}
                            </td>
                            <td className="py-2 px-2 text-center text-slate-700 whitespace-normal break-words leading-snug">
                              {r.role || '—'}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#007791] whitespace-normal break-words leading-snug">
                              {r.ctc || '—'}
                            </td>
                            <td className="py-2 px-2 text-center text-slate-600 whitespace-normal break-words leading-snug">
                              {r.status || r.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}

          {/* Observations & Remarks */}
          {report.included_sections?.remarks && report.remarks && (
            <div className="space-y-1 pt-1">
              <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                <PenLine size={13} className="text-slate-600" />
                <span>
                  {report.template_type === 'active_leads'
                    ? 'Notes'
                    : 'Coordinator Remarks & Observations'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 leading-relaxed">
                {report.remarks}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {report.include_prepared_by !== false && (
          <div className="border-t border-slate-300 pt-3 pb-1 mt-auto flex items-center justify-between text-[10px] text-slate-500 avoid-break shrink-0">
            <div>
              <p className="mt-0.5">© 2026 Infoziant. All rights reserved.</p>
            </div>
            {hasPreparedBy && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <User size={12} className="text-blue-900 shrink-0" />
                <span>
                  Prepared by: <strong className="font-bold">{preparedByName}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to render the Image preview element
  const renderImagePreview = () => {
    if (imageLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] h-full text-slate-400 gap-3 py-16">
          <Loader2 size={32} className="animate-spin text-sky-400" />
          <p className="text-xs font-medium">Generating High-DPI Report Canvas…</p>
        </div>
      );
    }

    if (!imageSrc) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] h-full text-slate-400 gap-2 py-16">
          <ImageIcon size={32} className="text-slate-600" />
          <p className="text-xs">No image preview available</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-start w-full py-2">
        <div
          style={{
            transform: `scale(${zoomImage / 100})`,
            transformOrigin: 'top center',
            width: '860px',
            maxWidth: '100%',
          }}
          className="transition-transform duration-150 flex flex-col items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Report Preview"
            className="w-full h-auto bg-white rounded-sm shadow-xl shadow-slate-900/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-slate-700/80"
          />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={modalContainerRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none outline-none"
    >
      {/* ── Top Master Header & Mode Switcher Bar ──────────────────────────── */}
      <header className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-sm dark:shadow-xl z-20 shrink-0 gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {mode === 'both' ? (
              <Columns2 size={16} />
            ) : mode === 'image' ? (
              <ImageIcon size={16} />
            ) : (
              <FileText size={16} />
            )}
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Report previewer
            </h2>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
              {collegeName && collegeName !== 'Consolidated Partner Institutions'
                ? collegeName
                : report.report_title || 'Institutional Report'}
            </p>
          </div>
        </div>

        {/* Center: Segmented Preview Mode Switcher (Image / Both / PDF) — Perfectly Center Aligned */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-slate-100 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-inner gap-1 z-10">
          {/* 1. Image */}
          <button
            type="button"
            onClick={() => {
              setMode('image');
              setZoomImage(100);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'image'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
            title="Show Image Preview full screen"
          >
            <ImageIcon size={13} />
            <span>Image</span>
          </button>

          {/* 2. Both (Image + PDF) */}
          <button
            type="button"
            onClick={() => {
              setMode('both');
              setZoomPdf(85);
              setZoomImage(85);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'both'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
            title="Show Both (Image and PDF Preview)"
          >
            <Columns2 size={13} />
            <span>Both</span>
          </button>

          {/* 3. PDF */}
          <button
            type="button"
            onClick={() => {
              setMode('pdf');
              setZoomPdf(100);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'pdf'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
            title="Show A4 PDF Document preview full screen"
          >
            <FileText size={13} />
            <span>PDF</span>
          </button>
        </div>

        {/* Right: Close (X) Icon Button */}
        <div className="flex items-center shrink-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-200 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500/40 flex items-center justify-center transition-colors cursor-pointer"
            title="Close Preview (ESC)"
            aria-label="Close Preview"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── Main Viewport Area: Side-by-Side (Both) OR Single Mode ───────────── */}
      <main className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-200/60 dark:bg-slate-950">
        {mode === 'both' ? (
          /* 50/50 Screen Split: Left = Preview Image, Right = Preview PDF */
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 h-full min-h-0 overflow-hidden">
            {/* ── Left Pane: Preview Image ── */}
            <div className="flex flex-col h-full min-h-0 bg-slate-100/50 dark:bg-slate-950/70 overflow-hidden">
              {/* Left Pane Sub-Header (Tool Box) */}
              <div className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    <ImageIcon size={13} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Preview Image</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                      (Ultra-HD Mobile & WhatsApp Format)
                    </span>
                  </div>
                </div>

                {/* Left Pane Zoom Bar Only */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomImage((z) => Math.max(z - 10, 40))}
                    className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                    title="Zoom Out Image"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomImage(85)}
                    className="px-1 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Reset Image Zoom"
                  >
                    {zoomImage}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomImage((z) => Math.min(z + 10, 150))}
                    className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                    title="Zoom In Image"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              </div>

              {/* Left Pane Scrollable Body */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center bg-slate-200/50 dark:bg-slate-950 no-scrollbar">
                {renderImagePreview()}
              </div>
            </div>

            {/* ── Right Pane: Preview PDF ── */}
            <div className="flex flex-col h-full min-h-0 bg-slate-100/50 dark:bg-slate-900/60 overflow-hidden">
              {/* Right Pane Sub-Header (Tool Box) */}
              <div className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <FileText size={13} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Preview PDF</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                      (A4 Institutional Printout 210mm × 297mm)
                    </span>
                  </div>
                </div>

                {/* Right Pane Zoom Bar Only */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomPdf((z) => Math.max(z - 10, 40))}
                    className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                    title="Zoom Out PDF"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPdf(85)}
                    className="px-1 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Reset PDF Zoom"
                  >
                    {zoomPdf}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPdf((z) => Math.min(z + 10, 150))}
                    className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                    title="Zoom In PDF"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              </div>

              {/* Right Pane Scrollable Body */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center bg-slate-200/50 dark:bg-slate-900/80 no-scrollbar gap-8">
                {renderPdfDocument()}
              </div>
            </div>
          </div>
        ) : mode === 'image' ? (
          /* Single Image Mode Full Screen */
          <div className="flex flex-col h-full min-h-0 bg-slate-100/50 dark:bg-slate-950 overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-sky-600 dark:text-sky-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">High-Resolution Image Preview</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  (860px Portrait Layout • High-DPI Output)
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setZoomImage((z) => Math.max(z - 10, 40))}
                  className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomImage(100)}
                  className="px-2 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Reset Zoom"
                >
                  {zoomImage}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomImage((z) => Math.min(z + 10, 160))}
                  className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>

            {/* Scrollable Viewport */}
            <div className="flex-1 overflow-auto p-6 sm:p-10 flex flex-col items-center bg-slate-200/50 dark:bg-slate-950 no-scrollbar">
              {renderImagePreview()}
            </div>
          </div>
        ) : (
          /* Single PDF Mode Full Screen */
          <div className="flex flex-col h-full min-h-0 bg-slate-100/50 dark:bg-slate-900 overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">A4 PDF Document Print Preview</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  (210mm × 297mm Institutional Paper)
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setZoomPdf((z) => Math.max(z - 10, 40))}
                  className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPdf(100)}
                  className="px-2 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Reset Zoom"
                >
                  {zoomPdf}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPdf((z) => Math.min(z + 10, 160))}
                  className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded flex items-center justify-center cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>

            {/* Scrollable Viewport */}
            <div className="flex-1 overflow-auto p-6 sm:p-10 flex flex-col items-center bg-slate-200/50 dark:bg-slate-900/80 no-scrollbar gap-8">
              {renderPdfDocument()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
