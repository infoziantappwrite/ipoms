'use client';

import { useState, useEffect } from 'react';
import {
  ListTodo,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Download,
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
import { SelectionModeBar } from '@/components/ui/SelectionModeBar';
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
  onExportCsv: () => void;
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
  onExportCsv,
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
    <header className="bg-white border-b border-slate-200 px-6 py-4 space-y-3 shadow-xs">
      {/* ── Top Row: Header Info, College Logo, Top-Right Sign Out ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title & College-Wise Tracker Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <ListTodo size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
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
                className="flex items-center justify-center bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs animate-fadeIn h-9 max-w-[170px] shrink-0"
              >
                {selectedCollegeObj.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedCollegeObj.logo_url}
                    alt={selectedCollegeObj.college_name}
                    className="max-h-7 max-w-full w-auto h-auto object-contain rounded"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono">
                    {selectedCollegeObj.college_code?.slice(0, 2) || 'CL'}
                  </span>
                )}
              </div>
              {selectedCollegeObj.location && (
                <div
                  className="flex items-center gap-1 text-xs text-slate-500 font-medium hidden sm:flex truncate max-w-[180px]"
                  title={`${selectedCollegeObj.college_name} • ${selectedCollegeObj.location}`}
                >
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{selectedCollegeObj.location}</span>
                </div>
              )}
            </div>
          )}

          {/* User Sign Out */}
          <UserSignOutButton />
        </div>
      </div>

      {/* ── Bottom Row: Search, College Dropdown & Action Buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company, current status, action..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Right Actions: College Dropdown, Top Delete Toggle/Banner, Refresh, Export, Add */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Dropdown list for picking college near the refresh button */}
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

          {/* Delete Mode Toggle or Active Controls */}
          {!isSelectionMode ? (
            <button
              type="button"
              onClick={onToggleSelectionMode}
              title="Select rows to delete"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Trash2 size={14} className="text-slate-500 hover:text-rose-600" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          ) : (
            <SelectionModeBar
              selectedCount={selectedCount}
              onCancel={onToggleSelectionMode}
              onDelete={onDeleteSelected}
              onEdit={onEditSelected}
            />
          )}

          {/* Export CSV */}
          <button
            type="button"
            onClick={onExportCsv}
            title="Export tasks to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* + Add Task Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
