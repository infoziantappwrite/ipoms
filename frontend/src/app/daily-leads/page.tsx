'use client';

import { useState, useEffect, useCallback } from 'react';
import { LeadsHeader } from './components/LeadsHeader';
import { LeadsSummaryStrip, LeadsSummaryData } from './components/LeadsSummaryStrip';
import { LeadsTabBar } from './components/LeadsTabBar';
import { LeadsTable, DailyLeadRow } from './components/LeadsTable';
import { AddLeadModal } from './components/AddLeadModal';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';

export default function DailyLeadsPage() {
  // Date State (Defaults to today in YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // College State ('all' or specific college ObjectId)
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('all');
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>('All Colleges');

  // Tab State: 'positive' or 'jd_received' (with persistent localStorage memory per Spec Section 6.4)
  const [activeTab, setActiveTab] = useState<'positive' | 'jd_received'>('positive');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) setCoordinatorId(user._id);
  }, []);

  // Clear selection whenever filters or tab change
  useEffect(() => {
    setSelectedIds([]);
  }, [selectedDate, selectedCollegeId, activeTab, searchQuery]);

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
    setSelectedIds([]);
    try {
      localStorage.setItem('ipoms_daily_leads_active_tab', tab);
    } catch {
      // ignore
    }
  };

  // ── Fetch Leads
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        lead_type: activeTab,
      });
      if (selectedCollegeId !== 'all') params.set('college_id', selectedCollegeId);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiFetch(`/daily-leads?${params.toString()}`);
      if (res.success && res.data) {
        setLeads((res.data as any).leads);
      }
    } catch (err) {
      console.error('Failed to load daily leads:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedCollegeId, activeTab, searchQuery]);

  // ── Fetch Summary Strip Counts
  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedCollegeId !== 'all') params.set('college_id', selectedCollegeId);

      const res = await apiFetch(`/daily-leads/summary?${params.toString()}`);
      if (res.success && res.data) {
        setSummary((res.data as any).summary);
      }
    } catch (err) {
      console.error('Failed to load leads summary:', err);
    }
  }, [selectedDate, selectedCollegeId]);

  useEffect(() => {
    loadLeads();
    loadSummary();
  }, [loadLeads, loadSummary]);

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
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  // ── 1-Click Move to JD Received (Spec Section 6.3 & 11)
  const handleMoveToJd = async (rowId: string) => {
    try {
      const res = await apiFetch(`/daily-leads/${rowId}/move-to-jd`, {
        method: 'POST',
      });
      if (res.success) {
        await loadLeads();
        await loadSummary();
      }
    } catch (err) {
      console.error('Failed to move to JD:', err);
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
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  // ── Multi-Select Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l._id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // ── Bulk Delete Selected Rows
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to move ${selectedIds.length} selected ${
          selectedIds.length === 1 ? 'entry' : 'entries'
        } to Recycle Bin?`
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
      await loadLeads();
      await loadSummary();
    } catch (err) {
      console.error('Failed to bulk delete leads:', err);
    }
  };

  // ── Export CSV
  const handleExportCsv = () => {
    if (leads.length === 0) {
      alert('No data to export.');
      return;
    }

    const rows = leads.map((r, idx) => ({
      'S.No': idx + 1,
      Time: r.event_time,
      Date: new Date(r.lead_date).toISOString().split('T')[0],
      Company: r.company_name,
      Role: r.job_role,
      CTC: r.ctc,
      College: r.college_id?.college_name || '',
      'College Code': r.college_id?.college_code || '',
      Batch: r.eligible_batch,
      Remarks: r.remarks,
      Tab: r.lead_type === 'positive' ? 'Positives' : 'JD Received',
    }));

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) =>
        headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Daily_Leads_${activeTab.toUpperCase()}_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <LeadsHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedCollegeId={selectedCollegeId}
        onCollegeChange={(id, name) => {
          setSelectedCollegeId(id);
          setSelectedCollegeName(name);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onExportCsv={handleExportCsv}
        onRefresh={() => {
          loadLeads();
          loadSummary();
        }}
      />

      {/* ── Summary Strip (Fixed above tabs per Spec Section 12) ───────────── */}
      <LeadsSummaryStrip
        summary={summary}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* ── Tab Bar (Positives vs JD Received) ────────────────────────────── */}
      <LeadsTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        positivesCount={summary.positives_count}
        jdCount={summary.jd_received_count}
      />

      {/* ── Table Workspace ───────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-4">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <LeadsTable
            rows={leads}
            activeTab={activeTab}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onClearSelection={handleClearSelection}
            onBulkDelete={handleBulkDelete}
            onUpdateRow={handleUpdateRow}
            onMoveToJd={handleMoveToJd}
            onDeleteRow={handleDeleteRow}
          />
        </div>
      </div>

      {/* ── Add Entry Modal ───────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <AddLeadModal
          initialLeadType={activeTab}
          initialCollegeId={selectedCollegeId}
          initialDate={selectedDate}
          coordinatorId={coordinatorId}
          onClose={() => setIsAddModalOpen(false)}
          onAdded={() => {
            loadLeads();
            loadSummary();
          }}
        />
      )}

    </div>
  );
}
