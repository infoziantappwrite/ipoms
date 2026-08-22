'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckSquare, ChevronLeft, ChevronRight, Download, Loader2, Sparkles, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Company {
  _id: string;
  company_name: string;
  hr_name: string;
  hr_designation?: string;
  primary_mobile: string;
  primary_email?: string;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchCompanies = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/companies/search?q=${encodeURIComponent(q)}&page=${p}&limit=100`);
      if (res.success) {
        const data = res.data as any;
        setCompanies(data.companies || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error('[Picker] Fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCompanies(query, 1);
      setPage(1);
      setLastClickedIndex(null);
    }, 250);
  }, [query, fetchCompanies]);

  useEffect(() => {
    fetchCompanies(query, page);
    setLastClickedIndex(null);
  }, [page]);

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
    setSelected((prev) => {
      const next = new Set(prev);
      companies.forEach((c) => next.delete(c._id));
      return next;
    });
  };

  const handleLoad = () => {
    if (selected.size === 0) {
      alert('Please select at least one contact.');
      return;
    }
    onLoad(Array.from(selected));
    onClose();
  };

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {/* Expansive Window Container with Crisp Light Neumorphic Styling */}
      <div className="bg-white border border-border rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-sunken border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)]">
              <Download size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-fg tracking-tight">Load Today's Contacts</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Read-Only Master Picker
                </span>
              </div>
              <p className="text-xs text-fg-subtle mt-0.5">
                Select company contacts to populate your active Daily Tracker workspace. Master records remain protected.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-sunken border border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-all cursor-pointer shadow-sm"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Search & Selection Controls with Light Inset Neumorphic Input */}
        <div className="px-6 py-3 bg-surface border-b border-border shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:max-w-md">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company, HR name, mobile, or email…"
              className="w-full bg-slate-50 border border-border-strong text-fg px-3.5 py-2 rounded-xl placeholder:text-fg-disabled text-xs shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)] focus:outline-none focus:border-primary transition-all font-medium"
            />
          </div>

          {/* Quick Selection Actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-fg-muted font-medium mr-1 text-[11px]">
              {loading ? 'Searching…' : `${total.toLocaleString()} companies`}
            </span>
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-sunken border border-border text-fg-muted hover:text-fg font-semibold transition-all shadow-sm cursor-pointer text-[11px]"
            >
              Select All on Page ({companies.length})
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-sunken border border-border text-fg-subtle hover:text-fg font-medium transition-all cursor-pointer text-[11px]"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Keyboard Helper Hint */}
        <div className="px-6 py-1.5 bg-slate-50 border-b border-border/80 flex items-center justify-between text-[11px] text-fg-subtle shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-fg font-semibold">⚡ Excel Shortcuts:</span>
            <span>Hold <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-fg font-mono text-[10px] shadow-xs">Shift</kbd> + Click to select a range</span>
            <span>•</span>
            <span>Hold <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-fg font-mono text-[10px] shadow-xs">Ctrl</kbd> / <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-fg font-mono text-[10px] shadow-xs">Cmd</kbd> + Click for multi-select</span>
          </div>
          <span className="font-bold text-primary">
            {selected.size} selected
          </span>
        </div>

        {/* Company Data Table — Clean, Crisp & Light-Neumorphic */}
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
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3">HR Contact</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Mobile Number</th>
                  <th className="px-4 py-3">Email ID</th>
                  <th className="px-4 py-3">Sector / Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-sans">
                {companies.map((c, index) => {
                  const isSelected = selected.has(c._id);
                  return (
                    <tr
                      key={c._id}
                      onClick={(e) => handleRowClick(index, c._id, e)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-slate-50 text-fg'
                      }`}
                    >
                      <td className="w-12 px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-bold text-fg">
                        {c.company_name}
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted font-medium">{c.hr_name || '—'}</td>
                      <td className="px-4 py-2.5 text-fg-subtle text-[11px]">{c.hr_designation || 'HR'}</td>
                      <td className="px-4 py-2.5 font-mono text-fg tabular-nums font-semibold">{c.primary_mobile || '—'}</td>
                      <td className="px-4 py-2.5 text-fg-muted truncate max-w-[180px]" title={c.primary_email}>
                        {c.primary_email || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-surface-sunken border-t border-border text-xs text-fg-muted shrink-0">
            <span className="text-[11px]">
              Showing page <strong className="text-fg">{page}</strong> of <strong className="text-fg">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 disabled:opacity-30 hover:text-fg transition-colors px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-slate-50 cursor-pointer text-xs font-semibold shadow-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 disabled:opacity-30 hover:text-fg transition-colors px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-slate-50 cursor-pointer text-xs font-semibold shadow-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Footer Bar with Light Neumorphic Action Buttons */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface border-t border-border shrink-0">
          <div className="text-xs text-fg-muted">
            Total Selected: <strong className="text-primary text-sm font-black ml-1">{selected.size}</strong> contacts
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
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
