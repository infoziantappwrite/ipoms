'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { ActiveLeadHeader } from './components/ActiveLeadHeader';
import { ActiveLeadTable, ActiveLeadItem } from './components/ActiveLeadTable';
import { AddActiveLeadModal } from './components/AddActiveLeadModal';
import { BulkPasteLeadModal } from './components/BulkPasteLeadModal';
import { LeadStatus } from '@/components/ui/SmoothLeadStatusDropdown';

export default function ActiveLeadsPage() {
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
    not_hiring: 0,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Cross-tab instant broadcast channel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('ipoms_active_leads_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'LEAD_MUTATION') {
          fetchLeads(false);
        }
      };
    } catch {
      // BroadcastChannel not supported in older environments
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (bc) bc.close();
    };
  }, [fetchLeads]);

  const broadcastMutation = () => {
    try {
      const bc = new BroadcastChannel('ipoms_active_leads_sync');
      bc.postMessage({ type: 'LEAD_MUTATION', timestamp: Date.now() });
      bc.close();
    } catch {
      // ignore
    }
  };

  // Update a single lead (Auto-save)
  const handleUpdateLead = async (id: string, updates: Partial<ActiveLeadItem>): Promise<boolean> => {
    try {
      // Optimistic update
      setLeads((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...updates } : item))
      );

      const res = await apiFetch(`/active-leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (res.success) {
        // Refresh stats silently
        const statsRes = await apiFetch('/active-leads');
        if (statsRes.success && statsRes.data?.stats) {
          setStats(statsRes.data.stats);
        }
        broadcastMutation();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Update lead failed:', err);
      fetchLeads(); // rollback
      return false;
    }
  };

  // Delete a lead
  const handleDeleteLead = async (id: string): Promise<boolean> => {
    if (!window.confirm('Are you sure you want to remove this active lead?')) return false;

    try {
      setLeads((prev) => prev.filter((item) => item._id !== id));
      const res = await apiFetch(`/active-leads/${id}`, { method: 'DELETE' });
      if (res.success) {
        // Refresh stats
        const statsRes = await apiFetch('/active-leads');
        if (statsRes.success && statsRes.data?.stats) {
          setStats(statsRes.data.stats);
        }
        broadcastMutation();
        return true;
      }
      fetchLeads();
      return false;
    } catch (err) {
      console.error('Delete lead failed:', err);
      fetchLeads();
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
        return true;
      }
      return false;
    } catch (err) {
      console.error('Add lead failed:', err);
      return false;
    }
  };

  // Bulk add leads
  const handleBulkAdd = async (
    lines: string[],
    academicYear: string,
    defaultStatus: LeadStatus
  ): Promise<boolean> => {
    try {
      const res = await apiFetch('/active-leads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          lines,
          academic_year: academicYear,
          default_status: defaultStatus,
        }),
      });

      if (res.success) {
        fetchLeads();
        broadcastMutation();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Bulk add leads failed:', err);
      return false;
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
        onOpenBulkPasteModal={() => setShowBulkModal(true)}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
      />

      {/* Main Content Body */}
      <main className="flex-1 p-6 space-y-4 max-w-7xl w-full mx-auto">
        <ActiveLeadTable
          leads={leads}
          loading={loading}
          onUpdateLead={handleUpdateLead}
          onDeleteLead={handleDeleteLead}
        />
      </main>

      {/* Modals */}
      <AddActiveLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddLead}
      />

      <BulkPasteLeadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSubmitBulk={handleBulkAdd}
      />
    </div>
  );
}
