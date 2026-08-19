'use client';

import { useState } from 'react';

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
      <div className="glass-panel rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📋</span> Bulk Paste Excel Contacts (Fast Importer)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base">
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
          <p className="font-semibold text-blue-400">💡 Excel Copy-Paste Instructions:</p>
          <p>
            Copy rows directly from your Excel sheet and paste below. Expected columns:
            <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded font-mono ml-1">
              Company Name | HR Name | Mobile Number | Email ID | Industry
            </code>
          </p>
        </div>

        {!importResult ? (
          <>
            {/* Raw Text Input */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs">
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {parsedRows.length === 0 && rawText.trim() && (
              <button
                type="button"
                onClick={handleParse}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold"
              >
                🔍 Parse & Preview Rows ({rawText.trim().split('\n').length})
              </button>
            )}

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Preview: {parsedRows.length} Valid Row(s)
                  </span>
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setRawText('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Company</th>
                        <th className="py-2 px-3">HR Name</th>
                        <th className="py-2 px-3">Mobile</th>
                        <th className="py-2 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-1.5 px-3 text-slate-500">{idx + 1}</td>
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
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0 || loading}
                onClick={handleImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                {loading ? 'Importing…' : `Import ${parsedRows.length} Contacts 🚀`}
              </button>
            </div>
          </>
        ) : (
          /* Import Results Screen */
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-1">
              <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                <span>🎉</span> Bulk Import Finished!
              </h4>
              <p className="text-slate-300">
                Successfully imported <strong className="text-emerald-400">{importResult.imported_count}</strong> new corporate contacts.
              </p>
              {importResult.skipped_count > 0 && (
                <p className="text-amber-400">
                  Skipped {importResult.skipped_count} row(s) due to missing company names or exact duplicates.
                </p>
              )}
            </div>

            {importResult.errors?.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-300">Skipped Rows Details:</span>
                <div className="max-h-36 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                  {importResult.errors.map((e: any, i: number) => (
                    <div key={i}>
                      Row #{e.row_number} [{e.company_name}]: <span className="text-red-400">{e.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs"
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
