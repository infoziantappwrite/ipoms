'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, FileSpreadsheet, Plus, Target, RefreshCw } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { CollegeSelector, College } from '@/components/CollegeSelector';
import { apiFetch } from '@/lib/api';

interface Props {
  selectedDate: string;
  onDateChange: (d: string) => void;
  selectedCollegeId: string;
  onCollegeChange: (id: string, name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
}

export function LeadsHeader({
  selectedDate,
  onDateChange,
  selectedCollegeId,
  onCollegeChange,
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onExportCsv,
  onRefresh,
}: Props) {
  const [selectedCollegeObj, setSelectedCollegeObj] = useState<College | null>(null);

  // If a college is selected, fetch its info or update
  useEffect(() => {
    if (selectedCollegeId === 'all') {
      setSelectedCollegeObj(null);
      return;
    }
    apiFetch('/colleges').then((data) => {
      if (data.success && Array.isArray((data.data as any)?.colleges)) {
        const found = (data.data as any).colleges.find((c: College) => c._id === selectedCollegeId);
        if (found) setSelectedCollegeObj(found);
      }
    }).catch(console.error);
  }, [selectedCollegeId]);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 space-y-3 shadow-xs">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-primary">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Daily Leads
            </h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              Positives & JD Tracking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manual Timestamped Register
          </p>
        </div>

        {/* Pin Selected College Logo & Sign Out to Absolute Top Right */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedCollegeObj && (
            <div
              title={`${selectedCollegeObj.college_name} (${selectedCollegeObj.college_code})`}
              className="flex items-center justify-center bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs animate-fadeIn h-9 max-w-[160px] shrink-0"
            >
              {selectedCollegeObj.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCollegeObj.logo_url}
                  alt={selectedCollegeObj.college_name}
                  className="max-h-7 max-w-full w-auto h-auto object-contain rounded"
                />
              ) : (
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-primary font-bold text-xs flex items-center justify-center font-mono">
                  {selectedCollegeObj.college_code?.slice(0, 2) || 'CL'}
                </span>
              )}
            </div>
          )}

          <div className="shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Bottom Controls Row: Date, Smart College Selector, Search, Actions ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
            <CalendarDays size={14} strokeWidth={2} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium cursor-pointer focus:outline-none"
            />
          </div>

          {/* Smart Auto-Shrinking College Selector */}
          <CollegeSelector
            selectedCollegeId={selectedCollegeId}
            allowAll={true}
            allLabel="All Colleges"
            label=""
            onSelect={(id, name) => {
              onCollegeChange(id, name);
            }}
            onSelectCollege={(col) => {
              setSelectedCollegeObj(col);
            }}
          />

          {/* Search Box */}
          <div className="w-52 sm:w-60">
            <input
              type="text"
              placeholder="Search company, role, remarks…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-800 text-xs px-3.5 py-1.5 rounded-xl placeholder:text-slate-400 outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-[#FEF3C7] hover:bg-[#FDE68A] text-amber-900 border border-amber-300 rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center"
            title="Refresh leads"
          >
            <RefreshCw size={14} strokeWidth={2} />
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={14} strokeWidth={2} /> Export CSV
          </button>

          <button
            onClick={() => {
              if (selectedCollegeId === 'all' || !selectedCollegeId) {
                alert('Please select a specific college from the dropdown before adding a new entry.');
                return;
              }
              onOpenAddModal();
            }}
            className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} /> Add Entry
          </button>
        </div>
      </div>
    </header>
  );
}
