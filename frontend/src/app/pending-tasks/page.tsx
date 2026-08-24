'use client';

import { useState, useEffect, useCallback } from 'react';
import { PendingTaskHeader } from './components/PendingTaskHeader';
import { PendingTaskKpiCards } from './components/PendingTaskKpiCards';
import { PendingTaskTable } from './components/PendingTaskTable';
import { AddPendingTaskModal } from './components/AddPendingTaskModal';
import { BulkEditPendingTasksModal } from './components/BulkEditPendingTasksModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import type { PendingTaskRow, PendingTaskKpiData } from './types';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';
import { getActiveCollege, setActiveCollege, resolveDefaultCollege } from '@/lib/collegeSession';
import { College } from '@/components/CollegeSelector';

export default function PendingTasksPage() {
  // ── College State (Active College from Session / Dropdown)
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(() => {
    return getActiveCollege().id || '';
  });
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>(() => {
    return getActiveCollege().name || '';
  });

  // ── Search State
  const [searchQuery, setSearchQuery] = useState('');

  // ── Table Data & KPI State
  const [tasks, setTasks] = useState<PendingTaskRow[]>([]);
  const [kpi, setKpi] = useState<PendingTaskKpiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [coordinatorId, setCoordinatorId] = useState('');

  // ── Selection State for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // ── Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PendingTaskRow | null>(null);

  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<PendingTaskRow | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize session user & resolve default college if none selected
  useEffect(() => {
    const user = readSessionUser();
    if (user?._id) setCoordinatorId(user._id);

    resolveDefaultCollege().then((col) => {
      if (col.id) {
        setSelectedCollegeId(col.id);
        setSelectedCollegeName(col.name);
      }
    });

    const handleCollegeChange = (e: any) => {
      if (e.detail?.id) {
        setSelectedCollegeId(e.detail.id);
        setSelectedCollegeName(e.detail.name || '');
      }
    };

    window.addEventListener('ipoms_college_change', handleCollegeChange);
    return () => window.removeEventListener('ipoms_college_change', handleCollegeChange);
  }, []);

  // Clear selections when filters or college change
  useEffect(() => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  }, [selectedCollegeId, searchQuery]);

  // Escape exits selection mode (mirrors the "Exit Selection" toggle button)
  useEffect(() => {
    if (!isSelectionMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleToggleSelectionMode();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode]);

  // ── College Change Handler from Header Dropdown
  const handleCollegeSelect = (id: string, name: string) => {
    setSelectedCollegeId(id);
    setSelectedCollegeName(name);
    setActiveCollege(id, name);
  };

  // ── Fetch Pending Tasks for the Selected College
  const loadTasks = useCallback(async () => {
    if (!selectedCollegeId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        college_id: selectedCollegeId,
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiFetch(`/pending-tasks?${params.toString()}`);
      if (res.success && res.data) {
        setTasks((res.data as any).tasks || []);
      }
    } catch (err) {
      console.error('[PendingTask] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCollegeId, searchQuery]);

  // ── Fetch KPI Summary for the Selected College
  const loadKpi = useCallback(async () => {
    if (!selectedCollegeId) return;
    try {
      const res = await apiFetch(`/pending-tasks/kpi?college_id=${selectedCollegeId}`);
      if (res.success && res.data) {
        setKpi((res.data as any).kpi || null);
      }
    } catch (err) {
      console.error('[PendingTask] KPI load error:', err);
    }
  }, [selectedCollegeId]);

  useEffect(() => {
    loadTasks();
    loadKpi();
  }, [loadTasks, loadKpi]);

  // ── Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === tasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map((t) => t._id));
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds([]);
      }
      return !prev;
    });
  };

  // ── Add / Edit Modal Openers
  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (task: PendingTaskRow) => {
    setEditingTask(task);
    setIsAddModalOpen(true);
  };

  // ── Add or Update Task Submission
  const handleSaveTask = async (data: Partial<PendingTaskRow>): Promise<boolean> => {
    try {
      if (editingTask) {
        // Update existing task (PATCH)
        const res = await apiFetch(`/pending-tasks/${editingTask._id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        if (res.success) {
          await loadTasks();
          await loadKpi();
          return true;
        } else {
          alert(res.error?.message || 'Failed to update task');
          return false;
        }
      } else {
        // Create new task (POST)
        const payload = {
          ...data,
          coordinator_id: coordinatorId,
          college_id: selectedCollegeId,
        };
        const res = await apiFetch('/pending-tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          await loadTasks();
          await loadKpi();
          return true;
        } else {
          alert(res.error?.message || 'Failed to create task');
          return false;
        }
      }
    } catch (err) {
      console.error('[PendingTask] Save error:', err);
      alert('Network error while saving task');
      return false;
    }
  };

  // ── Bulk Edit Openers & Submissions
  const handleOpenBulkEdit = () => {
    if (selectedIds.length === 0) return;
    setIsBulkEditModalOpen(true);
  };

  const handleSaveBulkEdit = async (updates: Partial<PendingTaskRow>): Promise<boolean> => {
    try {
      const res = await apiFetch('/pending-tasks/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          ids: selectedIds,
          updates,
        }),
      });
      if (res.success) {
        setSelectedIds([]);
        setIsSelectionMode(false);
        setIsBulkEditModalOpen(false);
        await loadTasks();
        await loadKpi();
        return true;
      } else {
        alert(res.error?.message || 'Failed to apply bulk updates');
        return false;
      }
    } catch (err: any) {
      console.error('[PendingTask] Bulk edit error:', err);
      alert(err.message || 'Failed to apply bulk updates');
      return false;
    }
  };

  // ── Delete Confirmations
  const handleOpenSingleDelete = (task: PendingTaskRow) => {
    setTaskToDelete(task);
    setIsBulkDelete(false);
    setIsDeleteModalOpen(true);
  };

  const handleOpenBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setTaskToDelete(null);
    setIsBulkDelete(true);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (isBulkDelete) {
        // Batch Delete
        const res = await apiFetch('/pending-tasks/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ ids: selectedIds }),
        });
        if (res.success) {
          setSelectedIds([]);
          setIsSelectionMode(false);
          setIsDeleteModalOpen(false);
          await loadTasks();
          await loadKpi();
        } else {
          alert(res.error?.message || 'Bulk delete failed');
        }
      } else if (taskToDelete) {
        // Single Delete
        const res = await apiFetch(`/pending-tasks/${taskToDelete._id}`, {
          method: 'DELETE',
        });
        if (res.success) {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
          await loadTasks();
          await loadKpi();
        } else {
          alert(res.error?.message || 'Delete failed');
        }
      }
    } catch (err) {
      console.error('[PendingTask] Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Export Table to CSV
  const handleExportCsv = () => {
    if (tasks.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = [
      'S.No',
      'Company Name',
      'JD Received Date',
      'DB Shared Date',
      'Current Status',
      'Remarks / Next Action',
      'Drive Date',
      'Remarks',
    ];

    const csvRows = tasks.map((t, idx) => [
      t.serial_no || idx + 1,
      `"${(t.company_name || '').replace(/"/g, '""')}"`,
      t.jd_received_date ? new Date(t.jd_received_date).toLocaleDateString('en-IN') : '',
      t.db_shared_date ? new Date(t.db_shared_date).toLocaleDateString('en-IN') : '',
      `"${(t.current_status || '').replace(/"/g, '""')}"`,
      `"${(t.action_to_be_taken || '').replace(/"/g, '""')}"`,
      t.drive_date ? new Date(t.drive_date).toLocaleDateString('en-IN') : '',
      `"${(t.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Pending_Tasks_${selectedCollegeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedTasks = tasks.filter((t) => selectedIds.includes(t._id));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Header with College Selector & Action Controls ── */}
      <PendingTaskHeader
        selectedCollegeId={selectedCollegeId}
        onCollegeChange={handleCollegeSelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCount={selectedIds.length}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        onOpenAddModal={handleOpenAddModal}
        onEditSelected={handleOpenBulkEdit}
        onDeleteSelected={handleOpenBulkDelete}
        onRefresh={() => {
          loadTasks();
          loadKpi();
        }}
        onExportCsv={handleExportCsv}
        loading={loading}
      />

      {/* ── Executive KPI Summary Strip ── */}
      <PendingTaskKpiCards kpi={kpi} loading={loading} />

      {/* ── Data Grid Table ── */}
      <main className="flex-1">
        <PendingTaskTable
          tasks={tasks}
          selectedIds={selectedIds}
          isSelectionMode={isSelectionMode}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onEdit={handleOpenEditModal}
          onDelete={handleOpenSingleDelete}
          onOpenAddModal={handleOpenAddModal}
          loading={loading}
          collegeName={selectedCollegeName || 'Selected College'}
        />
      </main>

      {/* ── Add / Edit Single Task Modal ── */}
      <AddPendingTaskModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        initialData={editingTask}
        collegeId={selectedCollegeId}
        collegeName={selectedCollegeName || 'Selected College'}
      />

      {/* ── Bulk Edit Multiple Tasks Modal ── */}
      <BulkEditPendingTasksModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onSubmit={handleSaveBulkEdit}
        selectedTasks={selectedTasks}
        collegeName={selectedCollegeName || 'Selected College'}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={isBulkDelete ? 'Delete Multiple Pending Tasks' : 'Delete Pending Task'}
        message={
          isBulkDelete
            ? `Are you sure you want to delete ${selectedIds.length} selected pending tasks for ${selectedCollegeName}?`
            : taskToDelete
            ? `Are you sure you want to delete the pending task for "${taskToDelete.company_name}"?`
            : undefined
        }
        itemCount={isBulkDelete ? selectedIds.length : 1}
        loading={deleting}
      />
    </div>
  );
}
