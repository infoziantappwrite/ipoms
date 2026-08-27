'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ActiveLeadHeader } from './components/ActiveLeadHeader';
import { ActiveLeadTable, ActiveLeadItem } from './components/ActiveLeadTable';
import { AddActiveLeadModal } from './components/AddActiveLeadModal';
import { LeadStatus } from '@/components/ui/SmoothLeadStatusDropdown';

export default function ActiveLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<ActiveLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    hiring: 0,
    follow_up: 0,
    invite_email: 0,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Batch Delete State
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Fetch leads with active filters
  const fetchLeads = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const params = new URLSearchParams();
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
      }
    } catch (err) {
      console.error('Failed to load active leads:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedYear, selectedStatus, selectedMonth, searchQuery]);

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
        const statsRes = await apiFetch('/active-leads?academic_year=' + selectedYear);
        if (statsRes.success && statsRes.data?.stats) {
          setStats(statsRes.data.stats);
        }
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
    status: LeadStatus;
    followup_month: string;
    academic_year: string;
  }): Promise<boolean> => {
    try {
      const res = await apiFetch('/active-leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
      });

      if (res.success) {
        fetchLeads();
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
  };

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

  // Delete selected leads
  const handleDeleteSelected = async () => {
    if (selectedLeadIds.length === 0) return;
    try {
      setIsDeletingSelected(true);
      const res = await apiFetch('/active-leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedLeadIds }),
      });

      if (res.success) {
        toast(res.message || `${selectedLeadIds.length} lead(s) deleted successfully!`, 'success');
        setSelectedLeadIds([]);
        setIsDeleteMode(false);
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

  // Sync leads from Daily Tracker
  const handleSyncTracker = async () => {
    try {
      setIsSyncing(true);
      const res = await apiFetch('/active-leads/sync', {
        method: 'POST',
        body: JSON.stringify({
          academic_year: selectedYear !== 'all' ? selectedYear : undefined,
        }),
      });

      if (res.success) {
        await fetchLeads(false);
        broadcastMutation();
        toast(res.message || 'Leads synchronized from Daily Tracker successfully!', 'success');
      } else {
        toast(res.error?.message || 'Failed to sync leads from Daily Tracker', 'error');
      }
    } catch (err: any) {
      console.error('Sync tracker error:', err);
      toast('Failed to sync leads from Daily Tracker. Please try again.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background text-fg selection:bg-primary selection:text-white flex flex-col">
      {/* Header */}
      <ActiveLeadHeader
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
        isExporting={isExporting}
        onSyncTracker={handleSyncTracker}
        isSyncing={isSyncing}
        isDeleteMode={isDeleteMode}
        onToggleDeleteMode={toggleDeleteMode}
        selectedCount={selectedLeadIds.length}
        onDeleteSelected={handleDeleteSelected}
        isDeletingSelected={isDeletingSelected}
      />

      {/* Main Content Body */}
      <main className="flex-1 p-6 space-y-4 max-w-7xl w-full mx-auto">
        <ActiveLeadTable
          leads={leads}
          loading={loading}
          onUpdateLead={handleUpdateLead}
          isDeleteMode={isDeleteMode}
          selectedIds={selectedLeadIds}
          onToggleSelectLead={handleToggleSelectLead}
          onToggleSelectAll={handleToggleSelectAll}
        />
      </main>

      {/* Modals */}
      <AddActiveLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddLead}
      />
    </div>
  );
}
