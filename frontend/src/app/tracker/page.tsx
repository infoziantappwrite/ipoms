'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { KpiCards } from './components/KpiCards';
import { CollegeSelector, College } from './components/CollegeSelector';
import { ContactPickerModal } from './components/ContactPickerModal';
import { TrackerGrid } from './components/TrackerGrid';
import { CalendarPicker } from './components/CalendarPicker';
import { SoftphonePanel, SoftphoneCallResult } from './components/SoftphonePanel';
import { SmoothOutcomeDropdown } from '@/components/ui/SmoothOutcomeDropdown';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Cloud, Download, Loader2, PhoneCall, Plus, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { ManualAddRowModal } from './components/ManualAddRowModal';

// ── Types ────────────────────────────────────────────────────────────────────

export type CallOutcome =
  | 'jd_received'
  | 'hiring_freezed'
  | 'hiring_completed'
  | 'call_back'
  | 'hiring'
  | 'invite_mail'
  | 'not_hiring'
  | 'no_response'
  | 'follow_up'
  | 'in_connect'
  | 'invalid'
  | 'drive_completed';

export interface TrackerRow {
  _id: string;
  serial_no: number;
  company_name: string;
  hr_name: string;
  mobile_number: string;
  email_id?: string;
  call_start_time?: string;
  call_end_time?: string;
  duration_seconds?: number;
  duration_formatted?: string;
  outcome_status?: CallOutcome;
  follow_up_month?: string | null;
  comments?: string;
  is_skipped: boolean;
  is_finalized: boolean;
  last_saved_at?: string;
}

export interface KpiData {
  total_loaded: number;
  completed: number;
  pending: number;
  positive: number;
  no_response: number;
  follow_up: number;
  skipped: number;
}

// ── Page ─────────────────────────────────────────────────────────────────────

import { getActiveCollege, resolveDefaultCollege } from '@/lib/collegeSession';

