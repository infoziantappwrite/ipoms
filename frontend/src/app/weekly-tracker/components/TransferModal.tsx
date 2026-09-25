'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Copy, X, Search, ArrowLeft, Loader2, Building2, Layers } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';

/**
 * Two small dialogs for sending Weekly Tracker companies to another college:
 *   TransferSectionPicker - "which section do you want to move from?" (asked before ticking companies)
 *   TransferCollegeModal  - pick the receiving college, then an explicit "Are you sure?" step.
 * The receiver gets only Company, Role, CTC, Contact and Email, in the same section.
 */

export interface TransferSectionOption {
  key: string;
  title: string;
  count: number;
}

export function TransferSectionPicker({
  isOpen,
  options,
  onClose,
  onPick,
}: {
  isOpen: boolean;
  options: TransferSectionOption[];
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <ArrowRightLeft size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">Send companies to another college</h3>
              <p className="text-[11px] text-fg-subtle">Which section are they in?</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken cursor-pointer" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>
        <div className="p-3 max-h-[60vh] overflow-y-auto space-y-1.5">
          {options.length === 0 && <p className="text-xs text-fg-subtle p-3">There are no companies in any section yet.</p>}
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onPick(o.key);
              }}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised hover:border-primary/50 text-left transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-fg">
                <Layers size={14} className="text-fg-subtle" />
                {o.title}
              </span>
              <span className="text-[11px] font-bold text-fg-subtle tabular-nums">{o.count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CollegeRow {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
}

export function TransferCollegeModal({
  isOpen,
  mode,
  count,
  sectionTitle,
  sourceCollegeId,
  sourceCode,
  myCollegeIds,
  busy,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  mode: 'move' | 'copy';
  count: number;
  sectionTitle: string;
  sourceCollegeId: string;
  sourceCode: string;
  myCollegeIds: Set<string>;
  busy: boolean;
  onClose: () => void;
  onConfirm: (target: { id: string; code: string; name: string }) => void | Promise<void>;
}) {
  const [colleges, setColleges] = useState<CollegeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<CollegeRow | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPicked(null);
    setQ('');
    setLoading(true);
    apiFetch('/colleges')
      .then((d: any) => {
        const list = Array.isArray(d?.data?.colleges) ? d.data.colleges : [];
        setColleges(list);
      })
      .catch(() => setColleges([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        if (picked) setPicked(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, picked, busy, onClose]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return colleges
      .filter((c) => c._id !== sourceCollegeId)
      .filter((c) => !needle || `${c.college_code} ${c.college_name} ${c.location || ''}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const am = myCollegeIds.has(a._id) ? 0 : 1;
        const bm = myCollegeIds.has(b._id) ? 0 : 1;
        return am - bm || a.college_code.localeCompare(b.college_code);
      });
  }, [colleges, q, sourceCollegeId, myCollegeIds]);

  if (!isOpen) return null;
  const srcCode = colleges.find((c) => c._id === sourceCollegeId)?.college_code || sourceCode;
  const verb = mode === 'move' ? 'Move' : 'Copy';
  const Icon = mode === 'move' ? ArrowRightLeft : Copy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Icon size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">
                {verb} {count} compan{count === 1 ? 'y' : 'ies'}
              </h3>
              <p className="text-[11px] text-fg-subtle">From {srcCode} · {sectionTitle}</p>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken cursor-pointer" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {!picked ? (
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-fg">Which college should they go to?</p>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search college…"
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-border bg-surface-sunken text-xs text-fg outline-none focus:border-primary"
              />
            </div>
            <div className="max-h-[46vh] overflow-y-auto space-y-1.5">
              {loading && (
                <div className="flex items-center gap-2 text-xs text-fg-subtle p-3">
                  <Loader2 size={14} className="animate-spin" /> Loading colleges…
                </div>
              )}
              {!loading && visible.length === 0 && <p className="text-xs text-fg-subtle p-3">No other college found.</p>}
              {visible.map((c) => {
                const mine = myCollegeIds.has(c._id);
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setPicked(c);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised hover:border-primary/50 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Building2 size={14} className="text-fg-subtle shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-fg">{c.college_code}</span>
                        <span className="block text-[11px] text-fg-subtle truncate">{c.college_name}</span>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        mine
                          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                          : 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      {mine ? 'Your focus' : 'Other login'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-3">
              <p className="text-sm text-fg leading-relaxed">
                Are you sure you want to <strong>{mode === 'move' ? 'move' : 'copy'}</strong>{' '}
                <strong>{count}</strong> compan{count === 1 ? 'y' : 'ies'} from <strong>{srcCode}</strong> to{' '}
                <strong>{picked.college_code}</strong>?
              </p>
              {!myCollegeIds.has(picked._id) && (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  {picked.college_code} is not one of your focus colleges. Its coordinator will be told.
                </p>
              )}
              <ul className="text-[11px] text-fg-subtle space-y-1 list-disc pl-4">
                <li>They receive only Company name, Role, CTC, Contact and Email, in the same order and in the same section ({sectionTitle}).</li>
                <li>Everything else (status, dates, notes) starts empty for them to fill in.</li>
                <li>
                  {mode === 'move'
                    ? 'They will be removed from your tracker (you can restore them from the recycle bin).'
                    : 'Your own copy stays exactly as it is.'}
                </li>
                <li>A company {picked.college_code} already has is skipped.</li>
              </ul>
            </div>
            <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 bg-surface-sunken border-t border-border">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPicked(null)}
                className="px-3 py-2 rounded-xl bg-surface hover:bg-surface-raised border border-border text-fg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={13} /> Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  triggerHaptic('medium');
                  onConfirm({ id: picked._id, code: picked.college_code, name: picked.college_name });
                }}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                <span>{busy ? 'Sending…' : `Yes, ${mode === 'move' ? 'move' : 'copy'} & switch`}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
