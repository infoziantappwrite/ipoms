'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LeadsHeader } from './components/LeadsHeader';
import type { LeadsSummaryData } from './components/LeadsSummaryStrip';
import { LeadsTabBar } from './components/LeadsTabBar';
import { LeadsTable, DailyLeadRow } from './components/LeadsTable';
import { AddLeadModal } from './components/AddLeadModal';
import { CopyToJdModal } from './components/CopyToJdModal';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { getActiveCollege, setActiveCollege } from '@/lib/collegeSession';
import { exportToXlsx } from '@/lib/exportExcel';
import { useToast } from '@/components/ui/Toast';

export default function DailyLeadsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Date State (Defaults to today in YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // College List State for Table Dropdowns
  const [colleges, setColleges] = useState<{ _id: string; college_name: string; college_code: string }[]>([]);

  // Tab State: 'positive' or 'jd_received' (with persistent localStorage memory per Spec Section 6.4)
  const [activeTab, setActiveTab] = useState<'positive' | 'jd_received'>('positive');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Mode State
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // Syncing State
  const [isSyncing, setIsSyncing] = useState(false);

  // Copy to JD Modal State
  const [isCopyToJdModalOpen, setIsCopyToJdModalOpen] = useState(false);

  // Data
  const [leads, setLeads] = useState<DailyLeadRow[]>([]);
  const [summary, setSummary] = useState<LeadsSummaryData>({
    positives_count: 0,
    jd_received_count: 0,
    active_colleges_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [coordinatorId, setCoordinatorId] = useState<string>('');

  // Multi-Selection State for Bulk Deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) setCoordinatorId(user._id);

    // Fetch colleges list for row-level dropdowns
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          setColleges((data.data as any).colleges);
        }
      })
      .catch(console.error);
  }, []);

  // Clear selection whenever filters or tab change
  useEffect(() => {
    setSelectedIds([]);
    setIsAllSelected(false);
  }, [selectedDate, activeTab, searchQuery]);

  // Escape exits delete mode (mirrors the "Exit Delete" toggle button)
  useEffect(() => {
    if (!isDeleteMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleToggleDeleteMode();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDeleteMode]);

  // ── Load Last Active Tab from localStorage on mount (Spec Section 6.4)
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('ipoms_daily_leads_active_tab');
      if (savedTab === 'positive' || savedTab === 'jd_received') {
        setActiveTab(savedTab);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleTabChange = (tab: 'positive' | 'jd_received') => {
    setActiveTab(tab);

    // Keep the currently selected date preserved across tab switches!

    // Reset search, delete mode, and selections
    setSearchQuery('');
    setIsDeleteMode(false);
    setSelectedIds([]);
    setIsAllSelected(false);

    try {
      localStorage.setItem('ipoms_daily_leads_active_tab', tab);
    } catch {
      // ignore
    }
  };

  // ── Fetch Leads across all colleges for the selected date
  const loadLeads = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        lead_type: activeTab,
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiFetch(`/daily-leads?${params.toString()}`);
      if (res.success && res.data) {
        setLeads((res.data as any).leads || []);
      }
    } catch (err) {
      console.error('Failed to load daily leads:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedDate, activeTab, searchQuery]);

  // ── Fetch Summary Strip Counts
  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate });
      const res = await apiFetch(`/daily-leads/summary?${params.toString()}`);
      if (res.success && res.data) {
        setSummary((res.data as any).summary || {
          positives_count: 0,
          jd_received_count: 0,
          active_colleges_count: 0,
        });
      }
    } catch (err) {
      console.error('Failed to load leads summary:', err);
    }
  }, [selectedDate]);

  // ── Sync Positives (Pulls positive pipeline & calls for the selected date across colleges)
  const handleSyncPositives = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/daily-leads/sync-positives', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          college_id: 'all',
          coordinator_id: coordinatorId,
        }),
      });

      if (res.success) {
        const syncedCount = (res.data as any)?.synced_count ?? 0;
        toast(
          syncedCount > 0
            ? `Successfully synced ${syncedCount} positive lead(s) for ${selectedDate}`
            : `All positive pipeline leads for ${selectedDate} are already synced`,
          'success'
        );
        await loadLeads(false);
        await loadSummary();
        broadcastDailyLeadMutation();
      } else {
        toast((res as any)?.error?.message || 'Failed to sync positive leads', 'warning');
      }
    } catch (err: any) {
      toast(err?.message || 'Network error syncing positives', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadLeads(true);
    loadSummary();
  }, [loadLeads, loadSummary]);

  // ── Real-Time Multi-User Auto Synchronization & Polling ──
  useEffect(() => {
    // 1. Silent background interval every 5s
    const interval = setInterval(() => {
      loadLeads(false);
      loadSummary();
    }, 5000);

    // 2. Tab focus revalidation
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadLeads(false);
        loadSummary();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('ipoms_daily_leads_sync');
      bc.onmessage = (e) => {
        if (e.data?.type === 'DAILY_LEADS_MUTATION') {
          loadLeads(false);
          loadSummary();
        }
      };
    } catch {
      // ignore
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (bc) bc.close();
    };
  }, [loadLeads, loadSummary]);

  const broadcastDailyLeadMutation = () => {
    try {
      const bc = new BroadcastChannel('ipoms_daily_leads_sync');
      bc.postMessage({ type: 'DAILY_LEADS_MUTATION', timestamp: Date.now() });
      bc.close();
    } catch {
      // ignore
    }
  };

  // ── Row Patch (Inline Edit)
  const handleUpdateRow = async (rowId: string, patch: Partial<DailyLeadRow>) => {
    try {
      const res = await apiFetch(`/daily-leads/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (res.success) {
        await loadLeads();
        await loadSummary();
        broadcastDailyLeadMutation();
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  // ── 1-Click Move from Positives to JD Received
  const handleMoveToJd = async (rowId: string) => {
    try {
      const res = await apiFetch(`/daily-leads/${rowId}/move-to-jd`, {
        method: 'POST',
      });
      if (res.success) {
        toast((res as any)?.message || 'Lead moved to JD Received successfully', 'success');
        await loadLeads();
        await loadSummary();
        broadcastDailyLeadMutation();
      } else {
        toast((res as any)?.error?.message || 'Failed to move lead to JD', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Network error moving lead to JD', 'error');
    }
  };

  // ── Delete Single Row (Soft Delete)
  const handleDeleteRow = async (rowId: string) => {
    try {
      const res = await apiFetch(`/daily-leads/${rowId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSelectedIds((prev) => prev.filter((id) => id !== rowId));
        await loadLeads();
        await loadSummary();
        broadcastDailyLeadMutation();
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  // ── Multi-Select Handlers
  const handleToggleSelect = (id: string) => {
    setIsAllSelected(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
      setIsAllSelected(false);
    } else {
      setSelectedIds(leads.map((l) => l._id));
      setIsAllSelected(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setIsAllSelected(false);
  };

  // ── Delete Mode Handlers
  const handleToggleDeleteMode = () => {
    if (isDeleteMode) {
      setIsDeleteMode(false);
      setSelectedIds([]);
      setIsAllSelected(false);
    } else {
      if (leads.length === 0) {
        alert(`No ${activeTab === 'positive' ? 'positive leads' : 'JD received records'} to delete.`);
        return;
      }
      setIsDeleteMode(true);
    }
  };

  const handleCancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedIds([]);
    setIsAllSelected(false);
  };

  // ── Bulk Delete Selected Rows
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one row to delete.');
      return;
    }
    const tabName = activeTab === 'positive' ? 'Positive Leads' : 'JD Received';
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} selected ${
          selectedIds.length === 1 ? 'record' : 'records'
        } from ${tabName}?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) =>
          apiFetch(`/daily-leads/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedIds([]);
      setIsAllSelected(false);
      setIsDeleteMode(false);
      await loadLeads();
      await loadSummary();
    } catch (err) {
      console.error('Failed to bulk delete leads:', err);
    }
  };

  // ── Export XLSX
  const handleExportXlsx = () => {
    if (leads.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['SI.NO', 'Time Stamp', 'Date', 'Company Name', 'Role', 'CTC', 'Eligible Batch', 'Lead Type'];
    const rows = leads.map((r, idx) => [
      idx + 1,
      r.event_time || '',
      r.lead_date ? new Date(r.lead_date).toISOString().split('T')[0] : '',
      r.company_name || '',
      r.job_role || '',
      r.ctc || '',
      r.eligible_batch || '',
      r.lead_type === 'positive' ? 'Positives' : 'JD Received',
    ]);

    exportToXlsx(`Daily_Leads_${activeTab.toUpperCase()}_${selectedDate}`, {
      name: activeTab === 'positive' ? 'Positives' : 'JD Received',
      headers,
      rows,
    });
  };

  // Trigger direct navigation to Report Builder when clicking PDF or Image from dropdown
  const handleOpenPdfModal = () => {
    const collegeQuery = getActiveCollege()?.id || 'all';
    router.push(`/reports?template=weekly_placement&collegeId=${encodeURIComponent(collegeQuery)}`);
  };

  const handleOpenImageModal = () => {
    const collegeQuery = getActiveCollege()?.id || 'all';
    router.push(`/reports?template=weekly_placement&collegeId=${encodeURIComponent(collegeQuery)}`);
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <LeadsHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onExportXlsx={handleExportXlsx}
        onExportPdf={handleOpenPdfModal}
        onExportImage={handleOpenImageModal}
        onRefresh={() => {
          loadLeads();
          loadSummary();
        }}
        isDeleteMode={isDeleteMode}
        onToggleDeleteMode={handleToggleDeleteMode}
        onSyncPositives={handleSyncPositives}
        isSyncing={isSyncing}
        activeTab={activeTab}
        onOpenCopyToJdModal={() => setIsCopyToJdModalOpen(true)}
      />

      {/* ── Tab Bar (Positives vs JD Received) ────────────────────────────── */}
      <LeadsTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        positivesCount={summary.positives_count}
        jdCount={summary.jd_received_count}
        isDeleteMode={isDeleteMode}
        selectedCount={selectedIds.length}
        onBulkDelete={handleBulkDelete}
      />

      {/* ── Table Workspace ───────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <LeadsTable
            rows={leads}
            activeTab={activeTab}
            colleges={colleges}
            isDeleteMode={isDeleteMode}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onClearSelection={handleClearSelection}
            onBulkDelete={handleBulkDelete}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
            onMoveToJd={handleMoveToJd}
          />
        </div>
      </div>

      {/* ── Add Entry Modal (Dual Property: Positives vs JD Received) ─────── */}
      {isAddModalOpen && (
        <AddLeadModal
          initialLeadType={activeTab}
          initialCollegeId=""
          initialDate={selectedDate === 'all' ? new Date().toISOString().split('T')[0] : selectedDate}
          coordinatorId={coordinatorId}
          onClose={() => setIsAddModalOpen(false)}
          onAdded={() => {
            loadLeads();
            loadSummary();
            broadcastDailyLeadMutation();
          }}
        />
      )}

      {/* ── Copy to JD Modal (Checkboxes for College List) ────────────────── */}
      {isCopyToJdModalOpen && (
        <CopyToJdModal
          selectedDate={selectedDate}
          colleges={colleges}
          positiveLeads={leads}
          onClose={() => setIsCopyToJdModalOpen(false)}
          onCopied={() => {
            loadLeads();
            loadSummary();
            broadcastDailyLeadMutation();
          }}
        />
      )}

    </div>
  );
}
