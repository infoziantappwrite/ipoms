'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Radio,
  CalendarClock,
  Layers,
  Briefcase,
  Ban,
  XCircle,
  ChevronDown,
  LayoutDashboard,
  Search,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface TpoRow {
  _id: string;
  company_name: string;
  job_role: string;
  ctc_lpa?: string;
  current_status_text?: string;
  follow_up_date?: string;
  drive_date?: string;
  registered_count: number;
  shortlisted_count: number;
  selected_count: number;
}

interface Sections {
  completed: TpoRow[];
  drive_in_progress: TpoRow[];
  upcoming_drive: TpoRow[];
  in_progress: TpoRow[];
  pipeline: TpoRow[];
  rejected_by_tpo: TpoRow[];
  rejected: TpoRow[];
}

interface TpoWeeklyData {
  college: { name: string; code: string; logo_url?: string; location?: string } | null;
  sections: Sections;
}

const SECTION_META: {
  key: keyof Sections;
  label: string;
  icon: any;
  iconColor: string;
  badgeBg: string;
  borderClass: string;
}[] = [
  {
    key: 'completed',
    label: 'Companies Completed',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-100',
  },
  {
    key: 'drive_in_progress',
    label: 'Drive In Progress',
    icon: Radio,
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-blue-100',
  },
  {
    key: 'upcoming_drive',
    label: 'Upcoming Drive',
    icon: CalendarClock,
    iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borderClass: 'border-indigo-100',
  },
  {
    key: 'in_progress',
    label: 'Companies In Progress',
    icon: Layers,
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-amber-100',
  },
  {
    key: 'pipeline',
    label: 'Companies in Pipeline',
    icon: Briefcase,
    iconColor: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    borderClass: 'border-sky-100',
  },
  {
    key: 'rejected_by_tpo',
    label: 'Companies Rejected by TPO',
    icon: Ban,
    iconColor: 'text-slate-500',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    borderClass: 'border-slate-200',
  },
  {
    key: 'rejected',
    label: 'Rejected Companies',
    icon: XCircle,
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    borderClass: 'border-rose-100',
  },
];

/** Each comma-separated role gets its own line/chip */
function RoleChips({ value }: { value: string }) {
  const roles = (value || '').split(',').map((r) => r.trim()).filter(Boolean);
  if (roles.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      {roles.map((role, i) => (
        <span
          key={i}
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
        >
          {role}
        </span>
      ))}
    </div>
  );
}

export default function TpoWeeklyTrackerPage() {
  const [data, setData] = useState<TpoWeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({
    completed: true,
    drive_in_progress: true,
    upcoming_drive: true,
    in_progress: true,
    pipeline: true,
    rejected_by_tpo: false,
    rejected: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<TpoWeeklyData>('/tpo/weekly-tracker');
        if (res.success && res.data) setData(res.data);
        else setError(res.error?.message || 'Could not load the tracker data.');
      } catch {
        setError('Cannot reach the iPOMS server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        <span className="text-xs font-semibold text-slate-500">Loading company tracker…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center">
        <XCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-bold text-rose-900">Tracker Unavailable</h3>
        <p className="mt-1 text-xs text-rose-600">{error || 'No tracker data found.'}</p>
      </div>
    );
  }

  const collegeName = data.college?.name || 'Placement Institution';

  // Calculate total companies
  const totalCount = Object.values(data.sections).reduce((acc, list) => acc + (list?.length || 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Title Card: Tracker - <College Name> (No repetitive college name, No 'weekly tracker' phrase) ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Tracker - {collegeName}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Live recruitment status and company breakdown by stage (Read-only).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search filter input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter companies or roles…"
                className="w-full sm:w-56 rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>

            <Link
              href="/tpo"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 shrink-0"
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Quick jump pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Stages:</span>
          {SECTION_META.map((meta) => {
            const rawRows = data.sections[meta.key] ?? [];
            const count = rawRows.length;
            const isOpen = open[meta.key] ?? false;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => setOpen((prev) => ({ ...prev, [meta.key]: !isOpen }))}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                  isOpen
                    ? meta.badgeBg
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <span>{meta.label}</span>
                <span className="rounded-full bg-black/5 px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section Tables ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {SECTION_META.map((meta) => {
          const rawRows = data.sections[meta.key] ?? [];
          const rows = searchQuery.trim()
            ? rawRows.filter((r) =>
                r.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.job_role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.current_status_text?.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : rawRows;

          const isOpen = open[meta.key] ?? false;
          const Icon = meta.icon;
          const showOutcomeColumns = meta.key === 'completed';

          return (
            <div
              key={meta.key}
              className={`overflow-hidden rounded-2xl border bg-white shadow-xs transition-all ${meta.borderClass}`}
            >
              <button
                type="button"
                onClick={() => setOpen((prev) => ({ ...prev, [meta.key]: !isOpen }))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/70"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 ${meta.iconColor}`}>
                  <Icon size={16} strokeWidth={2} />
                </span>
                <span className="flex-1 text-sm font-bold text-slate-900">{meta.label}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-micro font-bold text-slate-600">
                  {rows.length} {rows.length === 1 ? 'Company' : 'Companies'}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                rows.length === 0 ? (
                  <p className="border-t border-slate-100 px-4 py-6 text-center text-xs italic text-slate-400">
                    {searchQuery.trim()
                      ? 'No companies matching your search filter in this stage.'
                      : 'No companies in this stage yet.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                          <th className="px-3 py-2.5 text-left w-10">#</th>
                          <th className="px-4 py-2.5 text-left font-bold">Company</th>
                          <th className="px-4 py-2.5 text-left font-bold">Role</th>
                          <th className="px-4 py-2.5 text-left whitespace-nowrap font-bold">CTC</th>
                          <th className="px-4 py-2.5 text-left font-bold">Status</th>
                          {showOutcomeColumns && (
                            <>
                              <th className="px-4 py-2.5 text-right whitespace-nowrap font-bold">Registered</th>
                              <th className="px-4 py-2.5 text-right whitespace-nowrap font-bold">Shortlisted</th>
                              <th className="px-4 py-2.5 text-right whitespace-nowrap font-bold text-emerald-700">Offers</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r, i) => (
                          <tr key={r._id} className="hover:bg-slate-50/60 align-top transition-colors">
                            <td className="px-3 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 break-words max-w-[200px]">
                              {r.company_name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <RoleChips value={r.job_role} />
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                              {r.ctc_lpa || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500 break-words whitespace-pre-wrap max-w-[280px]">
                              {r.current_status_text || '—'}
                            </td>
                            {showOutcomeColumns && (
                              <>
                                <td className="px-4 py-3 text-right tabular-nums text-slate-700 font-medium">
                                  {r.registered_count || 0}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-slate-700 font-medium">
                                  {r.shortlisted_count || 0}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600">
                                  {r.selected_count || 0}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
