'use client';

import React, { useState } from 'react';
import { CompanyFunnel } from './CompanyFunnel';
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

  const { kpi_summary } = data;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      {/* ── 1. Company Funnel Headline ─────────────────────────────────────── */}
      <CompanyFunnel kpi={kpi_summary} />

      {/* ── 2. Coordinator Multi-College Focus Checkbox Selector (Min 1, Max 3) ── */}
      <CoordinatorCollegeFocusSection
        onSelectionChange={(ids) => setSelectedCollegeIds(ids)}
      />

      {/* ── 3. Dedicated Per-College KPI Analytics Cards (1, 2, or 3 cards) ── */}
      <CoordinatorCollegeKpiCards
        selectedCollegeIds={selectedCollegeIds}
      />
    </div>
  );
}
