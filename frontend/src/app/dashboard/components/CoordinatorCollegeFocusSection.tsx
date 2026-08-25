'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Check,
  Lock,
  Pencil,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  getCoordinatorSelectedColleges,
  setCoordinatorSelectedColleges,
} from '@/lib/collegeSession';
import { College } from '@/components/CollegeSelector';
import { toast } from '@/components/ui/Toast';

interface Props {
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function CoordinatorCollegeFocusSection({ onSelectionChange }: Props) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Load available colleges and coordinator's active focus selection
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await apiFetch('/colleges');
        if (res.success && Array.isArray((res.data as any)?.colleges)) {
          const list: College[] = (res.data as any).colleges;
          setColleges(list);

          const savedIds = getCoordinatorSelectedColleges();
          if (savedIds && savedIds.length > 0) {
            // Verify stored IDs exist in live colleges list
            const validSaved = savedIds.filter((id) => list.some((c) => c._id === id));
            if (validSaved.length > 0) {
              setSelectedIds(validSaved.slice(0, 3));
              if (onSelectionChange) onSelectionChange(validSaved.slice(0, 3));
            } else if (list.length > 0) {
              const defaultFirst = [list[0]._id];
              setSelectedIds(defaultFirst);
              setCoordinatorSelectedColleges(defaultFirst);
              if (onSelectionChange) onSelectionChange(defaultFirst);
            }
          } else if (list.length > 0) {
            const defaultFirst = [list[0]._id];
            setSelectedIds(defaultFirst);
            setCoordinatorSelectedColleges(defaultFirst);
            if (onSelectionChange) onSelectionChange(defaultFirst);
          }
        }
      } catch (err) {
        console.error('Failed to load colleges for focus section', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle Toggle Checkbox
  const handleToggleCollege = (collegeId: string) => {
    if (!isEditing) return; // Prevent edits when locked

    const isAlreadySelected = selectedIds.includes(collegeId);

    if (isAlreadySelected) {
      // Rule: Minimum 1 college must be selected
      if (selectedIds.length <= 1) {
        toast('Minimum 1 college must remain selected in your focus list.', 'error');
        return;
      }
      const updated = selectedIds.filter((id) => id !== collegeId);
      setSelectedIds(updated);
      setCoordinatorSelectedColleges(updated);
      if (onSelectionChange) onSelectionChange(updated);
    } else {
      // Rule: Maximum 3 colleges are allowed
      if (selectedIds.length >= 3) {
        toast('Maximum 3 colleges are allowed. Uncheck an existing college to select a different one.', 'error');
        return;
      }
      const updated = [...selectedIds, collegeId];
      setSelectedIds(updated);
      setCoordinatorSelectedColleges(updated);
      if (onSelectionChange) onSelectionChange(updated);
    }
  };

  const handleLockToggle = () => {
    if (isEditing) {
      if (selectedIds.length === 0) {
        toast('Please select at least 1 college before locking.', 'error');
        return;
      }
      setIsEditing(false);
      toast(`Locked focus to ${selectedIds.length} ${selectedIds.length === 1 ? 'college' : 'colleges'}. Priority applied to all dropdowns.`, 'success');
    } else {
      setIsEditing(true);
    }
  };

  const filteredColleges = colleges.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.college_code.toLowerCase().includes(q) ||
      c.college_name.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q))
    );
  });

  return (
    <section className="w-full rounded-2xl border border-border bg-surface shadow-xs overflow-hidden transition-all duration-300">
      {/* ── Section Header ────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 border-b border-border bg-gradient-to-r from-surface via-surface to-surface-sunken/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers size={18} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
              Active College Focus
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-tight transition-colors ${
                selectedIds.length > 0
                  ? 'bg-primary/15 text-primary border border-primary/25'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
              }`}
            >
              {selectedIds.length} / 3 Selected
            </span>
          </div>
          <p className="text-xs text-fg-subtle max-w-2xl leading-relaxed">
            Select 1 to 3 partner campuses. Your chosen colleges automatically pin to the top of all trackers and generate dedicated KPI summary sections below.
          </p>
        </div>

        {/* ── Lock / Edit Action Button ──────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleLockToggle}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none active:scale-95 ${
              isEditing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-surface-sunken hover:bg-surface-raised border border-border text-fg hover:border-primary/40'
            }`}
          >
            {isEditing ? (
              <>
                <CheckCircle2 size={15} className="text-white" />
                <span>Save & Lock Focus</span>
              </>
            ) : (
              <>
                <Pencil size={14} className="text-primary" />
                <span>Edit College Selection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Search & Filter Strip ─────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-border bg-surface-sunken/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by college code or name…"
            className="w-full bg-surface border border-border text-xs text-fg pl-9 pr-3 py-1.5 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled font-normal shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 text-micro text-fg-subtle w-full sm:w-auto justify-between sm:justify-end">
          {isEditing ? (
            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Editing Mode: Click any checkbox to check/uncheck
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-fg-muted font-medium">
              <Lock size={12} className="text-fg-subtle" />
              Checkboxes Locked — Click &quot;Edit College Selection&quot; to change
            </span>
          )}
        </div>
      </div>

      {/* ── 10+ Colleges Checkbox Interactive Grid ────────────────────── */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-sunken animate-pulse border border-border" />
            ))}
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="py-12 text-center text-xs text-fg-disabled">
            No partner colleges match your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredColleges.map((college) => {
              const isChecked = selectedIds.includes(college._id);
              const isDisabled = !isEditing;

              return (
                <div
                  key={college._id}
                  onClick={() => isEditing && handleToggleCollege(college._id)}
                  className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all select-none ${
                    isChecked
                      ? 'bg-blue-50/70 dark:bg-sky-950/40 border-blue-400/80 dark:border-sky-500/60 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-surface border-border hover:border-border-strong hover:bg-surface-raised/60'
                  } ${
                    isEditing
                      ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                      : 'cursor-default opacity-90'
                  }`}
                >
                  {/* Custom Checkbox Input */}
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : isEditing
                          ? 'border-border-strong bg-surface group-hover:border-primary/60'
                          : 'border-border bg-surface-sunken opacity-60'
                      }`}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                  </div>

                  {/* College Identity & Acronym */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-black font-mono text-xs px-1.5 py-0.2 rounded-md tracking-wider ${
                          isChecked
                            ? 'bg-blue-600/15 text-blue-700 dark:text-sky-300 font-bold'
                            : 'bg-surface-sunken text-fg-muted'
                        }`}
                      >
                        [{college.college_code}]
                      </span>
                      {isChecked && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-sky-400">
                          <Sparkles size={10} /> Focus
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-fg mt-1 line-clamp-2 leading-snug">
                      {college.college_name}
                    </span>
                    {college.location && (
                      <span className="text-micro text-fg-subtle mt-0.5 truncate">
                        {college.location}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Helper Bar */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-fg-subtle">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-fg-subtle shrink-0" />
            <span>
              Total Partner Institutions: <strong className="text-fg">{colleges.length} Colleges</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Alphabetical ordering automatically pinned to dropdown top rows.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
