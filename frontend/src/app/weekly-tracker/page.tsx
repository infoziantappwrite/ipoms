'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { WeeklyHeader } from './components/WeeklyHeader';
import { WeeklyKpiCards, WeeklyKpiData } from './components/WeeklyKpiCards';
import { WeeklySection } from './components/WeeklySection';
import { AddCompanyModal } from './components/AddCompanyModal';
import type { WeeklyRow } from './components/WeeklyTable';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';
import { getActiveCollege, resolveDefaultCollege } from '@/lib/collegeSession';

interface SectionData {
  title: string;
  order: number;
  summary_metric: string;
  rows: WeeklyRow[];
}

interface SectionsResponse {
  follow_ups_due_today: SectionData;
  completed: SectionData;
  in_drive?: SectionData;
  companies_in_drive?: SectionData;
  in_progress: SectionData;
  pipeline: SectionData;
  top_companies: SectionData;
  rejected_companies?: SectionData;
  on_hold_by_college?: SectionData;
  on_hold_by_hr?: SectionData;
  rejected_by_hr?: SectionData;
  rejected_by_college?: SectionData;
}

export default function WeeklyTrackerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(() => {
    return getActiveCollege().id || '';
  });
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>(() => {
    return getActiveCollege().name || '';
  });
  // 'all' - there is no working year selector in the UI (onAcademicYearChange is
  // never actually wired to a control), so a hardcoded year here silently filters
  // out real data forever whenever the current season's number doesn't match it.
  // 'all' means "don't filter", matching what the backend now does honestly.
  const [academicYear, setAcademicYear] = useState<string>('all');
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

  // ── Global Delete Mode State ──
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleSelectRow = (rowId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleToggleSelectSection = (sectionRowIds: string[]) => {
    const allSelected = sectionRowIds.every((id) => selectedRowIds.includes(id));
    if (allSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !sectionRowIds.includes(id)));
    } else {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...sectionRowIds])));
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.length} selected row(s)?`)) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch('/weekly-tracker/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedRowIds }),
      });
      if (res.success) {
        setSelectedRowIds([]);
        setIsDeleteMode(false);
        await loadWeeklyTracker();
        await loadKpi();
      }
    } catch (err) {
      console.error('Failed to bulk delete rows:', err);
      alert('Failed to delete selected rows. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) setCoordinatorId(user._id);

    resolveDefaultCollege().then((col) => {
      if (col.id) {
        setSelectedCollegeId(col.id);
        setSelectedCollegeName(col.name);
      }
    });
  }, []);

  // ── Load Weekly Tracker Sections
  const loadWeeklyTracker = useCallback(async () => {
    if (!selectedCollegeId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        college_id: selectedCollegeId,
        academic_year: academicYear,
        week_offset: String(weekOffset),
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
  }, [selectedCollegeId, academicYear, weekOffset, searchQuery, companyTypeFilter]);

  // ── Load Live KPI Counts
  const loadKpi = useCallback(async () => {
    if (!selectedCollegeId) return;
    try {
      const res = await apiFetch(`/weekly-tracker/kpi?college_id=${selectedCollegeId}&academic_year=${academicYear}&week_offset=${weekOffset}`);
      if (res.success && res.data) {
        setKpi((res.data as any).kpi);
      }
    } catch (err) {
      console.error('Failed to load weekly KPI:', err);
    }
  }, [selectedCollegeId, academicYear, weekOffset]);

  // ── Initial load & filter change effects
  useEffect(() => {
    if (selectedCollegeId) {
      loadWeeklyTracker();
      loadKpi();
    }
  }, [selectedCollegeId, academicYear, loadWeeklyTracker, loadKpi]);

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
          academic_year: academicYear,
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

  // ── XLSX Excel Export Utility
  const handleExportXlsx = async () => {
    if (!selectedCollegeId) {
      alert('Please select a college first');
      return;
    }

    try {
      const q = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const blob = await apiFetchBlob(
        `/weekly-tracker/export-xlsx?college_id=${selectedCollegeId}&academic_year=${academicYear}${q}`
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Weekly_Tracker_${selectedCollegeName.replace(/\s+/g, '_')}_${academicYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export XLSX error:', err);
      alert('Failed to export XLSX document: ' + (err.message || 'Unknown error'));
    }
  };

  // Helper to extract all rows across sections
  const getAllWeeklyRows = useCallback(() => {
    if (!sections) return [];
    const allRows: (WeeklyRow & { sectionTitle: string })[] = [];
    (Object.keys(sections) as (keyof SectionsResponse)[]).forEach((k) => {
      const sec = sections[k];
      if (sec && Array.isArray(sec.rows)) {
        sec.rows.forEach((r) => {
          if (r.company_name) {
            allRows.push({ ...r, sectionTitle: sec.title });
          }
        });
      }
    });
    return allRows;
  }, [sections]);

  // Trigger direct navigation to Report Builder when clicking PDF or Image from dropdown
  const handleOpenPdfModal = () => {
    const collegeQuery = selectedCollegeId || 'all';
    router.push(`/reports?template=weekly_placement&collegeId=${encodeURIComponent(collegeQuery)}`);
  };

  const handleOpenImageModal = () => {
    const collegeQuery = selectedCollegeId || 'all';
    router.push(`/reports?template=weekly_placement&collegeId=${encodeURIComponent(collegeQuery)}`);
  };

  // ── Global Save & Sync (Ctrl+S / Cmd+S) ──────────────────────────────────
  const handleSaveAll = useCallback(async () => {
    // Commit any currently active input or table cell by unfocusing
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      // Refresh and sync weekly tracker state and KPI metrics with backend
      await Promise.all([loadWeeklyTracker(), loadKpi()]);
      window.dispatchEvent(new CustomEvent('ipoms_trigger_autosave_banner'));
    } catch (e) {
      console.error('Failed to sync weekly tracker on save:', e);
      toast('Failed to save changes. Please check your connection.', 'error');
    }
  }, [loadWeeklyTracker, loadKpi, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveAll();
      }
    };

    const handleGlobalTrigger = (e: any) => {
      if (e.detail?.pathname?.includes('/weekly-tracker')) {
        handleSaveAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ipoms_global_save_trigger' as any, handleGlobalTrigger);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ipoms_global_save_trigger' as any, handleGlobalTrigger);
    };
  }, [handleSaveAll]);

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
        academicYear={academicYear}
        onAcademicYearChange={setAcademicYear}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onSyncDailyPositives={handleSyncDailyPositives}
        onExportXlsx={handleExportXlsx}
        onExportPdf={handleOpenPdfModal}
        onExportImage={handleOpenImageModal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDeleteMode={isDeleteMode}
        selectedCount={selectedRowIds.length}
        onToggleDeleteMode={() => {
          setIsDeleteMode(!isDeleteMode);
          setSelectedRowIds([]);
        }}
        onExecuteBulkDelete={handleExecuteBulkDelete}
        isDeleting={isDeleting}
      />

      {/* ── KPI Cards (Slim Single-Row Profile) ──────────────────────────── */}
      {selectedCollegeId && kpi && (
        <div className="px-6 py-2">
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

      {/* ── Operational Sections ────────────────────────────────────────── */}
      {selectedCollegeId && sections && (
        <div className="flex-1 px-6 pb-8 space-y-4">
          {/* Section 1: Companies Completed */}
          {shouldRenderSection('completed') && (
            <WeeklySection
              sectionKey="completed"
              title={sections?.completed?.title || 'Companies Completed'}
              order={sections?.completed?.order ?? 1}
              summaryMetric={sections?.completed?.summary_metric || ''}
              rows={sections?.completed?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 2: Companies in Drive */}
          {(shouldRenderSection('in_drive') || shouldRenderSection('companies_in_drive')) && (
            <WeeklySection
              sectionKey="in_drive"
              title={sections?.in_drive?.title || sections?.companies_in_drive?.title || 'Companies in Drive'}
              order={sections?.in_drive?.order ?? 2}
              summaryMetric={sections?.in_drive?.summary_metric || sections?.companies_in_drive?.summary_metric || ''}
              rows={sections?.in_drive?.rows || sections?.companies_in_drive?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
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
              title={sections?.in_progress?.title || 'Companies In Progress'}
              order={sections?.in_progress?.order ?? 3}
              summaryMetric={sections?.in_progress?.summary_metric || ''}
              rows={sections?.in_progress?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
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
              title={sections?.pipeline?.title || 'Companies in Pipeline'}
              order={sections?.pipeline?.order ?? 3}
              summaryMetric={sections?.pipeline?.summary_metric || ''}
              rows={sections?.pipeline?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
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
              title={sections?.top_companies?.title || 'Top Companies'}
              order={sections?.top_companies?.order ?? 4}
              summaryMetric={sections?.top_companies?.summary_metric || ''}
              rows={sections?.top_companies?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 5: Rejected Companies */}
          {(shouldRenderSection('rejected_companies') || shouldRenderSection('rejected_by_hr')) && (
            <WeeklySection
              sectionKey="rejected_companies"
              title={sections?.rejected_companies?.title || sections?.rejected_by_hr?.title || 'Rejected Companies'}
              order={sections?.rejected_companies?.order ?? 5}
              summaryMetric={sections?.rejected_companies?.summary_metric || sections?.rejected_by_hr?.summary_metric || ''}
              rows={sections?.rejected_companies?.rows || sections?.rejected_by_hr?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 6: Companies On Hold By College */}
          {(shouldRenderSection('on_hold_by_college') || shouldRenderSection('rejected_by_college')) && (
            <WeeklySection
              sectionKey="on_hold_by_college"
              title={sections?.on_hold_by_college?.title || sections?.rejected_by_college?.title || 'Companies On Hold By College'}
              order={sections?.on_hold_by_college?.order ?? 6}
              summaryMetric={sections?.on_hold_by_college?.summary_metric || sections?.rejected_by_college?.summary_metric || ''}
              rows={sections?.on_hold_by_college?.rows || sections?.rejected_by_college?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Section 7: Companies On Hold By HR */}
          {shouldRenderSection('on_hold_by_hr') && (
            <WeeklySection
              sectionKey="on_hold_by_hr"
              title={sections?.on_hold_by_hr?.title || 'Companies On Hold By HR'}
              order={sections?.on_hold_by_hr?.order ?? 7}
              summaryMetric={sections?.on_hold_by_hr?.summary_metric || ''}
              rows={sections?.on_hold_by_hr?.rows || []}
              isGlobalDeleteMode={isDeleteMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
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
