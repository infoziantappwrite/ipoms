'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Sparkles, ArrowUpRight, Lock, Target } from 'lucide-react';
import { CoordinatorCollegeFocusSection } from './CoordinatorCollegeFocusSection';
import { CoordinatorCollegeKpiCards } from './CoordinatorCollegeKpiCards';
import { FollowUpSmartQueueWidget } from './FollowUpSmartQueueWidget';
import { getCoordinatorSelectedColleges, isFocusLockedToday } from '@/lib/collegeSession';

interface Props {
  data: any;
  onLoadToMetadata?: (id: string) => void;
  onMarkComplete?: (id: string) => void;
}

export function CoordinatorDashboard({ data }: Props) {
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setSelectedCollegeIds(getCoordinatorSelectedColleges());
    setIsLocked(isFocusLockedToday());

    const handleFocusUpdate = () => {
      setSelectedCollegeIds(getCoordinatorSelectedColleges());
      setIsLocked(isFocusLockedToday());
    };
    window.addEventListener('ipoms_focus_updated' as any, handleFocusUpdate);
    return () => {
      window.removeEventListener('ipoms_focus_updated' as any, handleFocusUpdate);
    };
  }, []);

  if (!data) return null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      {/* ── 1. Coordinator Multi-College Focus Selector (Min 1, Max 4) ── */}
      <CoordinatorCollegeFocusSection
        onSelectionChange={(ids, locked) => {
          setSelectedCollegeIds(ids);
          setIsLocked(locked);
        }}
      />

      {/* ── 2. Fresh Dashboard Empty State (When Colleges are Not Yet Locked) ── */}
      {(!isLocked || selectedCollegeIds.length === 0) ? (
        <div className="bg-surface border border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-2xs animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-1">
            <Target size={28} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-fg">
            Daily Operational Dashboard Ready
          </h3>
          <p className="text-xs text-fg-subtle max-w-md leading-relaxed">
            Please select between <strong>1 and 4 partner colleges</strong> in the focus area above and click <strong className="text-emerald-600 dark:text-emerald-400">Save & Lock Focus</strong>. Once saved, your live KPIs, follow-up alerts, and system navigation (Daily Tracker, Weekly Tracker, Leads) will automatically activate.
          </p>
        </div>
      ) : (
        <>
          {/* ── 3. Dedicated Per-College KPI Analytics Cards (1 to 4 cards) ── */}
          <CoordinatorCollegeKpiCards
            selectedCollegeIds={selectedCollegeIds}
          />

          {/* ── 4. Hot Follow-Ups Due — Smart Queue & Alarm ── */}
          <FollowUpSmartQueueWidget
            selectedCollegeIds={selectedCollegeIds}
          />
        </>
      )}
    </div>
  );
}
