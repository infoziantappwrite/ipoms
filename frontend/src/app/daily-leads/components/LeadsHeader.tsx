'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, FileSpreadsheet, Globe, Plus, Target } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface College {
  _id: string;
  college_name: string;
  college_code: string;
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

  return (
    <header className="glass-panel border-b border-border px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">

        {/* Left: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Target size={14} strokeWidth={2} aria-hidden /> Daily Leads Register
            </h1>
            <span className="text-xs bg-success/20 text-success border border-success/30 px-2.5 py-0.5 rounded-full font-semibold">
              Live Daily Tracker
            </span>
          </div>
          <p className="text-xs text-fg-subtle mt-1">
            Manual Timestamped Register • Positives & JD Received Tracking
          </p>
        </div>

        {/* Centre/Right Controls: Date, College Filter, Search, Actions */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5">
            <CalendarDays size={14} strokeWidth={2} aria-hidden />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs text-fg cursor-pointer"
            />
          </div>

          {/* College Filter (All Colleges or Single College per Spec Section 12) */}
          <select
            value={selectedCollegeId}
            onChange={(e) => {
              const val = e.target.value;
              const col = colleges.find((c) => c._id === val);
              onCollegeChange(val, col ? col.college_name : 'All Colleges');
            }}
            disabled={loading}
            className="bg-surface border border-border-strong text-fg text-xs px-3 py-2 rounded-lg 
                       min-w-[200px] cursor-pointer"
          >
            <option value="all"><Globe size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}All Colleges</option>
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
              className="w-full bg-surface border border-border-strong text-fg text-xs px-3.5 py-2 rounded-lg 
                         placeholder-fg-subtle"
            />
          </div>

          {/* Actions */}
          <button
            onClick={onRefresh}
            className="p-2 bg-surface hover:bg-surface-raised text-fg rounded-lg text-xs transition-colors"
            title="Refresh"
          >
            🔄
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 bg-success hover:bg-success text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Export CSV
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus size={14} strokeWidth={2} aria-hidden /> Add Entry
          </button>

        </div>

      </div>
    </header>
  );
}
