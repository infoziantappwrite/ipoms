'use client';

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Save,
  Wrench,
  Trash2,
  TrendingUp,
  BarChart3,
  GraduationCap,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Props {
  onSelectTemplate: (templateId: string) => void;
  onLoadPreset: (preset: any) => void;
}

const TEMPLATE_ICONS: Record<string, any> = {
  weekly_placement: TrendingUp,
  monthly_summary: BarChart3,
  college_deep_dive: GraduationCap,
  coordinator_activity: UserCheck,
};

export function ReportsLibraryView({ onSelectTemplate, onLoadPreset }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const [tmplRes, presRes] = await Promise.all([
        fetch(`${API}/reports/templates`),
        fetch(`${API}/reports/presets`),
      ]);
      const [tmplData, presData] = await Promise.all([tmplRes.json(), presRes.json()]);

      if (tmplData.success) setTemplates(tmplData.data.templates);
      if (presData.success) setPresets(presData.data.presets);
    } catch (err) {
      console.error('Failed to load reports library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const handleDeletePreset = async (id: string, name: string) => {
    if (!confirm(`Delete saved preset "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/reports/presets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadLibrary();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* 4 Standardized Report Template Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet size={16} strokeWidth={2.25} className="text-primary" />
              <span>Enterprise Report Templates</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              4 standardized institutional report templates. Select any template to configure and generate a live report.
            </p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 size={13} strokeWidth={2.5} /> 4 Approved Formats
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((t) => {
            const IconComp = TEMPLATE_ICONS[t.id] || FileSpreadsheet;
            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-primary hover:shadow-sm transition-all group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-2xs">
                      <IconComp size={18} strokeWidth={2.25} />
                    </div>
                    <span className="text-micro bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
                      {t.audience?.split('&')[0]?.trim() || 'Leadership'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-primary transition-colors">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                    {t.description}
                  </p>

                  {/* Section tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.default_sections?.slice(0, 3).map((s: string) => (
                      <span
                        key={s}
                        className="text-micro bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium"
                      >
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                    {t.default_sections?.length > 3 && (
                      <span className="text-micro text-slate-400 px-1 self-center font-medium">
                        +{t.default_sections.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTemplate(t.id)}
                  className="w-full mt-5 bg-primary hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wrench size={13} strokeWidth={2} />
                  <span>Build This Report</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saved Report Presets Section */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Save size={14} strokeWidth={2.25} className="text-primary" /> Saved Report Configuration Presets
            </h3>
            <p className="text-micro text-slate-500 mt-0.5">
              Reusable presets stored in <code className="text-primary font-mono font-semibold">report_library</code> for 1-click recurring report creation.
            </p>
          </div>
          <span className="text-xs bg-white text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 font-semibold shadow-2xs">
            {presets.length} Saved Presets
          </span>
        </div>

        {presets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic text-xs">
            No saved presets yet. When configuring a report in the builder, click <span className="text-primary font-semibold">"Save as Preset"</span> to store it here for 1-click generation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-micro uppercase">
                  <th className="py-2.5 px-4">Preset Name</th>
                  <th className="py-2.5 px-4">Template Type</th>
                  <th className="py-2.5 px-4">Target College</th>
                  <th className="py-2.5 px-4">Saved By</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-normal">
                {presets.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.preset_name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="bg-blue-50 text-primary border border-blue-200 px-2 py-0.5 rounded text-micro font-semibold">
                        {p.template_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {p.college_id?.college_name || 'All Colleges (Consolidated)'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{p.coordinator_id?.full_name || 'Operations Lead'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLoadPreset(p)}
                          className="bg-primary hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-micro font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          Load & Build
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(p._id, p.preset_name)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete Preset"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
