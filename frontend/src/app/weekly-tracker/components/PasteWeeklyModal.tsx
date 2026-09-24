'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ClipboardPaste, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle, PlusCircle, RefreshCw, Search, Info, Plus, Eraser } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { validateAndNormalizeMultiMobile, validateAndNormalizeMultiEmail } from '@/lib/contactValidation';
import type { WeeklyRow } from './WeeklyTable';

/**
 * Weekly Tracker "Paste".
 *   1. Which section?  (Companies In Progress / Companies in Pipeline)  and  what do you want to do?
 *        - fill in details for companies already in that section, or
 *        - add new companies
 *      plus which columns you have.
 *   2. (fill in)  tick the companies you have data for - e.g. 5 of the 15
 *   3. a small table: type into the cells or paste from Excel (a pasted block fills the table from the
 *      clicked cell). Fill mode lists the ticked companies down the left; add mode has a Company name column.
 *   4. preview - the server checks every row; nothing is saved until Apply.
 */

export type PasteFieldKey = 'job_role' | 'ctc_lpa' | 'contact' | 'email' | 'follow_up_date' | 'jd_received_date' | 'db_shared_date';
export type PasteSectionKey = 'in_progress' | 'pipeline';
type Mode = 'fill' | 'add';

interface ColumnDef {
  key: PasteFieldKey;
  label: string;
  isDate?: boolean;
  hint: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'contact', label: 'Contact', hint: '10-digit mobile / landline, added to existing numbers' },
  { key: 'email', label: 'Email', hint: 'added to existing emails' },
  { key: 'job_role', label: 'Role', hint: 'commas add more roles' },
  { key: 'ctc_lpa', label: 'CTC', hint: 'e.g. 3 - 5 LPA' },
  { key: 'follow_up_date', label: 'Follow-up date', isDate: true, hint: 'today or later' },
  { key: 'jd_received_date', label: 'JD received date', isDate: true, hint: 'past is fine' },
  { key: 'db_shared_date', label: 'DB shared date', isDate: true, hint: 'past is fine' },
];
const COLUMN_LABEL: Record<string, string> = { company_name: 'Company name' };
COLUMNS.forEach((c) => (COLUMN_LABEL[c.key] = c.label));