export default function DailyTrackerPage() {
  // ── State
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(() => {
    return getActiveCollege().id || '';
  });
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>(() => {
    return getActiveCollege().name || '';
  });
  const [selectedCollegeObj, setSelectedCollegeObj] = useState<College | null>(() => {
    return getActiveCollege().obj || null;
  });
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyDate, setHistoryDate] = useState<string>('');
  const [historyRows, setHistoryRows] = useState<TrackerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all');
  const [activeCallRow, setActiveCallRow] = useState<TrackerRow | null>(null);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);

  // Real signed-in identity. The backend still enforces ownership itself
  // (scopeToSelf pins a coordinator to their own id regardless of what's
  // sent) — this is just what the UI asks for by default.
  const [coordinatorId, setCoordinatorId] = useState<string>('');
  useEffect(() => {
    const user = readSessionUser();
    const cId = user?._id ?? '';
    setCoordinatorId(cId);

    resolveDefaultCollege().then((col) => {
      if (col.id) {
        setSelectedCollegeId(col.id);
        setSelectedCollegeName(col.name);
        if (col.obj) setSelectedCollegeObj(col.obj);
      }
    });
  }, []);

  // ── Derive today's title (e.g. "August Tracker 2026")
  const today = new Date();
  const monthName = today.toLocaleString('en-IN', { month: 'long' });
  const yearStr = today.getFullYear();
  const trackerTitle = `${monthName} Tracker ${yearStr}`;
  const todayDisplay = today.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Load today's tracker rows
  const loadTodayRows = useCallback(async () => {
    if (!selectedCollegeId || !coordinatorId) return;
    try {
      const res = await apiFetch(`/daily-tracker/today?coordinator_id=${coordinatorId}&college_id=${selectedCollegeId}`);
      if (res.success) {
        setRows((res.data as any).rows);
        setSessionDate((res.data as any).session_date);
      }
    } catch (e) { console.error('[DT] Load today failed', e); }
  }, [selectedCollegeId, coordinatorId]);

  // ── Load KPI counts
  const loadKpi = useCallback(async () => {
    if (!selectedCollegeId || !coordinatorId) return;
    try {
      const res = await apiFetch(`/daily-tracker/kpi?coordinator_id=${coordinatorId}&college_id=${selectedCollegeId}`);
      if (res.success) setKpi((res.data as any).kpi);
    } catch (e) { console.error('[KPI] Load failed', e); }
  }, [selectedCollegeId, coordinatorId]);

  // ── Load both on college change or refresh
  useEffect(() => {
    if (selectedCollegeId) {
      loadTodayRows();
      loadKpi();
    }
  }, [selectedCollegeId, loadTodayRows, loadKpi]);

  // ── Auto-refresh KPI every 30 seconds (live update)
  useEffect(() => {
    if (!selectedCollegeId) return;
    const interval = setInterval(loadKpi, 30000);
    return () => clearInterval(interval);
  }, [selectedCollegeId, loadKpi]);

  // ── Handle contact picker load (Debounced to prevent multiple parallel triggers)
  const lastSyncRef = useRef<{ time: number; ids: string }>({ time: 0, ids: '' });
  const handleContactsLoaded = useCallback(async (companyIds: string[]) => {
    if (!selectedCollegeId || !coordinatorId || companyIds.length === 0) return;

    const idsKey = companyIds.slice().sort().join(',');
    const now = Date.now();
    if (now - lastSyncRef.current.time < 2000 && lastSyncRef.current.ids === idsKey) {
      // Ignore duplicate parallel trigger
      return;
    }
    lastSyncRef.current = { time: now, ids: idsKey };

    try {
      const res = await apiFetch('/daily-tracker/load-contacts', {
        method: 'POST',
        body: JSON.stringify({
          coordinator_id: coordinatorId,
          college_id: selectedCollegeId,
          company_ids: companyIds,
        }),
      });
      if (res.success) {
        await loadTodayRows();
        await loadKpi();
        const data = res.data as any;
        if (data.duplicates_skipped > 0 && data.loaded === 0) {
          alert(`Selected contact(s) are already loaded in today's tracker for this college:\n${data.duplicate_companies.join(', ')}`);
        }
      }
    } catch (e) { console.error('[DT] Load contacts failed', e); }
  }, [selectedCollegeId, coordinatorId, loadTodayRows, loadKpi]);

  // ── Listen for imported contacts from the Load Contacts new tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'IPOMS_LOAD_CONTACTS' && Array.isArray(event.data.companyIds)) {
        handleContactsLoaded(event.data.companyIds);
      }
    };
    window.addEventListener('message', handleMessage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('ipoms_tracker_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'LOAD_CONTACTS' && Array.isArray(event.data.companyIds)) {
          handleContactsLoaded(event.data.companyIds);
        }
      };
    } catch {
      // BroadcastChannel unsupported
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'ipoms_imported_contacts' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed.ids) && parsed.ids.length > 0) {
            handleContactsLoaded(parsed.ids);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      channel?.close();
    };
  }, [handleContactsLoaded]);

  // ── Auto-reset saved badge status
  useEffect(() => {
    if (saveStatus === 'saved') {
      const t = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  // ── Handle row update (auto-save on each change)
  const handleRowUpdate = useCallback(async (rowId: string, patch: Partial<TrackerRow>) => {
    setSaveStatus('saving');
    try {
      const res = await apiFetch(`/daily-tracker/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (res.success) {
        setRows((prev) => prev.map((row) => row._id === rowId ? { ...row, ...(res.data as any) } : row));
        await loadKpi();
        setSaveStatus('saved');
        setLastSavedAt(new Date());

        // Automatically background sync progress to Weekly Tracker without manual intervention
        if (coordinatorId && selectedCollegeId) {
          apiFetch('/daily-tracker/save-progress', {
            method: 'POST',
            body: JSON.stringify({ coordinator_id: coordinatorId, college_id: selectedCollegeId }),
          }).catch((err) => console.error('[DT] Auto-save progress sync failed', err));
        }
      } else if (res.error?.code === 'START_TIME_REQUIRED') {
        setSaveStatus('idle');
        alert(res.error?.message || res.message || 'Call start time is required before saving.');
      } else {
        setSaveStatus('idle');
      }
    } catch (e) {
      console.error('[DT] Row update failed', e);
      setSaveStatus('idle');
    }
  }, [loadKpi, coordinatorId, selectedCollegeId]);

  // ── Handle manual contact row added
  const handleManualRowAdded = useCallback((newRow: TrackerRow) => {
    setRows((prev) => {
      const next = [...prev, newRow];
      return next.map((r, idx) => ({ ...r, serial_no: idx + 1 }));
    });
    loadKpi();
  }, [loadKpi]);

  // ── Handle Softphone wrap-up save (auto-populates tracker row)
  const handleSoftphoneSave = useCallback(async (result: SoftphoneCallResult) => {
    const patch: Partial<TrackerRow> = {
      outcome_status: result.outcomeStatus,
      follow_up_month: result.followUpMonth || null,
      comments: result.comments,
    };
    if (result.callDurationSeconds !== undefined && result.callDurationSeconds > 0) {
      patch.duration_seconds = result.callDurationSeconds;
      const mins = Math.floor(result.callDurationSeconds / 60);
      const secs = result.callDurationSeconds % 60;
      patch.duration_formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    await handleRowUpdate(result.rowId, patch);
    setActiveCallRow(null);
  }, [handleRowUpdate]);

  // ── Handle delete row
  const handleDeleteRow = useCallback(async (rowId: string) => {
    if (!confirm('Are you sure you want to remove this contact from today\'s calling sheet?')) return;
    try {
      const res = await apiFetch(`/daily-tracker/${rowId}`, { method: 'DELETE' });
      if (res.success) {
        setRows((prev) => prev.filter((row) => row._id !== rowId).map((r, idx) => ({ ...r, serial_no: idx + 1 })));
        await loadKpi();
      }
    } catch (e) { console.error('[DT] Delete failed', e); }
  }, [loadKpi]);

  // ── Save Progress (Ctrl+S)
  const handleSaveProgress = useCallback(async () => {
    if (!selectedCollegeId || !coordinatorId) return;

    // Verify mandatory Follow Up Month for rows marked as follow_up
    const missingFollowUp = rows.find((r) => !r.is_skipped && r.outcome_status === 'follow_up' && !r.follow_up_month);
    if (missingFollowUp) {
      alert(`Follow Up Month is mandatory for "${missingFollowUp.company_name}" (Row #${missingFollowUp.serial_no}). Please select a month.`);
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');
    try {
      const res = await apiFetch('/daily-tracker/save-progress', {
        method: 'POST',
        body: JSON.stringify({ coordinator_id: coordinatorId, college_id: selectedCollegeId }),
      });
      if (res.success) {
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        const data = res.data as any;
        if (data.positive_promoted > 0) {
          console.log(`${data.positive_promoted} positive outcome(s) queued for Weekly Tracker`);
        }
      }
    } catch (e) {
      console.error('[DT] Save progress failed', e);
      setSaveStatus('idle');
    }
  }, [selectedCollegeId, coordinatorId]);

  // ── Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProgress();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveProgress]);

  // ── Load history view
  const handleViewHistory = async (date: string) => {
    if (!coordinatorId) return;
    setIsCalendarOpen(false);
    setHistoryDate(date);
    try {
      const res = await apiFetch(`/daily-tracker/history?coordinator_id=${coordinatorId}&date=${date}`);
      if (res.success) {
        setHistoryRows((res.data as any).rows);
        setIsHistoryMode(true);
      }
    } catch (e) { console.error('[DT] History load failed', e); }
  };

  // ── Filtered rows for display
  const activeRows = isHistoryMode ? historyRows : rows;
  const displayRows = activeRows.filter((row) => {
    if (outcomeFilter !== 'all' && row.outcome_status !== outcomeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        row.company_name.toLowerCase().includes(q) ||
        row.hr_name.toLowerCase().includes(q) ||
        row.mobile_number.includes(q)
      );
    }
    return true;
  });

  // ── History View Statistics
  const historyTotalLoaded = historyRows.length;
  const historyCompletedCount = historyRows.filter(
    (r) => r.outcome_status && !r.is_skipped
  ).length;
  const historyDisplayDate = historyDate
    ? new Date(historyDate).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col font-sans">

      {/* ── Top Section: Title & Top-Right Header ───────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 space-y-3 shrink-0 shadow-xs text-fg">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Tracker title + date */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <PhoneCall size={18} strokeWidth={2.25} />
              </div>
              <h1 className="text-base font-bold text-fg tracking-tight">
                Daily Tracker
              </h1>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-semibold">
                {isHistoryMode ? 'History Archive' : `${monthName} ${yearStr}`}
              </span>
              {isHistoryMode && (
                <span className="text-micro bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 px-2.5 py-0.5 rounded-full font-bold">
                  Read-Only
                </span>
              )}
            </div>
            <p className="text-xs text-fg-subtle mt-0.5">
              {isHistoryMode
                ? `Viewing archived records for ${historyDisplayDate}`
                : `Active Session: ${sessionDate ? new Date(sessionDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : todayDisplay} • Auto-resets at 6:00 AM IST`}
            </p>
          </div>

          {/* Right: Back to Today (in history) + Selected College Logo Badge + Sign Out */}
          <div className="flex items-center gap-3">
            {isHistoryMode && (
              <button
                onClick={() => setIsHistoryMode(false)}
                className="px-3.5 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Back to Today
              </button>
            )}

            {/* Selected College Logo Badge + Location */}
            {selectedCollegeObj && (
              <div className="flex items-center gap-2">
                <div
                  title={`${selectedCollegeObj.college_name} (${selectedCollegeObj.college_code})`}
                  className="flex items-center justify-center bg-surface border border-border px-2.5 py-1 rounded-xl shadow-xs animate-fadeIn h-9 max-w-[160px] shrink-0"
                >
                  {selectedCollegeObj.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedCollegeObj.logo_url}
                      alt={selectedCollegeObj.college_name}
                      className="max-h-7 max-w-full w-auto h-auto object-contain rounded"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono">
                      {selectedCollegeObj.college_code?.slice(0, 2) || 'CL'}
                    </span>
                  )}
                </div>
                {selectedCollegeObj.location && (
                  <span
                    className="text-xs text-fg-subtle font-medium hidden sm:inline truncate max-w-[160px]"
                    title={selectedCollegeObj.location}
                  >
                    {selectedCollegeObj.location}
                  </span>
                )}
              </div>
            )}

            <div className="shrink-0">
              <UserSignOutButton />
            </div>
          </div>
        </div>

        {/* ── Sub-bar: Unified Controls Row (College Selector + Actions + Filter + Search) ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/80 relative z-30">
          <div className="flex items-center gap-2.5 flex-wrap">
            <CollegeSelector
              selectedCollegeId={selectedCollegeId}
              onSelect={(id, name) => {
                setSelectedCollegeId(id);
                setSelectedCollegeName(name);
                setIsHistoryMode(false);
                try {
                  localStorage.setItem('ipoms_daily_tracker_college_id', id);
                  localStorage.setItem('ipoms_daily_tracker_college_name', name);
                } catch (e) {}
              }}
              onSelectCollege={(col) => {
                setSelectedCollegeObj(col);
                try {
                  if (col) {
                    localStorage.setItem('ipoms_daily_tracker_college_obj', JSON.stringify(col));
                  } else {
                    localStorage.removeItem('ipoms_daily_tracker_college_obj');
                  }
                } catch (e) {}
              }}
            />

            {!isHistoryMode ? (
              <>
                {/* Load Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedCollegeId) {
                      alert('Please select a college first');
                      return;
                    }
                    window.open('/tracker/load-contacts', '_blank');
                  }}
                  className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Click me to load contacts from metadata base"
                >
                  <Download size={14} strokeWidth={2.5} aria-hidden /> Load
                </button>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={!selectedCollegeId}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Save Progress (Ctrl + S)"
                >
                  <Save size={14} strokeWidth={2.5} aria-hidden /> Save
                </button>

                {/* History / Calendar */}
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(true)}
                  className="flex items-center gap-1.5 bg-surface hover:bg-surface-sunken text-fg border border-border px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <CalendarDays size={14} strokeWidth={2} aria-hidden /> History
                </button>

                {/* + Add Manual Row Button (Next to History) */}
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(true)}
                  title="Add Custom Entry (Row-wise)"
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                >
                  <Plus size={16} strokeWidth={2.5} aria-hidden />
                </button>

                {/* Divider */}
                <div className="h-5 w-px bg-border mx-0.5 shrink-0 hidden sm:block" />

                {/* Filter by outcome (Smooth UI Dropdown) */}
                <SmoothOutcomeDropdown
                  value={outcomeFilter}
                  onChange={setOutcomeFilter}
                />

                {/* Search */}
                <div className="w-48 sm:w-56 shrink-0">
                  <input
                    type="text"
                    placeholder="Search company, HR, mobile…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-fg text-xs px-3.5 py-1.5 rounded-xl outline-none placeholder:text-fg-disabled shadow-xs transition-colors"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Back to Live Today */}
                <button
                  type="button"
                  onClick={() => setIsHistoryMode(false)}
                  className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Back to Today
                </button>

                {/* History Date Badge */}
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <CalendarDays size={14} strokeWidth={2} aria-hidden /> {historyDate}
                </button>

                {/* Divider */}
                <div className="h-5 w-px bg-border mx-0.5 shrink-0 hidden sm:block" />

                {/* Filter by outcome (Smooth UI Dropdown) */}
                <SmoothOutcomeDropdown
                  value={outcomeFilter}
                  onChange={setOutcomeFilter}
                />

                {/* Search */}
                <div className="w-48 sm:w-56 shrink-0">
                  <input
                    type="text"
                    placeholder="Search history records…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-fg text-xs px-3.5 py-1.5 rounded-xl outline-none placeholder:text-fg-disabled shadow-xs"
                  />
                </div>
              </>
            )}
          </div>

          {/* Row count summary */}
          <div className="ml-auto text-xs text-fg-subtle font-medium shrink-0">
            Showing {displayRows.length} / {isHistoryMode ? historyRows.length : rows.length} rows
          </div>
        </div>
      </header>

      {/* ── KPI Cards (Slim Single-Row Profile) ──────────────────────────── */}
      {kpi && !isHistoryMode && (
        <div className="px-6 py-2">
          <KpiCards kpi={kpi} />
        </div>
      )}

      {/* ── No College Selected state ──────────────────────────────────────── */}
      {!selectedCollegeId && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-fg-subtle">
          <ClipboardList size={56} strokeWidth={1.5} aria-hidden />
          <p className="text-xl font-semibold text-fg-subtle">Select a College to Begin</p>
          <p className="text-sm">Choose a college from the dropdown above, then load contacts to start logging calls.</p>
        </div>
      )}

      {/* ── Tracker Grid ──────────────────────────────────────────────────── */}
      {selectedCollegeId && (
        <div className="flex-1 overflow-hidden flex flex-col px-6 pb-2">
          <TrackerGrid
            rows={displayRows}
            isReadOnly={isHistoryMode}
            onRowUpdate={handleRowUpdate}
            onDelete={handleDeleteRow}
            onCall={(row) => setActiveCallRow(row)}
          />
        </div>
      )}

      {/* ── Bottom Unified Status Bar ─────────────────────────────────────── */}
      <footer className="bg-surface border-t border-border px-6 py-2.5 flex items-center justify-between gap-4 text-xs text-fg-subtle font-medium shrink-0 flex-wrap shadow-2xs">
        {/* Left: Friendly Reminder (in live mode) */}
        {!isHistoryMode ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold text-[11px] shadow-2xs">
            <Save size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Don&apos;t forget to save with <kbd className="bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono text-[10.5px]">Ctrl+S</kbd> or the <strong>Save</strong> button to record your call data!</span>
          </div>
        ) : (
          <div className="text-xs text-fg-subtle font-medium flex items-center gap-2">
            <span className="font-semibold text-fg">Historical Archive</span> (Read-Only)
          </div>
        )}

        {/* Right Corner: Keyboard Shortcuts & Last Saved Timestamp */}
        <div className="flex items-center gap-4 shrink-0">
          {!isHistoryMode && (
            <div className="hidden md:flex items-center gap-3 text-micro text-fg-subtle font-normal">
              <span><kbd className="bg-surface-sunken border border-border px-1.5 py-0.5 rounded text-fg font-mono font-medium shadow-2xs">Tab</kbd> Next cell</span>
              <span><kbd className="bg-surface-sunken border border-border px-1.5 py-0.5 rounded text-fg font-mono font-medium shadow-2xs">Enter</kbd> Save row</span>
              <span><kbd className="bg-surface-sunken border border-border px-1.5 py-0.5 rounded text-fg font-mono font-medium shadow-2xs">Del</kbd> Clear cell</span>
            </div>
          )}

          {isHistoryMode ? (
            <span className="text-fg-subtle font-medium text-xs">
              {historyDate}
            </span>
          ) : lastSavedAt ? (
            <span className="text-fg-subtle text-xs">
              Last saved: <strong className="text-fg font-mono">{lastSavedAt.toLocaleTimeString('en-IN')}</strong>
            </span>
          ) : null}
        </div>
      </footer>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {isPickerOpen && (
        <ContactPickerModal
          onClose={() => setIsPickerOpen(false)}
          onLoad={handleContactsLoaded}
        />
      )}

      {isCalendarOpen && (
        <CalendarPicker
          coordinatorId={coordinatorId}
          onClose={() => setIsCalendarOpen(false)}
          onSelectDate={handleViewHistory}
        />
      )}

      {isManualAddOpen && (
        <ManualAddRowModal
          coordinatorId={coordinatorId}
          collegeId={selectedCollegeId}
          sessionDate={sessionDate}
          onClose={() => setIsManualAddOpen(false)}
          onRowAdded={handleManualRowAdded}
        />
      )}


      {/* ── Softphone Panel (Click-to-Call) ───────────────────────────────── */}
      <SoftphonePanel
        row={activeCallRow}
        onSave={handleSoftphoneSave}
        onClose={() => setActiveCallRow(null)}
      />
    </div>
  );
}
