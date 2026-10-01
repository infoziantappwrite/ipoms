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
  PhoneCall,
} from 'lucide-react';
import { COLLEGE_LOGO_MAP, getCollegeLogoUrl } from '@/lib/collegeLogo';
import { ReportDocumentView } from './ReportDocumentView';
import {
  generateReportCanvases,
  prepareReportImageBlob,
  exportReportAsPdf,
  type ImageExportSize,
} from '../lib/reportCanvasRenderer';
import { sectionTitle, columnHeading } from '../lib/reportOverrides';

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
  initialMode = 'image',
}: Props) {
  const [mode, setMode] = useState<PreviewMode>(initialMode);
  const [zoomPdf, setZoomPdf] = useState<number>(100);
  const [zoomImage, setZoomImage] = useState<number>(100);
  const [logoFailed, setLogoFailed] = useState(false);
  const [paperPages, setPaperPages] = useState(1);
  const [imageSize, setImageSize] = useState<ImageExportSize>('auto');
  const [imageSrcs, setImageSrcs] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [readyImageDownload, setReadyImageDownload] = useState<{ url: string; fileName: string } | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Clear any pending "click to download" link whenever the underlying report/size changes
  // or the modal closes, so a stale object URL is never reused.
  useEffect(() => {
    return () => {
      if (readyImageDownload) URL.revokeObjectURL(readyImageDownload.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, imageSize, isOpen]);

  const handleSaveImage = async () => {
    if (readyImageDownload) {
      URL.revokeObjectURL(readyImageDownload.url);
      setReadyImageDownload(null);
    }
    setSavingImage(true);
    try {
      const result = await prepareReportImageBlob(report, { size: imageSize });
      if (!result) {
        alert('Could not generate image file. Please try saving as PDF.');
        return;
      }
      const url = URL.createObjectURL(result.blob);
      setReadyImageDownload({ url, fileName: result.fileName });
    } catch (err) {
      console.error('Save image from preview failed:', err);
      alert('Failed to save image. Please try again.');
    } finally {
      setSavingImage(false);
    }
  };

  const handleSavePdf = async () => {
    setSavingPdf(true);
    try {
      await exportReportAsPdf(report);
    } catch (err) {
      console.error('Save PDF from preview failed:', err);
      onPrint();
    } finally {
      setSavingPdf(false);
    }
  };

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      const activeMode = (initialMode === 'both' ? 'image' : initialMode) || 'image';
      setMode(activeMode);
      setZoomPdf(100);
      setZoomImage(100);
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

  // Generate Image preview from canvas when modal is opened, report changes, or size changes
  useEffect(() => {
    if (!isOpen || !report) return;
    let isMounted = true;
    setImageLoading(true);

    generateReportCanvases(report, { size: imageSize })
      .then((canvases) => {
        if (!isMounted) return;
        const urls: string[] = [];
        for (const canvas of canvases) {
          try {
            urls.push(canvas.toDataURL('image/png'));
          } catch (e) {
            console.error('Failed to convert canvas to data URL:', e);
          }
        }
        setImageSrcs(urls);
      })
      .catch((err) => {
        console.error('Error generating report canvas preview:', err);
      })
      .finally(() => {
        if (isMounted) setImageLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, report, imageSize]);

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
          report.kpi_summary?.tier_focus?.includes('JD Received') ||
          report.kpi_summary?.tier_focus?.includes('Hot Leads (JD Received)') ||
          report.report_title?.includes('JD Received') ||
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
                  minHeight: imageSize === 'compact' ? '480px' : imageSize === 'square' ? '794px' : '1123px',
                  height: imageSize === 'square' ? '794px' : undefined,
                  overflow: imageSize === 'square' ? 'hidden' : undefined,
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

                      {/* Section Title with Single Total Leads Count */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[13px] font-bold text-[#0a2540] tracking-tight flex items-center gap-1.5 uppercase">
                            <TrendingUp size={14} className="text-[#007791] shrink-0" />
                            {sectionTitle(report, 'active_leads', (() => {
                              const tier = report.kpi_summary?.tier_focus || '';
                              const batchSuffix =
                                report.kpi_summary?.graduating_year &&
                                report.kpi_summary.graduating_year !== 'All Batches'
                                  ? ` — ${report.kpi_summary.graduating_year}`
                                  : '';
                              if (
                                (tier.includes('JD Received') && !tier.includes('Pipeline')) ||
                                report.report_title?.includes('JD Received')
                              ) {
                                return `JD RECEIVED COMPANIES${batchSuffix}`;
                              }
                              if (
                                (tier.includes('Pipeline') && !tier.includes('JD Received')) ||
                                report.report_title?.includes('Companies in Pipeline')
                              ) {
                                return `COMPANIES IN PIPELINE${batchSuffix}`;
                              }
                              return `ACTIVE CORPORATE LEADS & PIPELINE${batchSuffix}`;
                            })())}
                          </h3>
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                            Total Leads: {allActiveLeads.length || report.kpi_summary?.total_leads || 0}
                          </span>
                        </div>
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
                            {sectionTitle(report, 'active_leads', (() => {
                              const tier = report.kpi_summary?.tier_focus || '';
                              const batchSuffix =
                                report.kpi_summary?.graduating_year &&
                                report.kpi_summary.graduating_year !== 'All Batches'
                                  ? ` — ${report.kpi_summary.graduating_year}`
                                  : '';
                              if (
                                tier.includes('JD Received') ||
                                tier.includes('Hot Leads') ||
                                report.report_title?.includes('JD Received') ||
                                report.report_title?.includes('Hot Leads')
                              ) {
                                return `JD RECEIVED${batchSuffix}`;
                              }
                              if (
                                tier.includes('Positive') ||
                                report.report_title?.includes('Positive')
                              ) {
                                return `POSITIVES RECEIVED${batchSuffix}`;
                              }
                              if (
                                tier.includes('Weekly Tracker') ||
                                report.report_title?.includes('Weekly Tracker')
                              ) {
                                return `WEEKLY TRACKER PIPELINE${batchSuffix}`;
                              }
                              return `ACTIVE CORPORATE LEADS${batchSuffix}`;
                            })())}
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
                        <tr style={{ background: 'linear-gradient(180deg, #009EE3 0%, #006BB6 50%, #063A78 100%)' }} className="text-white font-bold text-[10.5px]">
                          <th
                            className="py-2 px-1 text-center font-bold"
                            style={{ width: activeLeadsColWidths.num }}
                          >
                            {columnHeading(report, 'active_leads', 0, 'S.No')}
                          </th>
                          <th className="py-2 px-2 text-center font-bold">{columnHeading(report, 'active_leads', 1, 'Company Name')}</th>
                          {showCollegesCol && (
                            <th className="py-2 px-2 text-center font-bold">{columnHeading(report, 'active_leads', 2, 'Colleges')}</th>
                          )}
                          {showRoleCol && <th className="py-2 px-2 text-center font-bold">{columnHeading(report, 'active_leads', 3, 'Role')}</th>}
                          {showCtcCol && <th className="py-2 px-2 text-center font-bold">{columnHeading(report, 'active_leads', 4, 'CTC')}</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {pageRows.map((r: any, rIdx: number) => (
                          <tr key={rIdx} className="bg-white">
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
                              <td className="py-2 px-2 text-center text-emerald-700 dark:text-emerald-400 font-bold whitespace-normal break-words leading-tight">
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

    // Standard Single/Multi-Section Paper Container for Other Report Types (Consumes single shared ReportDocumentView)
    return (
      <div
        ref={paperRef}
        style={{
          transform: `scale(${zoomPdf / 100})`,
          transformOrigin: 'top center',
          width: '794px',
          minHeight: imageSize === 'compact' ? '480px' : imageSize === 'square' ? '794px' : `${Math.max(1, paperPages) * 1123}px`,
          height: imageSize === 'square' ? '794px' : undefined,
          overflow: imageSize === 'square' ? 'hidden' : undefined,
        }}
        className="transition-transform duration-150 relative shrink-0"
      >
        <ReportDocumentView report={report} editable={false} className="bg-white text-slate-900 rounded-none sm:rounded-sm shadow-xl shadow-slate-900/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-slate-800" />
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

    if (!imageSrcs.length) {
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
          className="transition-transform duration-150 flex flex-col items-center gap-6"
        >
          {imageSrcs.map((src, i) => (
            <div key={i} className="w-full flex flex-col items-center">
              {imageSrcs.length > 1 && (
                <p className="text-[11px] font-bold text-slate-500 mb-1.5 text-center tracking-wide uppercase">
                  Page {i + 1} of {imageSrcs.length}
                </p>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Report Preview Page ${i + 1}`}
                className="w-full h-auto bg-white rounded-sm shadow-xl shadow-slate-900/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-slate-700/80 block"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={modalContainerRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none outline-none print:hidden"
    >
      {/* ── Top Master Header & Mode Switcher Bar ──────────────────────────── */}
      <header className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-sm dark:shadow-xl z-20 shrink-0 gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          <div className="w-[30px] h-[30px] rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            {mode === 'both' ? (
              <Columns2 size={15} />
            ) : mode === 'image' ? (
              <ImageIcon size={15} />
            ) : (
              <FileText size={15} />
            )}
          </div>
          <div className="hidden sm:block">
            <h2 className="text-sm sm:text-[14px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Report previewer
            </h2>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
              {collegeName && collegeName !== 'Consolidated Partner Institutions'
                ? collegeName
                : report.report_title || 'Institutional Report'}
            </p>
          </div>
        </div>

        {/* Center: Segmented Preview Mode Switcher (Image / PDF) — Perfectly Center Aligned */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-slate-100 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-inner z-20">
          {/* Smooth Sliding Pill Indicator */}
          <div
            className="absolute top-1 bottom-1 left-1 rounded-lg shadow-md shadow-blue-900/25 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] pointer-events-none z-0"
            style={{
              width: 'calc(50% - 4px)',
              background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)',
              transform: mode === 'pdf' ? 'translateX(calc(100% + 4px))' : 'translateX(0%)',
            }}
          />

          {/* 1. Image */}
          <button
            type="button"
            onClick={() => {
              setMode('image');
              setZoomImage(100);
            }}
            className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer min-w-[76px] ${
              mode === 'image'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Show Image Preview"
          >
            <ImageIcon size={13} strokeWidth={2.2} />
            <span>Image</span>
          </button>

          {/* 2. PDF */}
          <button
            type="button"
            onClick={() => {
              setMode('pdf');
              setZoomPdf(100);
            }}
            className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer min-w-[76px] ${
              mode === 'pdf'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Show PDF Preview"
          >
            <FileText size={13} strokeWidth={2.2} />
            <span>PDF</span>
          </button>
        </div>

        {/* Right: Export Actions & Close (X) */}
        <div className="flex items-center gap-2 shrink-0 z-10">
          {/* Save Image Button — becomes a real, user-clicked download link once the file is ready.
              Chrome silently drops downloads triggered by a script-dispatched click after several
              have fired without a fresh user gesture in between; a genuine click on a real <a> is
              never subject to that. */}
          {readyImageDownload ? (
            <a
              href={readyImageDownload.url}
              download={readyImageDownload.fileName}
              onClick={() => {
                setTimeout(() => {
                  URL.revokeObjectURL(readyImageDownload.url);
                  setReadyImageDownload(null);
                }, 2000);
              }}
              style={{ background: 'linear-gradient(180deg, #16A34A 0%, #15803D 50%, #166534 100%)' }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md shadow-green-900/25 transition-all cursor-pointer active:scale-[0.95] animate-pulse"
              title="Click to download the generated image"
            >
              <Download size={14} strokeWidth={2} aria-hidden /> Click to Save
            </a>
          ) : (
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={savingImage}
              style={{ background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 hover:brightness-110 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/25 transition-all cursor-pointer active:scale-[0.95]"
              title="Save PNG Image with selected size settings"
            >
              <Download size={14} strokeWidth={2} aria-hidden /> {savingImage ? 'Saving…' : 'Save Image'}
            </button>
          )}

          {/* Save PDF Button */}
          <button
            type="button"
            onClick={handleSavePdf}
            disabled={savingPdf}
            style={{ background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 hover:brightness-110 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/25 transition-all cursor-pointer active:scale-[0.95]"
            title="Save High-Definition Vector PDF"
          >
            <Download size={14} strokeWidth={2} aria-hidden /> {savingPdf ? 'Saving…' : 'Save PDF'}
          </button>

          {/* Close (X) Button */}
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)' }}
            className="w-[30px] h-[30px] rounded-lg text-white hover:brightness-110 shadow-md shadow-red-600/25 border border-red-500/30 flex items-center justify-center transition-all cursor-pointer ml-1 active:scale-[0.95]"
            title="Close Preview (ESC)"
            aria-label="Close Preview"
          >
            <X size={16} strokeWidth={2.5} />
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
              {/* Left Pane Scrollable Body */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center bg-slate-200/50 dark:bg-slate-950 no-scrollbar">
                {/* Compact Zoom & Size Controls directly above Image */}
                <div className="flex items-center justify-center gap-2 mb-3 shrink-0 flex-wrap">
                  <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full px-2.5 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setZoomImage((z) => Math.max(z - 10, 40))}
                      className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      title="Zoom Out Image (-)"
                    >
                      <ZoomOut size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomImage(85)}
                      className="px-1.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="Reset Image Zoom (85%)"
                    >
                      {zoomImage}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomImage((z) => Math.min(z + 10, 150))}
                      className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      title="Zoom In Image (+)"
                    >
                      <ZoomIn size={12} />
                    </button>
                  </div>

                  {/* Size Switcher Pills */}
                  <div className="flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 shadow-sm text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setImageSize('auto')}
                      style={imageSize === 'auto' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'auto'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Smart auto-fit: Compact card for single company, A4 for multi-company"
                    >
                      ⚡ Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSize('compact')}
                      style={imageSize === 'compact' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'compact'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="WhatsApp / Mobile Card format"
                    >
                      📱 WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSize('a4')}
                      style={imageSize === 'a4' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'a4'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Standard full A4 document sheet"
                    >
                      📄 A4
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSize('square')}
                      style={imageSize === 'square' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'square'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Square 1:1 format"
                    >
                      🔲 1:1
                    </button>
                  </div>
                </div>
                {renderImagePreview()}
              </div>
            </div>

            {/* ── Right Pane: Preview PDF ── */}
            <div className="flex flex-col h-full min-h-0 bg-slate-100/50 dark:bg-slate-900/60 overflow-hidden">
              {/* Right Pane Scrollable Body */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center bg-slate-200/50 dark:bg-slate-900/80 no-scrollbar gap-8">
                {/* Compact Zoom & Size Controls directly above PDF */}
                <div className="flex items-center justify-center gap-2 mb-3 shrink-0 flex-wrap print:hidden">
                  <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full px-2.5 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setZoomPdf((z) => Math.max(z - 10, 40))}
                      className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      title="Zoom Out PDF (-)"
                    >
                      <ZoomOut size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomPdf(85)}
                      className="px-1.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="Reset PDF Zoom (85%)"
                    >
                      {zoomPdf}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomPdf((z) => Math.min(z + 10, 150))}
                      className="w-5 h-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      title="Zoom In PDF (+)"
                    >
                      <ZoomIn size={12} />
                    </button>
                  </div>

                  {/* Size Switcher Pills */}
                  <div className="flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 shadow-sm text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setImageSize('auto')}
                      style={imageSize === 'auto' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'auto'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Smart auto-fit"
                    >
                      ⚡ Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSize('compact')}
                      style={imageSize === 'compact' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'compact'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="WhatsApp Card format"
                    >
                      📱 WhatsApp Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSize('a4')}
                      style={imageSize === 'a4' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'a4'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Standard full A4 document sheet"
                    >
                      📄 A4 Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSize('square')}
                      style={imageSize === 'square' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        imageSize === 'square'
                          ? 'text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Square 1:1 format"
                    >
                      🔲 Square (1:1)
                    </button>
                  </div>
                </div>
                {renderPdfDocument()}
              </div>
            </div>
          </div>
        ) : mode === 'image' ? (
          /* Single Image Mode Full Screen */
          <div className="flex flex-col h-full min-h-0 bg-slate-100/50 dark:bg-slate-950 overflow-hidden">
            {/* Scrollable Viewport */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center bg-slate-200/50 dark:bg-slate-950 no-scrollbar">
              {/* Compact Zoom & Size Controls directly above Image */}
              <div className="flex items-center justify-center gap-2.5 mb-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setZoomImage((z) => Math.max(z - 10, 40))}
                    className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomImage(100)}
                    className="px-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Reset Zoom (100%)"
                  >
                    {zoomImage}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomImage((z) => Math.min(z + 10, 160))}
                    className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>

                {/* Size Switcher Pills */}
                <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-sm text-xs">
                  <button
                    type="button"
                    onClick={() => setImageSize('auto')}
                    style={imageSize === 'auto' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'auto'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Smart auto-fit: Compact card for single company, A4 for multi-company"
                  >
                    ⚡ Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSize('compact')}
                    style={imageSize === 'compact' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'compact'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Compact Mobile / WhatsApp Card format"
                  >
                    📱 WhatsApp Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSize('a4')}
                    style={imageSize === 'a4' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'a4'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Standard full A4 document sheet"
                  >
                    📄 A4 Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSize('square')}
                    style={imageSize === 'square' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'square'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Square 1:1 format"
                  >
                    🔲 Square (1:1)
                  </button>
                </div>
              </div>

              {renderImagePreview()}
            </div>
          </div>
        ) : (
          /* Single PDF Mode Full Screen */
          <div className="flex flex-col h-full min-h-0 bg-slate-100/50 dark:bg-slate-900 overflow-hidden">
            {/* Scrollable Viewport */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center bg-slate-200/50 dark:bg-slate-900/80 no-scrollbar">
              {/* Compact Zoom & Size Controls directly above PDF Document */}
              <div className="flex items-center justify-center gap-2.5 mb-3 shrink-0 flex-wrap print:hidden">
                <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setZoomPdf((z) => Math.max(z - 10, 40))}
                    className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPdf(100)}
                    className="px-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Reset Zoom (100%)"
                  >
                    {zoomPdf}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPdf((z) => Math.min(z + 10, 160))}
                    className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>

                {/* Size Switcher Pills */}
                <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-sm text-xs">
                  <button
                    type="button"
                    onClick={() => setImageSize('auto')}
                    style={imageSize === 'auto' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'auto'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Smart auto-fit"
                  >
                    ⚡ Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSize('compact')}
                    style={imageSize === 'compact' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'compact'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="WhatsApp Card format"
                  >
                    📱 WhatsApp Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSize('a4')}
                    style={imageSize === 'a4' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'a4'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Standard full A4 document sheet"
                  >
                    📄 A4 Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSize('square')}
                    style={imageSize === 'square' ? { background: 'linear-gradient(180deg, #22449E 0%, #1D3D8F 50%, #172E6C 100%)' } : undefined}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      imageSize === 'square'
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Square 1:1 format"
                  >
                    🔲 Square (1:1)
                  </button>
                </div>
              </div>

              {renderPdfDocument()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
