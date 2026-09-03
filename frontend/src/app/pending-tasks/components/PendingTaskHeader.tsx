'use client';

import { useState, useEffect } from 'react';
import {
  ListTodo,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Filter,
  MapPin,
} from 'lucide-react';
import { CollegeSelector, College } from '@/components/CollegeSelector';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { AnimatedTrashIcon } from '@/components/icons/AnimatedIcons';
import { SmoothExportDropdown } from '@/components/ui/SmoothExportDropdown';
import { apiFetch } from '@/lib/api';

interface Props {
  selectedCollegeId: string;
  onCollegeChange: (id: string, name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCount: number;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onOpenAddModal: () => void;
  onEditSelected?: () => void;
  onDeleteSelected: () => void;
  onRefresh: () => void;
  onExportXlsx: () => void;
  onExportPdf?: () => void;
  onExportImage?: () => void;
  isExporting?: boolean;
  loading: boolean;
}

export function PendingTaskHeader({
  selectedCollegeId,
  onCollegeChange,
  searchQuery,
  onSearchChange,
  selectedCount,
  isSelectionMode,
  onToggleSelectionMode,
  onOpenAddModal,
  onEditSelected,
  onDeleteSelected,
  onRefresh,
  onExportXlsx,
  onExportPdf,
  onExportImage,
  isExporting = false,
  loading,
}: Props) {
  const [selectedCollegeObj, setSelectedCollegeObj] = useState<College | null>(null);

  useEffect(() => {
    if (!selectedCollegeId || selectedCollegeId === 'all') {
      setSelectedCollegeObj(null);
      return;
    }
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          const found = (data.data as any).colleges.find((c: College) => c._id === selectedCollegeId);
          if (found) setSelectedCollegeObj(found);
        }
      })
      .catch(console.error);
  }, [selectedCollegeId]);

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-6 py-4 space-y-3 shadow-xs text-fg">
      {/* ── Top Row: Header Info, College Logo, Top-Right Sign Out ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title & College-Wise Tracker Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <ListTodo size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fg tracking-tight">
              Pending Task
            </h1>
          </div>
        </div>

        {/* Right: Selected College Logo & Sign Out */}
        <div className="flex items-center gap-3">
          {/* Selected College Logo & Location Badge */}
          {selectedCollegeObj && (
            <div className="flex items-center gap-2">
              <div
                title={`${selectedCollegeObj.college_name} (${selectedCollegeObj.college_code})`}
                className="flex items-center justify-center bg-surface border border-border px-2.5 py-1 rounded-xl shadow-xs animate-fadeIn h-9 max-w-[170px] shrink-0"
              >
                {selectedCollegeObj.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedCollegeObj.logo_url}
                    alt={selectedCollegeObj.college_name}
                    className="max-h-7 max-w-full w-auto h-auto object-contain rounded"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center font-mono">
                    {selectedCollegeObj.college_code?.slice(0, 2) || 'CL'}
                  </span>
                )}
              </div>
              {selectedCollegeObj.location && (
                <div
                  className="flex items-center gap-1 text-xs text-fg-subtle font-medium hidden sm:flex truncate max-w-[180px]"
                  title={`${selectedCollegeObj.college_name} • ${selectedCollegeObj.location}`}
                >
                  <MapPin size={13} className="text-fg-disabled shrink-0" />
                  <span className="truncate">{selectedCollegeObj.location}</span>
                </div>
              )}
            </div>
          )}

          {/* User Sign Out */}
          <div className="flex items-center gap-2 shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Search, College Dropdown & Action Buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-border/80">
        {/* Search Bar (High Visibility with Crisp Outline & Light Placeholder) */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-300 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company, current status, action..."
            className="w-full h-8 pl-8 pr-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/90 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl shadow-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-300/80 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
          />
        </div>

        {/* Right Actions: College Dropdown, Top Delete Toggle/Banner, Refresh, Export, Add */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Dropdown list for picking college */}
          <div className="min-w-[200px]">
            <CollegeSelector
              selectedCollegeId={selectedCollegeId}
              onSelect={onCollegeChange}
              allowAll={false}
              label="Select College:"
              placeholder="Pick a college..."
              align="right"
            />
          </div>

          {/* Dustbin / Delete Selection Toggle */}
          <button
            type="button"
            onClick={onToggleSelectionMode}
            title={isSelectionMode ? 'Cancel deletion / Exit selection' : 'Delete pending tasks'}
            className={`group w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 border ${
              isSelectionMode
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs'
                : 'text-fg-subtle bg-surface hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 border-border'
            }`}
          >
            <AnimatedTrashIcon size={15} />
          </button>

          {/* Delete Action (Visible only when checkboxes are ticked) */}
          {isSelectionMode && selectedCount > 0 && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 rounded-xl shadow-xs transition-all cursor-pointer animate-in fade-in duration-150 active:scale-95"
            >
              <Trash2 size={13} />
              <span>Delete ({selectedCount})</span>
            </button>
          )}

          {/* Solid Export Dropdown Menu (Excel, PDF, Image) */}
          <SmoothExportDropdown
            onExportExcel={onExportXlsx}
            onExportPdf={onExportPdf}
            onExportImage={onExportImage}
            isExporting={isExporting}
          />

          {/* + Add Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover border border-primary/40 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </header>
  );
}
