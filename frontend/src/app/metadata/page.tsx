'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MetadataHeader } from './components/MetadataHeader';
import { MetadataTable } from './components/MetadataTable';
import { ContactEditModal } from './components/ContactEditModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { BulkPasteModal } from './components/BulkPasteModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { exportToXlsx } from '@/lib/exportExcel';
import { useToast } from '@/components/ui/Toast';
import { readSessionUser, roleOf } from '@/lib/session';

export default function MetadataPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [canDelete, setCanDelete] = useState<boolean>(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isRecycleBin, setIsRecycleBin] = useState<boolean>(false);
  const [isRecent, setIsRecent] = useState<boolean>(false);
  const [fromSno, setFromSno] = useState<number | null>(null);
  const [toSno, setToSno] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingData, setEditingData] = useState<any | null>(null);

  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<any | null>(null);
  const [pendingSaveData, setPendingSaveData] = useState<any | null>(null);
  const [isExactDuplicate, setIsExactDuplicate] = useState<boolean>(false);

  const [showBulkPasteModal, setShowBulkPasteModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadMetadata = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `/metadata?page=${page}&limit=50&is_deleted=${isRecycleBin}`;
      if (searchQuery.trim()) endpoint += `&q=${encodeURIComponent(searchQuery.trim())}`;
      if (selectedType !== 'all') endpoint += `&type=${selectedType}`;
      if (isRecent) endpoint += '&recent=true';
      if (fromSno !== null && fromSno > 0) endpoint += `&from_sno=${fromSno}`;
      if (toSno !== null && toSno > 0) endpoint += `&to_sno=${toSno}`;

      const res = await apiFetch<any>(endpoint);
      if (res.success && res.data) {
        setCompanies(res.data.companies || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedType, isRecycleBin, isRecent, fromSno, toSno]);

  useEffect(() => {
    const user = readSessionUser();
    const role = roleOf(user);
    const isMohana =
      (user?.official_email || '').toLowerCase().includes('mohanaradha') ||
      (user?.full_name || '').toLowerCase().includes('mohana') ||
      (user?.username || '').toLowerCase().includes('mohana');
    setCanDelete(role === 'admin' || role === 'team_leader' || isMohana);
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // ── Global Refresh Shortcut (Ctrl+S / Cmd+S) ──
  // This page has no inline-editable cells — every contact edit already
  // saves immediately through its own modal, so there is nothing pending for
  // Ctrl+S to flush. It used to dispatch the shared "Auto-Saved / All
  // changes permanently synchronized in cloud" banner anyway, which told the
  // user something was persisted when loadMetadata() only re-fetches the
  // current list. Now it says what actually happened.
  useEffect(() => {
    const REFRESH_MESSAGE = { title: 'Refreshed', subtitle: 'Metadata list re-fetched from the server' };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        loadMetadata();
        window.dispatchEvent(new CustomEvent('ipoms_trigger_autosave_banner', { detail: REFRESH_MESSAGE }));
      }
    };

    const handleGlobalTrigger = (e: any) => {
      if (e.detail?.pathname?.includes('/metadata')) {
        loadMetadata();
        window.dispatchEvent(new CustomEvent('ipoms_trigger_autosave_banner', { detail: REFRESH_MESSAGE }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ipoms_global_save_trigger' as any, handleGlobalTrigger);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ipoms_global_save_trigger' as any, handleGlobalTrigger);
    };
  }, [loadMetadata]);

  // Reset page to 1 on filter/search change
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleTypeChange = (t: string) => {
    setSelectedType(t);
    setPage(1);
  };

  const handleToggleRecycleBin = () => {
    setIsRecycleBin(!isRecycleBin);
    setPage(1);
  };

  const handleRangeChange = (from: number | null, to: number | null) => {
    setFromSno(from);
    setToSno(to);
    setPage(1);
  };

  const handleClearRange = () => {
    setFromSno(null);
    setToSno(null);
    setPage(1);
  };

  // Actions
  const handleOpenAdd = () => {
    setEditingData(null);
    setShowEditModal(true);
  };

  const handleOpenEdit = (company: any) => {
    setEditingData(company);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!canDelete) {
      alert('Access Denied: Only A. Mohanaradha among coordinators has authorization to delete from the Master Metadata Database.');
      return;
    }
    if (!confirm(`Are you sure you want to move "${name}" to the Recycle Bin?`)) return;
    try {
      const res = await apiFetch(`/metadata/${id}`, { method: 'DELETE' });
      if (res.success) {
        loadMetadata();
      } else {
        alert(res.error?.message || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete metadata error:', err);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      const res = await apiFetch(`/metadata/${id}/restore`, { method: 'POST' });
      if (res.success) {
        alert(`"${name}" restored successfully from Recycle Bin!`);
        loadMetadata();
      } else {
        alert(res.error?.message || 'Restore failed');
      }
    } catch (err) {
      console.error('Restore metadata error:', err);
    }
  };

  const handlePurge = async (id: string, name: string) => {
    if (!canDelete) {
      alert('Access Denied: Only A. Mohanaradha among coordinators has authorization to permanently purge records from the Master Metadata Database.');
      return;
    }
    if (!confirm(`⚠️ PERMANENT PURGE: Are you sure you want to completely delete "${name}" from the database? This cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/metadata/${id}/purge`, { method: 'DELETE' });
      if (res.success) {
        loadMetadata();
      } else {
        alert(res.error?.message || 'Purge failed');
      }
    } catch (err) {
      console.error('Purge metadata error:', err);
    }
  };

  // Duplicate Warning Callback
  const handleDuplicateFound = (conflict: any, pending: any, isExact: boolean) => {
    setConflictData(conflict);
    setPendingSaveData(pending);
    setIsExactDuplicate(isExact);
    setShowDuplicateModal(true);
  };

  const handleContinueSaveDuplicate = async () => {
    if (!pendingSaveData) return;
    try {
      const res = await apiFetch(`/metadata`, {
        method: 'POST',
        body: JSON.stringify({ ...pendingSaveData, force_save: true }),
      });
      if (res.success) {
        alert('Company contact saved successfully!');
        setShowDuplicateModal(false);
        setShowEditModal(false);
        loadMetadata();
      } else {
        alert(res.error?.message || 'Save failed');
      }
    } catch (err) {
      console.error('Force save error:', err);
    }
  };

  // Export to XLSX — pulls every row matching the current filters, not just
  // the current 50-row page. Was mapping straight from `companies` (the
  // paginated table state), so "Export" silently produced a 50-row file
  // labelled iPOMS_Master_Company_Metadata regardless of how many contacts
  // actually matched — a coordinator exporting "the master database" got 50
  // of however many thousand, with no indication anything was truncated.
  const handleExport = async () => {
    if (totalCount === 0) {
      alert('No data available to export');
      return;
    }

    setIsExporting(true);
    try {
      const EXPORT_PAGE_SIZE = 500; // server-enforced max per request
      const all: any[] = [];
      let fetchPage = 1;
      let expectedTotal = totalCount;

      while (all.length < expectedTotal) {
        let endpoint = `/metadata?page=${fetchPage}&limit=${EXPORT_PAGE_SIZE}&is_deleted=${isRecycleBin}`;
        if (searchQuery.trim()) endpoint += `&q=${encodeURIComponent(searchQuery.trim())}`;
        if (selectedType !== 'all') endpoint += `&type=${selectedType}`;
        if (isRecent) endpoint += '&recent=true';
        if (fromSno !== null && fromSno > 0) endpoint += `&from_sno=${fromSno}`;
        if (toSno !== null && toSno > 0) endpoint += `&to_sno=${toSno}`;

        const res = await apiFetch<any>(endpoint);
        if (!res.success || !res.data) break;

        const batch: any[] = res.data.companies || [];
        if (batch.length === 0) break;
        all.push(...batch);
        expectedTotal = res.data.total ?? expectedTotal; // stay accurate if data changed mid-export
        fetchPage++;
      }

      if (all.length < expectedTotal) {
        toast?.(`Export incomplete: got ${all.length} of ${expectedTotal} records. Try again.`, 'error');
      }

      const headers = ['Company Name', 'HR Name', 'Designation', 'Primary Mobile', 'All Mobiles', 'Primary Email', 'Industry Type', 'Notes'];
      const rows = all.map((c) => [
        c.company_name || '',
        c.hr_name || '',
        c.hr_designation || '',
        c.primary_mobile || '',
        (c.mobile_numbers || []).join('; '),
        c.primary_email || '',
        c.company_type || '',
        c.notes || '',
      ]);

      const rangeSuffix = (fromSno || toSno) ? `_SNo_${fromSno || 1}_to_${toSno || 'End'}` : '';
      exportToXlsx(`iPOMS_Master_Company_Metadata${rangeSuffix}_${new Date().toISOString().slice(0, 10)}`, {
        name: 'Master Companies',
        headers,
        rows,
      });
      toast?.(`Exported ${all.length} record(s) to Excel.`, 'success');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger direct navigation to Report Builder when clicking PDF or Image from dropdown
  const handleOpenPdfModal = () => {
    router.push('/reports?template=weekly_placement');
  };

  const handleOpenImageModal = () => {
    router.push('/reports?template=weekly_placement');
  };

  const isRangeActive = fromSno !== null || toSno !== null;

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-primary-foreground">

      {/* ── Top Header Bar ────────────────────────────────────────────────── */}
      <MetadataHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedType={selectedType}
        onTypeChange={handleTypeChange}
        isRecycleBin={isRecycleBin}
        onToggleRecycleBin={handleToggleRecycleBin}
        isRecent={isRecent}
        onToggleRecent={() => {
          setIsRecent(!isRecent);
          setFromSno(null);
          setToSno(null);
          setPage(1);
        }}
        fromSno={fromSno}
        toSno={toSno}
        onApplyRange={handleRangeChange}
        onClearRange={handleClearRange}
        onOpenAddModal={handleOpenAdd}
        onOpenBulkPasteModal={() => setShowBulkPasteModal(true)}
        onExport={handleExport}
        isExporting={isExporting}
        onExportPdf={handleOpenPdfModal}
        onExportImage={handleOpenImageModal}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        canDelete={canDelete}
      />

      {/* ── Main Working Table View ───────────────────────────────────────── */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-4 flex-1">
        {/* Active Range Highlight Banner */}
        {isRangeActive && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3 px-4.5 flex items-center justify-between gap-4 text-xs shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="font-bold text-fg">
                Target Calling Range Active:
              </span>
              <span className="font-mono text-primary font-bold px-2.5 py-0.5 bg-primary/15 rounded-lg border border-primary/30 text-xs">
                S.No #{fromSno ?? 1} — #{toSno ?? 'End'}
              </span>
              <span className="text-fg-subtle text-xs">
                ({totalCount.toLocaleString()} {totalCount === 1 ? 'company contact' : 'company contacts'} ready in batch)
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearRange}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1 bg-surface px-2.5 py-1 rounded-lg border border-border hover:border-rose-500/40 transition-colors shrink-0 shadow-2xs"
            >
              Reset to Full Directory
            </button>
          </div>
        )}



        {loading ? (
          <div className="p-12 text-center text-fg-subtle italic text-xs">
            Loading corporate metadata database…
          </div>
        ) : (
          <MetadataTable
            companies={companies}
            isRecycleBin={isRecycleBin}
            page={page}
            limit={50}
            canDelete={canDelete}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPurge={handlePurge}
          />
        )}


      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showEditModal && (
        <ContactEditModal
          initialData={editingData}
          onClose={() => setShowEditModal(false)}
          onSuccess={loadMetadata}
          onDuplicateFound={handleDuplicateFound}
        />
      )}

      {showDuplicateModal && conflictData && pendingSaveData && (
        <DuplicateWarningModal
          conflictingRecord={conflictData}
          pendingData={pendingSaveData}
          isExactDuplicate={isExactDuplicate}
          onContinueSave={handleContinueSaveDuplicate}
          onCancel={() => setShowDuplicateModal(false)}
        />
      )}

      {showBulkPasteModal && (
        <BulkPasteModal
          onClose={() => setShowBulkPasteModal(false)}
          onSuccess={loadMetadata}
        />
      )}

    </div>
  );
}
