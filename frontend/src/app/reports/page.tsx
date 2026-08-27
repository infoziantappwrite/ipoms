'use client';

import { useState, useEffect } from 'react';
import { ReportsNavigation } from './components/ReportsNavigation';
import { ReportBuilderWizard } from './components/ReportBuilderWizard';
import { NativeReportEditor } from './components/NativeReportEditor';
import { readSessionUser } from '@/lib/session';

export default function ReportsPage() {
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('all');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('weekly_placement');
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);
  const [coordinatorId, setCoordinatorId] = useState<string>('');

  useEffect(() => {
    setCoordinatorId(readSessionUser()?._id ?? '');
  }, []);

  const handleReportGenerated = (reportData: any) => {
    setGeneratedReport(reportData);
    setIsEditingReport(true);
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Report Builder Header ────────────────────────────────────────── */}
      <ReportsNavigation />

      {/* ── Direct View: Wizard or Live Interactive Editor ────────────────── */}
      <main className="flex-1">
        {isEditingReport && generatedReport ? (
          <NativeReportEditor
            reportData={generatedReport}
            onBackToBuilder={() => setIsEditingReport(false)}
          />
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <ReportBuilderWizard
              initialTemplateType={selectedTemplateType}
              initialCollegeId={selectedCollegeId}
              coordinatorId={coordinatorId}
              onReportGenerated={handleReportGenerated}
            />
          </div>
        )}
      </main>

    </div>
  );
}

