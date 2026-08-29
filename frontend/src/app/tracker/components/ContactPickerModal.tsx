'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckSquare, ChevronLeft, ChevronRight, Download, Loader2, Sparkles, X, Search, Clock, Database } from 'lucide-react';
import { apiFetch } from '@/lib/api';
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

interface Props {
  onClose: () => void;
  onLoad: (companyIds: string[]) => void;
}

export function ContactPickerModal({ onClose, onLoad }: Props) {
  const [query, setQuery] = useState('');
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
  const [isRecent, setIsRecent] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

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

  const fetchCompanies = useCallback(async (q: string, p: number, recentFlag?: boolean, fSno?: number | null, tSno?: number | null) => {
    setLoading(true);
    try {
      const useRecent = recentFlag !== undefined ? recentFlag : isRecent;
      const recentParam = useRecent ? '&recent=true' : '';
      const currentFrom = fSno !== undefined ? fSno : fromSno;
      const currentTo = tSno !== undefined ? tSno : toSno;

      let url = `/companies/search?q=${encodeURIComponent(q)}&page=${p}&limit=100${recentParam}`;
      if (currentFrom !== null && currentFrom > 0) url += `&from_sno=${currentFrom}`;
      if (currentTo !== null && currentTo > 0) url += `&to_sno=${currentTo}`;

      const res = await apiFetch(url);
      if (res.success) {
        const data = res.data as any;
        const count = data.pagination?.total || 0;
        setCompanies(data.companies || []);
        setTotal(count);
        if (!q && currentFrom === null && currentTo === null && !useRecent && count > 0) {
          setMasterTotal(count);
        }
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error('[Picker] Fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [isRecent, fromSno, toSno]);

  // Initial load + debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCompanies(query, 1, isRecent, fromSno, toSno);
      setPage(1);
      setLastClickedIndex(null);
    }, 250);
  }, [query, isRecent, fromSno, toSno, fetchCompanies]);

  useEffect(() => {
    fetchCompanies(query, page, isRecent, fromSno, toSno);
    setLastClickedIndex(null);
  }, [page, isRecent, fromSno, toSno]);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
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

  const handleLoad = () => {
    onLoad(Array.from(selected));
    onClose();
  };

  // Keyboard: Escape deselects all or closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected((prev) => {
          if (prev.size > 0) return new Set();
          onClose();
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-overlay/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {/* Expansive Window Container with Semantic Theming */}
      <div className="bg-surface border border-border rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-fg">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-surface-sunken border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)]">
              <Download size={16} strokeWidth={2} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-fg tracking-tight">Load Today's Contacts</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Master Database Picker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const next = !isRecent;
                setIsRecent(next);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95 ${
                isRecent
                  ? 'bg-primary text-white border border-primary shadow-xs ring-1 ring-primary/30'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/40'
              }`}
              title={isRecent ? 'Switch back to all metadata from Serial Number 1' : 'Toggle to view recently added contacts'}
            >
              {isRecent ? (
                <>
                  <Database size={13} strokeWidth={2.25} />
                  <span>Metadata</span>
                </>
              ) : (
                <>
                  <Clock size={13} strokeWidth={2.25} />
                  <span>Recent Data</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Search & Selection Controls */}
        <div className="px-6 py-2.5 bg-surface border-b border-border shrink-0 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Medium Sized Search Bar */}
            <div className="relative w-full sm:w-64 max-w-xs flex items-center">
              <Search size={14} className="absolute left-3 text-fg-disabled pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts, HR, mobile…"
                className="w-full bg-surface-sunken border border-border text-fg pl-9 pr-3 py-1.5 rounded-xl placeholder:text-fg-disabled text-xs shadow-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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

          {/* Quick Selection Actions & Top Pagination with Jump Input */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-fg-muted font-medium mr-1 text-[11px]">
              {loading ? 'Searching…' : `${total.toLocaleString()} companies`}
            </span>
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-fg-muted hover:text-fg font-semibold transition-all shadow-xs cursor-pointer text-[11px]"
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

        {/* Company Data Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-surface select-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-fg-subtle gap-3">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-xs font-medium">Loading companies from Master Database…</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-fg-subtle gap-2">
              <CheckSquare size={32} className="text-fg-disabled" />
              <p className="text-sm font-semibold text-fg">No companies found matching your search</p>
              <p className="text-xs text-fg-muted">Try searching by company name, HR name, or phone number.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-surface-sunken border-b border-border text-[11px] font-bold text-fg-muted uppercase tracking-wider">
                <tr>
                  <th className="w-12 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={companies.length > 0 && companies.every((c) => selected.has(c._id))}
                      onChange={(e) => (e.target.checked ? handleSelectAll() : handleDeselectAll())}
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="w-14 px-3 py-3 text-center font-mono text-[11px]">#</th>
                  <th className="px-4 py-3 min-w-[200px] max-w-[280px] text-left">Company Name</th>
                  <th className="px-4 py-3 min-w-[130px] max-w-[200px]">HR Name</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">Contact</th>
                  <th className="px-4 py-3 min-w-[180px] max-w-[280px]">Email ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Sector</th>
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
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'hover:bg-surface-sunken/80 text-fg'
                      }`}
                    >
                      <td className="w-12 px-4 py-2.5 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        />
                      </td>
                      {/* Serial Number (#) - Numerical alone */}
                      <td className="w-14 px-3 py-2.5 text-center font-mono text-xs font-bold text-fg-muted whitespace-nowrap tabular-nums">
                        {serialNo}
                      </td>
                      {/* Company Name - Wrap Allowed */}
                      <td className="px-4 py-2.5 font-bold text-fg min-w-[200px] max-w-[280px] break-words leading-snug text-xs">
                        {c.company_name}
                      </td>
                      {/* HR Name - Wrap Allowed */}
                      <td className="px-4 py-2.5 text-fg font-medium min-w-[130px] max-w-[200px]">
                        <span className="break-words">{c.hr_name || '—'}</span>
                      </td>
                      {/* Mobile Number - NEVER Wrap Numbers */}
                      <td className="px-4 py-2.5 font-mono text-fg tabular-nums font-semibold whitespace-nowrap min-w-[150px]">
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
                      <td className="px-4 py-2.5 text-fg-muted min-w-[180px] max-w-[280px]">
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
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-sunken text-fg-muted border border-border whitespace-nowrap">
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

        {/* Bottom Footer Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface border-t border-border shrink-0">
          <div className="text-xs text-fg-muted">
            Total Selected: <strong className="text-primary text-sm font-black ml-1">{selected.size}</strong> contacts
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLoad}
              disabled={selected.size === 0}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-[2px_2px_8px_rgba(30,58,138,0.25)] active:scale-[0.99] cursor-pointer"
            >
              Load Selected ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
