'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { KpiCards } from './components/KpiCards';
import { CollegeSelector, College } from './components/CollegeSelector';
import { ContactPickerModal } from './components/ContactPickerModal';
import { TrackerGrid } from './components/TrackerGrid';
import { CalendarPicker } from './components/CalendarPicker';
import { AutoSaveBadge } from './components/AutoSaveBadge';
import { SoftphonePanel, SoftphoneCallResult } from './components/SoftphonePanel';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { AlertTriangle, BookOpen, CalendarDays, ClipboardList, Download, RefreshCw, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';

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

export default function DailyTrackerPage() {
  // ── State
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>('');
  const [selectedCollegeObj, setSelectedCollegeObj] = useState<College | null>(null);
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
  const [missingEmailRows, setMissingEmailRows] = useState<string[]>([]);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [activeCallRow, setActiveCallRow] = useState<TrackerRow | null>(null);

  // Real signed-in identity. The backend still enforces ownership itself
  // (scopeToSelf pins a coordinator to their own id regardless of what's
  // sent) — this is just what the UI asks for by default.
  const [coordinatorId, setCoordinatorId] = useState<string>('');
  useEffect(() => {
    setCoordinatorId(readSessionUser()?._id ?? '');
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
      } else if (res.error?.code === 'START_TIME_REQUIRED') {
        // The save was refused, not completed — surfacing it as 'saved' here
        // used to mislead the coordinator into thinking the row was recorded.
        setSaveStatus('idle');
        alert(res.error.message);
      } else {
        setSaveStatus('idle');
      }
    } catch (e) {
      console.error('[DT] Row update failed', e);
      setSaveStatus('idle');
    }
  }, [loadKpi]);

  // ── Handle Softphone wrap-up save (auto-populates tracker row)
  const handleSoftphoneSave = useCallback(async (result: SoftphoneCallResult) => {
    await handleRowUpdate(result.rowId, {
      call_start_time: result.call_start_time,
      call_end_time: result.call_end_time,
      duration_seconds: result.duration_seconds,
      duration_formatted: result.duration_formatted,
      outcome_status: result.outcome_status,
      follow_up_month: result.follow_up_month,
      comments: result.comments,
    });
    setActiveCallRow(null);
  }, [handleRowUpdate]);

  // ── Handle skip
  const handleSkip = useCallback(async (rowId: string) => {
    try {
      const res = await apiFetch(`/daily-tracker/${rowId}/skip`, { method: 'PATCH' });
      if (res.success) {
        setRows((prev) => prev.map((row) => row._id === rowId ? { ...row, is_skipped: true } : row));
        await loadKpi();
      }
    } catch (e) { console.error('[DT] Skip failed', e); }
  }, [loadKpi]);

  // ── Save Progress (Ctrl+S)
  const handleSaveProgress = useCallback(async () => {
    if (!selectedCollegeId) return;

    // Check for invite_mail rows with missing email — show soft warning
    const noEmailRows = rows.filter(
      (r) => r.outcome_status === 'invite_mail' && !r.email_id && !r.is_skipped
    );
    if (noEmailRows.length > 0) {
      setMissingEmailRows(noEmailRows.map((r) => r.company_name));
      setShowEmailWarning(true);
      return;
    }

    await doSaveProgress();
  }, [selectedCollegeId, rows]);

  const doSaveProgress = async () => {
    if (!coordinatorId) return;
    setSaveStatus('saving');
    try {
      const res = await apiFetch('/daily-tracker/save-progress', {
        method: 'POST',
        body: JSON.stringify({ coordinator_id: coordinatorId, college_id: selectedCollegeId }),
      });
      if (res.success) {
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setShowEmailWarning(false);
        const data = res.data as any;
        if (data.positive_promoted > 0) {
          console.log(`${data.positive_promoted} positive outcome(s) queued for Weekly Tracker`);
        }
      }
    } catch (e) {
      console.error('[DT] Save progress failed', e);
      setSaveStatus('idle');
    }
  };

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
    if (row.is_skipped && outcomeFilter !== 'all') return false;
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">

      {/* ── Top Section: Title & Top-Right Header ───────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 space-y-3 shrink-0 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Tracker title + date */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-primary">
                <ClipboardList size={18} strokeWidth={2.25} />
              </div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Daily Tracker
              </h1>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold">
                {isHistoryMode ? 'History Archive' : `${monthName} ${yearStr}`}
              </span>
              {isHistoryMode && (
                <span className="text-micro bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                  Read-Only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {isHistoryMode ? historyDisplayDate : todayDisplay}
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

            {/* Selected College Logo Badge (Dynamic Aspect Ratio) */}
            {selectedCollegeObj && (
              <div
                title={`${selectedCollegeObj.college_name} (${selectedCollegeObj.college_code})`}
                className="flex items-center justify-center bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs animate-fadeIn h-9 max-w-[160px] shrink-0"
              >
                {selectedCollegeObj.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedCollegeObj.logo_url}
                    alt={selectedCollegeObj.college_name}
                    className="max-h-7 max-w-full w-auto h-auto object-contain rounded"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-primary font-bold text-xs flex items-center justify-center font-mono">
                    {selectedCollegeObj.college_code?.slice(0, 2) || 'CL'}
                  </span>
                )}
              </div>
            )}

            {!isHistoryMode && (
              <AutoSaveBadge status={saveStatus} lastSavedAt={lastSavedAt} />
            )}
            <div className="shrink-0">
              <UserSignOutButton />
            </div>
          </div>
        </div>

        {/* ── Sub-bar: College Selector (Acronyms in History), Outcomes, Search & Counts ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <CollegeSelector
              selectedCollegeId={selectedCollegeId}
              onSelect={(id, name) => {
                setSelectedCollegeId(id);
                setSelectedCollegeName(name);
                setIsHistoryMode(false);
              }}
              onSelectCollege={(col) => {
                setSelectedCollegeObj(col);
              }}
            />

            {/* In History Mode, place Outcomes dropdown and Search field in the same row */}
            {isHistoryMode && (
              <>
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value as CallOutcome | 'all')}
                  className="bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-800 text-xs px-3 py-2 rounded-xl outline-none font-medium shadow-xs cursor-pointer"
                >
                  <option value="all">All Outcomes</option>
                  <option value="jd_received">JD Received</option>
                  <option value="positive">Positive</option>
                  <option value="hiring">Hiring</option>
                  <option value="call_back">Call Back</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="no_response">No Response</option>
                  <option value="not_hiring">Not Hiring</option>
                </select>

                <input
                  type="text"
                  placeholder="Search history records…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-800 text-xs px-3.5 py-2 rounded-xl outline-none shadow-xs w-44 sm:w-56"
                />
              </>
            )}
          </div>

          {/* Calls Counts Summary above table */}
          {isHistoryMode ? (
            <div className="flex items-center gap-2.5 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="text-slate-500 font-medium">Calls Loaded:</span>
                <span className="font-bold text-slate-900 tabular-nums font-mono text-sm">{historyTotalLoaded}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="text-emerald-700 font-medium">Completed:</span>
                <span className="font-bold text-emerald-800 tabular-nums font-mono text-sm">{historyCompletedCount}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium ml-1">
                Showing {displayRows.length} / {historyRows.length} rows
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="text-slate-500 font-medium">Calls Loaded Today:</span>
                <span className="text-sm font-bold text-primary tabular-nums font-mono">{kpi?.total_loaded ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="text-emerald-700 font-medium">Completed:</span>
                <span className="text-sm font-bold text-emerald-800 tabular-nums font-mono">{kpi?.completed ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Live Today Toolbar (Only rendered in live mode) ──────────────────── */}
      {!isHistoryMode && (
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50/75 border-b border-slate-200 flex-wrap">
          {/* Load Button */}
          <button
            onClick={() => {
              if (!selectedCollegeId) {
                alert('Please select a college first');
                return;
              }
              window.open('/tracker/load-contacts', '_blank');
            }}
            className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Click me to load contacts from metadata base"
          >
            <Download size={14} strokeWidth={2.5} aria-hidden /> Load
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveProgress}
            disabled={!selectedCollegeId}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="You can use Ctrl + S to save the progress"
          >
            <Save size={14} strokeWidth={2.5} aria-hidden /> Save
          </button>

          {/* Refresh (Butter Yellow) */}
          <button
            onClick={() => { loadTodayRows(); loadKpi(); }}
            className="flex items-center gap-1.5 bg-[#FEF3C7] hover:bg-[#FDE68A] text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Refresh calls table"
          >
            <RefreshCw size={14} strokeWidth={2} aria-hidden /> Refresh
          </button>

          {/* History / Calendar */}
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <CalendarDays size={14} strokeWidth={2} aria-hidden /> History
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* Filter by outcome */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as CallOutcome | 'all')}
            className="bg-white border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-xl outline-none font-medium shadow-xs"
          >
            <option value="all">All Outcomes</option>
            <option value="jd_received">JD Received</option>
            <option value="hiring_freezed">Hiring Freezed</option>
            <option value="hiring_completed">Hiring Completed</option>
            <option value="call_back">Call Back</option>
            <option value="hiring">Hiring</option>
            <option value="invite_mail">Invite Mail</option>
            <option value="not_hiring">Not Hiring</option>
            <option value="no_response">No Response</option>
            <option value="follow_up">Follow Up</option>
            <option value="in_connect">In Connect</option>
            <option value="invalid">Invalid</option>
            <option value="drive_completed">Drive Completed</option>
          </select>

          {/* Search */}
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search company, HR, mobile…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-3.5 py-2 rounded-xl outline-none placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* Row count */}
          <span className="ml-auto text-xs text-slate-500 font-medium">
            Showing {displayRows.length} / {rows.length} rows
          </span>
        </div>
      )}

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
            onSkip={handleSkip}
            onCall={(row) => setActiveCallRow(row)}
          />
        </div>
      )}

      {/* ── Bottom Status Bar ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center gap-6 text-xs text-slate-500 font-medium shrink-0">
        <span>Total: <strong className="text-slate-900">{isHistoryMode ? historyRows.length : rows.length}</strong> rows</span>
        <span>Completed: <strong className="text-emerald-700 font-bold">{isHistoryMode ? historyCompletedCount : (kpi?.completed ?? 0)}</strong></span>
        <span>Pending: <strong className="text-amber-700 font-bold">{isHistoryMode ? Math.max(0, historyTotalLoaded - historyCompletedCount) : (kpi?.pending ?? 0)}</strong></span>
        {!isHistoryMode && <span>Positive: <strong className="text-primary font-bold">{kpi?.positive ?? 0}</strong></span>}
        {isHistoryMode && (
          <span className="ml-auto text-slate-400 font-medium text-xs">
            {historyDate}
          </span>
        )}
        {lastSavedAt && !isHistoryMode && (
          <span className="ml-auto text-slate-500">
            Last saved: <strong className="text-slate-700 font-mono">{lastSavedAt.toLocaleTimeString('en-IN')}</strong>
          </span>
        )}
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

      {/* ── Missing Email Warning Dialog ───────────────────────────────────── */}
      {showEmailWarning && (
        <div className="fixed inset-0 scrim flex items-center justify-center z-50">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full mx-4 border border-warning/30">
            <h3 className="text-lg font-semibold text-warning mb-3"><AlertTriangle size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Missing Email IDs</h3>
            <p className="text-sm text-fg-muted mb-3">
              <strong>{missingEmailRows.length}</strong> company(s) with "Invite Mail" outcome are missing Email ID.
              Progress will be saved — these will appear tomorrow as Pending Information.
            </p>
            <ul className="text-xs text-fg-subtle mb-4 list-disc list-inside">
              {missingEmailRows.map((name) => <li key={name}>{name}</li>)}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={doSaveProgress}
                className="flex-1 bg-warning hover:bg-warning text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Save Anyway
              </button>
              <button
                onClick={() => setShowEmailWarning(false)}
                className="flex-1 bg-surface-raised hover:bg-surface-raised text-fg px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
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
