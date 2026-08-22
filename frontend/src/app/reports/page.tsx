'use client';

import { useState, useEffect } from 'react';
import { ReportsNavigation, ReportsTab } from './components/ReportsNavigation';
import { AnalyticsView } from './components/AnalyticsView';
import { ReportsLibraryView } from './components/ReportsLibraryView';
import { ReportBuilderWizard } from './components/ReportBuilderWizard';
import { NativeReportEditor } from './components/NativeReportEditor';
import { readSessionUser } from '@/lib/session';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportsTab>('analytics');
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('all');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('weekly_placement');
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);
  const [coordinatorId, setCoordinatorId] = useState<string>('');

  useEffect(() => {
    setCoordinatorId(readSessionUser()?._id ?? '');
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateType(templateId);
    setIsEditingReport(false);
    setActiveTab('builder');
  };

  const handleLoadPreset = (preset: any) => {
    setSelectedTemplateType(preset.template_type);
    if (preset.college_id?._id) setSelectedCollegeId(preset.college_id._id);
    setIsEditingReport(false);
    setActiveTab('builder');
  };

  const handleReportGenerated = (reportData: any) => {
    setGeneratedReport(reportData);
    setIsEditingReport(true);
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Navigation Header (3 Views) ───────────────────────────────────── */}
      <ReportsNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'builder') setIsEditingReport(false);
        }}
      />

      {/* ── Sub-View 1: Live Analytics & BI ────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <AnalyticsView
          selectedCollegeId={selectedCollegeId}
          onSelectCollege={setSelectedCollegeId}
        />
      )}

      {/* ── Sub-View 2: Reports Library (4 Templates & Presets) ────────────── */}
      {activeTab === 'library' && (
        <ReportsLibraryView
          onSelectTemplate={handleSelectTemplate}
          onLoadPreset={handleLoadPreset}
        />
      )}

      {/* ── Sub-View 3: Report Builder & Native Interactive Editor ─────────── */}
      {activeTab === 'builder' && (
        <>
          {isEditingReport && generatedReport ? (
            <NativeReportEditor
              reportData={generatedReport}
              onBackToBuilder={() => setIsEditingReport(false)}
            />
          ) : (
            <ReportBuilderWizard
              initialTemplateType={selectedTemplateType}
              initialCollegeId={selectedCollegeId}
              coordinatorId={coordinatorId}
              onReportGenerated={handleReportGenerated}
            />
          )}
        </>
      )}

    </div>
  );
}
