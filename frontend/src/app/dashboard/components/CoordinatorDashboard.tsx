'use client';

import React, { useState } from 'react';
import { CoordinatorCollegeFocusSection } from './CoordinatorCollegeFocusSection';
import { CoordinatorCollegeKpiCards } from './CoordinatorCollegeKpiCards';
import { getCoordinatorSelectedColleges } from '@/lib/collegeSession';

interface Props {
  data: any;
  onLoadToMetadata?: (id: string) => void;
  onMarkComplete?: (id: string) => void;
}

export function CoordinatorDashboard({ data }: Props) {
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>(getCoordinatorSelectedColleges);

  if (!data) return null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      {/* ── 1. Coordinator Multi-College Focus Checkbox Selector (Min 1, Max 3) ── */}
      <CoordinatorCollegeFocusSection
        onSelectionChange={(ids) => setSelectedCollegeIds(ids)}
      />

      {/* ── 2. Dedicated Per-College KPI Analytics Cards (1, 2, or 3 cards) ── */}
      <CoordinatorCollegeKpiCards
        selectedCollegeIds={selectedCollegeIds}
      />
    </div>
  );
}
