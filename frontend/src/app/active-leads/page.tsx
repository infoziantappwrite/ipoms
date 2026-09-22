'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ActiveLeadHeader } from './components/ActiveLeadHeader';
import { ActiveLeadTable, ActiveLeadItem } from './components/ActiveLeadTable';
import { AddActiveLeadModal } from './components/AddActiveLeadModal';
import { DuplicateResolutionModal, DuplicateConflict, ConflictResolution } from './components/DuplicateResolutionModal';

export default function ActiveLeadsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'jd_received'>('pipeline');
  const [selectedSection, setSelectedSection] = useState<'all' | 'in_progress' | 'upcoming_drive' | 'drive_in_progress' | 'completed'>('all');
  const [tabCounts, setTabCounts] = useState({
    pipeline: 0,
    jd_received: 0,
  });
  const [jdSectionCounts, setJdSectionCounts] = useState({
    all: 0,
    in_progress: 0,
    upcoming_drive: 0,
    drive_in_progress: 0,
    completed: 0,
  });
  const [leads, setLeads] = useState<ActiveLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 100;

  const [stats, setStats] = useState({
    total: 0,
    hiring: 0,
    follow_up: 0,
    invite_email: 0,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Batch Delete State & In-App Confirmation
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Sync Duplicate Resolution Modal State
  const [conflicts, setConflicts] = useState<DuplicateConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

  // ── Auto-Restore & Save Active Leads View State from/to localStorage ──
  const [hasRestoredActiveLeadsState, setHasRestoredActiveLeadsState] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || hasRestoredActiveLeadsState) return;
    try {
      const raw = localStorage.getItem('ipoms_active_leads_saved_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.activeTab) setActiveTab(parsed.activeTab);
        if (parsed.selectedSection) setSelectedSection(parsed.selectedSection);
        if (parsed.selectedYear) setSelectedYear(parsed.selectedYear);
        if (parsed.selectedStatus) setSelectedStatus(parsed.selectedStatus);
        if (parsed.selectedMonth) setSelectedMonth(parsed.selectedMonth);
      }
    } catch {} finally {
      setHasRestoredActiveLeadsState(true);
    }
  }, [hasRestoredActiveLeadsState]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasRestoredActiveLeadsState) return;
    try {
      localStorage.setItem('ipoms_active_leads_saved_state', JSON.stringify({
        activeTab,
        selectedSection,
        selectedYear,
        selectedStatus,
        selectedMonth,
      }));
    } catch {}
  }, [hasRestoredActiveLeadsState, activeTab, selectedSection, selectedYear, selectedStatus, selectedMonth]);

  // Reset page to 1 when filters, search, section or active tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedSection, selectedYear, selectedStatus, selectedMonth, searchQuery]);

  // Fetch leads with active tab, section and filters
  const fetchLeads = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const params = new URLSearchParams();
      params.append('lead_type', activeTab);
      if (activeTab === 'jd_received' && selectedSection !== 'all') {
        params.append('pipeline_section', selectedSection);
      }
      if (selectedYear !== 'all') params.append('academic_year', selectedYear);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedMonth !== 'all') params.append('followup_month', selectedMonth);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiFetch(`/active-leads?${params.toString()}`);
      if (res.success && res.data) {
        setLeads(res.data.leads || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.tab_counts || res.data.pipeline_stats || res.data.jd_received_stats) {
          setTabCounts({
            pipeline: res.data.tab_counts?.pipeline ?? res.data.pipeline_stats?.total ?? 0,
            jd_received: res.data.tab_counts?.jd_received ?? res.data.jd_received_stats?.total ?? 0,
          });
        }
        if (res.data.jd_section_counts) {
          setJdSectionCounts(res.data.jd_section_counts);
        }
      }
    } catch (err) {
      console.error('Failed to load active leads:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [activeTab, selectedSection, selectedYear, selectedStatus, selectedMonth, searchQuery]);

  // Initial load on filter change
  useEffect(() => {
    fetchLeads(true);
  }, [fetchLeads]);

  // ── Real-Time Multi-User Auto Synchronization & Polling ──
  useEffect(() => {
    // 1. Periodic background sync every 5 seconds (silent, non-blocking)
    const interval = setInterval(() => {
      fetchLeads(false);
    }, 5000);

    // 2. Immediate revalidation when window gains focus or tab becomes visible
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchLeads(false);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 3. Multi-Tab Instant BroadcastChannel for real-time synchronization
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('ipoms_active_leads_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'LEAD_MUTATION') {
            fetchLeads(false);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (channel) {
        channel.close();
      }
    };
  }, [fetchLeads]);

  // Broadcast helper
  const broadcastMutation = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('ipoms_active_leads_sync');
        bc.postMessage({ type: 'LEAD_MUTATION', timestamp: Date.now() });
        setTimeout(() => bc.close(), 100);
      }
    } catch {
      // ignore
    }
  };

  // Inline Field Update with optimistic UI updates
  const handleUpdateLead = async (id: string, updates: Partial<ActiveLeadItem>): Promise<boolean> => {
    try {
      // Optimistic update
      setLeads((prev) =>
        prev.map((lead) => (lead._id === id ? { ...lead, ...updates } : lead))
      );

      const res = await apiFetch(`/active-leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (res.success) {
        await fetchLeads(false);
        broadcastMutation();
        return true;
      }
      // Revert if failed
      fetchLeads(false);
      return false;
    } catch (err) {
      console.error('Update lead failed:', err);
      fetchLeads(false);
      return false;
    }
  };

  // Add single lead
  const handleAddLead = async (leadData: {
    company_name: string;
    role: string;
    ctc: string;
    lead_type?: 'pipeline' | 'jd_received';
    pipeline_section?: string;
    status?: string;
    followup_month: string;
    academic_year: string;
  }): Promise<boolean> => {
    try {
      const res = await apiFetch('/active-leads', {
        method: 'POST',
        body: JSON.stringify({
          ...leadData,
          lead_type: leadData.lead_type || activeTab,
          pipeline_section:
            leadData.pipeline_section ||
            (leadData.lead_type === 'jd_received'
              ? selectedSection !== 'all'
                ? selectedSection
                : 'in_progress'
              : 'pipeline'),
        }),
      });

      if (res.success) {
        await fetchLeads(false);
        broadcastMutation();
        toast('Lead added successfully!', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Add lead failed:', err);
      return false;
    }
  };

  // Toggle Delete Mode
  const toggleDeleteMode = () => {
    setIsDeleteMode((prev) => !prev);
    setSelectedLeadIds([]);
    setShowDeleteConfirmModal(false);
  };

  // ── Keyboard shortcut: Escape key exits delete mode or closes open modals ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirmModal) {
          setShowDeleteConfirmModal(false);
          return;
        }
        if (isDeleteMode) {
          setIsDeleteMode(false);
          setSelectedLeadIds([]);
          setShowDeleteConfirmModal(false);
          return;
        }
        if (showAddModal) {
          setShowAddModal(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleteMode, showDeleteConfirmModal, showAddModal]);

  // Toggle individual lead selection
  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all visible leads
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length && leads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l._id));
    }
  };

  // Trigger In-App Confirmation Modal for deleting selected rows
  const handleRequestDelete = () => {
    if (selectedLeadIds.length === 0) {
      toast('Please select at least 1 lead to delete, or click the exit button.', 'info');
      return;
    }
    setShowDeleteConfirmModal(true);
  };

  // Execute deletion when confirmed by user in modal
  const handleExecuteDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    try {
      setIsDeletingSelected(true);
      const count = selectedLeadIds.length;
      const res = await apiFetch('/active-leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedLeadIds }),
      });

      if (res.success) {
        toast(res.message || `${count} lead(s) deleted successfully!`, 'success');
        setSelectedLeadIds([]);
        setIsDeleteMode(false);
        setShowDeleteConfirmModal(false);
        await fetchLeads(false);
        broadcastMutation();
      } else {
        toast(res.error?.message || 'Failed to delete selected leads', 'error');
      }
    } catch (err: any) {
      console.error('Delete selected error:', err);
      toast('Failed to delete selected leads. Please try again.', 'error');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Sync leads from Weekly Tracker with Duplicate Role Resolution
  const handleSyncTracker = async () => {
    try {
      setIsSyncing(true);
      // Step 1: Check if there are any duplicate role conflicts from the Weekly Tracker
      const checkRes = await apiFetch<{
        has_conflicts?: boolean;
        conflicts?: DuplicateConflict[];
        count?: number;
      }>('/active-leads/sync', {
        method: 'POST',
        body: JSON.stringify({
          check_only: true,
          academic_year: selectedYear !== 'all' ? selectedYear : undefined,
        }),
      });

      const foundConflicts = checkRes.data?.conflicts || (checkRes as any).conflicts || [];
      const hasConflicts = checkRes.data?.has_conflicts || (checkRes as any).has_conflicts || foundConflicts.length > 0;

      if (checkRes.success && hasConflicts && foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        setShowConflictModal(true);
        return;
      }

      // Step 2: If no conflicts, execute standard sync cleanly
      const syncRes = await apiFetch('/active-leads/sync', {
        method: 'POST',
        body: JSON.stringify({
          academic_year: selectedYear !== 'all' ? selectedYear : undefined,
        }),
      });

      if (syncRes.success) {
        await fetchLeads(false);
        broadcastMutation();
        toast(syncRes.message || 'Leads synchronized from Weekly Tracker successfully!', 'success');
      } else {
        toast(syncRes.error?.message || 'Failed to sync leads from Weekly Tracker', 'error');
      }
    } catch (err: any) {
      console.error('Sync tracker error:', err);
      toast('Failed to sync leads from Weekly Tracker. Please try again.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Confirm user's duplicate role resolutions from the In-App Modal
  const handleConfirmConflictResolutions = async (resolutions: Record<string, ConflictResolution>) => {
    try {
      setIsResolvingConflicts(true);
      const res = await apiFetch('/active-leads/sync', {
        method: 'POST',
        body: JSON.stringify({
          resolutions,
          academic_year: selectedYear !== 'all' ? selectedYear : undefined,
        }),
      });

      if (res.success) {
        setShowConflictModal(false);
        setConflicts([]);
        await fetchLeads(false);
        broadcastMutation();
        toast('Duplicate conflicts resolved & Active Leads updated successfully!', 'success');
      } else {
        toast(res.error?.message || 'Failed to update resolved roles', 'error');
      }
    } catch (err: any) {
      console.error('Confirm resolutions error:', err);
      toast('Failed to apply role resolutions. Please try again.', 'error');
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  // ── Global Save & Sync Shortcut (Ctrl+S / Cmd+S) ──────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        handleSyncTracker();
      }
    };

    const handleGlobalTrigger = (e: any) => {
      if (e.detail?.pathname?.includes('/active-leads')) {
        handleSyncTracker();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ipoms_global_save_trigger' as any, handleGlobalTrigger);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ipoms_global_save_trigger' as any, handleGlobalTrigger);
    };
  }, [handleSyncTracker]);

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('academic_year', selectedYear);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedMonth !== 'all') params.append('followup_month', selectedMonth);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const blob = await apiFetchBlob(`/active-leads/export?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iPOMS_Active_Leads_${selectedYear !== 'all' ? selectedYear : 'All'}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger direct navigation to Report Builder when clicking PDF or Image from dropdown
  const handleOpenPdfModal = () => {
    router.push(`/reports?template=active_leads&academicYear=${encodeURIComponent(selectedYear || 'all')}`);
  };

  const handleOpenImageModal = () => {
    router.push(`/reports?template=active_leads&academicYear=${encodeURIComponent(selectedYear || 'all')}`);
  };

  const totalPages = Math.ceil(leads.length / limit) || 1;
  const paginatedLeads = leads.slice((page - 1) * limit, page * limit);

  return (
    <div className="min-h-screen bg-background text-fg selection:bg-primary selection:text-primary-foreground flex flex-col">
      {/* Header (Sticky / Frozen at Top) */}
      <ActiveLeadHeader
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedSection('all');
          setPage(1);
        }}
        selectedSection={selectedSection}
        onSectionChange={(sec) => {
          setSelectedSection(sec);
          setPage(1);
        }}
        tabCounts={tabCounts}
        jdSectionCounts={jdSectionCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        stats={stats}
        onOpenAddModal={() => setShowAddModal(true)}
        onExportExcel={handleExportExcel}
        onExportPdf={handleOpenPdfModal}
        onExportImage={handleOpenImageModal}
        isExporting={isExporting}
        onSyncTracker={handleSyncTracker}
        isSyncing={isSyncing}
        isDeleteMode={isDeleteMode}
        onToggleDeleteMode={toggleDeleteMode}
        selectedCount={selectedLeadIds.length}
        onDeleteSelected={handleRequestDelete}
        isDeletingSelected={isDeletingSelected}
        page={page}
        totalPages={totalPages}
        totalCount={leads.length}
        onPageChange={setPage}
      />

      {/* Main Content Body */}
      <main className="flex-1 p-6 space-y-4 max-w-7xl w-full mx-auto">
        <ActiveLeadTable
          activeTab={activeTab}
          leads={paginatedLeads}
          loading={loading}
          onUpdateLead={handleUpdateLead}
          isDeleteMode={isDeleteMode}
          selectedIds={selectedLeadIds}
          onToggleSelectLead={handleToggleSelectLead}
          onToggleSelectAll={handleToggleSelectAll}
          page={page}
          limit={limit}
        />
      </main>

      {/* Modals */}
      <AddActiveLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultLeadType={activeTab}
        defaultSection={selectedSection !== 'all' ? selectedSection : 'in_progress'}
        onSubmit={handleAddLead}
      />

      {/* In-App Confirmation Modal for Deleting Selected Rows */}
      <Modal
        open={showDeleteConfirmModal}
        onClose={() => {
          if (!isDeletingSelected) setShowDeleteConfirmModal(false);
        }}
        size="sm"
        title={selectedLeadIds.length === 1 ? 'Delete Lead' : 'Delete Selected Leads'}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              disabled={isDeletingSelected}
              onClick={() => setShowDeleteConfirmModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-raised border border-border text-fg transition-all cursor-pointer shadow-2xs active:scale-[0.992] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingSelected}
              onClick={handleExecuteDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.992] disabled:opacity-50"
            >
              {isDeletingSelected ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Deleting…</span>
                </>
              ) : (
                <>
                  <Trash2 size={13} strokeWidth={2.2} />
                  <span>Delete {selectedLeadIds.length > 0 ? `(${selectedLeadIds.length})` : ''}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="py-2.5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 size={18} strokeWidth={2.2} />
          </div>
          <div className="space-y-1 pt-0.5">
            <p className="text-xs text-fg leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                {selectedLeadIds.length}
              </strong>{' '}
              selected {selectedLeadIds.length === 1 ? 'lead' : 'leads'}?
            </p>
            <p className="text-[11px] text-fg-subtle">
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* In-App Duplicate Role Conflict Resolution Modal */}
      <DuplicateResolutionModal
        isOpen={showConflictModal}
        conflicts={conflicts}
        onClose={() => setShowConflictModal(false)}
        onConfirm={handleConfirmConflictResolutions}
        isResolving={isResolvingConflicts}
      />
    </div>
  );
}
