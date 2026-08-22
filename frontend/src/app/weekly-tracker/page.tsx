'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { WeeklyHeader } from './components/WeeklyHeader';
import { WeeklyKpiCards, WeeklyKpiData } from './components/WeeklyKpiCards';
import { WeeklyToolbar } from './components/WeeklyToolbar';
import { WeeklySection } from './components/WeeklySection';
import { AddCompanyModal } from './components/AddCompanyModal';
import type { WeeklyRow } from './components/WeeklyTable';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';

interface SectionData {
  title: string;
  order: number;
  summary_metric: string;
  rows: WeeklyRow[];
}

interface SectionsResponse {
  follow_ups_due_today: SectionData;
  completed: SectionData;
  in_progress: SectionData;
  pipeline: SectionData;
  top_companies: SectionData;
  rejected_by_hr: SectionData;
  rejected_by_college: SectionData;
}

export default function WeeklyTrackerPage() {
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [sections, setSections] = useState<SectionsResponse | null>(null);
  const [kpi, setKpi] = useState<WeeklyKpiData | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('all');
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [coordinatorId, setCoordinatorId] = useState<string | null>(null);

  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) setCoordinatorId(user._id);
  }, []);

  // ── Load Weekly Tracker Sections
  const loadWeeklyTracker = useCallback(async () => {
    if (!selectedCollegeId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        college_id: selectedCollegeId,
        academic_year: '2026',
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (companyTypeFilter !== 'all') params.set('company_type', companyTypeFilter);

      const res = await apiFetch(`/weekly-tracker?${params.toString()}`);
      if (res.success && res.data) {
        setSections((res.data as any).sections);
        setTotalRecords((res.data as any).total_records);
      }
    } catch (err) {
      console.error('Failed to load weekly tracker:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCollegeId, searchQuery, companyTypeFilter]);

  // ── Load Live KPI Counts
  const loadKpi = useCallback(async () => {
    if (!selectedCollegeId) return;
    try {
      const res = await apiFetch(`/weekly-tracker/kpi?college_id=${selectedCollegeId}&academic_year=2026`);
      if (res.success && res.data) {
        setKpi((res.data as any).kpi);
      }
    } catch (err) {
      console.error('Failed to load weekly KPI:', err);
    }
  }, [selectedCollegeId]);

  // ── Initial load & filter change effects
  useEffect(() => {
    if (selectedCollegeId) {
      loadWeeklyTracker();
      loadKpi();
    }
  }, [selectedCollegeId, loadWeeklyTracker, loadKpi]);

  // ── Row Patch (Inline Edit)
  const handleUpdateRow = async (rowId: string, patch: Partial<WeeklyRow>) => {
    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (res.success) {
        await loadWeeklyTracker();
        await loadKpi();
      }
    } catch (err) {
      console.error('Failed to update row:', err);
    }
  };

  // ── Move Section
  const handleMoveSection = async (rowId: string, newSection: string) => {
    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}/section`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_section: newSection }),
      });
      if (res.success) {
        await loadWeeklyTracker();
        await loadKpi();
      }
    } catch (err) {
      console.error('Failed to move section:', err);
    }
  };

  // ── Toggle Pin Top Companies
  const handleTogglePin = async (rowId: string) => {
    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}/pin`, {
        method: 'PATCH',
      });
      if (res.success) {
        await loadWeeklyTracker();
        await loadKpi();
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // ── Delete Row (Soft delete)
  const handleDeleteRow = async (rowId: string) => {
    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await loadWeeklyTracker();
        await loadKpi();
      }
    } catch (err) {
      console.error('Failed to delete row:', err);
    }
  };

  // ── Sync Positives from Daily Tracker
  const handleSyncDailyPositives = async () => {
    if (!selectedCollegeId) return;
    try {
      const res = await apiFetch('/weekly-tracker/sync-daily-positives', {
        method: 'POST',
        body: JSON.stringify({
          college_id: selectedCollegeId,
          coordinator_id: coordinatorId,
        }),
      });
      if (res.success) {
        alert(res.message);
        await loadWeeklyTracker();
        await loadKpi();
      }
    } catch (err) {
      console.error('Failed to sync positives:', err);
    }
  };

  // ── CSV Export Utility
  const handleExportCsv = () => {
    if (!sections) return;

    const allRows: any[] = [];
    Object.entries(sections).forEach(([key, sec]) => {
      sec.rows.forEach((r: WeeklyRow, i: number) => {
        allRows.push({
          Section: sec.title,
          'S.No': i + 1,
          'Company Name': r.company_name,
          Roles: r.job_role,
          'CDC Reference': r.cdc_reference || '',
          Type: r.company_type || '',
          CTC: r.ctc_lpa || '',
          'Follow-Up Date': r.follow_up_date ? new Date(r.follow_up_date).toISOString().split('T')[0] : '',
          'Status Notes': r.current_status_text,
          Offers: r.selected_count || 0,
        });
      });
    });

    if (allRows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(allRows[0]);
    const csvContent = [
      headers.join(','),
      ...allRows.map((row) =>
        headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Weekly_Tracker_${selectedCollegeName.replace(/\s+/g, '_')}_2026.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Filter sections if activeSectionFilter is set from clicking a KPI card
  const shouldRenderSection = (key: string) => {
    if (activeSectionFilter === 'all') return true;
    return activeSectionFilter === key;
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <WeeklyHeader
        selectedCollegeId={selectedCollegeId}
        onSelectCollege={(id, name) => {
          setSelectedCollegeId(id);
          setSelectedCollegeName(name);
        }}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
      />

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      {selectedCollegeId && (
        <WeeklyToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          companyTypeFilter={companyTypeFilter}
          onCompanyTypeChange={setCompanyTypeFilter}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onSyncDailyPositives={handleSyncDailyPositives}
          onRefresh={() => {
            loadWeeklyTracker();
            loadKpi();
          }}
          onExportCsv={handleExportCsv}
          totalRecords={totalRecords}
        />
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      {selectedCollegeId && kpi && (
        <div className="px-6 py-4">
          <WeeklyKpiCards
            kpi={kpi}
            activeSectionFilter={activeSectionFilter}
            onFilterSection={setActiveSectionFilter}
          />
        </div>
      )}

      {/* ── Empty State when no college is selected ──────────────────────── */}
      {!selectedCollegeId && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400">
            <CalendarDays size={32} strokeWidth={1.75} className="text-primary" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">Select a College to View Weekly Tracker</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Choose a partner institution from the header dropdown to view ongoing recruitment drives across all 7 operational pipeline sections.
            </p>
          </div>
        </div>
      )}

      {/* ── 7 Operational Sections ────────────────────────────────────────── */}
      {selectedCollegeId && sections && (
        <div className="flex-1 px-6 pb-8 space-y-4">
          {/* Section 1: Follow-ups Due Today */}
          {shouldRenderSection('follow_ups_due_today') && (
            <WeeklySection
              sectionKey="follow_ups_due_today"
              title={sections.follow_ups_due_today.title}
              order={sections.follow_ups_due_today.order}
              summaryMetric={sections.follow_ups_due_today.summary_metric}
              rows={sections.follow_ups_due_today.rows}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 2: Companies Completed */}
          {shouldRenderSection('completed') && (
            <WeeklySection
              sectionKey="completed"
              title={sections.completed.title}
              order={sections.completed.order}
              summaryMetric={sections.completed.summary_metric}
              rows={sections.completed.rows}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 3: Companies In Progress */}
          {shouldRenderSection('in_progress') && (
            <WeeklySection
              sectionKey="in_progress"
              title={sections.in_progress.title}
              order={sections.in_progress.order}
              summaryMetric={sections.in_progress.summary_metric}
              rows={sections.in_progress.rows}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 4: Companies in Pipeline */}
          {shouldRenderSection('pipeline') && (
            <WeeklySection
              sectionKey="pipeline"
              title={sections.pipeline.title}
              order={sections.pipeline.order}
              summaryMetric={sections.pipeline.summary_metric}
              rows={sections.pipeline.rows}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 5: Top Companies */}
          {shouldRenderSection('top_companies') && (
            <WeeklySection
              sectionKey="top_companies"
              title={sections.top_companies.title}
              order={sections.top_companies.order}
              summaryMetric={sections.top_companies.summary_metric}
              rows={sections.top_companies.rows}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 6: Rejected by HR */}
          {shouldRenderSection('rejected_by_hr') && (
            <WeeklySection
              sectionKey="rejected_by_hr"
              title={sections.rejected_by_hr.title}
              order={sections.rejected_by_hr.order}
              summaryMetric={sections.rejected_by_hr.summary_metric}
              rows={sections.rejected_by_hr.rows}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 7: Rejected by College */}
          {shouldRenderSection('rejected_by_college') && (
            <WeeklySection
              sectionKey="rejected_by_college"
              title={sections.rejected_by_college.title}
              order={sections.rejected_by_college.order}
              summaryMetric={sections.rejected_by_college.summary_metric}
              rows={sections.rejected_by_college.rows}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}
        </div>
      )}

      {/* ── Add Company Modal ──────────────────────────────────────────────── */}
      {isAddModalOpen && selectedCollegeId && (
        <AddCompanyModal
          collegeId={selectedCollegeId}
          coordinatorId={coordinatorId ?? ''}
          onClose={() => setIsAddModalOpen(false)}
          onAdded={() => {
            loadWeeklyTracker();
            loadKpi();
          }}
        />
      )}

    </div>
  );
}
