'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Download } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchCompanies = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const url = `${API}/companies/search?q=${encodeURIComponent(q)}&page=${p}&limit=50`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.success) {
        setCompanies(data.data.companies);
        setTotal(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (e) { console.error('[Picker] Fetch failed', e); }
    finally { setLoading(false); }
  }, []);

  // Initial load + debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCompanies(query, 1);
      setPage(1);
    }, 200);
  }, [query, fetchCompanies]);

  useEffect(() => {
    fetchCompanies(query, page);
  }, [page]);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col
                      border border-border-strong shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-strong">
          <div>
            <h2 className="text-lg font-semibold text-white"><Download size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Load Today's Contacts</h2>
            <p className="text-xs text-fg-subtle mt-0.5">
              Read-only view — Add/Edit/Delete available in Master Company Database only
            </p>
          </div>
          <button onClick={onClose} className="text-fg-subtle hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-border">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by company name, HR name, mobile, or email…"
            className="w-full bg-surface border border-border-strong text-fg px-4 py-2.5 rounded-lg
                       placeholder-fg-subtle text-sm"
          />
          <div className="flex items-center justify-between mt-2 text-xs text-fg-subtle">
            <span>
              {loading ? 'Searching…' : `${total.toLocaleString()} companies found`}
            </span>
            <div className="flex gap-3">
              <button onClick={handleSelectAll} className="text-primary hover:text-primary transition-colors">
                Select All on Page ({companies.length})
              </button>
              <button onClick={handleDeselectAll} className="text-fg-subtle hover:text-fg-muted transition-colors">
                Deselect Page
              </button>
            </div>
          </div>
        </div>

        {/* Company list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-fg-subtle">
              <div className="animate-spin text-2xl mr-3">⟳</div> Loading…
            </div>
          ) : companies.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-fg-muted">
              No companies found matching your search.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-fg-subtle uppercase tracking-wide bg-background/50 border-b border-border">
                  <th className="w-10 px-3 py-2 text-left">☑</th>
                  <th className="px-3 py-2 text-left">Company Name</th>
                  <th className="px-3 py-2 text-left">HR Name</th>
                  <th className="px-3 py-2 text-left">Mobile</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {companies.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => toggleSelect(c._id)}
                    className={`cursor-pointer transition-colors hover:bg-surface/40
                                ${selected.has(c._id) ? 'bg-primary/30 border-primary/20' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c._id)}
                        onChange={() => toggleSelect(c._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-fg font-medium">{c.company_name}</td>
                    <td className="px-3 py-2 text-fg-muted">{c.hr_name}</td>
                    <td className="px-3 py-2 text-fg-muted font-mono">{c.primary_mobile}</td>
                    <td className="px-3 py-2 text-fg-subtle">{c.primary_email || '—'}</td>
                    <td className="px-3 py-2 text-fg-subtle">{c.company_type || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-6 py-2 border-t border-border text-xs text-fg-subtle">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="disabled:opacity-30 hover:text-white transition-colors px-3 py-1 rounded hover:bg-surface"
            >
              ← Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="disabled:opacity-30 hover:text-white transition-colors px-3 py-1 rounded hover:bg-surface"
            >
              Next →
            </button>
          </div>
        )}

        {/* Footer: Load Selected */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-strong">
          <p className="text-sm text-fg-subtle">
            <strong className="text-white">{selected.size}</strong> contact(s) selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="bg-surface-raised hover:bg-surface-raised text-fg px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLoad}
              disabled={selected.size === 0}
              className="bg-primary hover:bg-primary disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Load {selected.size > 0 ? selected.size : ''} Selected →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
