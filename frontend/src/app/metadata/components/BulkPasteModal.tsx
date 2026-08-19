'use client';

import { useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
      const res = await fetch(`${API}/metadata/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows }),
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.data);
        onSuccess();
      } else {
        alert(data.error?.message || 'Import failed');
      }
    } catch (err) {
      console.error('Bulk import error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-2xl border border-border-strong shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList size={14} strokeWidth={2} aria-hidden /> Bulk Paste Excel Contacts (Fast Importer)
          </h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-white text-base">
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-background/60 rounded-xl border border-border text-micro text-fg-muted space-y-1">
          <p className="font-semibold text-primary">💡 Excel Copy-Paste Instructions:</p>
          <p>
            Copy rows directly from your Excel sheet and paste below. Expected columns:
            <code className="text-fg bg-surface px-1 py-0.5 rounded font-mono ml-1">
              Company Name | HR Name | Mobile Number | Email ID | Industry
            </code>
          </p>
        </div>

        {!importResult ? (
          <>
            {/* Raw Text Input */}
            <div>
              <label className="block text-fg-muted font-semibold mb-1 text-xs">
                Paste Excel Rows Here:
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setParsedRows([]);
                }}
                placeholder="Google	Sundar Pichai	9876543210	hr@google.com	software
Amazon	Andy Jassy	9876543211	hr@amazon.com	software"
                className="w-full bg-background border border-border-strong rounded-xl p-3 text-xs text-fg font-mono "
              />
            </div>

            {parsedRows.length === 0 && rawText.trim() && (
              <button
                type="button"
                onClick={handleParse}
                className="px-4 py-2 bg-surface hover:bg-surface-raised text-primary border border-primary/30 rounded-xl text-xs font-semibold"
              >
                <Search size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Parse & Preview Rows ({rawText.trim().split('\n').length})
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
                    className="text-micro text-fg-subtle hover:text-white"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-micro text-left">
                    <thead className="bg-background text-fg-subtle border-b border-border">
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
                        <tr key={idx} className="hover:bg-surface/30">
                          <td className="py-1.5 px-3 text-fg-subtle">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-sans font-semibold text-white">{r.company_name}</td>
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
                className="px-4 py-2 bg-surface hover:bg-surface-raised text-fg-muted rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0 || loading}
                onClick={handleImport}
                className="px-5 py-2 bg-primary hover:bg-primary disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                {loading ? 'Importing…' : `Import ${parsedRows.length} Contacts 🚀`}
              </button>
            </div>
          </>
        ) : (
          /* Import Results Screen */
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-success/20 border border-success/40 rounded-xl space-y-1">
              <h4 className="font-bold text-success text-sm flex items-center gap-1.5">
                <span>🎉</span> Bulk Import Finished!
              </h4>
              <p className="text-fg-muted">
                Successfully imported <strong className="text-success">{importResult.imported_count}</strong> new corporate contacts.
              </p>
              {importResult.skipped_count > 0 && (
                <p className="text-warning">
                  Skipped {importResult.skipped_count} row(s) due to missing company names or exact duplicates.
                </p>
              )}
            </div>

            {importResult.errors?.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-fg-muted">Skipped Rows Details:</span>
                <div className="max-h-36 overflow-y-auto bg-background p-3 rounded-xl border border-border font-mono text-micro text-fg-subtle space-y-1">
                  {importResult.errors.map((e: any, i: number) => (
                    <div key={i}>
                      Row #{e.row_number} [{e.company_name}]: <span className="text-destructive">{e.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-primary hover:bg-primary text-white rounded-xl font-bold text-xs"
              >
                Done & Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
