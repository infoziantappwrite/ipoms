'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, ClipboardPaste, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle, PlusCircle, RefreshCw, Info } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SmoothSelect } from '@/components/ui/SmoothSelect';

/**
 * Weekly Tracker "Paste".
 *   1. tick which columns you are about to paste (Company name is always the first column)
 *   2. paste from Excel / Google Sheets
 *   3. preview - every row is checked by the server (same code that later saves it), nothing is
 *      saved yet; if new companies would be created you choose which section they go into
 *   4. Apply
 */

export type PasteFieldKey =
  | 'job_role'
  | 'ctc_lpa'
  | 'contact'
  | 'email'
  | 'follow_up_date'
  | 'jd_received_date'
  | 'db_shared_date';

interface ColumnDef {
  key: PasteFieldKey;
  label: string;
  hint: string;
  isDate?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'job_role', label: 'Role', hint: 'Several roles separated by commas are added to the ones already there' },
  { key: 'ctc_lpa', label: 'CTC', hint: 'e.g. 3 - 5 LPA (a bare 3-5 becomes 3 - 5 LPA)' },
  { key: 'contact', label: 'Contact', hint: '10-digit mobile / landline. Added to existing numbers, never replaces them' },
  { key: 'email', label: 'Email', hint: 'Added to existing emails, never replaces them' },
  { key: 'follow_up_date', label: 'Follow-up date', hint: 'Today or a future date only', isDate: true },
  { key: 'jd_received_date', label: 'JD received date', hint: 'Past dates are fine', isDate: true },
  { key: 'db_shared_date', label: 'DB shared date', hint: 'Past dates are fine', isDate: true },
];

const COLUMN_LABEL: Record<string, string> = { company_name: 'Company name' };
COLUMNS.forEach((c) => (COLUMN_LABEL[c.key] = c.label));

export interface PasteRowPayload {
  row_no: number;
  company_name: string;
  [k: string]: string | number;
}

export interface PasteRowResult {
  row_no: number;
  company_name: string;
  action: 'create' | 'update' | 'error';
  errors: string[];
  warnings: string[];
  changes: string[];
  applied?: boolean;
  row_id?: string;
  before?: Record<string, any>;
  apply_error?: string;
}

export interface PasteApplyPayload {
  fields: PasteFieldKey[];
  section: string;
  rows: PasteRowPayload[];
}

interface Props {
  collegeId: string;
  collegeName: string;
  sectionOptions: { value: string; label: string }[];
  onClose: () => void;
  /** Saves for real. Resolves with the result rows, or null if the user backed out / it failed. */
  onApply: (payload: PasteApplyPayload) => Promise<{ rows: PasteRowResult[] } | null>;
}

// ── Excel / Sheets text -> cells (handles quoted cells that contain line breaks)
function parseTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const hasTab = clean.includes('\t');
  const delim = hasTab ? '\t' : clean.includes('|') ? '|' : null;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell === '') { inQuotes = true; continue; }
    if (delim && ch === delim) { row.push(cell); cell = ''; continue; }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

type Step = 'choose' | 'paste' | 'preview';

