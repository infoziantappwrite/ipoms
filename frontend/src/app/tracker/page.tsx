'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CollegeSelector, College } from './components/CollegeSelector';
import { ContactPickerModal } from './components/ContactPickerModal';
import { TrackerGrid } from './components/TrackerGrid';
import { CalendarPicker } from './components/CalendarPicker';
import { SoftphonePanel, SoftphoneCallResult } from './components/SoftphonePanel';
import { SmoothOutcomeDropdown } from '@/components/ui/SmoothOutcomeDropdown';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { AutoSaveBadge } from '@/components/ui/AutoSaveBadge';
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Cloud, Loader2, PhoneCall, Plus, Save, Search, Trash2, Upload, Undo2, Redo2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { ManualAddRowModal } from './components/ManualAddRowModal';
import { EditTrackerRowModal } from './components/EditTrackerRowModal';
import { BulkDeleteTrackerModal } from './components/BulkDeleteTrackerModal';
import { DeleteRowConfirmModal } from './components/DeleteRowConfirmModal';
import { TrackerActionsDropdown } from './components/TrackerActionsDropdown';
import { DailySummaryModal } from './components/DailySummaryModal';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';
import { useUndoRedo } from '@/hooks/useUndoRedo';

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
  /** Only present in history mode — whose call this was, now that history spans every coordinator. */
  coordinator_name?: string;
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyDate, setHistoryDate] = useState<string>('');
  const [historyRows, setHistoryRows] = useState<TrackerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all');
  const [activeCallRow, setActiveCallRow] = useState<TrackerRow | null>(null);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TrackerRow | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkDeleteSuccessMsg, setBulkDeleteSuccessMsg] = useState<string | null>(null);
  const [selectedRowCount, setSelectedRowCount] = useState<number>(0);
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const { toast } = useToast();

  // ── Global Undo / Redo Hook ──
  const { pushAction, undo, redo, canUndo, canRedo } = useUndoRedo({
    enableKeyboardShortcuts: true,
  });

  // Listen for selection count, delete mode, and confirmation events from TrackerGrid
  useEffect(() => {
    const handleCount = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number; isDeleteMode?: boolean }>;
      setSelectedRowCount(customEvent.detail?.count || 0);
      if (customEvent.detail?.isDeleteMode !== undefined) {
        setIsDeleteMode(customEvent.detail.isDeleteMode);
      }
    };

    const handleOpenConfirm = () => {
      setIsDeleteConfirmOpen(true);
    };

    window.addEventListener('ipoms_tracker_selection_count', handleCount);
    window.addEventListener('ipoms_tracker_open_delete_confirm', handleOpenConfirm);

    return () => {
      window.removeEventListener('ipoms_tracker_selection_count', handleCount);
      window.removeEventListener('ipoms_tracker_open_delete_confirm', handleOpenConfirm);
    };
  }, []);

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

  // ── Handle row update (auto-save on each change) with Undo / Redo
  const handleRowUpdate = useCallback(async (rowId: string, patch: Partial<TrackerRow>, isUndoRedo = false) => {
    const existingRow = rows.find((r) => r._id === rowId);
    if (!isUndoRedo && existingRow) {
      const oldPatch: Partial<TrackerRow> = {};
      const newPatch: Partial<TrackerRow> = { ...patch };
      for (const k of Object.keys(patch) as (keyof TrackerRow)[]) {
        (oldPatch as any)[k] = existingRow[k];
      }
      const companyName = existingRow.company_name || 'contact';
      pushAction({
        description: `Update on "${companyName}"`,
        undo: async () => {
          await handleRowUpdate(rowId, oldPatch, true);
        },
        redo: async () => {
          await handleRowUpdate(rowId, newPatch, true);
        },
      });
    }

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
      setSaveStatus('error');
    }
  }, [rows, pushAction, loadKpi, coordinatorId, selectedCollegeId]);

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

  // ── Handle bulk delete selected rows in active college
  const handleDeleteSelectedRows = useCallback(async (rowIds: string[]) => {
    if (!rowIds || rowIds.length === 0) return;

    try {
      const results = await Promise.all(
        rowIds.map((id) => apiFetch(`/daily-tracker/${id}`, { method: 'DELETE' }))
      );
      const allSuccess = results.every((r) => r.success);
      if (allSuccess) {
        setRows((prev) => prev.filter((row) => !rowIds.includes(row._id)).map((r, idx) => ({ ...r, serial_no: idx + 1 })));
        await loadKpi();
      } else {
        await loadTodayRows();
        await loadKpi();
      }
    } catch (e) {
      console.error('[DT] Bulk delete selected rows failed', e);
      alert('Error occurred while deleting selected contacts.');
    }
  }, [selectedCollegeName, loadKpi, loadTodayRows]);

  // ── Save Progress (Ctrl+S / Save Button)
  const handleSaveProgress = useCallback(async () => {
    if (!selectedCollegeId || !coordinatorId) {
      toast('Please select a college first', 'warning');
      return;
    }

    // Verify mandatory Follow Up Month for rows marked as follow_up
    const missingFollowUp = rows.find((r) => !r.is_skipped && r.outcome_status === 'follow_up' && !r.follow_up_month);
    if (missingFollowUp) {
      toast(`Follow Up Month is mandatory for "${missingFollowUp.company_name}" (Row #${missingFollowUp.serial_no}). Please select a month.`, 'warning');
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');
    triggerHaptic('selection');
    try {
      const res = await apiFetch('/daily-tracker/save-progress', {
        method: 'POST',
        body: JSON.stringify({ coordinator_id: coordinatorId, college_id: selectedCollegeId }),
      });
      if (res.success) {
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        triggerHaptic('success');
        const data = res.data as any;
        if (data?.positive_promoted > 0) {
          toast(`Saved! ${data.positive_promoted} positive outcome(s) queued for Weekly Tracker`, 'success');
        } else {
          toast('All changes saved successfully', 'success');
        }
      } else {
        setSaveStatus('error');
        toast(res.message || 'Failed to save progress', 'error');
      }
    } catch (e) {
      console.error('[DT] Save progress failed', e);
      setSaveStatus('error');
      toast('Failed to save progress. Please check your network connection.', 'error');
    }
  }, [selectedCollegeId, coordinatorId, rows, toast]);

  // ── Keyboard shortcuts (Ctrl+S to save, Shift+S for summary pop-up, Shift+H for history, Shift+A for manual entry, Escape to close/exit)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag);

      // Handle Shift+Key global shortcuts when not typing in text fields
      if (!isInput && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Shift+S: Toggle Daily Calling Summary Pop-up Window
        if (e.key === 'S' || e.key === 's') {
          e.preventDefault();
          setIsSummaryOpen((prev) => !prev);
          return;
        }

        // Shift+H: Open / Toggle Call History (Calendar)
        if (e.key === 'H' || e.key === 'h') {
          e.preventDefault();
          setIsCalendarOpen((prev) => !prev);
          return;
        }

        // Shift+A: Open / Toggle Add Manual Entry Modal
        if (e.key === 'A' || e.key === 'a') {
          e.preventDefault();
          if (!selectedCollegeId) {
            alert('Please select a college first');
            return;
          }
          setIsManualAddOpen((prev) => !prev);
          return;
        }

        // Shift+L: Open / Toggle Load Contacts Picker Modal
        if (e.key === 'L' || e.key === 'l') {
          e.preventDefault();
          if (!selectedCollegeId) {
            alert('Please select a college first');
            return;
          }
          setIsPickerOpen((prev) => !prev);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveProgress();
      } else if (e.key === 'Escape') {
        if (isPickerOpen) {
          return;
        }
        if (isSummaryOpen) {
          setIsSummaryOpen(false);
          return;
        }
        if (isCalendarOpen) {
          setIsCalendarOpen(false);
          return;
        }
        if (isManualAddOpen) {
          setIsManualAddOpen(false);
          return;
        }
        if (
          isHistoryMode &&
          !isPickerOpen &&
          !isCalendarOpen &&
          !isManualAddOpen &&
          !editingRow &&
          !isBulkDeleteOpen
        ) {
          setIsHistoryMode(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveProgress, isPickerOpen, isSummaryOpen, isCalendarOpen, isManualAddOpen, isHistoryMode, editingRow, isBulkDeleteOpen, selectedCollegeId]);

  // ── Bulk Delete Tracker Data
  const handleBulkDelete = useCallback(async (scope: 'today' | 'college_all' | 'entire_database') => {
    if (!selectedCollegeId || !coordinatorId) return;

    try {
      const res = await apiFetch('/daily-tracker/bulk', {
        method: 'DELETE',
        body: JSON.stringify({
          coordinator_id: coordinatorId,
          college_id: scope === 'entire_database' ? 'all' : selectedCollegeId,
          scope,
          session_date: sessionDate || undefined,
        }),
      });

      if (res.success) {
        await loadTodayRows();
        await loadKpi();
        const code = selectedCollegeObj?.college_code || selectedCollegeName;
        const msg = (res.data as any)?.message ||
          (scope === 'today'
            ? `Successfully cleared today's calling sheet for [${code}].`
            : scope === 'college_all'
            ? `Successfully deleted all daily tracker records for [${code}].`
            : 'Successfully wiped entire daily tracker database.');
        setBulkDeleteSuccessMsg(msg);
        setTimeout(() => setBulkDeleteSuccessMsg(null), 5000);
      } else {
        alert(res.error?.message || 'Failed to delete daily tracker records');
      }
    } catch (err: any) {
      console.error('[DT] Bulk delete error', err);
      alert(err.message || 'Error occurred while deleting tracker records');
    }
  }, [selectedCollegeId, coordinatorId, sessionDate, selectedCollegeObj, selectedCollegeName, loadTodayRows, loadKpi]);

  // ── Load history view
  // Deliberately organization-wide, not scoped to the signed-in coordinator:
  // any Coordinator, Team Leader, or Administrator can review any college's
  // past daily-tracker calls (user decision, 6 Sep 2026) — history is a shared
  // record, unlike the live "Today" workspace which stays per-coordinator.
  const handleViewHistory = useCallback(async (date: string, collegeIdOverride?: string) => {
    setIsCalendarOpen(false);
    setHistoryDate(date);
    try {
      const collegeId = collegeIdOverride ?? selectedCollegeId;
      const collegeParam = collegeId ? `&college_id=${collegeId}` : '';
      const res = await apiFetch(`/daily-tracker/history?date=${date}${collegeParam}`);
      if (res.success) {
        setHistoryRows((res.data as any).rows);
        setIsHistoryMode(true);
      }
    } catch (e) { console.error('[DT] History load failed', e); }
  }, [selectedCollegeId]);

  // Re-fetch history when the college selector changes while already viewing
  // history — otherwise switching colleges mid-review would silently keep
  // showing the previous college's rows.
  useEffect(() => {
    if (isHistoryMode && historyDate) {
      handleViewHistory(historyDate, selectedCollegeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollegeId]);

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
    <div className="h-screen bg-background text-fg flex flex-col font-sans overflow-hidden">

      {/* ── Top Section: Title & Top-Right Header ───────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border px-6 py-4 space-y-3 shrink-0 shadow-xs text-fg">
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

          {/* Right: Selected College Logo Badge + Sign Out */}
          <div className="flex items-center gap-3">

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

            <div className="flex items-center gap-2 shrink-0">
              {!isHistoryMode && <AutoSaveBadge status={saveStatus} lastSavedAt={lastSavedAt} />}
              <UserSignOutButton />
            </div>
          </div>
        </div>

        {/* Bulk Delete Success Banner */}
        {bulkDeleteSuccessMsg && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{bulkDeleteSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setBulkDeleteSuccessMsg(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 cursor-pointer font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

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
                {/* Filter by outcome (Smooth UI Dropdown) */}
                <SmoothOutcomeDropdown
                  value={outcomeFilter}
                  onChange={setOutcomeFilter}
                />

                {/* Search */}
                <div className="relative w-64 sm:w-72 shrink-0">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-300 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Start searching..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/90 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl shadow-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-300/80 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Back to Live Today */}
                <button
                  type="button"
                  onClick={() => setIsHistoryMode(false)}
                  className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-primary-foreground px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
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

          {/* ── Right Top Corner: Undo / Redo + Delete Bin Button & 3 Vertical Dots (Actions Menu) ── */}
          {!isHistoryMode && (
            <div className="ml-auto shrink-0 flex items-center gap-2">
              {/* Undo & Redo Controls */}
              {selectedCollegeId && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={!canUndo}
                    onClick={() => {
                      triggerHaptic('medium');
                      undo();
                    }}
                    className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 bg-surface-sunken hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed border border-border shadow-2xs active:scale-[0.95] text-fg"
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                  >
                    <Undo2 size={14} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    disabled={!canRedo}
                    onClick={() => {
                      triggerHaptic('medium');
                      redo();
                    }}
                    className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 bg-surface-sunken hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed border border-border shadow-2xs active:scale-[0.95] text-fg"
                    title="Redo (Ctrl+Y)"
                    aria-label="Redo"
                  >
                    <Redo2 size={14} strokeWidth={2.2} />
                  </button>
                </div>
              )}

              {/* Standalone Red Dustbin / Trash Icon Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  if (isDeleteMode && selectedRowCount > 0) {
                    setIsDeleteConfirmOpen(true);
                  } else {
                    window.dispatchEvent(new CustomEvent('ipoms_tracker_toggle_delete_mode'));
                  }
                }}
                disabled={!selectedCollegeId || rows.length === 0}
                className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none shrink-0 ${
                  isDeleteMode && selectedRowCount > 0
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs ring-2 ring-rose-500/30'
                    : isDeleteMode
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 shadow-2xs'
                } disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.95]`}
                title={
                  isDeleteMode && selectedRowCount > 0
                    ? `Delete ${selectedRowCount} selected row${selectedRowCount > 1 ? 's' : ''}`
                    : isDeleteMode
                    ? 'Delete mode active — select rows to delete (click to exit)'
                    : 'Enter Delete Mode (Shift+D)'
                }
                aria-label="Delete Rows"
              >
                <Trash2 size={16} strokeWidth={2.2} />
                {isDeleteMode && selectedRowCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white dark:bg-zinc-900 text-rose-600 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs tabular-nums ring-1 ring-rose-600">
                    {selectedRowCount}
                  </span>
                )}
              </button>

              {/* 3 Vertical Dots (Actions Menu) */}
              <TrackerActionsDropdown
                selectedCollegeId={selectedCollegeId}
                isReadOnly={false}
                selectedCount={selectedRowCount}
                kpi={kpi}
                rows={rows}
                onFilterOutcome={setOutcomeFilter}
                onLoadContacts={() => {
                  if (!selectedCollegeId) {
                    alert('Please select a college first');
                    return;
                  }
                  setIsPickerOpen(true);
                }}
                onSaveProgress={handleSaveProgress}
                onAddManualRow={() => setIsManualAddOpen(true)}
                onOpenHistory={() => setIsCalendarOpen(true)}
                onCopyAll={() => {
                  window.dispatchEvent(new CustomEvent('ipoms_tracker_copy_all'));
                }}
                onCopyBoth={() => {
                  window.dispatchEvent(new CustomEvent('ipoms_tracker_copy_both'));
                }}
                onCopyEntireRows={() => {
                  window.dispatchEvent(new CustomEvent('ipoms_tracker_copy_entire_row'));
                }}
                onOpenSummary={() => setIsSummaryOpen(true)}
              />
            </div>
          )}
        </div>
      </header>

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
        <div className="flex-1 overflow-hidden flex flex-col px-6 pt-5 pb-4 min-h-0">
          <TrackerGrid
            rows={displayRows}
            isReadOnly={isHistoryMode}
            onRowUpdate={handleRowUpdate}
            onEdit={(row) => setEditingRow(row)}
            onDelete={handleDeleteRow}
            onDeleteSelected={handleDeleteSelectedRows}
            onCall={(row) => setActiveCallRow(row)}
          />
        </div>
      )}

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

      {/* ── Edit Tracker Row Modal ────────────────────────────────────────── */}
      {editingRow && (
        <EditTrackerRowModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={async (id, patch) => {
            await handleRowUpdate(id, patch);
          }}
          onDelete={async (id) => {
            await handleDeleteRow(id);
          }}
        />
      )}

      {/* ── Delete Row Confirmation Mini Pop-up Modal ── */}
      <DeleteRowConfirmModal
        isOpen={isDeleteConfirmOpen}
        count={selectedRowCount}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={async () => {
          window.dispatchEvent(new CustomEvent('ipoms_tracker_execute_delete_selected'));
          setIsDeleteMode(false);
        }}
      />

      {/* ── Bulk Delete Tracker Modal ────────────────────────────────────── */}
      {isBulkDeleteOpen && (
        <BulkDeleteTrackerModal
          collegeId={selectedCollegeId}
          collegeCode={selectedCollegeObj?.college_code || selectedCollegeName}
          collegeName={selectedCollegeName}
          todayCount={rows.length}
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirmDelete={handleBulkDelete}
        />
      )}

      {/* ── Daily Summary Pop-up Modal (Shift+S) ─────────────────────────── */}
      <DailySummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        kpi={kpi}
        rows={isHistoryMode ? historyRows : rows}
        collegeName={selectedCollegeName}
        collegeCode={selectedCollegeObj?.college_code}
        sessionDate={isHistoryMode ? historyDate : sessionDate}
        onFilterOutcome={(outcome) => {
          setOutcomeFilter(outcome);
          setIsSummaryOpen(false);
        }}
      />

      {/* ── Softphone Panel (Click-to-Call) ───────────────────────────────── */}
      <SoftphonePanel
        row={activeCallRow}
        onSave={handleSoftphoneSave}
        onClose={() => setActiveCallRow(null)}
      />
    </div>
  );
}
