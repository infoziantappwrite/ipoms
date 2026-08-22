'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetadataHeader } from './components/MetadataHeader';
import { MetadataTable } from './components/MetadataTable';
import { ContactEditModal } from './components/ContactEditModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { BulkPasteModal } from './components/BulkPasteModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function MetadataPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isRecycleBin, setIsRecycleBin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingData, setEditingData] = useState<any | null>(null);

  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<any | null>(null);
  const [pendingSaveData, setPendingSaveData] = useState<any | null>(null);
  const [isExactDuplicate, setIsExactDuplicate] = useState<boolean>(false);

  const [showBulkPasteModal, setShowBulkPasteModal] = useState<boolean>(false);

  const loadMetadata = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/metadata?page=${page}&limit=50&is_deleted=${isRecycleBin}`;
      if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      if (selectedType !== 'all') url += `&type=${selectedType}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data.companies);
        setTotalCount(data.data.total);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedType, isRecycleBin]);

  useEffect(() => {
    loadMetadata();
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
    if (!confirm(`Are you sure you want to move "${name}" to the Recycle Bin?`)) return;
    try {
      const res = await fetch(`${API}/metadata/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadMetadata();
      }
    } catch (err) {
      console.error('Delete metadata error:', err);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API}/metadata/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`"${name}" restored successfully from Recycle Bin!`);
        loadMetadata();
      }
    } catch (err) {
      console.error('Restore metadata error:', err);
    }
  };

  const handlePurge = async (id: string, name: string) => {
    if (!confirm(`⚠️ PERMANENT PURGE: Are you sure you want to completely delete "${name}" from the database? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/metadata/${id}/purge`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadMetadata();
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
      const res = await fetch(`${API}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingSaveData, force_save: true }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Company contact saved successfully!');
        setShowDuplicateModal(false);
        setShowEditModal(false);
        loadMetadata();
      } else {
        alert(data.error?.message || 'Save failed');
      }
    } catch (err) {
      console.error('Force save error:', err);
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (companies.length === 0) {
      alert('No data available to export');
      return;
    }

    const headers = ['Company Name', 'HR Name', 'Designation', 'Primary Mobile', 'All Mobiles', 'Primary Email', 'Industry Type', 'Notes'];
    const rows = companies.map((c) => [
      `"${c.company_name}"`,
      `"${c.hr_name || ''}"`,
      `"${c.hr_designation || ''}"`,
      `"${c.primary_mobile || ''}"`,
      `"${(c.mobile_numbers || []).join('; ')}"`,
      `"${c.primary_email || ''}"`,
      `"${c.company_type || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `iPOMS_Master_Company_Metadata_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Top Header Bar ────────────────────────────────────────────────── */}
      <MetadataHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedType={selectedType}
        onTypeChange={handleTypeChange}
        isRecycleBin={isRecycleBin}
        onToggleRecycleBin={handleToggleRecycleBin}
        onOpenAddModal={handleOpenAdd}
        onOpenBulkPasteModal={() => setShowBulkPasteModal(true)}
        onExport={handleExport}
        totalCount={totalCount}
      />

      {/* ── Main Working Table View ───────────────────────────────────────── */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-4 flex-1">
        {loading ? (
          <div className="p-12 text-center text-fg-subtle italic text-xs">
            Loading corporate metadata database…
          </div>
        ) : (
          <MetadataTable
            companies={companies}
            isRecycleBin={isRecycleBin}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPurge={handlePurge}
          />
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-2 text-xs text-fg-subtle">
            <span>
              Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total contacts)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-background border border-border hover:bg-surface disabled:opacity-40 rounded-lg"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-background border border-border hover:bg-surface disabled:opacity-40 rounded-lg cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
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
