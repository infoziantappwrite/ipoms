'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { WeeklyHeader } from './components/WeeklyHeader';
import { WeeklyKpiCards, WeeklyKpiData } from './components/WeeklyKpiCards';
import { WeeklySection } from './components/WeeklySection';
import { AddCompanyModal } from './components/AddCompanyModal';
import { BulkMoveModal } from './components/BulkMoveModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import type { WeeklyRow } from './components/WeeklyTable';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';
import { getActiveCollege, resolveDefaultCollege } from '@/lib/collegeSession';
import { useUndoRedo } from '@/hooks/useUndoRedo';

interface SectionData {
  title: string;
  order: number;
  summary_metric: string;
  rows: WeeklyRow[];
}

interface SectionsResponse {
  follow_ups_due_today: SectionData;
  completed: SectionData;
  drive_in_progress?: SectionData;
  in_drive?: SectionData;
  companies_in_drive?: SectionData;
  upcoming_drives?: SectionData;
  in_progress: SectionData;
  pipeline: SectionData;
  top_companies: SectionData;
  rejected_companies?: SectionData;
  on_hold_by_college?: SectionData;
  on_hold_by_hr?: SectionData;
  rejected_by_hr?: SectionData;
  rejected_by_college?: SectionData;
}

function normalizeSectionKey(key: string): keyof SectionsResponse {
  if (key === 'companies_in_drive' || key === 'upcoming_drives') return 'in_drive';
  if (key === 'rejected_by_hr') return 'rejected_companies';
  if (key === 'rejected_by_college') return 'on_hold_by_college';
  return key as keyof SectionsResponse;
}