export interface PasteRowPayload {
  row_no: number;
  row_id?: string;
  company_name: string;
  [k: string]: string | number | undefined;
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

export interface PasteSectionInfo {
  label: string;
  rows: WeeklyRow[];
}

interface Props {
  collegeId: string;
  collegeName: string;
  sections: Record<PasteSectionKey, PasteSectionInfo>;
  onClose: () => void;
  /** Saves for real. Resolves with the result rows, or null if the user backed out / it failed. */
  onApply: (payload: PasteApplyPayload) => Promise<{ rows: PasteRowResult[] } | null>;
}

// ── Excel / Sheets text -> cells (quoted cells with line breaks are handled)
function parseTable(text: string, keepBlank: boolean): string[][] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delim = clean.includes('\t') ? '\t' : clean.includes('|') ? '|' : null;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
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
  if (keepBlank) {
    // a blank cell is meaningful (leave that company as it is); only the trailing blank lines are dropped
    while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) rows.pop();
    return rows;
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const fmtDate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function currentValue(row: WeeklyRow, key: PasteFieldKey): string {
  switch (key) {
    case 'job_role': return row.job_role || '';
    case 'ctc_lpa': return row.ctc_lpa || '';
    case 'contact': return row.contact_number || (row.mobile_numbers || []).join(', ') || '';
    case 'email': return row.email_id || (row.email_ids || []).join(', ') || '';
    case 'follow_up_date': return fmtDate(row.follow_up_date);
    case 'jd_received_date': return fmtDate(row.jd_received_date);
    case 'db_shared_date': return fmtDate(row.db_shared_date);
  }
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

/** Day-first dates, same formats the server accepts. Returns an error message or '' when fine. */
function checkDate(raw: string, mustBeFuture: boolean): string {
  const v = raw.trim();
  if (!v) return '';
  let y = 0, m = 0, d = 0;
  let mt: RegExpMatchArray | null;
  if ((mt = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) { d = +mt[1]; m = +mt[2]; y = +mt[3]; }
  else if ((mt = v.match(/^(\d{1,2})[\s\-\/.]([A-Za-z]{3,9})[\s\-\/.,]+(\d{4})$/))) { d = +mt[1]; m = MONTHS[mt[2].slice(0, 4).toLowerCase()] || MONTHS[mt[2].slice(0, 3).toLowerCase()] || 0; y = +mt[3]; }
  else return 'Use DD/MM/YYYY, e.g. 30/09/2026';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (!m || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return 'Not a real date';
  if (mustBeFuture) {
    const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (iso < today) return 'Follow-up date must be today or later';
  }
  return '';
}

function cellIssue(key: string, value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (key === 'contact') { const r = validateAndNormalizeMultiMobile(v); return r.valid ? '' : (r.error || 'Invalid number'); }
  if (key === 'email') { const r = validateAndNormalizeMultiEmail(v); return r.valid ? '' : (r.error || 'Invalid email'); }
  if (key === 'follow_up_date') return checkDate(v, true);
  if (key === 'jd_received_date' || key === 'db_shared_date') return checkDate(v, false);
  return '';
}

const COL_WIDTH: Record<string, string> = {
  company_name: '180px', contact: '115px', email: '165px', job_role: '130px', ctc_lpa: '90px',
  follow_up_date: '110px', jd_received_date: '110px', db_shared_date: '110px',
};

type Step = 'setup' | 'pick' | 'paste' | 'preview';

export function PasteWeeklyModal({ collegeId, collegeName, sections, onClose, onApply }: Props) {
  const sectionKeys: PasteSectionKey[] = ['in_progress', 'pipeline'];
  const uniqueRows = (k: PasteSectionKey) => {
    const seen = new Set<string>();
    return (sections[k]?.rows || []).filter((r) => (seen.has(r._id) ? false : (seen.add(r._id), true)));
  };

  const [step, setStep] = useState<Step>('setup');
  const [section, setSection] = useState<PasteSectionKey>('pipeline');
  const [mode, setMode] = useState<Mode>('fill');
  const [picked, setPicked] = useState<Set<PasteFieldKey>>(new Set(['contact']));
  const [ticked, setTicked] = useState<string[]>([]); // row ids, in list order
  const [search, setSearch] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [grid, setGrid] = useState<string[][]>([]);
  const gridSig = useRef('');
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pasteNote, setPasteNote] = useState('');
  const [payloadRows, setPayloadRows] = useState<PasteRowPayload[]>([]);
  const [results, setResults] = useState<PasteRowResult[]>([]);
  const [summary, setSummary] = useState<{ create: number; update: number; error: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  const rows = useMemo(() => uniqueRows(section), [sections, section]); // eslint-disable-line react-hooks/exhaustive-deps
  const orderedFields = useMemo(() => COLUMNS.filter((c) => picked.has(c.key)).map((c) => c.key), [picked]);
  const availableColumns = mode === 'add' ? COLUMNS.filter((c) => !c.isDate) : COLUMNS;
  const hasDate = orderedFields.some((k) => COLUMNS.find((c) => c.key === k)?.isDate);

  // ticked companies in the order they appear in the list (that is the order to paste in)
  const tickedRows = useMemo(() => rows.filter((r) => ticked.includes(r._id)), [rows, ticked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applying, onClose]);

  const togglePicked = (k: PasteFieldKey) =>
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });

  const chooseMode = (m: Mode) => {
    setMode(m);
    setPicked(m === 'add' ? new Set(['job_role', 'ctc_lpa', 'contact', 'email']) : new Set(['contact']));
  };

  const firstField = orderedFields[0];
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.company_name.toLowerCase().includes(q)) return false;
      if (onlyMissing && firstField && currentValue(r, firstField)) return false;
      return true;
    });
  }, [rows, search, onlyMissing, firstField]);
  const missingCount = firstField ? rows.filter((r) => !currentValue(r, firstField)).length : 0;
  const allVisibleTicked = visibleRows.length > 0 && visibleRows.every((r) => ticked.includes(r._id));

  const toggleRow = (id: string) => setTicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAllVisible = () =>
    setTicked((p) => {
      if (allVisibleTicked) return p.filter((id) => !visibleRows.some((r) => r._id === id));
      const n = new Set(p);
      visibleRows.forEach((r) => n.add(r._id));
      return Array.from(n);
    });

  // ── the table
  const gridCols = useMemo(
    () => [
      ...(mode === 'add' ? [{ key: 'company_name', label: 'Company name' }] : []),
      ...orderedFields.map((k) => ({ key: k as string, label: COLUMN_LABEL[k] })),
    ],
    [mode, orderedFields]
  );
  const nCols = gridCols.length;
  const MAX_ROWS = 200;

  const blankRow = () => Array(nCols).fill('');
  const buildGrid = () => setGrid(Array.from({ length: mode === 'fill' ? tickedRows.length : 6 }, blankRow));

  const setCell = (r: number, c: number, v: string) =>
    setGrid((prev) => prev.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
  const focusCell = (r: number, c: number) => setTimeout(() => cellRefs.current[`${r}:${c}`]?.focus(), 0);
  const addRows = (n: number) => setGrid((prev) => [...prev, ...Array.from({ length: Math.max(0, Math.min(n, MAX_ROWS - prev.length)) }, blankRow)]);

  const issues = useMemo(() => {
    const m: Record<string, string> = {};
    grid.forEach((row, r) => {
      const filled = row.some((v) => v.trim());
      row.forEach((v, c) => {
        const msg = cellIssue(gridCols[c]?.key, v);
        if (msg) m[`${r}:${c}`] = msg;
      });
      if (mode === 'add' && filled && !row[0].trim()) m[`${r}:0`] = 'Company name is needed';
    });
    return m;
  }, [grid, gridCols, mode]);
  const issueCount = Object.keys(issues).length;
  const filledRows = useMemo(() => grid.map((row, r) => ({ row, r })).filter((x) => x.row.some((v) => v.trim())), [grid]);
  const canPreview = filledRows.length > 0 && !loading;

  const handleCellPaste = (e: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
    const raw = e.clipboardData.getData('text');
    if (!/[\t\n\r]/.test(raw.replace(/\r?\n$/, ''))) return; // a single value: normal paste into this cell
    e.preventDefault();
    let block = parseTable(raw, true);
    if (mode === 'add' && r === 0 && c === 0 && block.length && ['company', 'company name', 'company_name'].includes((block[0][0] || '').trim().toLowerCase())) block = block.slice(1);
    if (!block.length) return;
    const next = grid.map((row) => [...row]);
    let ignored = 0;
    block.forEach((cells, i) => {
      const rr = r + i;
      if (rr >= MAX_ROWS) { ignored++; return; }
      if (rr >= next.length) {
        if (mode === 'fill') { ignored++; return; }
        while (next.length <= rr) next.push(blankRow());
      }
      cells.forEach((v, j) => { if (c + j < nCols) next[rr][c + j] = v.trim(); });
    });
    setGrid(next);
    setPasteNote(ignored > 0 ? `${ignored} pasted row${ignored === 1 ? ' was' : 's were'} left out - ${mode === 'fill' ? `you ticked only ${tickedRows.length} companies` : `the limit is ${MAX_ROWS} rows`}.` : '');
  };

  const handleCellKey = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (r + 1 >= grid.length && mode === 'add' && grid.length < MAX_ROWS) addRows(1);
      // add mode: you type across a row, so Enter starts the next row at its first column;
      // fill mode: you usually type down one column, so Enter stays in the same column
      focusCell(Math.min(r + 1, mode === 'add' ? MAX_ROWS - 1 : grid.length - 1), mode === 'add' ? 0 : c);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(Math.max(0, r - 1), c);
    }
  };

  const runPreview = async () => {
    setMessage('');
    if (!canPreview) return;
    const payload: PasteRowPayload[] = filledRows.map(({ row, r }) => {
      const base: PasteRowPayload =
        mode === 'fill'
          ? { row_no: r + 1, row_id: tickedRows[r]?._id, company_name: tickedRows[r]?.company_name || '' }
          : { row_no: r + 1, company_name: (row[0] || '').trim() };
      const offset = mode === 'add' ? 1 : 0;
      orderedFields.forEach((k, i) => { base[k] = (row[i + offset] || '').trim(); });
      return base;
    });
    setPayloadRows(payload);
    setLoading(true);
    try {
      const res: any = await apiFetch('/weekly-tracker/bulk-paste', {
        method: 'POST',
        body: JSON.stringify({ college_id: collegeId, section, fields: orderedFields, rows: payload, dry_run: true }),
      });
      if (!res.success) {
        setMessage(res.error?.message || (typeof res.error === 'string' ? res.error : 'Could not check the rows.'));
        return;
      }
      const merged: PasteRowResult[] = res.data.rows;
      setResults(merged);
      setSummary({
        create: merged.filter((m) => m.action === 'create').length,
        update: merged.filter((m) => m.action === 'update' && m.changes.length > 0).length,
        error: merged.filter((m) => m.action === 'error').length,
      });
      setStep('preview');
    } catch {
      setMessage('Could not check the rows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const actionable = results.filter((r) => r.action === 'create' || (r.action === 'update' && r.changes.length > 0)).length;
  const canApply = !!summary && actionable > 0 && !applying;

  const apply = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      const out = await onApply({ fields: orderedFields, section, rows: payloadRows });
      if (out) onClose();
    } finally {
      setApplying(false);
    }
  };

  // ── navigation
  const flow: Step[] = mode === 'fill' ? ['setup', 'pick', 'paste', 'preview'] : ['setup', 'paste', 'preview'];
  const stepNo = flow.indexOf(step) + 1;
  const stepTitle = { setup: 'Section & columns', pick: 'Choose companies', paste: 'Paste', preview: 'Check & apply' }[step];
  const goBack = () => {
    const i = flow.indexOf(step);
    if (i <= 0) onClose();
    else setStep(flow[i - 1]);
  };
  const goNext = () => {
    const i = flow.indexOf(step);
    const nextStep = flow[i + 1];
    if (nextStep === 'paste') {
      const sig = `${mode}|${section}|${orderedFields.join(',')}|${tickedRows.map((r) => r._id).join(',')}`;
      if (sig !== gridSig.current) {
        gridSig.current = sig;
        buildGrid();
        setPasteNote('');
      }
    }
    if (nextStep) setStep(nextStep);
  };
  const setupOk = orderedFields.length > 0 || mode === 'add';
  const nextDisabled = (step === 'setup' && (!setupOk || (mode === 'fill' && rows.length === 0))) || (step === 'pick' && tickedRows.length === 0);

  const chip = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer select-none';

  return (
    <div role="dialog" aria-modal="true" aria-label="Paste into Weekly Tracker" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-surface text-fg text-xs border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-surface-sunken/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ClipboardPaste size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight leading-tight">Paste into Weekly Tracker</h2>
              <p className="text-[11px] text-fg-subtle truncate">{collegeName} · Step {stepNo} of {flow.length} · {stepTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={applying} aria-label="Close" className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto min-h-0 flex-1">
          {step === 'setup' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-bold">1. Which section?</p>
                <div className="grid grid-cols-2 gap-2">
                  {sectionKeys.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setSection(k); setTicked([]); }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left cursor-pointer transition-colors ${section === k ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-sunken/60'}`}
                    >
                      <span className="text-xs font-bold">{sections[k].label}</span>
                      <span className="text-[11px] font-semibold text-fg-subtle tabular-nums">{uniqueRows(k).length} companies</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold">2. What do you want to do?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    ['fill', 'Fill in details for companies already here', 'You tick the companies, then paste their values'],
                    ['add', 'Add new companies', 'Paste Company name + the columns you have'],
                  ] as const).map(([m, title, sub]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => chooseMode(m)}
                      className={`px-3 py-2 rounded-xl border text-left cursor-pointer transition-colors ${mode === m ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-sunken/60'}`}
                    >
                      <p className="text-xs font-bold">{title}</p>
                      <p className="text-[11px] text-fg-subtle">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold">3. Which columns do you have?</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableColumns.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      title={c.hint}
                      onClick={() => togglePicked(c.key)}
                      className={`${chip} ${picked.has(c.key) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-fg-muted hover:bg-surface-sunken/60'}`}
                    >
                      <span className={`w-3 h-3 rounded-[4px] border flex items-center justify-center ${picked.has(c.key) ? 'bg-primary border-primary text-primary-foreground' : 'border-border-strong'}`}>
                        {picked.has(c.key) && <CheckCircle2 size={9} strokeWidth={3} />}
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="flex items-start gap-1.5 text-[11px] text-fg-subtle">
                  <Info size={12} className="mt-px shrink-0" />
                  {mode === 'add'
                    ? 'New companies must already be in the Metadata database. Dates can only be added to companies already in the tracker.'
                    : 'Only the companies you tick are touched; everything else stays exactly as it is. A blank cell leaves that company unchanged.'}
                  {hasDate && ' Follow-up date must be today or later.'}
                </p>
                {mode === 'fill' && rows.length === 0 && (
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">There are no companies in {sections[section].label} yet - choose the other section or "Add new companies".</p>
                )}
              </div>
            </div>
          )}

          {step === 'pick' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search company…"
                    className="w-full h-8 pl-7 pr-2 bg-surface-sunken border border-border-strong focus:border-primary rounded-lg text-xs outline-none"
                  />
                </div>
                {firstField && (
                  <button
                    type="button"
                    onClick={() => setOnlyMissing((v) => !v)}
                    className={`${chip} h-8 ${onlyMissing ? 'border-primary bg-primary/10 text-primary' : 'border-border text-fg-muted hover:bg-surface-sunken/60'}`}
                  >
                    Only without {COLUMN_LABEL[firstField].toLowerCase()} ({missingCount})
                  </button>
                )}
                <span className="text-[11px] font-bold text-primary tabular-nums ml-auto">{tickedRows.length} of {rows.length} ticked</span>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-[46vh] overflow-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="sticky top-0 bg-surface-sunken text-fg-muted uppercase tracking-wider text-[10px] z-10">
                      <tr>
                        <th className="py-1.5 px-3 w-8">
                          <input type="checkbox" checked={allVisibleTicked} onChange={toggleAllVisible} aria-label="Tick all shown" className="h-3.5 w-3.5 accent-[#1E3A8A] cursor-pointer" />
                        </th>
                        <th className="py-1.5 px-2 w-8 text-center">#</th>
                        <th className="py-1.5 px-2">Company</th>
                        {orderedFields.slice(0, 3).map((k) => <th key={k} className="py-1.5 px-2">Now: {COLUMN_LABEL[k]}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {visibleRows.map((r) => {
                        const on = ticked.includes(r._id);
                        return (
                          <tr key={r._id} onClick={() => toggleRow(r._id)} className={`cursor-pointer transition-colors ${on ? 'bg-primary/5' : 'hover:bg-surface-sunken/50'}`}>
                            <td className="py-1.5 px-3"><input type="checkbox" checked={on} onChange={() => toggleRow(r._id)} onClick={(e) => e.stopPropagation()} className="h-3.5 w-3.5 accent-[#1E3A8A] cursor-pointer" /></td>
                            <td className="py-1.5 px-2 text-center text-fg-subtle tabular-nums">{rows.indexOf(r) + 1}</td>
                            <td className="py-1.5 px-2 font-semibold">{r.company_name}</td>
                            {orderedFields.slice(0, 3).map((k) => {
                              const v = currentValue(r, k);
                              return <td key={k} className={`py-1.5 px-2 max-w-[180px] truncate ${v ? 'text-fg-muted' : 'text-fg-disabled italic'}`}>{v || '—'}</td>;
                            })}
                          </tr>
                        );
                      })}
                      {visibleRows.length === 0 && (
                        <tr><td colSpan={3 + Math.min(3, orderedFields.length)} className="py-6 text-center text-fg-subtle">No companies match.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'paste' && (
            <div className="space-y-2.5">
              {mode === 'fill' ? (
                <p className="text-xs text-fg-muted">
                  Type or paste the <b>{orderedFields.map((k) => COLUMN_LABEL[k]).join(' | ')}</b> next to each company. Leave a cell empty to keep that company as it is.
                </p>
              ) : (
                <p className="text-xs text-fg-muted">
                  Type the new companies below, or paste from Excel / Google Sheets. New rows go into <b>{sections[section].label}</b>.
                </p>
              )}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-[42vh] overflow-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-surface-sunken text-fg-muted uppercase tracking-wider text-[10px] z-10">
                      <tr>
                        <th className="py-1.5 px-2 w-8 text-center">#</th>
                        {mode === 'fill' && <th className="py-1.5 px-2 text-left" style={{ minWidth: 180 }}>Company</th>}
                        {gridCols.map((c) => (
                          <th key={c.key} className="py-1.5 px-2 text-left" style={{ minWidth: COL_WIDTH[c.key] }}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {grid.map((row, r) => (
                        <tr key={r}>
                          <td className="px-2 text-center text-fg-subtle tabular-nums bg-surface-sunken/40">{r + 1}</td>
                          {mode === 'fill' && (
                            <td className="px-2 font-semibold max-w-[220px] truncate bg-surface-sunken/40" title={tickedRows[r]?.company_name}>{tickedRows[r]?.company_name}</td>
                          )}
                          {row.map((v, c) => {
                            const issue = issues[`${r}:${c}`];
                            return (
                              <td key={c} className="p-0 border-l border-border/60">
                                <input
                                  ref={(el) => { cellRefs.current[`${r}:${c}`] = el; }}
                                  value={v}
                                  onChange={(e) => setCell(r, c, e.target.value)}
                                  onPaste={(e) => handleCellPaste(e, r, c)}
                                  onKeyDown={(e) => handleCellKey(e, r, c)}
                                  title={issue || undefined}
                                  aria-invalid={!!issue}
                                  aria-label={`${gridCols[c].label}, row ${r + 1}`}
                                  spellCheck={false}
                                  className={`w-full h-8 px-2 text-[11px] bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-inset focus:ring-primary ${issue ? 'bg-rose-500/10 ring-1 ring-inset ring-rose-500/60 text-rose-700 dark:text-rose-300' : ''}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {mode === 'add' && (
                  <button type="button" onClick={() => addRows(5)} disabled={grid.length >= MAX_ROWS} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-border text-fg-muted hover:bg-surface-sunken/60 cursor-pointer disabled:opacity-40">
                    <Plus size={11} /> Add 5 rows
                  </button>
                )}
                <button type="button" onClick={() => { buildGrid(); setPasteNote(''); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-border text-fg-muted hover:bg-surface-sunken/60 cursor-pointer">
                  <Eraser size={11} /> Clear table
                </button>
                <span className="text-[11px] text-fg-subtle ml-auto">
                  Tab / Enter move between cells · to paste from Excel, click the first cell and press Ctrl+V
                </span>
              </div>
              <p className={`text-[11px] font-semibold ${issueCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-fg-subtle'}`}>
                {filledRows.length} row{filledRows.length === 1 ? '' : 's'} filled
                {issueCount > 0 && ` · ${issueCount} cell${issueCount === 1 ? '' : 's'} need fixing (hover a red cell to see why) - rows with a problem are skipped`}
              </p>
              {pasteNote && <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{pasteNote}</p>}
              {message && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{message}</p>}
            </div>
          )}

          {step === 'preview' && summary && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                {summary.create > 0 && <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">{summary.create} new in {sections[section].label}</span>}
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">{summary.update} to update</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">{summary.error} skipped</span>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-[44vh] overflow-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="sticky top-0 bg-surface-sunken text-fg-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-1.5 px-3 w-8 text-center">#</th>
                        <th className="py-1.5 px-2">Company</th>
                        <th className="py-1.5 px-2">What will happen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {results.map((r) => (
                        <tr key={r.row_no} className={r.action === 'error' ? 'bg-rose-500/5' : ''}>
                          <td className="py-1.5 px-3 text-center text-fg-subtle tabular-nums align-top">{r.row_no}</td>
                          <td className="py-1.5 px-2 font-semibold align-top">{r.company_name || <em className="text-fg-subtle">(blank)</em>}</td>
                          <td className="py-1.5 px-2 align-top">
                            {r.action === 'error' ? (
                              <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
                                <AlertTriangle size={12} className="mt-px shrink-0" />
                                <span>{r.errors.join(' · ')}</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className={`flex items-start gap-1.5 font-semibold ${r.action === 'create' ? 'text-emerald-700 dark:text-emerald-300' : r.changes.length ? 'text-blue-700 dark:text-blue-300' : 'text-fg-subtle'}`}>
                                  {r.action === 'create' ? <PlusCircle size={12} className="mt-px shrink-0" /> : <RefreshCw size={12} className="mt-px shrink-0" />}
                                  <span>{r.action === 'create' ? 'Add as a new company' : r.changes.length ? 'Update' : 'No change'}</span>
                                </div>
                                {r.action === 'update' && r.changes.map((c, i) => <p key={i} className="text-fg-muted pl-[18px]">{c}</p>)}
                                {r.warnings.map((w, i) => <p key={i} className="text-amber-700 dark:text-amber-300 pl-[18px]">{w}</p>)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] text-fg-subtle">Nothing is saved until you press Apply. Skipped rows are not saved.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border bg-surface-sunken/40 shrink-0">
          <button type="button" onClick={goBack} disabled={applying} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface-sunken text-fg-muted hover:text-fg cursor-pointer">
            {step === 'setup' ? 'Cancel' : (<><ArrowLeft size={12} /> Back</>)}
          </button>
          {(step === 'setup' || step === 'pick') && (
            <button type="button" onClick={goNext} disabled={nextDisabled} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              Next <ArrowRight size={12} />
            </button>
          )}
          {step === 'paste' && (
            <button type="button" onClick={runPreview} disabled={!canPreview} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              {loading ? <Loader2 size={12} className="animate-spin" /> : null} Check &amp; preview <ArrowRight size={12} />
            </button>
          )}
          {step === 'preview' && (
            <button type="button" onClick={apply} disabled={!canApply} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              {applying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Apply {actionable} row{actionable === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
