'use client';

import { useState } from 'react';
import { FileSpreadsheet, PenLine, Printer } from 'lucide-react';

interface Props {
  reportData: any;
  onBackToBuilder: () => void;
}

export function NativeReportEditor({ reportData, onBackToBuilder }: Props) {
  const [report, setReport] = useState(reportData);
  const [theme, setTheme] = useState(reportData?.theme || 'blue');
  const [checklist, setChecklist] = useState({
    logoVerified: true,
    brandingHeader: true,
    titlePeriod: true,
    figuresVerified: true,
    remarksConfirmed: true,
  });

  if (!report) {
    return (
      <div className="p-12 text-center text-fg-subtle">
        <p className="text-sm">No report loaded in editor.</p>
        <button
          onClick={onBackToBuilder}
          className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-xs"
        >
          Open Builder Wizard →
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

  // Export to CSV / Excel
  const handleExportCsv = () => {
    const allRows: any[] = [];
    if (report.sections.completed_companies) {
      report.sections.completed_companies.forEach((r: any) => {
        allRows.push({
          Section: 'Companies Completed',
          'S.No': r.s_no,
          'Company Name': r.company_name,
          Role: r.job_role,
          Type: r.company_type,
          CTC: r.ctc_lpa,
          Offers: r.selected_count,
          Status: r.current_status_text,
        });
      });
    }
    if (report.sections.in_progress) {
      report.sections.in_progress.forEach((r: any) => {
        allRows.push({
          Section: 'Companies In Progress',
          'S.No': r.s_no,
          'Company Name': r.company_name,
          Role: r.job_role,
          Type: r.company_type,
          CTC: r.ctc_lpa,
          Offers: '—',
          Status: r.current_status_text,
        });
      });
    }
    if (report.sections.pipeline) {
      report.sections.pipeline.forEach((r: any) => {
        allRows.push({
          Section: 'Companies in Pipeline',
          'S.No': r.s_no,
          'Company Name': r.company_name,
          Role: r.job_role,
          Type: r.company_type,
          CTC: r.ctc_lpa,
          Offers: '—',
          Status: r.current_status_text,
        });
      });
    }

    if (allRows.length === 0) {
      alert('No tabular data to export.');
      return;
    }

    const headers = Object.keys(allRows[0]);
    const csvContent = [
      headers.join(','),
      ...allRows.map((row) =>
        headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.report_title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print to PDF
  const handlePrintPdf = () => {
    window.print();
  };

  const themeColors = {
    blue: {
      accent: 'border-primary text-primary bg-primary/30',
      headerBg: 'bg-primary/40 text-primary',
      badge: 'bg-primary/20 text-primary border-primary/30',
    },
    green: {
      accent: 'border-success text-success bg-success/30',
      headerBg: 'bg-success/40 text-success',
      badge: 'bg-success/20 text-success border-success/30',
    },
    purple: {
      accent: 'border-purple-600 text-purple-400 bg-purple-950/30',
      headerBg: 'bg-purple-900/40 text-purple-300',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    college_branded: {
      accent: 'border-indigo-600 text-indigo-400 bg-indigo-950/30',
      headerBg: 'bg-indigo-900/40 text-indigo-300',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
  }[theme as 'blue' | 'green' | 'purple' | 'college_branded'] || {
    accent: 'border-primary text-primary bg-primary/30',
    headerBg: 'bg-primary/40 text-primary',
    badge: 'bg-primary/20 text-primary border-primary/30',
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Editor Action Toolbar (Sticky Top) */}
      <div className="glass-panel sticky top-4 z-30 p-4 rounded-2xl border border-border-strong shadow-2xl flex items-center justify-between flex-wrap gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToBuilder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-raised text-fg-muted rounded-lg text-xs font-semibold transition-colors"
          >
            ← Builder Settings
          </button>
          <span className="text-xs text-fg-subtle font-medium hidden sm:inline">
            Interactive Presentation Canvas (Click cells to edit)
          </span>
        </div>

        {/* Theme Switcher & Exporters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Color theme switcher */}
          <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-lg">
            {(['blue', 'green', 'purple', 'college_branded'] as const).map((th) => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`px-2 py-1 rounded text-micro font-semibold capitalize transition-colors ${
                  theme === th ? 'bg-surface text-white shadow' : 'text-fg-subtle hover:text-fg-muted'
                }`}
              >
                {th === 'college_branded' ? 'College' : th}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-3 py-1.5 bg-success hover:bg-success text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Excel / CSV
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1 px-4 py-1.5 bg-primary hover:bg-primary text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <Printer size={14} strokeWidth={2} aria-hidden /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Pre-Export Quality Checklist (Spec Section 14) */}
      <div className="bg-background/60 border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-fg flex items-center gap-1.5">
            <span>✅</span> Pre-Export Report Quality Verification Checklist
          </span>
          <span className="text-micro text-success font-semibold">Ready for Sharing</span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-fg-subtle pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.brandingHeader}
              onChange={(e) => setChecklist({ ...checklist, brandingHeader: e.target.checked })}
              className="rounded bg-surface border-border-strong text-primary"
            />
            <span>Infoziant Header Branding</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.logoVerified}
              onChange={(e) => setChecklist({ ...checklist, logoVerified: e.target.checked })}
              className="rounded bg-surface border-border-strong text-primary"
            />
            <span>Institutional Profile Verified</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.titlePeriod}
              onChange={(e) => setChecklist({ ...checklist, titlePeriod: e.target.checked })}
              className="rounded bg-surface border-border-strong text-primary"
            />
            <span>Period & Generated By Stamped</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.figuresVerified}
              onChange={(e) => setChecklist({ ...checklist, figuresVerified: e.target.checked })}
              className="rounded bg-surface border-border-strong text-primary"
            />
            <span>Placement Figures Checked</span>
          </label>
        </div>
      </div>

      {/* ── Document Canvas (Printable Page) ────────────────────────────────── */}
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-8 space-y-6 text-fg print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">

        {/* 1. Header Branding Strip */}
        <div className="flex items-center justify-between border-b-2 border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary print:text-primary tracking-wider">
                INFOZIANT
              </span>
              <span className="text-xs text-fg-subtle font-mono">| iPOMS Operations</span>
            </div>
            <p className="text-micro text-fg-subtle mt-0.5">
              Placement Operations Management System • SOC 2 & ISO 27001 Certified
            </p>
          </div>

          <div className="text-right">
            <h3 className="text-xs font-bold text-fg print:text-black uppercase tracking-wider">
              {report.branding.college_name}
            </h3>
            <span className="text-micro text-fg-subtle font-mono">
              Code: [{report.branding.college_code}]
            </span>
          </div>
        </div>

        {/* 2. Report Title & Period Metadata */}
        <div className="space-y-2">
          <input
            type="text"
            value={report.report_title}
            onChange={(e) => setReport({ ...report, report_title: e.target.value })}
            className="text-lg font-bold text-white print:text-black bg-transparent w-full border-b border-transparent hover:border-border-strong pb-1"
          />
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-fg-subtle print:text-fg-muted">
            <span>Period: <strong className="text-fg print:text-black">{report.report_period}</strong></span>
            <span>Generated Date: <strong className="text-fg print:text-black">{report.generated_date}</strong></span>
            <span>Prepared By: <strong className="text-fg print:text-black">{report.generated_by}</strong></span>
          </div>
        </div>

        {/* 3. Live KPI Summary Strip */}
        {report.included_sections.kpi_summary && report.kpi_summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
            <div className="bg-surface/80 print:bg-surface-sunken p-2.5 rounded-xl border border-border-strong text-center">
              <span className="text-micro text-fg-subtle uppercase block">Calls Made</span>
              <span className="text-base font-bold text-primary tabular-nums">{report.kpi_summary.total_calls}</span>
            </div>
            <div className="bg-surface/80 print:bg-surface-sunken p-2.5 rounded-xl border border-border-strong text-center">
              <span className="text-micro text-fg-subtle uppercase block">Positives</span>
              <span className="text-base font-bold text-success tabular-nums">{report.kpi_summary.positive_responses}</span>
            </div>
            <div className="bg-surface/80 print:bg-surface-sunken p-2.5 rounded-xl border border-border-strong text-center">
              <span className="text-micro text-fg-subtle uppercase block">JDs Received</span>
              <span className="text-base font-bold text-cyan-400 tabular-nums">{report.kpi_summary.jds_received}</span>
            </div>
            <div className="bg-surface/80 print:bg-surface-sunken p-2.5 rounded-xl border border-border-strong text-center">
              <span className="text-micro text-fg-subtle uppercase block">Completed</span>
              <span className="text-base font-bold text-warning tabular-nums">{report.kpi_summary.drives_completed}</span>
            </div>
            <div className="bg-surface/80 print:bg-surface-sunken p-2.5 rounded-xl border border-border-strong text-center">
              <span className="text-micro text-fg-subtle uppercase block">In Progress</span>
              <span className="text-base font-bold text-purple-400 tabular-nums">{report.kpi_summary.drives_in_progress}</span>
            </div>
            <div className="bg-surface/80 print:bg-surface-sunken p-2.5 rounded-xl border border-border-strong text-center">
              <span className="text-micro text-fg-subtle uppercase block">Pipeline</span>
              <span className="text-base font-bold text-fg-muted tabular-nums">{report.kpi_summary.pipeline_leads}</span>
            </div>
            <div className="bg-surface/80 print:bg-surface-sunken p-2.5 rounded-xl border border-border-strong text-center">
              <span className="text-micro text-fg-subtle uppercase block">Offers Placed</span>
              <span className="text-base font-bold text-success tabular-nums">{report.kpi_summary.total_offers}</span>
            </div>
          </div>
        )}

        {/* 4. Section 1: Companies Completed */}
        {report.included_sections.completed_companies && report.sections.completed_companies && (
          <div className="space-y-2 pt-2">
            <div className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center justify-between ${themeColors.accent}`}>
              <span>🏆 1. COMPANIES COMPLETED</span>
              <span>{report.sections.completed_companies.length} Drives</span>
            </div>

            {report.sections.completed_companies.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No completed drives in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-surface/90 text-fg-subtle font-semibold border-b border-border-strong text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Role(s)</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">CTC</th>
                      <th className="py-2 px-3 text-center">Offers</th>
                      <th className="py-2 px-3">Status Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-normal">
                    {report.sections.completed_companies.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface/30">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-surface rounded px-1"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-muted">
                          <input
                            type="text"
                            value={r.job_role}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'job_role', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-surface rounded px-1"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-subtle">{r.company_type}</td>
                        <td className="py-2 px-3 text-success font-medium">{r.ctc_lpa}</td>
                        <td className="py-2 px-3 text-center font-bold text-success">
                          <input
                            type="number"
                            value={r.selected_count}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'selected_count', Number(e.target.value))
                            }
                            className="bg-transparent w-14 text-center focus:bg-surface rounded px-1 font-bold text-success"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-subtle">
                          <input
                            type="text"
                            value={r.current_status_text}
                            onChange={(e) =>
                              handleUpdateCell('completed_companies', idx, 'current_status_text', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-surface rounded px-1"
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
        {report.included_sections.in_progress && report.sections.in_progress && (
          <div className="space-y-2 pt-2">
            <div className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center justify-between ${themeColors.accent}`}>
              <span>🚀 2. COMPANIES IN PROGRESS</span>
              <span>{report.sections.in_progress.length} Drives</span>
            </div>

            {report.sections.in_progress.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No active drives currently in progress.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-surface/90 text-fg-subtle font-semibold border-b border-border-strong text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Role(s)</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">CTC</th>
                      <th className="py-2 px-3">Status Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-normal">
                    {report.sections.in_progress.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface/30">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg">
                          <input
                            type="text"
                            value={r.company_name}
                            onChange={(e) =>
                              handleUpdateCell('in_progress', idx, 'company_name', e.target.value)
                            }
                            className="bg-transparent w-full focus:bg-surface rounded px-1"
                          />
                        </td>
                        <td className="py-2 px-3 text-fg-muted">{r.job_role}</td>
                        <td className="py-2 px-3 text-fg-subtle">{r.company_type}</td>
                        <td className="py-2 px-3 text-success">{r.ctc_lpa}</td>
                        <td className="py-2 px-3 text-fg-subtle">{r.current_status_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. Section 3: Companies in Pipeline */}
        {report.included_sections.pipeline && report.sections.pipeline && (
          <div className="space-y-2 pt-2">
            <div className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center justify-between ${themeColors.accent}`}>
              <span>📥 3. COMPANIES IN PIPELINE</span>
              <span>{report.sections.pipeline.length} Leads</span>
            </div>

            {report.sections.pipeline.length === 0 ? (
              <p className="text-xs text-fg-subtle italic py-2">No pipeline leads recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-surface/90 text-fg-subtle font-semibold border-b border-border-strong text-micro">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Role(s)</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-normal">
                    {report.sections.pipeline.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface/30">
                        <td className="py-2 px-2 text-center text-fg-subtle">{r.s_no}</td>
                        <td className="py-2 px-3 font-semibold text-fg">{r.company_name}</td>
                        <td className="py-2 px-3 text-fg-muted">{r.job_role}</td>
                        <td className="py-2 px-3 text-fg-subtle">{r.company_type}</td>
                        <td className="py-2 px-3 text-fg-subtle">{r.current_status_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. Key Operational Observations & Remarks */}
        {report.included_sections.remarks && (
          <div className="space-y-2 pt-2">
            <div className="font-bold text-xs text-fg-muted flex items-center gap-1.5">
              <PenLine size={14} strokeWidth={2} aria-hidden /> Coordinator Remarks & Observations
            </div>
            <textarea
              rows={3}
              value={report.remarks}
              onChange={(e) => setReport({ ...report, remarks: e.target.value })}
              className="w-full bg-surface/60 border border-border-strong rounded-xl p-3 text-xs text-fg "
            />
          </div>
        )}

        {/* 8. Confidential Footer */}
        <div className="border-t border-border pt-4 text-center text-micro text-fg-subtle">
          <p>{report.branding.confidential_notice}</p>
          <p className="mt-0.5">© 2026 Infoziant IT Solutions Inc. All rights reserved.</p>
        </div>

      </div>

    </div>
  );
}