function normalizeAllSections(raw: any): SectionsResponse {
  if (!raw) return raw;
  const inDriveData: SectionData = raw.in_drive || raw.upcoming_drives || raw.companies_in_drive || {
    title: 'Upcoming Drives',
    order: 3,
    summary_metric: '',
    rows: [],
  };
  const rejectedData: SectionData = raw.rejected_companies || raw.rejected_by_hr || {
    title: 'Rejected Companies',
    order: 7,
    summary_metric: '',
    rows: [],
  };
  const holdCollegeData: SectionData = raw.on_hold_by_college || raw.rejected_by_college || {
    title: 'Companies On Hold By College',
    order: 8,
    summary_metric: '',
    rows: [],
  };

  return {
    ...raw,
    in_drive: inDriveData,
    upcoming_drives: inDriveData,
    companies_in_drive: inDriveData,
    rejected_companies: rejectedData,
    rejected_by_hr: rejectedData,
    on_hold_by_college: holdCollegeData,
    rejected_by_college: holdCollegeData,
  };
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [myCollegeIds, setMyCollegeIds] = useState<Set<string>>(new Set());
  const isForeignCollege = myCollegeIds.size > 0 && !!selectedCollegeId && !myCollegeIds.has(selectedCollegeId);

  // ── Global Undo / Redo Hook ──
  const { pushAction, undo, redo, canUndo, canRedo } = useUndoRedo({
    enableKeyboardShortcuts: true,
  });

  // ── Global Move / Delete Selection Mode State ──
  const [selectionMode, setSelectionMode] = useState<'move' | 'delete' | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

  const handleToggleSelectRow = (rowId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleToggleSelectSection = (sectionRowIds: string[]) => {
    const allSelected = sectionRowIds.length > 0 && sectionRowIds.every((id) => selectedRowIds.includes(id));
    if (allSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !sectionRowIds.includes(id)));
    } else {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...sectionRowIds])));
    }
  };

  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) {
      setCoordinatorId(user._id);
      apiFetch<any>(`/profile/${user._id}`).then((res) => {
        const ids = (res?.data?.assigned_college_ids || [])
          .map((c: any) => (typeof c === 'string' ? c : c?._id))
          .filter(Boolean);
        setMyCollegeIds(new Set(ids));
      }).catch((err) => console.error('Failed to load assigned colleges:', err));
    }

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
        const normalized = normalizeAllSections((res.data as any).sections);
        setSections(normalized);
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

  // ── Auto-reset saved badge status
  useEffect(() => {
    if (saveStatus === 'saved') {
      const t = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  const confirmForeignAction = (actionLabel: string): boolean => {
    if (!isForeignCollege) return true;
    return window.confirm(
      `${selectedCollegeName || 'This college'} is not one of your assigned colleges. `
      + `Continue with this ${actionLabel} anyway? The coordinator who handles it will be notified.`
    );
  };

  // ── Row Patch (Inline Edit) with Undo / Redo
  const handleUpdateRow = async (rowId: string, patch: Partial<WeeklyRow>, isUndoRedo = false) => {
    if (!confirmForeignAction('edit')) return;

    let existingRow: WeeklyRow | undefined;
    if (sections) {
      for (const sec of Object.values(sections)) {
        if (sec && Array.isArray(sec.rows)) {
          const found = sec.rows.find((r: WeeklyRow) => r._id === rowId);
          if (found) {
            existingRow = found;
            break;
          }
        }
      }
    }

    if (!isUndoRedo && existingRow) {
      const oldPatch: Partial<WeeklyRow> = {};
      const newPatch: Partial<WeeklyRow> = { ...patch };
      for (const k of Object.keys(patch) as (keyof WeeklyRow)[]) {
        (oldPatch as any)[k] = existingRow[k];
      }
      const companyName = existingRow.company_name || 'company';
      pushAction({
        description: `Edit on "${companyName}"`,
        undo: async () => {
          await handleUpdateRow(rowId, oldPatch, true);
        },
        redo: async () => {
          await handleUpdateRow(rowId, newPatch, true);
        },
      });
    }

    // Optimistically update in state
    setSections((prev) => {
      if (!prev) return prev;
      const nextState: any = { ...prev };
      for (const secKey of Object.keys(prev) as (keyof SectionsResponse)[]) {
        const sec = prev[secKey];
        if (sec && Array.isArray(sec.rows) && sec.rows.some((r) => r._id === rowId)) {
          nextState[secKey] = {
            ...sec,
            rows: sec.rows.map((r) => (r._id === rowId ? { ...r, ...patch } : r)),
          };
        }
      }
      return nextState;
    });

    setSaveStatus('saving');
    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (res.success) {
        await loadWeeklyTracker();
        await loadKpi();
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } else {
        setSaveStatus('idle');
      }
    } catch (err) {
      console.error('Failed to update row:', err);
      setSaveStatus('idle');
    }
  };

  // ── Move Section
  const handleMoveSection = async (rowId: string, newSection: string) => {
    if (sections) {
      for (const [secKey, secData] of Object.entries(sections)) {
        if (secData && Array.isArray(secData.rows) && secData.rows.some((r: WeeklyRow) => r._id === rowId)) {
          await handleMoveRowCrossSection(rowId, secKey, newSection);
          return;
        }
      }
    }

    if (!confirmForeignAction('edit')) return;
    setSaveStatus('saving');
    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}/section`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_section: newSection }),
      });
      if (res.success) {
        await loadWeeklyTracker();
        await loadKpi();
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } else {
        setSaveStatus('idle');
      }
    } catch (err) {
      console.error('Failed to move section:', err);
      setSaveStatus('idle');
    }
  };

  // ── Toggle Pin Top Companies with Undo / Redo
  const handleTogglePin = async (rowId: string, isUndoRedo = false) => {
    let existingRow: WeeklyRow | undefined;
    if (sections) {
      for (const sec of Object.values(sections)) {
        if (sec && Array.isArray(sec.rows)) {
          const found = sec.rows.find((r: WeeklyRow) => r._id === rowId);
          if (found) {
            existingRow = found;
            break;
          }
        }
      }
    }

    if (!isUndoRedo && existingRow) {
      const companyName = existingRow.company_name || 'company';
      const isPinnedNow = !existingRow.is_pinned_top;
      pushAction({
        description: `${isPinnedNow ? 'Pinned' : 'Unpinned'} "${companyName}"`,
        undo: async () => {
          await handleTogglePin(rowId, true);
        },
        redo: async () => {
          await handleTogglePin(rowId, true);
        },
      });
    }

    setSaveStatus('saving');
    try {
      const res = await apiFetch(`/weekly-tracker/${rowId}/pin`, {
        method: 'PATCH',
      });
      if (res.success) {
        await loadWeeklyTracker();
        await loadKpi();
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } else {
        setSaveStatus('idle');
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      setSaveStatus('idle');
    }
  };

  // ── Delete Row (Soft delete) with Undo / Redo
  const handleDeleteRow = async (rowId: string, isUndoRedo = false) => {
    if (!confirmForeignAction('delete')) return;

    let deletedRow: WeeklyRow | undefined;
    if (sections) {
      for (const sec of Object.values(sections)) {
        if (sec && Array.isArray(sec.rows)) {
          const found = sec.rows.find((r: WeeklyRow) => r._id === rowId);
          if (found) {
            deletedRow = found;
            break;
          }
        }
      }
    }

    if (!isUndoRedo && deletedRow) {
      const companyName = deletedRow.company_name || 'company';
      pushAction({
        description: `Delete "${companyName}"`,
        undo: async () => {
          await apiFetch(`/weekly-tracker/${rowId}/restore`, { method: 'POST' });
          await loadWeeklyTracker();
          await loadKpi();
        },
        redo: async () => {
          await apiFetch(`/weekly-tracker/${rowId}`, { method: 'DELETE' });
          await loadWeeklyTracker();
          await loadKpi();
        },
      });
    }

    // Optimistic removal
    setSections((prev) => {
      if (!prev) return prev;
      const nextState: any = { ...prev };
      for (const secKey of Object.keys(prev) as (keyof SectionsResponse)[]) {
        const sec = prev[secKey];
        if (sec && Array.isArray(sec.rows) && sec.rows.some((r) => r._id === rowId)) {
          nextState[secKey] = {
            ...sec,
            rows: sec.rows.filter((r) => r._id !== rowId),
          };
        }
      }
      return normalizeAllSections(nextState);
    });

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

  // ── Bulk Delete with In-App Confirmation Modal & Undo/Redo
  const handleRequestBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    const idsToDelete = [...selectedRowIds];
    setIsDeleteConfirmModalOpen(false);

    pushAction({
      description: `Deleted ${idsToDelete.length} company records`,
      undo: async () => {
        await apiFetch('/weekly-tracker/batch-restore', {
          method: 'POST',
          body: JSON.stringify({ ids: idsToDelete }),
        });
        await loadWeeklyTracker();
        await loadKpi();
      },
      redo: async () => {
        await apiFetch('/weekly-tracker/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ ids: idsToDelete }),
        });
        await loadWeeklyTracker();
        await loadKpi();
      },
    });

    setIsDeleting(true);
    try {
      const res = await apiFetch('/weekly-tracker/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: idsToDelete }),
      });
      if (res.success) {
        setSelectedRowIds([]);
        setSelectionMode(null);
        await loadWeeklyTracker();
        await loadKpi();
        toast(`Deleted ${idsToDelete.length} company record${idsToDelete.length > 1 ? 's' : ''}`, 'success');
      }
    } catch (err) {
      console.error('Failed to bulk delete rows:', err);
      toast('Failed to delete selected rows. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Excel-like Row Reorder & Swap (Intra-Section) with Undo / Redo
  const handleReorderRows = async (sectionKey: string, reorderedRows: WeeklyRow[], isUndoRedo = false) => {
    const targetSecKey = normalizeSectionKey(sectionKey);
    const currentRows = sections?.[targetSecKey]?.rows || [];

    if (!isUndoRedo && currentRows.length > 0) {
      const prevRowsCopy = [...currentRows];
      const newRowsCopy = [...reorderedRows];
      const sectionTitle = sections?.[targetSecKey]?.title || sectionKey;
      pushAction({
        description: `Row order in ${sectionTitle}`,
        undo: async () => {
          await handleReorderRows(sectionKey, prevRowsCopy, true);
        },
        redo: async () => {
          await handleReorderRows(sectionKey, newRowsCopy, true);
        },
      });
    }

    // 1. Optimistic UI update across all alias keys
    setSections((prev) => {
      if (!prev) return prev;
      const currentSec = prev[targetSecKey];
      if (!currentSec) return prev;
      const updatedSec = { ...currentSec, rows: reorderedRows };
      const nextState: any = {
        ...prev,
        [targetSecKey]: updatedSec,
      };

      if (targetSecKey === 'in_drive') {
        nextState.upcoming_drives = updatedSec;
        nextState.companies_in_drive = updatedSec;
      } else if (targetSecKey === 'rejected_companies') {
        nextState.rejected_by_hr = updatedSec;
      } else if (targetSecKey === 'on_hold_by_college') {
        nextState.rejected_by_college = updatedSec;
      }

      return nextState;
    });

    // 2. Persist order_index to backend
    try {
      const rowIds = reorderedRows.map((r) => r._id);
      await apiFetch('/weekly-tracker/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          college_id: selectedCollegeId,
          section: sectionKey,
          row_ids: rowIds,
        }),
      });
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Failed to save reordered rows:', err);
      toast('Failed to save row arrangement', 'error');
      await loadWeeklyTracker();
    }
  };

  // ── Excel-like Cross-Section Drag & Drop Row Swap with Undo / Redo
  const handleMoveRowCrossSection = async (
    rowId: string,
    sourceSectionKey: string,
    targetSectionKey: string,
    targetIndex?: number,
    isUndoRedo = false
  ) => {
    const normSourceKey = normalizeSectionKey(sourceSectionKey);
    const normTargetKey = normalizeSectionKey(targetSectionKey);

    if (normSourceKey === normTargetKey) return;

    if (!confirmForeignAction('move')) return;

    const sourceSec = sections?.[normSourceKey];
    const targetSec = sections?.[normTargetKey];
    const rowToMove = sourceSec?.rows.find((r) => r._id === rowId);
    const sourceIndex = sourceSec?.rows.findIndex((r) => r._id === rowId) ?? -1;
    const companyName = rowToMove?.company_name || 'company';

    if (!isUndoRedo && rowToMove && sourceIndex !== -1) {
      const prevSecKey = sourceSectionKey;
      const nextSecKey = targetSectionKey;
      const prevIdx = sourceIndex;
      const nextIdx = typeof targetIndex === 'number' ? targetIndex : (targetSec?.rows.length || 0);

      const sourceLabel = normSourceKey.replace(/_/g, ' ');
      const targetLabel = normTargetKey.replace(/_/g, ' ');

      pushAction({
        description: `Moved "${companyName}" from ${sourceLabel} to ${targetLabel}`,
        undo: async () => {
          await handleMoveRowCrossSection(rowId, nextSecKey, prevSecKey, prevIdx, true);
        },
        redo: async () => {
          await handleMoveRowCrossSection(rowId, prevSecKey, nextSecKey, nextIdx, true);
        },
      });
    }

    let nextTargetRows: WeeklyRow[] = [];
    let nextSourceRows: WeeklyRow[] = [];

    // 1. Optimistic local state update across all aliases
    setSections((prev) => {
      if (!prev) return prev;
      const sSec = prev[normSourceKey];
      const tSec = prev[normTargetKey];
      if (!sSec || !tSec) return prev;

      const r = sSec.rows.find((x) => x._id === rowId);
      if (!r) return prev;

      nextSourceRows = sSec.rows.filter((x) => x._id !== rowId);
      const updatedRow: WeeklyRow = {
        ...r,
        pipeline_section: targetSectionKey,
        is_pinned_top: targetSectionKey === 'top_companies' ? true : r.is_pinned_top,
      };

      nextTargetRows = [...tSec.rows.filter((x) => x._id !== rowId)];
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= nextTargetRows.length) {
        nextTargetRows.splice(targetIndex, 0, updatedRow);
      } else {
        nextTargetRows.push(updatedRow);
      }

      const updatedSource = { ...sSec, rows: nextSourceRows };
      const updatedTarget = { ...tSec, rows: nextTargetRows };

      const nextState: any = {
        ...prev,
        [normSourceKey]: updatedSource,
        [normTargetKey]: updatedTarget,
      };

      if (normSourceKey === 'in_drive' || normTargetKey === 'in_drive') {
        const d = normSourceKey === 'in_drive' ? updatedSource : updatedTarget;
        nextState.in_drive = d;
        nextState.upcoming_drives = d;
        nextState.companies_in_drive = d;
      }
      if (normSourceKey === 'rejected_companies' || normTargetKey === 'rejected_companies') {
        const d = normSourceKey === 'rejected_companies' ? updatedSource : updatedTarget;
        nextState.rejected_companies = d;
        nextState.rejected_by_hr = d;
      }
      if (normSourceKey === 'on_hold_by_college' || normTargetKey === 'on_hold_by_college') {
        const d = normSourceKey === 'on_hold_by_college' ? updatedSource : updatedTarget;
        nextState.on_hold_by_college = d;
        nextState.rejected_by_college = d;
      }

      return nextState;
    });

    triggerHaptic('medium');
    const targetLabel = targetSectionKey.replace(/_/g, ' ');
    if (!isUndoRedo) {
      toast(`Moved company to ${targetLabel.charAt(0).toUpperCase() + targetLabel.slice(1)}`, 'success');
    }

    // 2. Persist section change and ordering in background
    setSaveStatus('saving');
    try {
      await apiFetch(`/weekly-tracker/${rowId}/section`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_section: targetSectionKey }),
      });

      if (nextTargetRows.length > 0) {
        await apiFetch('/weekly-tracker/reorder', {
          method: 'PATCH',
          body: JSON.stringify({
            college_id: selectedCollegeId,
            section: targetSectionKey,
            row_ids: nextTargetRows.map((r) => r._id),
          }),
        });
      }

      if (nextSourceRows.length > 0) {
        await apiFetch('/weekly-tracker/reorder', {
          method: 'PATCH',
          body: JSON.stringify({
            college_id: selectedCollegeId,
            section: sourceSectionKey,
            row_ids: nextSourceRows.map((r) => r._id),
          }),
        });
      }

      setSaveStatus('saved');
      setLastSavedAt(new Date());
      loadKpi();
    } catch (err) {
      console.error('Failed to move row cross section:', err);
      toast('Failed to save cross-section move', 'error');
      await loadWeeklyTracker();
      await loadKpi();
    }
  };

  // ── Gather all rows across all active sections ─────────────────────────
  const getAllAvailableRows = useCallback((): WeeklyRow[] => {
    if (!sections) return [];
    const all: WeeklyRow[] = [];
    const seenIds = new Set<string>();

    const canonicalKeys: (keyof SectionsResponse)[] = [
      'completed',
      'drive_in_progress',
      'in_drive',
      'in_progress',
      'pipeline',
      'top_companies',
      'rejected_companies',
      'on_hold_by_college',
      'on_hold_by_hr',
      'follow_ups_due_today',
    ];

    for (const key of canonicalKeys) {
      const sec = sections[key];
      if (sec && Array.isArray(sec.rows)) {
        for (const r of sec.rows) {
          if (r && r._id && !seenIds.has(r._id)) {
            seenIds.add(r._id);
            all.push(r);
          }
        }
      }
    }
    return all;
  }, [sections]);

  // ── Mode Handlers for Move & Delete ──────────────────────────────────
  const handleStartMoveMode = () => {
    setSelectionMode('move');
    setSelectedRowIds([]);
  };

  const handleStartDeleteMode = () => {
    setSelectionMode('delete');
    setSelectedRowIds([]);
  };

  const handleCancelSelection = () => {
    setSelectionMode(null);
    setSelectedRowIds([]);
    setIsBulkMoveModalOpen(false);
    setIsDeleteConfirmModalOpen(false);
  };

  const handleExecuteMove = () => {
    if (selectedRowIds.length === 0) return;
    setIsBulkMoveModalOpen(true);
  };

  const handleOpenBulkMove = () => {
    if (selectedRowIds.length > 0) {
      setIsBulkMoveModalOpen(true);
    } else {
      handleStartMoveMode();
    }
  };

  // ── Execute Bulk Move across sections with Undo / Redo ─────────────────
  const handleBulkMoveSection = async (
    targetSectionKey: string,
    rowIdsToMove: string[],
    isUndoRedo = false
  ) => {
    if (rowIdsToMove.length === 0) return;
    if (!confirmForeignAction('move')) return;

    const normTargetKey = normalizeSectionKey(targetSectionKey);
    const targetLabel = targetSectionKey.replace(/_/g, ' ');

    // Capture previous section and index for each row before moving
    const originalLocations: { id: string; sectionKey: string; index: number; row: WeeklyRow }[] = [];
    if (sections) {
      const canonicalKeys: (keyof SectionsResponse)[] = [
        'completed',
        'drive_in_progress',
        'in_drive',
        'in_progress',
        'pipeline',
        'top_companies',
        'rejected_companies',
        'on_hold_by_college',
        'on_hold_by_hr',
      ];
      for (const secKey of canonicalKeys) {
        const sec = sections[secKey];
        if (sec && Array.isArray(sec.rows)) {
          sec.rows.forEach((r, idx) => {
            if (rowIdsToMove.includes(r._id)) {
              originalLocations.push({ id: r._id, sectionKey: secKey, index: idx, row: r });
            }
          });
        }
      }
    }

    if (!isUndoRedo && originalLocations.length > 0) {
      const originalLocationsCopy = [...originalLocations];
      const targetSecCopy = targetSectionKey;
      const idsCopy = [...rowIdsToMove];

      pushAction({
        description: `Bulk moved ${idsCopy.length} companies to ${targetLabel}`,
        undo: async () => {
          for (const loc of originalLocationsCopy) {
            await apiFetch(`/weekly-tracker/${loc.id}/section`, {
              method: 'PATCH',
              body: JSON.stringify({ pipeline_section: loc.sectionKey }),
            });
          }
          await loadWeeklyTracker();
          await loadKpi();
        },
        redo: async () => {
          await apiFetch('/weekly-tracker/batch-move-section', {
            method: 'POST',
            body: JSON.stringify({ row_ids: idsCopy, pipeline_section: targetSecCopy }),
          });
          await loadWeeklyTracker();
          await loadKpi();
        },
      });
    }

    // 1. Optimistic Local State Update
    setSections((prev) => {
      if (!prev) return prev;
      const nextState: any = { ...prev };
      const rowsToTransfer: WeeklyRow[] = [];

      for (const [sKey, sData] of Object.entries(prev)) {
        if (sData && Array.isArray((sData as any).rows)) {
          const matching = (sData as any).rows.filter((r: WeeklyRow) => rowIdsToMove.includes(r._id));
          if (matching.length > 0) {
            rowsToTransfer.push(...matching);
            nextState[sKey] = {
              ...(sData as any),
              rows: (sData as any).rows.filter((r: WeeklyRow) => !rowIdsToMove.includes(r._id)),
            };
          }
        }
      }

      const currentTargetSec = nextState[normTargetKey] || { title: targetLabel, order: 99, summary_metric: '', rows: [] };
      const updatedTransferRows = rowsToTransfer.map((r) => ({
        ...r,
        pipeline_section: targetSectionKey,
        is_pinned_top: targetSectionKey === 'top_companies' ? true : r.is_pinned_top,
      }));

      nextState[normTargetKey] = {
        ...currentTargetSec,
        rows: [...currentTargetSec.rows, ...updatedTransferRows],
      };

      return normalizeAllSections(nextState);
    });

    triggerHaptic('medium');
    if (!isUndoRedo) {
      toast(`Moved ${rowIdsToMove.length} companies to ${targetLabel.charAt(0).toUpperCase() + targetLabel.slice(1)}`, 'success');
    }

    setSaveStatus('saving');
    try {
      const res = await apiFetch('/weekly-tracker/batch-move-section', {
        method: 'POST',
        body: JSON.stringify({
          row_ids: rowIdsToMove,
          pipeline_section: targetSectionKey,
        }),
      });

      if (res.success) {
        setSelectedRowIds([]);
        setSelectionMode(null);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        await loadWeeklyTracker();
        await loadKpi();
      } else {
        setSaveStatus('idle');
      }
    } catch (err) {
      console.error('Failed to execute bulk move:', err);
      toast('Failed to move companies in bulk', 'error');
      await loadWeeklyTracker();
      await loadKpi();
      setSaveStatus('idle');
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
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      await Promise.all([loadWeeklyTracker(), loadKpi()]);
      window.dispatchEvent(new CustomEvent('ipoms_trigger_autosave_banner'));
    } catch (e) {
      console.error('Failed to sync weekly tracker on save:', e);
      toast('Failed to save changes. Please check your connection.', 'error');
    }
  }, [loadWeeklyTracker, loadKpi, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveAll();
      } else if (!isInput && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAddModalOpen(true);
      } else if (!isInput && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setSelectionMode((prev) => (prev === 'delete' ? null : 'delete'));
        setSelectedRowIds([]);
      } else if (!isInput && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        setSelectionMode((prev) => (prev === 'move' ? null : 'move'));
        setSelectedRowIds([]);
      } else if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsBulkMoveModalOpen(false);
        setIsDeleteConfirmModalOpen(false);
        setSelectedRowIds([]);
        setSelectionMode(null);
        triggerHaptic('light');
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

  // Filter sections if activeSectionFilter is set from clicking a KPI card
  const shouldRenderSection = (key: string) => {
    if (activeSectionFilter === 'all') return true;
    if (activeSectionFilter === 'rejected' && key === 'rejected_companies') return true;
    if (activeSectionFilter === 'in_drive' && (key === 'in_drive' || key === 'companies_in_drive' || key === 'upcoming_drives')) return true;
    if (activeSectionFilter === 'drive_in_progress' && key === 'drive_in_progress') return true;
    return activeSectionFilter === key;
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-primary-foreground">

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <WeeklyHeader
        selectedCollegeId={selectedCollegeId}
        onSelectCollege={(id, name) => {
          setSelectedCollegeId(id);
          setSelectedCollegeName(name);
        }}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
        academicYear={academicYear}
        onAcademicYearChange={setAcademicYear}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onSyncDailyPositives={handleSyncDailyPositives}
        onSaveProgress={handleSaveAll}
        onExportXlsx={handleExportXlsx}
        onExportPdf={handleOpenPdfModal}
        onExportImage={handleOpenImageModal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectionMode={selectionMode}
        selectedCount={selectedRowIds.length}
        onStartMoveMode={handleStartMoveMode}
        onStartDeleteMode={handleStartDeleteMode}
        onCancelSelection={handleCancelSelection}
        onExecuteMove={handleExecuteMove}
        onExecuteBulkDelete={handleRequestBulkDelete}
        onOpenBulkMove={handleStartMoveMode}
        isDeleting={isDeleting}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
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
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 2: Drive in Progress */}
          {shouldRenderSection('drive_in_progress') && (
            <WeeklySection
              sectionKey="drive_in_progress"
              title={sections?.drive_in_progress?.title || 'Drive in Progress'}
              order={sections?.drive_in_progress?.order ?? 2}
              summaryMetric={sections?.drive_in_progress?.summary_metric || ''}
              rows={sections?.drive_in_progress?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 3: Upcoming Drives */}
          {shouldRenderSection('in_drive') && (
            <WeeklySection
              sectionKey="in_drive"
              title={sections?.in_drive?.title || 'Upcoming Drives'}
              order={sections?.in_drive?.order ?? 3}
              summaryMetric={sections?.in_drive?.summary_metric || ''}
              rows={sections?.in_drive?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 4: Companies In Progress */}
          {shouldRenderSection('in_progress') && (
            <WeeklySection
              sectionKey="in_progress"
              title={sections?.in_progress?.title || 'Companies In Progress'}
              order={sections?.in_progress?.order ?? 4}
              summaryMetric={sections?.in_progress?.summary_metric || ''}
              rows={sections?.in_progress?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 5: Companies in Pipeline */}
          {shouldRenderSection('pipeline') && (
            <WeeklySection
              sectionKey="pipeline"
              title={sections?.pipeline?.title || 'Companies in Pipeline'}
              order={sections?.pipeline?.order ?? 5}
              summaryMetric={sections?.pipeline?.summary_metric || ''}
              rows={sections?.pipeline?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 6: Top Companies */}
          {shouldRenderSection('top_companies') && (
            <WeeklySection
              sectionKey="top_companies"
              title={sections?.top_companies?.title || 'Top Companies'}
              order={sections?.top_companies?.order ?? 6}
              summaryMetric={sections?.top_companies?.summary_metric || ''}
              rows={sections?.top_companies?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 7: Rejected Companies */}
          {shouldRenderSection('rejected_companies') && (
            <WeeklySection
              sectionKey="rejected_companies"
              title={sections?.rejected_companies?.title || 'Rejected Companies'}
              order={sections?.rejected_companies?.order ?? 7}
              summaryMetric={sections?.rejected_companies?.summary_metric || ''}
              rows={sections?.rejected_companies?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 8: Companies On Hold By College */}
          {shouldRenderSection('on_hold_by_college') && (
            <WeeklySection
              sectionKey="on_hold_by_college"
              title={sections?.on_hold_by_college?.title || 'Companies On Hold By College'}
              order={sections?.on_hold_by_college?.order ?? 8}
              summaryMetric={sections?.on_hold_by_college?.summary_metric || ''}
              rows={sections?.on_hold_by_college?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}

          {/* Section 9: Companies On Hold By HR */}
          {shouldRenderSection('on_hold_by_hr') && (
            <WeeklySection
              sectionKey="on_hold_by_hr"
              title={sections?.on_hold_by_hr?.title || 'Companies On Hold By HR'}
              order={sections?.on_hold_by_hr?.order ?? 9}
              summaryMetric={sections?.on_hold_by_hr?.summary_metric || ''}
              rows={sections?.on_hold_by_hr?.rows || []}
              isGlobalDeleteMode={selectionMode !== null}
              selectionMode={selectionMode}
              globalSelectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectSection={handleToggleSelectSection}
              onUpdateRow={handleUpdateRow}
              onMoveSection={handleMoveSection}
              onTogglePin={handleTogglePin}
              onDeleteRow={handleDeleteRow}
              onReorderRows={handleReorderRows}
              onMoveRowCrossSection={handleMoveRowCrossSection}
            />
          )}
        </div>
      )}

      {/* ── Add Company Modal ──────────────────────────────────────────────── */}
      {isAddModalOpen && selectedCollegeId && (
        <AddCompanyModal
          collegeId={selectedCollegeId}
          coordinatorId={coordinatorId ?? ''}
          isForeignCollege={isForeignCollege}
          collegeName={selectedCollegeName}
          onClose={() => setIsAddModalOpen(false)}
          onAdded={() => {
            loadWeeklyTracker();
            loadKpi();
          }}
        />
      )}

      {/* ── Bulk Move Modal ──────────────────────────────────────────────── */}
      {isBulkMoveModalOpen && (
        <BulkMoveModal
          selectedRows={getAllAvailableRows().filter((r) => selectedRowIds.includes(r._id))}
          allAvailableRows={getAllAvailableRows()}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onConfirmMove={handleBulkMoveSection}
        />
      )}

      {/* ── Delete Confirmation In-App Modal ───────────────────────────────── */}
      <DeleteConfirmModal
        count={selectedRowIds.length}
        isOpen={isDeleteConfirmModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteConfirmModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />

    </div>
  );
}
