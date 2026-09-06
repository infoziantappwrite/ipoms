'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportsNavigation } from './components/ReportsNavigation';
import { ReportBuilderWizard } from './components/ReportBuilderWizard';
import { NativeReportEditor } from './components/NativeReportEditor';
import { readSessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const templateQuery = searchParams.get('template') || 'weekly_placement';
  const collegeIdQuery = searchParams.get('collegeId') || '';
  const autoQuery = searchParams.get('auto') === 'true';

  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(collegeIdQuery);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>(templateQuery);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);
  const [coordinatorId, setCoordinatorId] = useState<string>('');
  const [autoLoading, setAutoLoading] = useState<boolean>(autoQuery);

  useEffect(() => {
    setCoordinatorId(readSessionUser()?._id ?? '');
  }, []);

  useEffect(() => {
    if (templateQuery) setSelectedTemplateType(templateQuery);
    if (collegeIdQuery) setSelectedCollegeId(collegeIdQuery);

    if (autoQuery) {
      const autoGenerate = async () => {
        try {
          setAutoLoading(true);
          const res = await apiFetch<any>('/api/v1/reports/generate', {
            method: 'POST',
            body: JSON.stringify({
              template_type: templateQuery,
              college_id: collegeIdQuery,
              coordinator_id: readSessionUser()?._id ?? '',
            }),
          });
          if (res?.data?.report) {
            setGeneratedReport(res.data.report);
            setIsEditingReport(true);
          }
        } catch (err) {
          console.error('Failed to auto-generate report:', err);
        } finally {
          setAutoLoading(false);
        }
      };
      autoGenerate();
    }
  }, [templateQuery, collegeIdQuery, autoQuery]);

  const handleReportGenerated = (reportData: any) => {
    if (reportData?.template_type) {
      setSelectedTemplateType(reportData.template_type);
    }
    if (reportData?.branding?.college_id) {
      setSelectedCollegeId(reportData.branding.college_id);
    }
    setGeneratedReport(reportData);
    setIsEditingReport(true);
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* ── Report Builder Header ────────────────────────────────────────── */}
      <ReportsNavigation />

      {/* ── Direct View: Wizard or Live Interactive Editor ────────────────── */}
      <main className="flex-1">
        {autoLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-fg-subtle font-medium">Generating Pending Task placement report...</p>
          </div>
        ) : isEditingReport && generatedReport ? (
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

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ReportsPageContent />
    </Suspense>
  );
}

