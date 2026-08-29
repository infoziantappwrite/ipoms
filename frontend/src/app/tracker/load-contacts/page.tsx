'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, CheckSquare, ChevronLeft, ChevronRight,
  Search, Sparkles, X, CheckCircle2, Building2, Phone, Mail, User, ArrowLeft, Clock, Database
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { initTheme } from '@/lib/theme';
import { SnoRangeSelector } from '@/app/metadata/components/SnoRangeSelector';

interface Company {
  _id: string;
  serial_number?: number;
  company_name: string;
  hr_name: string;
  hr_designation?: string;
  primary_mobile: string;
  mobile_numbers?: string[];
  primary_email?: string;
  email_ids?: string[];
  company_type?: string;
}

export default function LoadContactsPage() {
  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [masterTotal, setMasterTotal] = useState(3823);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inputPage, setInputPage] = useState<string>('1');
  const [fromSno, setFromSno] = useState<number | null>(null);
  const [toSno, setToSno] = useState<number | null>(null);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [importedSuccess, setImportedSuccess] = useState(false);
  const [isRecent, setIsRecent] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    setInputPage(String(page));
  }, [page]);

  const handlePageInputSubmit = () => {
    const p = parseInt(inputPage.trim(), 10);
    if (!isNaN(p) && totalPages) {
      const clamped = Math.max(1, Math.min(p, totalPages));
      setPage(clamped);
      setInputPage(String(clamped));
    } else {
      setInputPage(String(page));
    }
  };

  const fetchCompanies = useCallback(async (q: string, p: number, sector: string, recentFlag?: boolean, fSno?: number | null, tSno?: number | null) => {
    setLoading(true);
    try {
      const useRecent = recentFlag !== undefined ? recentFlag : isRecent;
      const currentFrom = fSno !== undefined ? fSno : fromSno;
      const currentTo = tSno !== undefined ? tSno : toSno;

      let url = `/companies/search?q=${encodeURIComponent(q)}&page=${p}&limit=100${useRecent ? '&recent=true' : ''}`;
      if (sector !== 'all') url += `&type=${encodeURIComponent(sector)}`;
      if (currentFrom !== null && currentFrom > 0) url += `&from_sno=${currentFrom}`;
      if (currentTo !== null && currentTo > 0) url += `&to_sno=${currentTo}`;

      const res = await apiFetch(url);
      if (res.success) {
        const data = res.data as any;
        const count = data.pagination?.total || 0;
        setCompanies(data.companies || []);
        setTotal(count);
        if (!q && currentFrom === null && currentTo === null && sector === 'all' && !useRecent && count > 0) {
          setMasterTotal(count);
        }
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error('[Picker Page] Fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [isRecent, fromSno, toSno]);

  // Debounced search & filter
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCompanies(query, 1, sectorFilter, isRecent, fromSno, toSno);
      setPage(1);
      setLastClickedIndex(null);
    }, 250);
  }, [query, sectorFilter, isRecent, fromSno, toSno, fetchCompanies]);

  useEffect(() => {
    fetchCompanies(query, page, sectorFilter, isRecent, fromSno, toSno);
    setLastClickedIndex(null);
  }, [page, sectorFilter, isRecent, fromSno, toSno]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Keyboard: Escape key triggers Deselect All
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Shift + Click & Ctrl / Cmd Multi-Selection (Google Sheets / Excel Style) ───
  const handleRowClick = (index: number, id: string, e: React.MouseEvent) => {
    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isShift && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeIds = companies.slice(start, end + 1).map((c) => c._id);

      setSelected((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((item) => next.add(item));
        return next;
      });
    } else if (isCtrl) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setLastClickedIndex(index);
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setLastClickedIndex(index);
    }
  };

  const handleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      companies.forEach((c) => next.add(c._id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelected(new Set());
  };

  // ─── Import into Daily Tracker (via BroadcastChannel + window.opener + localStorage fallback) ───
  const handleImportToTracker = () => {
    if (selected.size === 0) return;

    const ids = Array.from(selected);
    let sent = false;

    // 1. BroadcastChannel (fast, modern)
    try {
      const channel = new BroadcastChannel('ipoms_tracker_sync');
      channel.postMessage({
        type: 'LOAD_CONTACTS',
        companyIds: ids,
        timestamp: Date.now(),
      });
      channel.close();
      sent = true;
    } catch (e) {
      // Fallback
    }

    // 2. Direct Window Opener message
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(
          {
            type: 'IPOMS_LOAD_CONTACTS',
            companyIds: ids,
          },
          '*'
        );
        sent = true;
      } catch (err) {
        console.error('Opener postMessage error:', err);
      }
    }

    // 3. LocalStorage event fallback
    if (!sent) {
      try {
        localStorage.setItem('ipoms_imported_contacts', JSON.stringify({
          ids,
          timestamp: Date.now(),
        }));
      } catch {
        // ignore
      }
    }

    setImportedSuccess(true);

    // Auto-close after brief confirmation if opened as a popup/tab
    setTimeout(() => {
      try {
        window.close();
      } catch {
        // window.close may be ignored if tab wasn't opened directly by script
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col font-sans selection:bg-primary selection:text-white">
      
      {/* ── Sticky Top Pinned Section (Header + Search Controls) ──────────── */}
      <div className="sticky top-0 z-30 bg-surface border-b border-border shadow-xs">
        {/* Top Header Bar */}
        <header className="px-6 py-3 border-b border-border/70">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)] shrink-0">
                <Download size={16} strokeWidth={2} />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
                  <span>Load Today's Contacts</span>
                </h1>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                  {isRecent ? 'Recent Data (S.No 3548+)' : 'Master Database Picker'}
                </span>
              </div>
            </div>

            {/* Top Right: Recent Data / Metadata Toggle Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = !isRecent;
                  setIsRecent(next);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95 ${
                  isRecent
                    ? 'bg-primary text-white border border-primary shadow-xs ring-1 ring-primary/30'
                    : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/40'
                }`}
                title={isRecent ? 'Switch back to all metadata from Serial Number 1' : 'Filter & sort contacts added in the past 1 to 2 weeks'}
              >
                {isRecent ? (
                  <>
                    <Database size={14} strokeWidth={2.25} />
                    <span>Metadata</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} strokeWidth={2.25} />
                    <span>Recent Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ── Frozen Filter & Search Control Ribbon ─────────── */}
        <div className="bg-surface-sunken px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Box with Clear Leading Space */}
              <div className="relative w-full sm:w-64 max-w-xs flex items-center">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by company, HR, phone…"
                  className="w-full bg-surface border border-border text-fg pl-9 pr-3 py-1.5 rounded-xl placeholder:text-fg-disabled text-xs shadow-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              {/* S.No Range Dropdown Selector */}
              {!isRecent && (
                <SnoRangeSelector
                  fromSno={fromSno}
                  toSno={toSno}
                  maxSno={masterTotal}
                  onApplyRange={(f, t) => {
                    setFromSno(f);
                    setToSno(t);
                    setPage(1);
                  }}
                  onClearRange={() => {
                    setFromSno(null);
                    setToSno(null);
                    setPage(1);
                  }}
                />
              )}
            </div>

            {/* Quick Action Tools & Top Pagination with Jump Input */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-fg-muted font-semibold text-[11px] mr-1">
                {loading ? 'Searching…' : `${total.toLocaleString()} total companies`}
              </span>

              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-fg-muted hover:text-fg font-semibold transition-all shadow-xs cursor-pointer text-[11px]"
              >
                Select All on Page ({companies.length})
              </button>

              {/* Top Pagination with Jump-to-Page Input */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Previous Page"
                    className="w-7 h-7 rounded-full bg-surface border border-border hover:bg-surface-raised active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg hover:text-primary shadow-2xs transition-all cursor-pointer"
                  >
                    <ChevronLeft size={14} strokeWidth={2.25} />
                  </button>

                  <div
                    className="flex items-center gap-1 px-2 py-0.5 bg-surface border border-border rounded-full shadow-2xs"
                    title={`Type a page number (1 to ${totalPages}) and press Enter`}
                  >
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={inputPage}
                      onChange={(e) => setInputPage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePageInputSubmit();
                        }
                      }}
                      onBlur={handlePageInputSubmit}
                      className="w-9 text-center font-mono font-bold text-[11px] bg-surface-sunken border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md py-0.5 text-fg outline-none transition-colors"
                    />
                    <span className="text-[11px] font-mono font-bold text-fg-subtle select-none">
                      / {totalPages}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    title="Next Page"
                    className="w-7 h-7 rounded-full bg-surface border border-border hover:bg-surface-raised active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg hover:text-primary shadow-2xs transition-all cursor-pointer"
                  >
                    <ChevronRight size={14} strokeWidth={2.25} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Main Contact Selection Table ───────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col">
        <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col flex-1">
          
          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-fg-subtle gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-fg">Loading master company records…</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-fg-subtle gap-2">
                <Building2 size={36} className="text-fg-disabled" />
                <p className="text-sm font-bold text-fg">No companies found</p>
                <p className="text-xs text-fg-muted">Try searching with a different keyword or company name.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse select-none">
                <thead className="sticky top-0 z-10 bg-surface-sunken border-b border-border text-[11px] font-bold text-fg-muted uppercase tracking-wider shadow-2xs">
                  <tr>
                    <th className="w-12 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={companies.length > 0 && companies.every((c) => selected.has(c._id))}
                        onChange={(e) => (e.target.checked ? handleSelectAll() : handleDeselectAll())}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="w-14 px-3 py-3.5 text-center font-mono text-[11px]">#</th>
                    <th className="px-4 py-3.5 min-w-[200px] max-w-[280px] text-left">Company Name</th>
                    <th className="px-4 py-3.5 min-w-[130px] max-w-[200px]">HR Name</th>
                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Contact</th>
                    <th className="px-4 py-3.5 min-w-[180px] max-w-[280px]">Email ID</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Sector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans bg-surface">
                  {companies.map((c, index) => {
                    const isSelected = selected.has(c._id);
                    const serialNo = c.serial_number ?? ((page - 1) * 100 + index + 1);
                    return (
                      <tr
                        key={c._id}
                        onClick={(e) => handleRowClick(index, c._id, e)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isSelected
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'hover:bg-surface-sunken/80 text-fg'
                        }`}
                      >
                        <td className="w-12 px-4 py-3 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(index, c._id, e);
                            }}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                          />
                        </td>
                        {/* Serial Number (#) - Numerical alone */}
                        <td className="w-14 px-3 py-3 text-center font-mono text-xs font-bold text-fg-muted whitespace-nowrap tabular-nums">
                          {serialNo}
                        </td>
                        {/* Company Name - Wrap Allowed */}
                        <td className="px-4 py-3 font-bold text-fg min-w-[200px] max-w-[280px] break-words leading-snug text-xs">
                          {c.company_name}
                        </td>
                        {/* HR Name - Wrap Allowed */}
                        <td className="px-4 py-3 text-fg font-medium min-w-[130px] max-w-[200px]">
                          <span className="break-words">{c.hr_name || '—'}</span>
                        </td>
                        {/* Mobile Number - NEVER Wrap Numbers */}
                        <td className="px-4 py-3 font-mono text-fg tabular-nums font-semibold whitespace-nowrap min-w-[150px]">
                          <div className="flex flex-col gap-1 items-start">
                            {c.primary_mobile ? (
                              <span className="whitespace-nowrap tabular-nums">{c.primary_mobile}</span>
                            ) : (
                              <span className="text-fg-subtle">—</span>
                            )}
                            {c.mobile_numbers
                              ?.filter((m: string) => m !== c.primary_mobile)
                              .map((m: string, i: number) => (
                                <span key={i} className="text-fg-subtle text-[11px] whitespace-nowrap tabular-nums">
                                  {m}
                                </span>
                              ))}
                          </div>
                        </td>
                        {/* Email ID(s) - Wraps Multiple Emails Cleanly */}
                        <td className="px-4 py-3 text-fg-muted min-w-[180px] max-w-[280px]">
                          {c.email_ids && c.email_ids.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {c.email_ids.map((email: string, i: number) => (
                                <span key={i} className="text-xs break-all leading-tight font-mono text-primary" title={email}>
                                  {email}
                                </span>
                              ))}
                            </div>
                          ) : c.primary_email ? (
                            <span className="text-xs break-all leading-tight font-mono text-primary" title={c.primary_email}>
                              {c.primary_email}
                            </span>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-sunken text-fg-muted border border-border whitespace-nowrap">
                            {c.company_type || 'General'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ── Fixed Bottom Bar for Instant Action ────────────────────────── */}
      <footer className="sticky bottom-0 z-20 bg-surface border-t border-border shadow-xs px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="font-semibold">Selected Contacts:</span>
            <span className="font-black text-primary text-sm px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
              {selected.size}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-surface-sunken hover:bg-surface-raised text-fg rounded-xl text-xs font-semibold border border-border transition-all cursor-pointer"
            >
              Close Window
            </button>
            <button
              onClick={handleImportToTracker}
              disabled={selected.size === 0 || importedSuccess}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-[2px_2px_8px_rgba(30,58,138,0.25)] flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              {importedSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Imported Successfully!</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Import ({selected.size}) to Daily Tracker</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
