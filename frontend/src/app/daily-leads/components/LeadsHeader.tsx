'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, FileSpreadsheet, Globe, Plus, Target } from 'lucide-react';
import { UserSignOutButton } from '@/components/UserSignOutButton';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface College {
  _id: string;
  college_name: string;
  college_code: string;
  logo_url?: string;
}

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
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setColleges(data.data.colleges);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedCollege = colleges.find((c) => c._id === selectedCollegeId);

  return (
    <header className="glass-panel border-b border-border px-6 py-4 space-y-3">
      {/* ── Top Row: Title & Top-Right Sign Out ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <Target size={18} strokeWidth={2} className="text-primary" />
            <span>Daily Leads</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            Manual Timestamped Register • Positives & JD Received Tracking
          </p>
        </div>

        {/* Pin Selected College Logo & Sign Out to Absolute Top Right */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedCollege && (
            <div className="flex items-center gap-2 bg-surface/90 border border-border/80 px-2.5 py-1 rounded-xl shadow-sm animate-fadeIn">
              {selectedCollege.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCollege.logo_url}
                  alt={selectedCollege.college_name}
                  className="w-7 h-7 object-contain rounded-md bg-white/95 p-0.5 shadow-sm border border-border/50"
                />
              ) : (
                <span className="w-7 h-7 rounded-md bg-primary/20 text-primary font-bold text-xs flex items-center justify-center font-mono">
                  {selectedCollege.college_code?.slice(0, 2) || 'CL'}
                </span>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-fg leading-none font-mono">
                  {selectedCollege.college_code}
                </div>
                <div className="text-[10px] text-fg-subtle truncate max-w-[130px] leading-tight mt-0.5">
                  {selectedCollege.college_name}
                </div>
              </div>
            </div>
          )}

          <div className="shrink-0">
            <UserSignOutButton />
          </div>
        </div>
      </div>

      {/* ── Bottom Controls Row: Date, College Filter, Search, Actions ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-1.5 shadow-inner">
            <CalendarDays size={14} strokeWidth={2} className="text-fg-subtle" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs text-fg cursor-pointer focus:outline-none"
            />
          </div>

          {/* College Filter */}
          <select
            value={selectedCollegeId}
            onChange={(e) => {
              const val = e.target.value;
              const col = colleges.find((c) => c._id === val);
              onCollegeChange(val, col ? col.college_name : 'All Colleges');
            }}
            disabled={loading}
            className="bg-surface border border-border-strong text-fg text-xs px-3 py-2 rounded-xl min-w-[200px] cursor-pointer"
          >
            <option value="all">🌐 All Colleges</option>
            {colleges.map((c) => (
              <option key={c._id} value={c._id}>
                [{c.college_code}] {c.college_name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="w-56">
            <input
              type="text"
              placeholder="Search company, role, remarks…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-surface border border-border-strong text-fg text-xs px-3.5 py-2 rounded-xl placeholder-fg-subtle"
            />
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-surface hover:bg-surface-raised text-fg rounded-xl text-xs transition-colors border border-border"
            title="Refresh"
          >
            🔄
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-1"
          >
            <FileSpreadsheet size={14} strokeWidth={2} /> Export CSV
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2 transition-colors"
          >
            <Plus size={14} strokeWidth={2} /> Add Entry
          </button>
        </div>
      </div>
    </header>
  );
}
