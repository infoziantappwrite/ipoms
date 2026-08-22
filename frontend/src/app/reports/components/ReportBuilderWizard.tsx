import { useState, useEffect } from 'react';
import { Globe, Save, Sparkles, Wrench, BarChart3, TrendingUp, GraduationCap, UserCheck, Calendar, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

import { CollegeSelector } from '@/components/CollegeSelector';
import { DateRangeCalendar, formatPeriodFromDates } from './DateRangeCalendar';

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
  
  // Dynamic Interactive Date Range Calendar Selection
  const [startDate, setStartDate] = useState('2026-08-21');
  const [endDate, setEndDate] = useState('2026-08-27');
  const [weekLabel, setWeekLabel] = useState(
    () => formatPeriodFromDates('2026-08-21', '2026-08-27') || 'August 2026 • Week 3: 21 Aug – 27 Aug 2026'
  );

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
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          setColleges((data.data as any).colleges);
        }
      })
      .catch(console.error);
  }, []);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleGenerate = async () => {
    setValidationErrors([]);

    const errors: string[] = [];

    // 1. Mandatory Target College (Option 2)
    if (!collegeId || collegeId.trim() === '') {
      errors.push('Option 2: Target College must be selected.');
    }

    // 2. Mandatory Graduating Academic Year (Option 3)
    if (!academicYear || academicYear.trim() === '') {
      errors.push('Option 3: Graduating Academic Year must be selected.');
    }

    // 3. Mandatory Date Range (Option 4) with minimum 5 days verification
    if (!startDate || !endDate) {
      errors.push('Option 4: Both "From" and "To" dates are required for the Report Period.');
    } else {
      const s = new Date(startDate + 'T00:00:00');
      const e = new Date(endDate + 'T00:00:00');
      if (s > e) {
        errors.push('Option 4: The "From" start date cannot be after the "To" end date.');
      } else {
        const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays < 5) {
          errors.push(
            `Option 4: Weekly Report date range must span a minimum of 5 days (currently ${diffDays} day${diffDays === 1 ? '' : 's'}).`
          );
        }
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/reports/generate', {
        method: 'POST',
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
      if (res.success && res.data) {
        onReportGenerated((res.data as any).report);
      } else {
        setValidationErrors([res.error?.message || 'Failed to generate report']);
      }
    } catch (err) {
      console.error('Generate report error:', err);
      setValidationErrors(['Network error while generating report. Please try again.']);
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
      const res = await apiFetch('/reports/presets', {
        method: 'POST',
        body: JSON.stringify({
          template_type: templateType,
          preset_name: presetName.trim(),
          college_id: collegeId === 'all' ? null : collegeId,
          theme,
          academic_year: academicYear,
          week_label: weekLabel,
          included_sections: sections,
          custom_remarks: customRemarks,
        }),
      });
      if (res.success) {
        alert('Preset saved to Report Library successfully');
        setShowSavePresetModal(false);
        setPresetName('');
      } else {
        alert(res.error?.message || 'Failed to save preset');
      }
    } catch (err) {
      console.error('Save preset error:', err);
      alert('Network error while saving preset');
    }
  };

  const TEMPLATES = [
    { id: 'weekly_placement', label: 'Weekly Placement', icon: BarChart3 },
    { id: 'monthly_placement', label: 'Monthly Placement', icon: TrendingUp },
    { id: 'college_deep_dive', label: 'College Deep-Dive', icon: GraduationCap },
    { id: 'coordinator_activity', label: 'Coordinator Activity', icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Wizard Form Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Wrench size={18} strokeWidth={2} className="text-primary" /> Guided Report Builder Wizard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure parameters, select sections, and generate an interactive live report
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSavePresetModal(true)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Save size={14} strokeWidth={2} /> Save as Preset
          </button>
        </div>

        {/* Step 1: Select Report Template (Slim Profile) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            1. Select Report Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {TEMPLATES.map((t) => {
              const IconComponent = t.icon;
              const isSelected = templateType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateType(t.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none shadow-2xs ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-xs font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <IconComponent
                    size={14}
                    strokeWidth={isSelected ? 2.5 : 2}
                    className={isSelected ? 'text-white shrink-0' : 'text-slate-500 shrink-0'}
                  />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 & Step 3: Target College & Graduating Academic Year */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Step 2: Target College */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              2. Target College <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <CollegeSelector
              selectedCollegeId={collegeId}
              allowAll={true}
              allLabel="All Colleges (Consolidated)"
              label=""
              onSelect={(id) => {
                setCollegeId(id);
                setValidationErrors([]);
              }}
            />
          </div>

          {/* Step 3: Graduating Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              3. Graduating Academic Year <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setValidationErrors([]);
              }}
              className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-slate-800 text-xs cursor-pointer outline-none font-medium shadow-xs"
            >
              <option value="">-- Select Graduating Year --</option>
              <option value="2026">2026 Graduating</option>
              <option value="2027">2027 Graduating</option>
              <option value="2028">2028 Graduating</option>
              <option value="2029">2029 Graduating</option>
              <option value="2030">2030 Graduating</option>
              <option value="2031">2031 Graduating</option>
              <option value="2032">2032 Graduating</option>
              <option value="2033">2033 Graduating</option>
              <option value="2034">2034 Graduating</option>
              <option value="2035">2035 Graduating</option>
            </select>
          </div>
        </div>

        {/* Step 4: Report Period & Weekly Date Range */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-slate-700">
            4. Report Period & Weekly Date Range <span className="text-red-500 font-bold ml-0.5">*</span>
          </label>
          <DateRangeCalendar
            startDate={startDate}
            endDate={endDate}
            onChangeRange={(s, e, calculatedLabel) => {
              setStartDate(s);
              setEndDate(e);
              setWeekLabel(calculatedLabel);
              setValidationErrors([]);
            }}
          />
        </div>

        {/* Step 5: Choose Sections to Include (Spec Section 9.6) */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            5. Included Sections in Generated Report
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {Object.entries(sections).map(([key, val]) => (
              <label
                key={key}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <span className="capitalize font-medium text-slate-700">
                  {key.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Step 6: Coordinator Custom Remarks */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            6. Coordinator Remarks & Notes
          </label>
          <textarea
            rows={2}
            value={customRemarks}
            onChange={(e) => setCustomRemarks(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-3 text-xs text-slate-800 outline-none shadow-xs"
          />
        </div>

        {/* Minimal SaaS Theme Matching Mandatory Alert */}
        {validationErrors.length > 0 && (
          <div className="p-3.5 bg-slate-50 border border-rose-200 rounded-xl text-xs space-y-2 animate-fadeIn shadow-2xs">
            <div className="flex items-center gap-2 text-rose-700 font-bold">
              <AlertCircle size={15} strokeWidth={2.25} className="text-rose-600 shrink-0" />
              <span>Mandatory Options Required</span>
            </div>
            <p className="text-slate-600 text-micro">
              These mandatory fields are missed by you. Please select them before generating the report:
            </p>
            <ul className="space-y-1 text-slate-700 text-micro pl-1 font-medium">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Generate Report Submit Button */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={14} strokeWidth={2} aria-hidden /> {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>

      </div>

      {/* Modal: Save Preset */}
      {showSavePresetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="rounded-2xl w-full max-w-md bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Save size={16} strokeWidth={2} className="text-primary" /> Save Preset to Report Library
            </h3>
            <p className="text-xs text-slate-500">
              Save your current filters, section toggles, and remarks to quickly reload later.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preset Name</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. Weekly Dean Summary Preset"
                className="w-full bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSavePresetModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                className="px-5 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
