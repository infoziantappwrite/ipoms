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
  Unlock,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  Users,
  Edit3,
} from 'lucide-react';
import {
  getCoordinatorSelectedColleges,
  setCoordinatorSelectedColleges,
  getCachedColleges,
  fetchAllCollegesCached,
  fetchCollegeFocusMatrix,
  lockDailyFocusApi,
  unlockDailyFocusApi,
  isFocusLockedToday,
  CollegeOccupancy,
} from '@/lib/collegeSession';
import { useToast } from '@/components/ui/Toast';

interface Props {
  onSelectionChange?: (selectedIds: string[], isLocked: boolean) => void;
}

export function CoordinatorCollegeFocusSection({ onSelectionChange }: Props) {
  const { toast } = useToast();

  const [colleges, setColleges] = useState<CollegeOccupancy[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [weekKey, setWeekKey] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load Matrix Data from Backend API
  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetchCollegeFocusMatrix();
      setColleges(res.colleges);
      setSelectedIds(res.selectedIds);
      setIsLocked(res.isLocked);
      setWeekKey(res.weekKey);
      if (onSelectionChange) {
        onSelectionChange(res.selectedIds, res.isLocked);
      }
    } catch (err) {
      console.error('Failed to load college focus matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Handle Toggle Checkbox — Active only in editing mode
  const handleToggleCollege = (college: CollegeOccupancy) => {
    // If currently locked, notify user to click Change Selection to edit
    if (isLocked) {
      toast('Your college focus is saved and locked for the week. Click "Change Selection" to adjust your colleges.', 'info');
      return;
    }

    const collegeId = college._id;
    const isAlreadySelected = selectedIds.includes(collegeId);

    if (isAlreadySelected) {
      // Rule: Minimum 1 college must remain selected
      if (selectedIds.length <= 1) {
        toast('At least 1 college must be selected (Minimum 1, Maximum 4).', 'warning');
        return;
      }
      const updated = selectedIds.filter((id) => id !== collegeId);
      setSelectedIds(updated);
      setCoordinatorSelectedColleges(updated);
      if (onSelectionChange) onSelectionChange(updated, false);
      return;
    }

    // Rule: Maximum 4 colleges allowed
    if (selectedIds.length >= 4) {
      toast('Maximum 4 colleges allowed. Uncheck an existing college to choose another.', 'warning');
      return;
    }

    // Rule: At most 2 coordinators or team leader allowed per college
    if (college.is_occupied) {
      const handlerName = college.occupied_by?.name || 'other coordinators';
      toast(
        `[${college.college_code}] already has the maximum of 2 handlers (${handlerName}). A maximum of 2 coordinators or team leader can handle a college.`,
        'warning'
      );
      return;
    }

    // Rule: At a time, maximum 1 college only is allowed to be co-handled with another coordinator or team leader
    const isThisShared = Boolean(college.is_shared_slot || (college.occupied_by?.name && !college.is_occupied));
    if (isThisShared) {
      const alreadyHasShared = colleges.some(
        (c) =>
          selectedIds.includes(c._id) &&
          (c.is_shared_slot || (c.occupied_by?.name && !c.is_occupied))
      );
      if (alreadyHasShared) {
        toast(
          'At a time, maximum 1 college only is allowed to be co-handled by 2 coordinators or team leader. You already have a co-handled college selected.',
          'warning'
        );
        return;
      }
    }

    const updated = [...selectedIds, collegeId];
    setSelectedIds(updated);
    setCoordinatorSelectedColleges(updated);
    if (onSelectionChange) onSelectionChange(updated, false);
  };

  const handleSaveAndLock = async () => {
    if (selectedIds.length === 0) {
      toast('Please select at least 1 college (Minimum 1, Maximum 4) to activate your dashboard.', 'warning');
      return;
    }
    if (selectedIds.length > 4) {
      toast('Maximum 4 colleges allowed. Please select between 1 and 4.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await lockDailyFocusApi(selectedIds);
      if (res.success) {
        setIsLocked(true);
        toast(
          res.message ||
            `Focus saved with ${selectedIds.length} ${
              selectedIds.length === 1 ? 'college' : 'colleges'
            }. You can change your selection anytime whenever required!`,
          'success'
        );
        if (onSelectionChange) onSelectionChange(selectedIds, true);
        await loadData(false);
      } else {
        toast(res.message || 'Failed to lock college focus.', 'error');
        await loadData(false);
      }
    } catch (err: any) {
      toast(err.message || 'Network error while locking focus.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockToEdit = async () => {
    setIsSubmitting(true);
    try {
      const res = await unlockDailyFocusApi();
      setIsLocked(false);
      toast(res.message || 'Editing mode active. Adjust your focus colleges (1 to 4) whenever required.', 'info');
      if (onSelectionChange) onSelectionChange(selectedIds, false);
      await loadData(false);
    } catch (err: any) {
      toast(err.message || 'Failed to unlock focus.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredColleges = colleges.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.college_code.toLowerCase().includes(q) ||
      c.college_name.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.occupied_by?.name && c.occupied_by.name.toLowerCase().includes(q))
    );
  });

  const totalOccupiedByOthers = colleges.filter((c) => c.is_occupied && !selectedIds.includes(c._id)).length;

  return (
    <section className="w-full rounded-2xl border border-border bg-surface shadow-xs overflow-hidden transition-all duration-300">
      {/* ── Single Unified Title Header with Description & Single Action Button ──────── */}
      <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-surface via-surface to-surface-sunken/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Icon + Title + Badge + Sub-Description */}
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
            <Layers size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-fg whitespace-nowrap">
                Active College Focus
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-tight transition-colors whitespace-nowrap ${
                  isLocked
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                    : selectedIds.length > 0
                    ? 'bg-primary/15 text-primary border border-primary/25'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                }`}
              >
                {selectedIds.length} / 4 Selected {isLocked && '• Saved & Locked for Week'}
              </span>
            </div>
            <p className="text-xs text-fg-subtle mt-1 leading-relaxed">
              {isLocked
                ? 'Your active institutions are saved and locked for the week. The remaining institutions are locked. Click "Change Selection" anytime to adjust.'
                : 'Select 1 to 4 partner institutions (at most 1 co-handled by 2 people). Click Save to confirm and lock.'}
            </p>
          </div>
        </div>

        {/* Right Side: Search Input + Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by college or coordinator…"
              className="w-full bg-surface-sunken border border-border text-xs text-fg pl-9 pr-3 py-2 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-fg-disabled font-normal shadow-2xs transition-all"
            />
          </div>

          {/* Action Button: Save & Lock OR Change Selection */}
          {!isLocked ? (
            <button
              type="button"
              onClick={handleSaveAndLock}
              disabled={selectedIds.length === 0 || isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer select-none active:scale-95 shrink-0"
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin text-white" />
              ) : (
                <CheckCircle2 size={15} className="text-white" />
              )}
              <span>Save & Lock Focus ({selectedIds.length}/4)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUnlockToEdit}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-surface-sunken hover:bg-surface-raised border border-border text-fg hover:border-primary/40 hover:text-primary transition-all shadow-xs cursor-pointer select-none active:scale-95 shrink-0 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin text-primary" />
              ) : (
                <Edit3 size={14} className="text-primary" />
              )}
              <span>Change Selection</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Colleges Interactive Grid ────────────────────── */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
              const isOccupiedByOther = Boolean(college.is_occupied && !isChecked);
              const isSharedSlot = Boolean(college.is_shared_slot && !isChecked);
              const isRemainingLocked = Boolean(isLocked && !isChecked);

              return (
                <div
                  key={college._id}
                  onClick={() => {
                    if (isLocked) {
                      toast('College focus is currently locked for the week. Click "Change Selection" to adjust your partner institutions.', 'info');
                      return;
                    }
                    if (!isOccupiedByOther) {
                      handleToggleCollege(college);
                    }
                  }}
                  className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all select-none ${
                    isChecked
                      ? 'bg-blue-50/80 dark:bg-sky-950/40 border-blue-400/80 dark:border-sky-500/60 shadow-xs ring-1 ring-blue-500/20'
                      : isRemainingLocked
                      ? 'bg-surface-sunken/60 dark:bg-surface-sunken/40 border-border/80 opacity-60 cursor-not-allowed select-none'
                      : isOccupiedByOther
                      ? 'bg-surface-sunken/60 border-border/80 opacity-70 cursor-not-allowed border-dashed'
                      : isSharedSlot
                      ? 'bg-surface border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-surface border-border hover:border-border-strong hover:bg-surface-raised/60 cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                  } ${
                    isLocked || isOccupiedByOther ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {/* Custom Checkbox / Lock Icon Input */}
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : isRemainingLocked
                          ? 'bg-surface-sunken border-border text-fg-subtle'
                          : isOccupiedByOther
                          ? 'bg-surface-sunken border-border text-fg-disabled'
                          : isSharedSlot
                          ? 'border-emerald-500/40 bg-surface group-hover:border-emerald-500'
                          : 'border-border-strong bg-surface group-hover:border-primary/60'
                      }`}
                    >
                      {isChecked ? (
                        <Check size={12} strokeWidth={3} className="text-white" />
                      ) : isRemainingLocked ? (
                        <Lock size={10} className="text-fg-subtle" />
                      ) : isOccupiedByOther ? (
                        <Lock size={10} className="text-amber-600 dark:text-amber-400" />
                      ) : isSharedSlot ? (
                        <Users size={10} className="text-emerald-600 dark:text-emerald-400" />
                      ) : null}
                    </div>
                  </div>

                  {/* College Identity & Acronym */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-black font-mono text-xs px-1.5 py-0.2 rounded-md tracking-wider ${
                          isChecked
                            ? 'bg-blue-600/15 text-blue-700 dark:text-sky-300 font-bold'
                            : isRemainingLocked
                            ? 'bg-surface-sunken text-fg-disabled font-medium'
                            : isOccupiedByOther
                            ? 'bg-surface-sunken text-fg-disabled line-through opacity-70'
                            : isSharedSlot
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'bg-surface-sunken text-fg-muted'
                        }`}
                      >
                        [{college.college_code}]
                      </span>

                      {isChecked ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-sky-400">
                          <Sparkles size={10} /> Focus
                          {college.occupied_by?.name && (
                            <span className="font-normal text-fg-subtle text-[9px] ml-0.5">
                              (Shared with {college.occupied_by.name})
                            </span>
                          )}
                        </span>
                      ) : isRemainingLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fg-subtle bg-surface px-1.5 py-0.2 rounded border border-border">
                          <Lock size={9} /> Locked {college.occupied_by?.name ? `(${college.occupied_by.name})` : ''}
                        </span>
                      ) : isOccupiedByOther && college.occupied_by?.name ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          <Lock size={9} /> {college.occupied_by.name} (Full)
                        </span>
                      ) : isSharedSlot && college.occupied_by?.name ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          <Users size={9} /> 1/2 with {college.occupied_by.name}
                        </span>
                      ) : null}
                    </div>

                    <span
                      className={`text-xs font-semibold mt-1 line-clamp-2 leading-snug ${
                        isRemainingLocked || isOccupiedByOther ? 'text-fg-muted' : 'text-fg'
                      }`}
                    >
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
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-fg-subtle shrink-0" />
              <span>
                Total Partner Institutions: <strong className="text-fg">{colleges.length} Colleges</strong>
              </span>
            </div>
            {totalOccupiedByOthers > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Lock size={12} />
                <span>
                  <strong>{totalOccupiedByOthers}</strong> locked by other coordinators
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Rule: Minimum 1, Maximum 4 colleges per coordinator (Zero duplication).</span>
          </div>
        </div>
      </div>
    </section>
  );
}
