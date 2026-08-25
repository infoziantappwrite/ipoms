'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, CheckSquare, ChevronLeft, ChevronRight,
  Search, Sparkles, X, CheckCircle2, Building2, Phone, Mail, User, ArrowLeft
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { initTheme } from '@/lib/theme';

interface Company {
  _id: string;
  company_name: string;
  hr_name: string;
  hr_designation?: string;
  primary_mobile: string;
  primary_email?: string;
  company_type?: string;
}

export default function LoadContactsPage() {
  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [importedSuccess, setImportedSuccess] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initTheme();
  }, []);

  const fetchCompanies = useCallback(async (q: string, p: number, sector: string) => {
    setLoading(true);
    try {
      let url = `/companies/search?q=${encodeURIComponent(q)}&page=${p}&limit=100`;
      if (sector !== 'all') url += `&type=${encodeURIComponent(sector)}`;

      const res = await apiFetch(url);
      if (res.success) {
        const data = res.data as any;
        setCompanies(data.companies || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error('[Picker Page] Fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search & filter
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCompanies(query, 1, sectorFilter);
      setPage(1);
      setLastClickedIndex(null);
    }, 250);
  }, [query, sectorFilter, fetchCompanies]);

  useEffect(() => {
    fetchCompanies(query, page, sectorFilter);
    setLastClickedIndex(null);
  }, [page]);

  useEffect(() => {
    searchRef.current?.focus();
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
        <header className="px-6 py-3.5 border-b border-border/70">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)] shrink-0">
                <Download size={18} strokeWidth={2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-fg tracking-tight flex items-center gap-2">
                    <span>Load Today's Contacts</span>
                  </h1>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
                    Master Database Picker
                  </span>
                </div>
                <p className="text-xs text-fg-subtle mt-0.5">
                  Select company contacts to populate your active Daily Tracker workspace. Master database records remain protected.
                </p>
              </div>
            </div>

            <div className="text-xs font-bold text-fg w-full md:w-auto">
              Selected: <span className="text-primary text-base font-black ml-1">{selected.size}</span> contacts
            </div>
          </div>
        </header>

        {/* ── Frozen Filter & Search Control Ribbon ─────────── */}
        <div className="bg-surface-sunken px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-lg">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by company, HR contact name, mobile number, or email…"
                className="w-full bg-surface border border-border text-fg pl-9 pr-4 py-2 rounded-xl placeholder:text-fg-disabled text-xs shadow-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>

            {/* Quick Action Tools & Top Pagination Icon Pair */}
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

              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg font-medium transition-all cursor-pointer text-[11px]"
              >
                Deselect All
              </button>

              {/* Top Pagination Icon Pair */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Previous Page"
                    className="w-7 h-7 rounded-lg bg-surface border border-border hover:bg-surface-raised active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg hover:text-primary shadow-2xs transition-all cursor-pointer"
                  >
                    <ChevronLeft size={15} strokeWidth={2.25} />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-fg px-1.5">
                    {page}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    title="Next Page"
                    className="w-7 h-7 rounded-lg bg-surface border border-border hover:bg-surface-raised active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-fg hover:text-primary shadow-2xs transition-all cursor-pointer"
                  >
                    <ChevronRight size={15} strokeWidth={2.25} />
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
                    <th className="px-4 py-3.5 min-w-[220px] max-w-[280px]">Company Name</th>
                    <th className="px-4 py-3.5">HR Contact</th>
                    <th className="px-4 py-3.5">Designation</th>
                    <th className="px-4 py-3.5">Mobile Number</th>
                    <th className="px-4 py-3.5">Email ID</th>
                    <th className="px-4 py-3.5">Sector / Industry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans bg-surface">
                  {companies.map((c, index) => {
                    const isSelected = selected.has(c._id);
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
                        <td className="w-12 px-4 py-3 text-center">
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
                        <td className="px-4 py-3 font-bold text-fg min-w-[220px] max-w-[280px] break-words leading-snug">
                          {c.company_name}
                        </td>
                        <td className="px-4 py-3 text-fg-muted font-medium">{c.hr_name || '—'}</td>
                        <td className="px-4 py-3 text-fg-subtle text-[11px]">{c.hr_designation || 'HR'}</td>
                        <td className="px-4 py-3 font-mono text-fg tabular-nums font-semibold">{c.primary_mobile || '—'}</td>
                        <td className="px-4 py-3 text-fg-muted truncate max-w-[200px]" title={c.primary_email}>
                          {c.primary_email || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-sunken text-fg-muted border border-border">
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
