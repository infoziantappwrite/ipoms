'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MetadataHeader } from './components/MetadataHeader';
import { MetadataTable } from './components/MetadataTable';
import { ContactEditModal } from './components/ContactEditModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { BulkPasteModal } from './components/BulkPasteModal';
import { ConfirmModal } from './components/ConfirmModal';
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
  const [showEmptyRecycleBinModal, setShowEmptyRecycleBinModal] = useState<boolean>(false);
  const [isEmptyingRecycleBin, setIsEmptyingRecycleBin] = useState<boolean>(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [singleActionModalConfig, setSingleActionModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);

  // Check for auto-open query parameters (e.g. from Daily Tracker or Weekly Tracker)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isAdd = params.get('add') === 'true';
      const companyNameParam = params.get('company_name') || params.get('addCompany');
      const hrNameParam = params.get('hr_name');
      const mobileParam = params.get('primary_mobile') || params.get('mobile');
      const emailParam = params.get('primary_email') || params.get('email');
      const typeParam = params.get('company_type') || params.get('type');
      const returnToParam = params.get('return_to') || params.get('returnUrl');
      const highlightParam = params.get('highlight');
      const recentParam = params.get('recent');
      const searchParam = params.get('q') || params.get('search');

      if (returnToParam) {
        setReturnTo(returnToParam);
      }

      if (highlightParam) {
        const ids = highlightParam.split(',').map((s) => s.trim()).filter(Boolean);
        setHighlightIds(ids);
      }

      if (recentParam === 'true') {
        setIsRecent(true);
      }

      if (searchParam && !companyNameParam) {
        setSearchQuery(searchParam);
      }

      if (isAdd || companyNameParam || mobileParam || emailParam || typeParam) {
        if (companyNameParam && companyNameParam.trim()) {
          apiFetch<any>(`/companies/search?q=${encodeURIComponent(companyNameParam.trim())}&limit=5`)
            .then((res) => {
              if (res.success && Array.isArray(res.data?.companies) && res.data.companies.length > 0) {
                const exact = res.data.companies.find(
                  (c: any) => (c.company_name || '').trim().toLowerCase() === companyNameParam.trim().toLowerCase()
                );
                if (exact) {
                  setEditingData({
                    ...exact,
                    company_type: typeParam || exact.company_type || '',
                    hr_name: hrNameParam || (exact.hr_name !== 'HR Contact' ? exact.hr_name : '') || '',
                    primary_mobile: mobileParam || exact.primary_mobile || '',
                    primary_email: emailParam || exact.primary_email || '',
                  });
                  setShowEditModal(true);
                  return;
                }
              }
              // Fallback: new contact
              setEditingData({
                company_name: companyNameParam || '',
                company_type: typeParam || '',
                hr_name: hrNameParam || '',
                primary_mobile: mobileParam || '',
                primary_email: emailParam || '',
              });
              setShowEditModal(true);
            })
            .catch(() => {
              setEditingData({
                company_name: companyNameParam || '',
                company_type: typeParam || 'IT / Software & Technology',
                hr_name: hrNameParam || '',
                primary_mobile: mobileParam || '',
                primary_email: emailParam || '',
              });
              setShowEditModal(true);
            });
        } else {
          setEditingData({
            company_name: companyNameParam || '',
            company_type: typeParam || 'IT / Software & Technology',
            hr_name: hrNameParam || '',
            primary_mobile: mobileParam || '',
            primary_email: emailParam || '',
          });
          setShowEditModal(true);
        }
      }
    }
  }, []);

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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ipoms_metadata_updated'));
        }
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

  // Handle Escape Key: Closes active modal first; pressing Escape again exits selection mode & clears checkmarks
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (singleActionModalConfig.isOpen) {
          setSingleActionModalConfig((prev) => ({ ...prev, isOpen: false }));
        } else if (showBulkDeleteModal) {
          setShowBulkDeleteModal(false);
        } else if (showEmptyRecycleBinModal) {
          setShowEmptyRecycleBinModal(false);
        } else if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedIds([]);
        }
      }
    };
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [singleActionModalConfig.isOpen, showBulkDeleteModal, showEmptyRecycleBinModal, isSelectionMode]);

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

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRows = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedIds(companies.map((c) => String(c._id)));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (!canDelete) {
      alert('Access Denied: Only authorized coordinators can delete records.');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      if (!isRecycleBin) {
        const results = await Promise.all(
          selectedIds.map((id) => apiFetch(`/metadata/${id}`, { method: 'DELETE' }))
        );
        const successCount = results.filter((r) => r.success).length;
        toast?.(`Successfully moved ${successCount} contact(s) to the Recycle Bin.`, 'success');
      } else {
        const results = await Promise.all(
          selectedIds.map((id) => apiFetch(`/metadata/${id}/purge`, { method: 'DELETE' }))
        );
        const successCount = results.filter((r) => r.success).length;
        toast?.(`Permanently purged ${successCount} contact(s) from database.`, 'success');
      }
      setSelectedIds([]);
      setIsSelectionMode(false);
      setShowBulkDeleteModal(false);
      loadMetadata();
    } catch (err) {
      console.error('Bulk delete operation error:', err);
      alert('Bulk delete operation failed.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingData(null);
    setShowEditModal(true);
  };

  const handleOpenEdit = (company: any) => {
    setEditingData(company);
    setShowEditModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!canDelete) {
      alert('Access Denied: Only A. Mohanaradha among coordinators has authorization to delete from the Master Metadata Database.');
      return;
    }
    setSingleActionModalConfig({
      isOpen: true,
      title: 'Move to Recycle Bin',
      message: `Are you sure you want to move "${name}" to the Recycle Bin? You can restore this record later from the Recycle Bin.`,
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/metadata/${id}`, { method: 'DELETE' });
          if (res.success) {
            toast?.(`"${name}" moved to Recycle Bin.`, 'success');
            loadMetadata();
          } else {
            alert(res.error?.message || 'Delete failed');
          }
        } catch (err) {
          console.error('Delete metadata error:', err);
        } finally {
          setSingleActionModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      const res = await apiFetch(`/metadata/${id}/restore`, { method: 'POST' });
      if (res.success) {
        toast?.(`"${name}" restored successfully from Recycle Bin!`, 'success');
        loadMetadata();
      } else {
        alert(res.error?.message || 'Restore failed');
      }
    } catch (err) {
      console.error('Restore metadata error:', err);
    }
  };

  const handlePurge = (id: string, name: string) => {
    if (!canDelete) {
      alert('Access Denied: Only A. Mohanaradha among coordinators has authorization to permanently purge records from the Master Metadata Database.');
      return;
    }
    setSingleActionModalConfig({
      isOpen: true,
      title: 'Confirm Permanent Deletion',
      message: `This particular data ("${name}") will be deleted permanently and you cannot retain it back from anywhere in your login.`,
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/metadata/${id}/purge`, { method: 'DELETE' });
          if (res.success) {
            toast?.(`"${name}" permanently purged from database.`, 'success');
            loadMetadata();
          } else {
            alert(res.error?.message || 'Purge failed');
          }
        } catch (err) {
          console.error('Purge metadata error:', err);
        } finally {
          setSingleActionModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleEmptyRecycleBin = () => {
    if (!canDelete) {
      alert('Access Denied: Only A. Mohanaradha among coordinators has authorization to permanently purge records from the Master Metadata Database.');
      return;
    }
    if (totalCount === 0) {
      toast?.('Recycle Bin is already empty.', 'info');
      return;
    }
    setShowEmptyRecycleBinModal(true);
  };

  const handleConfirmEmptyRecycleBin = async () => {
    setIsEmptyingRecycleBin(true);
    try {
      const res = await apiFetch<any>('/metadata/purge-all', { method: 'DELETE' });
      if (res.success) {
        toast?.(`Recycle Bin emptied successfully! ${(res as any).deleted_count || totalCount} metadata record(s) permanently cleared.`, 'success');
        setShowEmptyRecycleBinModal(false);
        loadMetadata();
      } else {
        alert(res.error?.message || 'Failed to empty Recycle Bin.');
      }
    } catch (err) {
      console.error('Empty recycle bin error:', err);
      alert('Failed to empty Recycle Bin.');
    } finally {
      setIsEmptyingRecycleBin(false);
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
        if (returnTo) {
          window.location.href = returnTo;
        }
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
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.length}
        onToggleSelectionMode={() => {
          setIsSelectionMode(!isSelectionMode);
          setSelectedIds([]);
        }}
        onBulkDeleteSelected={handleBulkDeleteSelected}
        onEmptyRecycleBin={handleEmptyRecycleBin}
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



        {/* Highlight notification banner from Daily Tracker */}
        {highlightIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-semibold shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-sm">✨</span>
              <span>
                Displaying <strong>{highlightIds.length} newly saved contact{highlightIds.length > 1 ? 's' : ''}</strong> from Daily Tracker import. Highlighted in green below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHighlightIds([])}
              className="text-emerald-700 dark:text-emerald-300 hover:opacity-80 px-2 py-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-bold cursor-pointer"
            >
              Dismiss Highlight
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
            highlightIds={highlightIds}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedIds}
            onToggleSelectRow={handleToggleSelectRow}
            onSelectAllRows={handleSelectAllRows}
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
          returnTo={returnTo}
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

      <ConfirmModal
        isOpen={showEmptyRecycleBinModal}
        title="Empty Recycle Bin"
        message="Are you sure you want to permanently delete all items in the Recycle Bin? This action cannot be undone and these records cannot be retained back from anywhere in your login."
        confirmLabel="OK"
        cancelLabel="Cancel"
        isDanger={true}
        loading={isEmptyingRecycleBin}
        onConfirm={handleConfirmEmptyRecycleBin}
        onCancel={() => setShowEmptyRecycleBinModal(false)}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title={isRecycleBin ? 'Confirm Permanent Deletion' : 'Confirm Multi-Row Deletion'}
        message={
          isRecycleBin
            ? `These ${selectedIds.length} selected data record(s) will be deleted permanently and you cannot retain them back from anywhere in your login.`
            : `Are you sure you want to move ${selectedIds.length} selected company contact(s) to the Recycle Bin? You can restore these records later.`
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        isDanger={true}
        loading={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />

      <ConfirmModal
        isOpen={singleActionModalConfig.isOpen}
        title={singleActionModalConfig.title}
        message={singleActionModalConfig.message}
        confirmLabel="OK"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={singleActionModalConfig.onConfirm}
        onCancel={() => setSingleActionModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
