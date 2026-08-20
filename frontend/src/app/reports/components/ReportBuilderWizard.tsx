'use client';

import { useState, useEffect } from 'react';
import { Globe, Save, Sparkles } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface College {
  _id: string;
  college_name: string;
  college_code: string;
}

interface Props {
  initialTemplateType: string;
  initialCollegeId: string;
  coordinatorId: string;
  onReportGenerated: (reportData: any) => void;
}

export function ReportBuilderWizard({
  initialTemplateType,
  initialCollegeId,
  coordinatorId,
  onReportGenerated,
}: Props) {
  const [templateType, setTemplateType] = useState(initialTemplateType || 'weekly_placement');
  const [collegeId, setCollegeId] = useState(initialCollegeId || 'all');
  const [academicYear, setAcademicYear] = useState('2026');
  const [weekLabel, setWeekLabel] = useState('Week 30: 18 Jul - 24 Jul 2026');
  const [theme, setTheme] = useState('blue');
  const [customRemarks, setCustomRemarks] = useState(
    'All campus drives are progressing actively as per schedule. Follow-ups with upcoming tech partners remain on track.'
  );

  // Section inclusion toggles (Spec Section 9.6)
  const [sections, setSections] = useState({
    kpi_summary: true,
    completed_companies: true,
    in_progress: true,
    pipeline: true,
    charts: true,
    insights: true,
    remarks: true,
  });

  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);

  useEffect(() => {
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setColleges(data.data.colleges);
      })
      .catch(console.error);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: templateType,
          college_id: collegeId,
          coordinator_id: coordinatorId,
          academic_year: academicYear,
          week_label: weekLabel,
          theme,
          included_sections: sections,
          custom_remarks: customRemarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onReportGenerated(data.data.report);
      } else {
        alert(data.error?.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Generate report error:', err);
      alert('Network error while generating report');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    try {
      const res = await fetch(`${API}/reports/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: templateType,
          preset_name: presetName.trim(),
          college_id: collegeId,
          coordinator_id: coordinatorId,
          academic_year: academicYear,
          theme,
          included_sections: sections,
          custom_remarks: customRemarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Preset saved to Report Library successfully!');
        setShowSavePresetModal(false);
        setPresetName('');
      }
    } catch (err) {
      console.error('Save preset error:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <div className="glass-panel rounded-2xl border border-border p-6 shadow-4 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🛠️</span> Guided Report Builder Wizard
            </h2>
            <p className="text-xs text-fg-subtle mt-0.5">
              Configure parameters, select sections, and generate an interactive live report
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSavePresetModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-raised text-primary border border-primary/30 rounded-lg text-xs font-semibold transition-colors"
          >
            <Save size={14} strokeWidth={2} aria-hidden /> Save as Preset
          </button>
        </div>

        {/* Step 1: Select Template Type */}
        <div>
          <label className="block text-xs font-semibold text-fg-muted mb-2">
            1. Select Report Template
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { id: 'weekly_placement', label: 'Weekly Placement', icon: '📊' },
              { id: 'monthly_placement', label: 'Monthly Placement', icon: '📈' },
              { id: 'college_performance', label: 'College Deep-Dive', icon: '🏛️' },
              { id: 'coordinator_performance', label: 'Coordinator Activity', icon: '👤' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateType(t.id)}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all text-center
                            ${
                              templateType === t.id
                                ? 'bg-primary/30 border-primary text-white shadow-2'
                                : 'bg-background/60 border-border text-fg-subtle hover:border-border-strong'
                            }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Choose Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Target College */}
          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1">
              2. Target College
            </label>
            <select
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs cursor-pointer"
            >
              <option value="all"><Globe size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}All Colleges (Consolidated)</option>
              {colleges.map((c) => (
                <option key={c._id} value={c._id}>
                  [{c.college_code}] {c.college_name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs cursor-pointer"
            >
              <option value="2026">2026 Batch Season</option>
              <option value="2025">2025 Batch Season</option>
            </select>
          </div>

          {/* Report Period Label */}
          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1">Period Header</label>
            <input
              type="text"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs "
            />
          </div>
        </div>

        {/* Step 3: Choose Sections to Include (Spec Section 9.6) */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-fg-muted mb-2">
            3. Included Sections in Generated Report
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {Object.entries(sections).map(([key, val]) => (
              <label
                key={key}
                className="flex items-center gap-2 bg-background/60 border border-border p-2.5 rounded-lg cursor-pointer hover:bg-surface/60 transition-colors select-none"
              >
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                  className="rounded bg-surface border-border-strong text-primary "
                />
                <span className="capitalize text-fg-muted font-medium">
                  {key.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Step 4: Color Theme (Spec Section 10.3) */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-fg-muted mb-2">
            4. Visual Branding Theme
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'blue', label: 'Infoziant Deep Blue', bg: 'bg-primary' },
              { id: 'green', label: 'Emerald Green', bg: 'bg-success' },
              { id: 'purple', label: 'Corporate Purple', bg: 'bg-purple-600' },
              { id: 'college_branded', label: 'College Branded Theme', bg: 'bg-gradient-to-r from-primary to-indigo-600' },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id)}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all
                            ${
                              theme === th.id
                                ? 'border-white bg-surface text-white shadow-2'
                                : 'border-border bg-background/40 text-fg-subtle'
                            }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${th.bg} shrink-0`} />
                <span className="text-micro truncate">{th.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Remarks */}
        <div>
          <label className="block text-xs font-semibold text-fg-muted mb-1">
            Coordinator Remarks & Notes
          </label>
          <textarea
            rows={2}
            value={customRemarks}
            onChange={(e) => setCustomRemarks(e.target.value)}
            className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs "
          />
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primary disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-3 transition-colors flex items-center gap-2"
          >
            <Sparkles size={14} strokeWidth={2} aria-hidden /> {loading ? 'Aggregating Live Data…' : 'Generate Live Report & Open Editor →'}
          </button>
        </div>

      </div>

      {/* Modal: Save Preset */}
      {showSavePresetModal && (
        <div className="fixed inset-0 scrim flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl w-full max-w-md border border-border-strong shadow-4 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Save size={14} strokeWidth={2} aria-hidden /> Save Preset to Report Library
            </h3>
            <p className="text-xs text-fg-subtle">
              Save current filter and section selections as a reusable template preset.
            </p>
            <div>
              <label className="block text-xs font-semibold text-fg-muted mb-1">Preset Name</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. AAA CET Friday Review Preset"
                className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-fg text-xs "
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSavePresetModal(false)}
                className="px-4 py-2 bg-surface text-fg-muted rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-lg text-xs font-semibold"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