export function PasteWeeklyModal({ collegeId, collegeName, sectionOptions, onClose, onApply }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [picked, setPicked] = useState<Set<PasteFieldKey>>(new Set(['job_role', 'ctc_lpa', 'contact', 'email']));
  const [text, setText] = useState('');
  const [payloadRows, setPayloadRows] = useState<PasteRowPayload[]>([]);
  const [shapeErrors, setShapeErrors] = useState<Record<number, string>>({});
  const [results, setResults] = useState<PasteRowResult[]>([]);
  const [summary, setSummary] = useState<{ create: number; update: number; error: number; needs_section: boolean } | null>(null);
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  const orderedFields = useMemo(() => COLUMNS.filter((c) => picked.has(c.key)).map((c) => c.key), [picked]);
  const colKeys: string[] = useMemo(() => ['company_name', ...orderedFields], [orderedFields]);
  const hasDate = orderedFields.some((k) => COLUMNS.find((c) => c.key === k)?.isDate);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applying, onClose]);

  const toggle = (k: PasteFieldKey) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const detectedRows = useMemo(() => {
    const t = parseTable(text);
    if (t.length && ['company', 'company name', 'company_name'].includes((t[0][0] || '').trim().toLowerCase())) t.shift();
    return t;
  }, [text]);

  const runPreview = async () => {
    setMessage('');
    if (detectedRows.length === 0) {
      setMessage('Paste some rows first.');
      return;
    }
    const rows: PasteRowPayload[] = [];
    const shape: Record<number, string> = {};
    detectedRows.forEach((cells, idx) => {
      const row_no = idx + 1;
      if (cells.length > colKeys.length) {
        shape[row_no] = `Too many columns (found ${cells.length}, expected ${colKeys.length}: ${colKeys.map((k) => COLUMN_LABEL[k]).join(' | ')})`;
      }
      const r: PasteRowPayload = { row_no, company_name: (cells[0] || '').trim() };
      colKeys.slice(1).forEach((k, i) => { r[k] = (cells[i + 1] || '').trim(); });
      rows.push(r);
    });
    setShapeErrors(shape);
    const sendable = rows.filter((r) => !shape[r.row_no as number]);
    setPayloadRows(rows);
    setLoading(true);
    try {
      let serverRows: PasteRowResult[] = [];
      let sum = { create: 0, update: 0, error: 0, needs_section: false };
      if (sendable.length) {
        const res: any = await apiFetch('/weekly-tracker/bulk-paste', {
          method: 'POST',
          body: JSON.stringify({ college_id: collegeId, fields: orderedFields, rows: sendable, dry_run: true }),
        });
        if (!res.success) {
          setMessage(res.error?.message || (typeof res.error === 'string' ? res.error : 'Could not check the pasted rows.'));
          return;
        }
        serverRows = res.data.rows;
        sum = res.data.summary;
      }
      const merged: PasteRowResult[] = rows.map((r) => {
        const rn = r.row_no as number;
        if (shape[rn]) return { row_no: rn, company_name: r.company_name, action: 'error', errors: [shape[rn]], warnings: [], changes: [] };
        return serverRows.find((x) => x.row_no === rn)!;
      });
      setResults(merged);
      setSummary({ create: sum.create, update: sum.update, error: merged.filter((m) => m.action === 'error').length, needs_section: sum.needs_section });
      setStep('preview');
    } catch {
      setMessage('Could not check the pasted rows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const actionable = results.filter((r) => r.action !== 'error' && (r.action === 'create' || r.changes.length > 0)).length;
  const canApply = !!summary && actionable > 0 && (!summary.needs_section || !!section) && !applying;

  const apply = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      const sendable = payloadRows.filter((r) => !shapeErrors[r.row_no as number]);
      const out = await onApply({ fields: orderedFields, section, rows: sendable });
      if (out) onClose();
    } finally {
      setApplying(false);
    }
  };

  const example = colKeys.map((k) => COLUMN_LABEL[k]).join('  |  ');

  return (
    <div role="dialog" aria-modal="true" aria-label="Paste into Weekly Tracker" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface text-fg border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-surface-sunken/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ClipboardPaste size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight">Paste into Weekly Tracker</h2>
              <p className="text-xs text-fg-subtle truncate">
                {collegeName} · {step === 'choose' ? 'Step 1 of 3 - what are you pasting?' : step === 'paste' ? 'Step 2 of 3 - paste your rows' : 'Step 3 of 3 - check and apply'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={applying} aria-label="Close" className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto min-h-0 flex-1">
          {step === 'choose' && (
            <div className="space-y-4">
              <p className="text-sm text-fg-muted">
                Tick the columns you have. <b>Company name</b> is always the first column - it is how each row is found.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPicked(new Set(['job_role', 'ctc_lpa', 'contact', 'email']))} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer">
                  Entire (Company, Role, CTC, Contact, Email)
                </button>
                <button type="button" onClick={() => setPicked(new Set())} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface-sunken text-fg-muted hover:text-fg cursor-pointer">
                  Company name only
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-sunken/60 opacity-90">
                  <input type="checkbox" checked readOnly disabled className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-sm font-bold">Company name</p>
                    <p className="text-[11px] text-fg-subtle">Always first. Must already be in the Metadata database to be added as a new row.</p>
                  </div>
                </div>
                {COLUMNS.map((c) => (
                  <label key={c.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${picked.has(c.key) ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-sunken/60'}`}>
                    <input type="checkbox" checked={picked.has(c.key)} onChange={() => toggle(c.key)} className="mt-0.5 h-4 w-4 accent-[#1E3A8A]" />
                    <div>
                      <p className="text-sm font-bold">{c.label}</p>
                      <p className="text-[11px] text-fg-subtle">{c.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
              {hasDate ? (
                <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  With a date column ticked, dates are only added to companies that are already on this college&apos;s tracker - no new companies are created.
                </p>
              ) : (
                <p className="flex items-start gap-2 text-xs text-fg-muted bg-surface-sunken/70 border border-border rounded-xl p-3">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  Companies not on this college&apos;s tracker yet will be added as new rows, and you will choose the section on the last step.
                </p>
              )}
            </div>
          )}

          {step === 'paste' && (
            <div className="space-y-3">
              <p className="text-sm text-fg-muted">Copy the cells from Excel or Google Sheets in this exact column order, then paste them here:</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {colKeys.map((k, i) => (
                  <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    <span className="opacity-60">{i + 1}</span>{COLUMN_LABEL[k]}
                  </span>
                ))}
              </div>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={example}
                rows={11}
                spellCheck={false}
                className="w-full font-mono text-xs bg-surface-sunken border border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-3 outline-none resize-y"
              />
              <p className="text-xs text-fg-subtle">
                {detectedRows.length} row{detectedRows.length === 1 ? '' : 's'} detected · a header row (starting with &quot;Company&quot;) is skipped automatically · up to 200 rows at a time
              </p>
              {message && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{message}</p>}
            </div>
          )}

          {step === 'preview' && summary && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">{summary.create} new</span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">{results.filter((r) => r.action === 'update' && r.changes.length).length} to update</span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">{summary.error} will be skipped</span>
              </div>

              {summary.needs_section && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
                  <p className="text-sm font-bold">Which section should the {summary.create} new compan{summary.create === 1 ? 'y' : 'ies'} go into?</p>
                  <SmoothSelect
                    value={section}
                    options={sectionOptions.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={setSection}
                    placeholder="Choose a section…"
                    error={!section}
                  />
                </div>
              )}

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-[38vh] overflow-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-surface-sunken text-fg-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Company</th>
                        <th className="py-2 px-3">What will happen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {results.map((r) => (
                        <tr key={r.row_no} className={r.action === 'error' ? 'bg-rose-500/5' : ''}>
                          <td className="py-2 px-3 text-center text-fg-subtle tabular-nums">{r.row_no}</td>
                          <td className="py-2 px-3 font-semibold align-top">{r.company_name || <em className="text-fg-subtle">(blank)</em>}</td>
                          <td className="py-2 px-3 align-top">
                            {r.action === 'error' ? (
                              <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
                                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                <span>{r.errors.join(' · ')}</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className={`flex items-start gap-1.5 font-semibold ${r.action === 'create' ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                  {r.action === 'create' ? <PlusCircle size={13} className="mt-0.5 shrink-0" /> : <RefreshCw size={13} className="mt-0.5 shrink-0" />}
                                  <span>{r.action === 'create' ? 'Add as a new company' : r.changes.length ? 'Update' : 'No change'}</span>
                                </div>
                                {r.action === 'update' && r.changes.map((c, i) => <p key={i} className="text-fg-muted pl-5">{c}</p>)}
                                {r.warnings.map((w, i) => <p key={i} className="text-amber-700 dark:text-amber-300 pl-5">{w}</p>)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-fg-subtle">Nothing is saved until you press Apply. Skipped rows are not saved - fix them in your sheet and paste them again.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-surface-sunken/40 shrink-0">
          <button
            type="button"
            onClick={() => (step === 'choose' ? onClose() : setStep(step === 'preview' ? 'paste' : 'choose'))}
            disabled={applying}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-surface-sunken text-fg-muted hover:text-fg cursor-pointer"
          >
            {step === 'choose' ? 'Cancel' : (<><ArrowLeft size={13} /> Back</>)}
          </button>
          {step === 'choose' && (
            <button type="button" onClick={() => setStep('paste')} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer">
              Next <ArrowRight size={13} />
            </button>
          )}
          {step === 'paste' && (
            <button type="button" onClick={runPreview} disabled={loading || detectedRows.length === 0} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              {loading ? <Loader2 size={13} className="animate-spin" /> : null} Check &amp; preview <ArrowRight size={13} />
            </button>
          )}
          {step === 'preview' && (
            <button type="button" onClick={apply} disabled={!canApply} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              {applying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Apply {actionable} row{actionable === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
