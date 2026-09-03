'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Power,
  RefreshCw,
  MapPin,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export interface CollegeRecord {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
  status: 'active' | 'inactive' | 'on_hold';
  logo_url?: string;
  tpo_name?: string;
  tpo_email?: string;
  tpo_contact_mobile?: string;
  departments?: string[];
}

export function CollegeRosterTab() {
  const { toast } = useToast();
  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  const loadAllColleges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/colleges/all');
      if (res.success && res.data) {
        setColleges(res.data.colleges || []);
      }
    } catch (err: any) {
      console.error('Failed to load colleges:', err);
      toast('Failed to load college roster', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAllColleges();
  }, [loadAllColleges]);

  const handleToggleStatus = async (college: CollegeRecord) => {
    const nextStatus = college.status === 'active' ? 'inactive' : 'active';
    setUpdatingId(college._id);

    // Optimistic UI update
    setColleges((prev) =>
      prev.map((c) => (c._id === college._id ? { ...c, status: nextStatus } : c))
    );

    try {
      const res = await apiFetch<any>(`/colleges/${college._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.success) {
        toast(
          nextStatus === 'active'
            ? `Activated ${college.college_code} — now live in reports & daily leads`
            : `Deactivated ${college.college_code} — placed in inactive mode`,
          'success'
        );
      } else {
        // Rollback
        setColleges((prev) =>
          prev.map((c) => (c._id === college._id ? { ...c, status: college.status } : c))
        );
        toast(res.error?.message || 'Failed to update college status', 'error');
      }
    } catch (err: any) {
      // Rollback
      setColleges((prev) =>
        prev.map((c) => (c._id === college._id ? { ...c, status: college.status } : c))
      );
      toast(err.message || 'Error updating status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSyncOfficialRoster = async () => {
    if (!confirm('Synchronize the official 21 active colleges roster? This will reset active/inactive statuses to the confirmed partner list.')) {
      return;
    }
    setSyncing(true);
    try {
      const res = await apiFetch<any>('/colleges/sync-roster', {
        method: 'POST',
      });
      if (res.success && res.data) {
        setColleges(res.data.colleges || []);
        toast('Successfully synchronized official 21 active colleges roster', 'success');
      } else {
        toast(res.error?.message || 'Failed to synchronize roster', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error syncing roster', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const activeCount = colleges.filter((c) => c.status === 'active').length;
  const inactiveCount = colleges.filter((c) => c.status !== 'active').length;

  const filteredColleges = colleges.filter((c) => {
    if (filterMode === 'active' && c.status !== 'active') return false;
    if (filterMode === 'inactive' && c.status === 'active') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = (c.college_code || '').toLowerCase().includes(q);
      const nameMatch = (c.college_name || '').toLowerCase().includes(q);
      const locMatch = (c.location || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !locMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Top Summary Header & KPIs ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Registered */}
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-medium text-fg-subtle uppercase tracking-wider">Total Registered</p>
            <p className="text-2xl font-bold text-fg mt-1">{colleges.length}</p>
            <p className="text-[11px] text-fg-muted mt-0.5">Partner institutions in database</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Building2 size={22} />
          </div>
        </div>

        {/* Active Colleges */}
        <div className="bg-surface border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Live & Active</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
            <p className="text-[11px] text-fg-muted mt-0.5">Included in reports, daily leads & trackers</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Inactive Colleges */}
        <div className="bg-surface border border-slate-300 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive Mode</p>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">{inactiveCount}</p>
            <p className="text-[11px] text-fg-muted mt-0.5">Excluded until activated selectively</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-slate-500/15 text-slate-500 flex items-center justify-center">
            <XCircle size={22} />
          </div>
        </div>
      </div>

      {/* ── Control Strip: Search, Filter Tabs & Reset Roster ── */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by college name, code (e.g. KARPAGAM), location..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-muted/50 border border-border rounded-lg text-fg focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        {/* Filter Pills & Sync Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-surface-muted/80 p-1 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                filterMode === 'all'
                  ? 'bg-surface text-fg shadow-2xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              All ({colleges.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('active')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                filterMode === 'active'
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('inactive')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                filterMode === 'inactive'
                  ? 'bg-slate-600 text-white shadow-2xs'
                  : 'text-fg-subtle hover:text-fg'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncOfficialRoster}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition disabled:opacity-50"
            title="Reset to official 21 active partner colleges roster"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Official Roster'}</span>
          </button>
        </div>
      </div>

      {/* ── College Roster Table / Grid ── */}
      <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-fg uppercase tracking-wider">
              Partner Institution Roster ({filteredColleges.length})
            </h3>
          </div>
          <p className="text-[11px] text-fg-subtle">
            Toggle switch to immediately activate or inactivate an institution
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-fg-subtle italic flex flex-col items-center gap-2">
            <RefreshCw size={20} className="animate-spin text-primary" />
            <span>Loading institutional roster...</span>
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="p-12 text-center text-xs text-fg-subtle italic">
            No institutions match your current search or filter.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredColleges.map((college, idx) => {
              const isActive = college.status === 'active';
              const isUpdating = updatingId === college._id;

              return (
                <div
                  key={college._id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isActive
                      ? 'hover:bg-emerald-500/5'
                      : 'bg-surface-muted/20 opacity-80 hover:opacity-100 hover:bg-surface-muted/40'
                  }`}
                >
                  {/* Left: Code, Name & Meta */}
                  <div className="flex items-start gap-3.5">
                    {/* Index & Avatar */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-fg-subtle w-5 text-right">
                        {idx + 1}.
                      </span>
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border ${
                          isActive
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-surface-muted border-border text-fg-subtle'
                        }`}
                      >
                        {college.college_code.slice(0, 4)}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-fg">
                          {college.college_name}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            isActive
                              ? 'bg-primary/15 text-primary'
                              : 'bg-surface-muted text-fg-subtle border border-border'
                          }`}
                        >
                          {college.college_code}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-fg-muted mt-1 flex-wrap">
                        {college.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} className="text-fg-subtle" />
                            {college.location}
                          </span>
                        )}
                        {college.tpo_name && (
                          <span>• TPO: {college.tpo_name}</span>
                        )}
                        {college.tpo_contact_mobile && (
                          <span>• {college.tpo_contact_mobile}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Pill & Interactive Toggle */}
                  <div className="flex items-center gap-4 shrink-0 sm:self-center pl-10 sm:pl-0">
                    {/* Status Badge */}
                    <div>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      disabled={isUpdating}
                      onClick={() => handleToggleStatus(college)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary/20 ${
                        isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                      title={
                        isActive
                          ? `Click to deactivate ${college.college_code}`
                          : `Click to activate ${college.college_code}`
                      }
                    >
                      <span className="sr-only">Toggle {college.college_name} status</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Operational Note Alert ── */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3 text-xs text-fg-muted">
        <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-fg">How Institutional Filtering Operates</p>
          <p>
            Only <strong>Active</strong> colleges appear in report builders, daily leads entry, weekly tracker focus, and coordinator dashboards. Any colleges marked <strong>Inactive</strong> are automatically preserved in the database but hidden from all active operational views until activated above.
          </p>
        </div>
      </div>
    </div>
  );
}
