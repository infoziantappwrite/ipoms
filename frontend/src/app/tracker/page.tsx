'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { KpiCards } from './components/KpiCards';
import { CollegeSelector } from './components/CollegeSelector';
import { ContactPickerModal } from './components/ContactPickerModal';
import { TrackerGrid } from './components/TrackerGrid';
import { CalendarPicker } from './components/CalendarPicker';
import { AutoSaveBadge } from './components/AutoSaveBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ── Types ────────────────────────────────────────────────────────────────────

export type CallOutcome =
  | 'no_response' | 'invalid' | 'not_hiring' | 'already_connected'
  | 'follow_up' | 'invite_mail' | 'drive_scheduled' | 'drive_in_progress' | 'drive_completed';

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

  // Hardcoded coordinator until auth is wired — will come from JWT in production
  const COORDINATOR_ID = '000000000000000000000001';

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
    if (!selectedCollegeId) return;
    try {
      const r = await fetch(`${API}/daily-tracker/today?coordinator_id=${COORDINATOR_ID}&college_id=${selectedCollegeId}`);
      const data = await r.json();
      if (data.success) {
        setRows(data.data.rows);
        setSessionDate(data.data.session_date);
      }
    } catch (e) { console.error('[DT] Load today failed', e); }
  }, [selectedCollegeId]);

  // ── Load KPI counts
  const loadKpi = useCallback(async () => {
    if (!selectedCollegeId) return;
    try {
      const r = await fetch(`${API}/daily-tracker/kpi?coordinator_id=${COORDINATOR_ID}&college_id=${selectedCollegeId}`);
      const data = await r.json();
      if (data.success) setKpi(data.data.kpi);
    } catch (e) { console.error('[KPI] Load failed', e); }
  }, [selectedCollegeId]);

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

  // ── Handle contact picker load
  const handleContactsLoaded = useCallback(async (companyIds: string[]) => {
    if (!selectedCollegeId || companyIds.length === 0) return;
    try {
      const r = await fetch(`${API}/daily-tracker/load-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinator_id: COORDINATOR_ID,
          college_id: selectedCollegeId,
          company_ids: companyIds,
        }),
      });
      const data = await r.json();
      if (data.success) {
        await loadTodayRows();
        await loadKpi();
        if (data.data.duplicates_skipped > 0) {
          alert(`⚠️ ${data.data.duplicates_skipped} duplicate(s) already exist in today's tracker and were skipped:\n${data.data.duplicate_companies.join(', ')}`);
        }
      }
    } catch (e) { console.error('[DT] Load contacts failed', e); }
  }, [selectedCollegeId, loadTodayRows, loadKpi]);

  // ── Handle row update (auto-save on each change)
  const handleRowUpdate = useCallback(async (rowId: string, patch: Partial<TrackerRow>) => {
    setSaveStatus('saving');
    try {
      const r = await fetch(`${API}/daily-tracker/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await r.json();
      if (data.success) {
        setRows((prev) => prev.map((row) => row._id === rowId ? { ...row, ...data.data } : row));
        await loadKpi();
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } else if (data.error?.code === 'START_TIME_REQUIRED') {
        setSaveStatus('saved');
        alert(data.error.message);
      } else {
        setSaveStatus('idle');
      }
    } catch (e) {
      console.error('[DT] Row update failed', e);
      setSaveStatus('idle');
    }
  }, [loadKpi]);

  // ── Handle skip
  const handleSkip = useCallback(async (rowId: string) => {
    try {
      const r = await fetch(`${API}/daily-tracker/${rowId}/skip`, { method: 'PATCH' });
      const data = await r.json();
      if (data.success) {
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
    setSaveStatus('saving');
    try {
      const r = await fetch(`${API}/daily-tracker/save-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinator_id: COORDINATOR_ID, college_id: selectedCollegeId }),
      });
      const data = await r.json();
      if (data.success) {
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setShowEmailWarning(false);
        if (data.data.positive_promoted > 0) {
          console.log(`✅ ${data.data.positive_promoted} positive outcome(s) queued for Weekly Tracker`);
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
    setIsCalendarOpen(false);
    setHistoryDate(date);
    try {
      const r = await fetch(`${API}/daily-tracker/history?coordinator_id=${COORDINATOR_ID}&date=${date}`);
      const data = await r.json();
      if (data.success) {
        setHistoryRows(data.data.rows);
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">

      {/* ── Top Section ───────────────────────────────────────────────────── */}
      <header className="glass-panel border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* Left: Tracker title + date */}
          <div>
            <div className="flex items-center gap-2">
              {isHistoryMode && (
                <button
                  onClick={() => setIsHistoryMode(false)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-md transition-colors"
                >
                  ← Back to Today
                </button>
              )}
              <h1 className="text-xl font-bold text-white">
                {isHistoryMode
                  ? `📅 History — ${new Date(historyDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : `📋 ${trackerTitle}`}
              </h1>
              {isHistoryMode && (
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Read-Only
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{todayDisplay}</p>
          </div>

          {/* Centre: College selector */}
          <div className="flex items-center gap-3">
            <CollegeSelector
              selectedCollegeId={selectedCollegeId}
              onSelect={(id, name) => {
                setSelectedCollegeId(id);
                setSelectedCollegeName(name);
                setIsHistoryMode(false);
              }}
            />
          </div>

          {/* Right: Auto-save badge + Call count */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{kpi?.total_loaded ?? 0}</p>
              <p className="text-xs text-slate-400">Loaded Today</p>
            </div>
            <AutoSaveBadge status={saveStatus} lastSavedAt={lastSavedAt} />
          </div>
        </div>
      </header>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      {!isHistoryMode && (
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-900/50 border-b border-slate-800 flex-wrap">
          {/* Load Contacts */}
          <button
            onClick={() => selectedCollegeId ? setIsPickerOpen(true) : alert('Please select a college first')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <span>📥</span> Load Contacts
          </button>

          {/* Save Progress (Ctrl+S) */}
          <button
            onClick={handleSaveProgress}
            disabled={!selectedCollegeId}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <span>💾</span> Save Progress
            <kbd className="text-xs bg-emerald-800 px-1 py-0.5 rounded">Ctrl+S</kbd>
          </button>

          {/* Refresh */}
          <button
            onClick={() => { loadTodayRows(); loadKpi(); }}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <span>🔄</span> Refresh
          </button>

          {/* History / Calendar */}
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <span>📅</span> History
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-700 mx-1" />

          {/* Filter by outcome */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as CallOutcome | 'all')}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Outcomes</option>
            <option value="no_response">No Response</option>
            <option value="invalid">Invalid</option>
            <option value="not_hiring">Not Hiring</option>
            <option value="already_connected">Already Connected</option>
            <option value="follow_up">Follow Up</option>
            <option value="invite_mail">Invite Mail</option>
            <option value="drive_scheduled">Drive Scheduled</option>
            <option value="drive_in_progress">Drive In Progress</option>
            <option value="drive_completed">Drive Completed</option>
          </select>

          {/* Search */}
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search company, HR, mobile…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          {/* Row count */}
          <span className="ml-auto text-xs text-slate-400">
            Showing {displayRows.length} / {rows.length} rows
          </span>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      {kpi && !isHistoryMode && (
        <div className="px-6 py-4">
          <KpiCards kpi={kpi} />
        </div>
      )}

      {/* ── No College Selected state ──────────────────────────────────────── */}
      {!selectedCollegeId && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
          <div className="text-6xl">📋</div>
          <p className="text-xl font-semibold text-slate-400">Select a College to Begin</p>
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
          />
        </div>
      )}

      {/* ── Bottom Status Bar ─────────────────────────────────────────────── */}
      <footer className="glass-panel border-t border-slate-800 px-6 py-2 flex items-center gap-6 text-xs text-slate-400">
        <span>Total: <strong className="text-slate-200">{rows.length}</strong> rows</span>
        <span>Completed: <strong className="text-emerald-400">{kpi?.completed ?? 0}</strong></span>
        <span>Pending: <strong className="text-amber-400">{kpi?.pending ?? 0}</strong></span>
        <span>Positive: <strong className="text-blue-400">{kpi?.positive ?? 0}</strong></span>
        {kpi && kpi.total_loaded > 0 && (
          <span>
            Progress:{' '}
            <strong className="text-white">
              {Math.round(((kpi.completed + kpi.skipped) / kpi.total_loaded) * 100)}%
            </strong>
          </span>
        )}
        {isHistoryMode && (
          <span className="ml-auto text-amber-400">📖 Viewing history — {historyDate} — Read-Only</span>
        )}
        {lastSavedAt && !isHistoryMode && (
          <span className="ml-auto">
            Last saved: <strong className="text-slate-300">{lastSavedAt.toLocaleTimeString('en-IN')}</strong>
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
          coordinatorId={COORDINATOR_ID}
          onClose={() => setIsCalendarOpen(false)}
          onSelectDate={handleViewHistory}
        />
      )}

      {/* ── Missing Email Warning Dialog ───────────────────────────────────── */}
      {showEmailWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full mx-4 border border-amber-500/30">
            <h3 className="text-lg font-semibold text-amber-400 mb-3">⚠️ Missing Email IDs</h3>
            <p className="text-sm text-slate-300 mb-3">
              <strong>{missingEmailRows.length}</strong> company(s) with "Invite Mail" outcome are missing Email ID.
              Progress will be saved — these will appear tomorrow as Pending Information.
            </p>
            <ul className="text-xs text-slate-400 mb-4 list-disc list-inside">
              {missingEmailRows.map((name) => <li key={name}>{name}</li>)}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={doSaveProgress}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Save Anyway
              </button>
              <button
                onClick={() => setShowEmailWarning(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
