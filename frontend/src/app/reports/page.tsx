'use client';

import { useState } from 'react';
import { ReportsNavigation, ReportsTab } from './components/ReportsNavigation';
import { AnalyticsView } from './components/AnalyticsView';
import { ReportsLibraryView } from './components/ReportsLibraryView';
import { ReportBuilderWizard } from './components/ReportBuilderWizard';
import { NativeReportEditor } from './components/NativeReportEditor';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportsTab>('analytics');
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('all');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('weekly_placement');
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);

  // Default Coordinator ID (will come from JWT session in production)
  const COORDINATOR_ID = '6a84719afa3bf51271bc1548';

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
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">

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
              coordinatorId={COORDINATOR_ID}
              onReportGenerated={handleReportGenerated}
            />
          )}
        </>
      )}

    </div>
  );
}
