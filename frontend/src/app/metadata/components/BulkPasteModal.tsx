'use client';

import { useState } from 'react';
import {
  ClipboardList,
  Search,
  X,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkPasteModal({ onClose, onSuccess }: Props) {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Parse raw pasted text (from Excel clipboard or CSV)
  const handleParse = () => {
    if (!rawText.trim()) return;

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const rows: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Split by Tab (Excel copy) or Comma (CSV)
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Simple comma split
        cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      }

      const cName = cols[0] || '';
      const hName = cols[1] || '';
      const mobile = cols[2] || '';
      const email = cols[3] || '';
      const cType = cols[4] || 'other';

      // Skip header row if detected
      const isHeader =
        i === 0 &&
        (cName.toLowerCase().includes('company') ||
          cName.toLowerCase().includes('name') ||
          cName.toLowerCase() === 'sl.no' ||
          cName.toLowerCase() === 's.no');

      if (isHeader) continue;

      if (cName) {
        rows.push({
          company_name: cName,
          hr_name: hName,
          primary_mobile: mobile,
          primary_email: email,
          company_type: cType.toLowerCase(),
        });
      }
    }

    setParsedRows(rows);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setLoading(true);
    try {
      const res = await apiFetch<any>(`/metadata/bulk-import`, {
        method: 'POST',
        body: JSON.stringify({ rows: parsedRows }),
      });

      if (res.success && res.data) {
        setImportResult(res.data);
        onSuccess();
      } else {
        alert(res.error?.message || 'Bulk import failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Bulk import error:', err);
      alert(err.message || 'Network error during bulk import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface text-fg rounded-2xl w-full max-w-3xl border border-border shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-2xs">
              <ClipboardList size={18} strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="text-base font-bold text-fg tracking-tight">
                Bulk Paste Excel Contacts
              </h3>
              <p className="text-xs text-fg-subtle">
                Fast paste importer with smart deduplication & number merging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-sunken border border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!importResult ? (
            <>
              {/* Instructions & Constraints Card */}
              <div className="p-3.5 bg-surface-sunken rounded-xl border border-border space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <Lightbulb size={15} className="shrink-0" />
                  <span>Excel Copy & Paste Format:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-surface border border-border/80 text-center">
                    <span className="text-primary font-bold block">Column 1</span>
                    <span className="text-fg font-medium">Company Name *</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-border/80 text-center">
                    <span className="text-primary font-bold block">Column 2</span>
                    <span className="text-fg-muted">HR Name</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-border/80 text-center">
                    <span className="text-primary font-bold block">Column 3</span>
                    <span className="text-fg-muted">Mobile Number(s)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-border/80 text-center">
                    <span className="text-primary font-bold block">Column 4</span>
                    <span className="text-fg-muted">Email ID</span>
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-fg-muted flex items-start gap-1.5 leading-relaxed">
                  <Info size={13} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Deduplication Rules:</strong> If a company with the same mobile number already exists, it is automatically <em>skipped</em>. If the same company has a new mobile number or email, it will be <em>appended to the existing row</em> in comma-separated format.
                  </span>
                </div>
              </div>

              {/* Paste Input Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-fg">
                    Paste Clipboard Content Here:
                  </label>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawText('');
                        setParsedRows([]);
                      }}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear text
                    </button>
                  )}
                </div>

                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setParsedRows([]);
                  }}
                  placeholder="Paste rows directly from Excel (e.g. InCoBAN	Arun Kumar	9876543210	hr@incoban.com)&#10;SURYA’S MiB	Priya S	9876543211	priya@surya.com"
                  className="w-full bg-surface-sunken border border-border rounded-xl p-3 text-xs text-fg font-mono placeholder:text-fg-disabled focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all leading-relaxed shadow-inner"
                />
              </div>

              {/* Parse & Preview Trigger */}
              {parsedRows.length === 0 && rawText.trim() && (
                <button
                  type="button"
                  onClick={handleParse}
                  className="w-full py-2.5 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Search size={14} strokeWidth={2.2} />
                  <span>Parse & Preview ({rawText.trim().split('\n').length} Rows)</span>
                </button>
              )}

              {/* Parsed Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2 border border-border rounded-xl p-3 bg-surface shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Ready to Import: <strong>{parsedRows.length}</strong> Valid Row(s)
                    </span>
                    <button
                      onClick={handleParse}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={11} /> Re-parse
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto border border-border/80 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-surface-sunken text-fg-subtle text-[11px] uppercase font-bold sticky top-0 border-b border-border">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Company Name</th>
                          <th className="py-2 px-3">HR Name</th>
                          <th className="py-2 px-3">Mobile Numbers</th>
                          <th className="py-2 px-3">Email ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-sans">
                        {parsedRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-surface-sunken/40">
                            <td className="py-1.5 px-3 text-center font-mono text-fg-subtle text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-fg">
                              {r.company_name}
                            </td>
                            <td className="py-1.5 px-3 text-fg-muted">
                              {r.hr_name || '—'}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-fg text-[11px]">
                              {r.primary_mobile || '—'}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-fg-muted text-[11px]">
                              {r.primary_email || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── Post-Import Result Summary Breakdown ── */
            <div className="space-y-4 text-xs animate-fadeIn">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                    New Inserted
                  </span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {importResult.inserted_count || 0}
                  </span>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 block">
                    Merged / Appended
                  </span>
                  <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {importResult.merged_count || 0}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block">
                    Duplicates Skipped
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {importResult.skipped_count || 0}
                  </span>
                </div>

                <div className="p-3 bg-surface-sunken border border-border rounded-xl text-center">
                  <span className="text-[11px] font-semibold text-fg-subtle block">
                    Total Processed
                  </span>
                  <span className="text-xl font-bold font-mono text-fg">
                    {importResult.total_processed || 0}
                  </span>
                </div>
              </div>

              {/* Row-by-Row Action Details Table */}
              {Array.isArray(importResult.details) && importResult.details.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-fg text-xs">Processing Log & Details:</h4>
                  <div className="max-h-56 overflow-y-auto border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-surface-sunken text-fg-subtle text-[11px] uppercase font-bold sticky top-0 border-b border-border">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Company Name</th>
                          <th className="py-2 px-3 w-28 text-center">Result Status</th>
                          <th className="py-2 px-3">Action Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {importResult.details.map((item: any, idx: number) => {
                          let badge = (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-fg-subtle border border-border">
                              {item.status}
                            </span>
                          );

                          if (item.status === 'inserted') {
                            badge = (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Inserted
                              </span>
                            );
                          } else if (item.status === 'merged') {
                            badge = (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Appended
                              </span>
                            );
                          } else if (item.status === 'skipped') {
                            badge = (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Skipped
                              </span>
                            );
                          } else if (item.status === 'error') {
                            badge = (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Error
                              </span>
                            );
                          }

                          return (
                            <tr key={idx} className="hover:bg-surface-sunken/40">
                              <td className="py-2 px-3 text-center font-mono text-fg-subtle text-[11px]">
                                {item.row_number || idx + 1}
                              </td>
                              <td className="py-2 px-3 font-semibold text-fg">
                                {item.company_name}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {badge}
                              </td>
                              <td className="py-2 px-3 text-fg-muted text-[11px]">
                                {item.message}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer Bar ── */}
        <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
          {!importResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-surface hover:bg-surface-sunken border border-border text-fg-muted hover:text-fg rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loading || parsedRows.length === 0}
                onClick={handleImport}
                className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Processing Import…</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={14} />
                    <span>Insert & Merge ({parsedRows.length} Rows)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setImportResult(null);
                  setParsedRows([]);
                  setRawText('');
                }}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Done & View Directory
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
