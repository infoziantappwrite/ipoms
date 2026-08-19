'use client';

import { useState, useEffect, useCallback } from 'react';
import { LeadsHeader } from './components/LeadsHeader';
import { LeadsSummaryStrip, LeadsSummaryData } from './components/LeadsSummaryStrip';
import { LeadsTabBar } from './components/LeadsTabBar';
import { LeadsTable, DailyLeadRow } from './components/LeadsTable';
import { AddLeadModal } from './components/AddLeadModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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

  // Default Coordinator ID (will come from JWT session in production)
  const COORDINATOR_ID = '6a84719afa3bf51271bc1548';

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

      const res = await fetch(`${API}/daily-leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.leads);
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

      const res = await fetch(`${API}/daily-leads/summary?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.data.summary);
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
      const res = await fetch(`${API}/daily-leads/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
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
      const res = await fetch(`${API}/daily-leads/${rowId}/move-to-jd`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        await loadLeads();
        await loadSummary();
      }
    } catch (err) {
      console.error('Failed to move to JD:', err);
    }
  };

  // ── Delete Row (Soft Delete)
  const handleDeleteRow = async (rowId: string) => {
    try {
      const res = await fetch(`${API}/daily-leads/${rowId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await loadLeads();
        await loadSummary();
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
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
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">

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
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-lg">
          <LeadsTable
            rows={leads}
            activeTab={activeTab}
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
          coordinatorId={COORDINATOR_ID}
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
