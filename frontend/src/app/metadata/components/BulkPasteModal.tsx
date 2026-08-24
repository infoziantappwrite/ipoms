'use client';

import { useState } from 'react';
import { ClipboardList, Search, X } from 'lucide-react';
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

  const handleParse = () => {
    if (!rawText.trim()) return;

    const lines = rawText.trim().split('\n');
    const rows = lines.map((line) => {
      // Split by tab (Excel copy) or comma
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      return {
        company_name: (cols[0] || '').trim(),
        hr_name: (cols[1] || '').trim(),
        primary_mobile: (cols[2] || '').trim(),
        primary_email: (cols[3] || '').trim(),
        company_type: (cols[4] || 'software').trim().toLowerCase(),
      };
    });

    setParsedRows(rows.filter((r) => r.company_name));
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
        alert(res.error?.message || 'Import failed');
      }
    } catch (err) {
      console.error('Bulk import error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface text-fg rounded-2xl w-full max-w-2xl border border-border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <h3 className="text-sm font-bold text-fg flex items-center gap-2">
            <ClipboardList size={16} strokeWidth={2} className="text-primary" aria-hidden />
            Bulk Paste Excel Contacts (Fast Importer)
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg hover:bg-surface-sunken text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-surface-sunken rounded-xl border border-border text-xs text-fg-muted space-y-1">
          <p className="font-semibold text-primary">💡 Excel Copy-Paste Instructions:</p>
          <p className="text-[11px]">
            Copy rows directly from your Excel sheet and paste below. Expected columns:
            <code className="text-fg bg-surface px-1.5 py-0.5 rounded font-mono ml-1 border border-border text-micro">
              Company Name | HR Name | Mobile Number | Email ID
            </code>
          </p>
        </div>

        {!importResult ? (
          <>
            {/* Raw Text Input */}
            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">
                Paste Excel Rows Here:
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setParsedRows([]);
                }}
                placeholder="Google	Sundar Pichai	9876543210	hr@google.com
Amazon	Andy Jassy	9876543211	hr@amazon.com"
                className="w-full bg-surface-sunken border border-border rounded-lg p-3 text-xs text-fg font-mono placeholder:text-fg-subtle/60 focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {parsedRows.length === 0 && rawText.trim() && (
              <button
                type="button"
                onClick={handleParse}
                className="px-4 py-2 bg-surface hover:bg-surface-sunken text-primary border border-primary/20 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Search size={14} strokeWidth={2} className="inline mr-1.5 shrink-0" aria-hidden />
                Parse & Preview Rows ({rawText.trim().split('\n').length})
              </button>
            )}

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">
                    Preview: {parsedRows.length} Valid Row(s)
                  </span>
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setRawText('');
                    }}
                    className="text-micro text-fg-subtle hover:text-fg cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-micro text-left">
                    <thead className="bg-surface-sunken text-fg-subtle border-b border-border">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Company</th>
                        <th className="py-2 px-3">HR Name</th>
                        <th className="py-2 px-3">Mobile</th>
                        <th className="py-2 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-fg-muted font-mono">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-surface-sunken/40">
                          <td className="py-1.5 px-3 text-fg-subtle">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-sans font-semibold text-fg">{r.company_name}</td>
                          <td className="py-1.5 px-3 font-sans">{r.hr_name || '—'}</td>
                          <td className="py-1.5 px-3">{r.primary_mobile || '—'}</td>
                          <td className="py-1.5 px-3">{r.primary_email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-surface hover:bg-surface-sunken text-fg-muted hover:text-fg rounded-lg text-xs font-medium border border-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || parsedRows.length === 0}
                onClick={handleImport}
                className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {loading ? 'Importing…' : `Import ${parsedRows.length} Contacts`}
              </button>
            </div>
          </>
        ) : (
          /* Success Report */
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 space-y-1">
              <p className="font-bold text-sm">✅ Bulk Import Finished</p>
              <p>Total rows processed: {importResult.total_processed}</p>
              <p>Successfully inserted: {importResult.inserted_count}</p>
              <p>Updated existing: {importResult.updated_count}</p>
              <p>Duplicates / Skipped: {importResult.skipped_count}</p>
            </div>

            {importResult.skipped_companies?.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold text-fg-muted">Skipped Companies (Already Existed):</p>
                <div className="max-h-32 overflow-y-auto p-2 bg-surface-sunken border border-border rounded-lg text-micro font-mono text-fg-subtle">
                  {importResult.skipped_companies.map((name: string, i: number) => (
                    <div key={i}>• {name}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setImportResult(null);
                }}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
