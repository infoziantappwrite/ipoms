'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Copy, X, Search, Loader2, Building2, Layers, Building, Send } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';

/**
 * The dialogs for "Move / Copy Companies" in the Weekly Tracker:
 *   MoveChoiceModal        - within this college (move between sections) or to another college (copy)
 *   TransferCollegePicker  - pick ONE receiving college
 *   TransferSectionPicker  - which section to copy from
 *   TransferConfirmModal   - "Are you sure?" before anything is sent
 * Copying to another college never changes the sender's rows; the receiver gets only Company, Role, CTC,
 * Contact and Email, in the same section and order.
 */

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, onEscape]);
}

function Shell({
  icon,
  title,
  subtitle,
  onClose,
  children,
  closeDisabled,
  wide,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  closeDisabled?: boolean;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" className={`w-full ${wide ? 'max-w-4xl' : 'max-w-md'} bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">{icon}</div>
            <div>
              <h3 className="text-sm font-bold text-fg">{title}</h3>
              {subtitle && <p className="text-[11px] text-fg-subtle">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            disabled={closeDisabled}
            onClick={onClose}
            className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken cursor-pointer"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── 1. Within this college, or to another college? ────────────────────────────
export function MoveChoiceModal({
  isOpen,
  onClose,
  onWithin,
  onOther,
}: {
  isOpen: boolean;
  onClose: () => void;
  onWithin: () => void;
  onOther: () => void;
}) {
  useEscape(isOpen, onClose);
  if (!isOpen) return null;
  return (
    <Shell icon={<ArrowRightLeft size={16} strokeWidth={2.2} />} title="Move / Copy companies" subtitle="Where do you want to send them?" onClose={onClose}>
      <div className="p-4 space-y-2.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            onWithin();
          }}
          className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:bg-surface-raised hover:border-primary/50 text-left transition-colors cursor-pointer"
        >
          <Layers size={18} className="text-primary mt-0.5 shrink-0" />
          <span>
            <span className="block text-sm font-bold text-fg">Within this college</span>
            <span className="block text-[11px] text-fg-subtle">Move companies between the sections of this tracker.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            onOther();
          }}
          className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:bg-surface-raised hover:border-primary/50 text-left transition-colors cursor-pointer"
        >
          <Building size={18} className="text-primary mt-0.5 shrink-0" />
          <span>
            <span className="block text-sm font-bold text-fg">To another college</span>
            <span className="block text-[11px] text-fg-subtle">Copy companies to another college. Your own rows stay exactly as they are.</span>
          </span>
        </button>
      </div>
    </Shell>
  );
}

// ── 2. Which college? (one only) ─────────────────────────────────────────────
interface CollegeRow {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
}

export function TransferCollegePicker({
  isOpen,
  sourceCollegeId,
  myCollegeIds,
  onClose,
  onPick,
}: {
  isOpen: boolean;
  sourceCollegeId: string;
  myCollegeIds: Set<string>;
  onClose: () => void;
  onPick: (c: { id: string; code: string; name: string }) => void;
}) {
  const [colleges, setColleges] = useState<CollegeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setQ('');
    setLoading(true);
    apiFetch('/colleges')
      .then((d: any) => setColleges(Array.isArray(d?.data?.colleges) ? d.data.colleges : []))
      .catch(() => setColleges([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEscape(isOpen, onClose);

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
  return (
    <Shell icon={<Copy size={16} strokeWidth={2.2} />} title="Copy to another college" subtitle="Which college should receive them?" onClose={onClose}>
      <div className="p-4 space-y-3">
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
                  onPick({ id: c._id, code: c.college_code, name: c.college_name });
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
    </Shell>
  );
}

// ── 3. Which section to copy from? ───────────────────────────────────────────
export interface TransferSectionOption {
  key: string;
  title: string;
  count: number;
}

export function TransferSectionPicker({
  isOpen,
  targetCode,
  options,
  onClose,
  onPick,
}: {
  isOpen: boolean;
  targetCode: string;
  options: TransferSectionOption[];
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  useEscape(isOpen, onClose);
  if (!isOpen) return null;
  return (
    <Shell icon={<Layers size={16} strokeWidth={2.2} />} title={`Copy to ${targetCode}`} subtitle="Which section are the companies in?" onClose={onClose}>
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
    </Shell>
  );
}

// ── 4. Are you sure? ─────────────────────────────────────────────────────────
export function TransferConfirmModal({
  isOpen,
  count,
  sectionTitle,
  sourceCode,
  target,
  targetIsMine,
  busy,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  count: number;
  sectionTitle: string;
  sourceCode: string;
  target: { id: string; code: string; name: string } | null;
  targetIsMine: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  useEscape(isOpen && !busy, onClose);
  if (!isOpen || !target) return null;
  return (
    <Shell
      icon={<Copy size={16} strokeWidth={2.2} />}
      title="Copy company"
      subtitle={`From ${sourceCode} · ${sectionTitle}`}
      onClose={onClose}
      closeDisabled={busy}
      wide
    >
      <div className="p-5 space-y-3">
        <p className="text-sm text-fg leading-relaxed">
          Are you sure you want to copy <strong>{count}</strong> compan{count === 1 ? 'y' : 'ies'} from <strong>{sourceCode}</strong> to{' '}
          <strong>{target.code}</strong>?
        </p>
        {!targetIsMine && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            {target.code} is not one of your focus colleges. Its coordinator will be told.
          </p>
        )}
        <ul className="text-[11px] text-fg-subtle space-y-1 list-disc pl-4">
          <li>Your own rows stay exactly as they are.</li>
          <li>
            {target.code} receives only Company name, Role, CTC, Contact and Email, in the same order and section ({sectionTitle}). Everything else
            starts empty for them to fill in.
          </li>
          <li>A company {target.code} already has is skipped.</li>
        </ul>
      </div>
      <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-surface-sunken border-t border-border">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-raised border border-border text-fg text-xs font-semibold cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            triggerHaptic('medium');
            onConfirm();
          }}
          className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          <span>{busy ? 'Copying…' : 'Yes, copy & switch'}</span>
        </button>
      </div>
    </Shell>
  );
}
