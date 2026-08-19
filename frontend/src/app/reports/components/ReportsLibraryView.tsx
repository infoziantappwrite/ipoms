'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Props {
  onSelectTemplate: (templateId: string) => void;
  onLoadPreset: (preset: any) => void;
}

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
    <div className="p-6 space-y-8">

      {/* 4 Standardized Report Template Cards (Spec Section 8.3) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📑</span> Enterprise Report Templates
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              4 standardized institutional templates. Select any template to build a live report.
            </p>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
            4 Approved Templates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col justify-between hover:border-blue-500/60 transition-all group shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl p-2 bg-slate-800 rounded-xl border border-slate-700">
                    {t.icon}
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                    {t.audience.split('&')[0].trim()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-3 group-hover:text-blue-400 transition-colors">
                  {t.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                  {t.description}
                </p>

                {/* Section tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {t.default_sections.slice(0, 3).map((s: string) => (
                    <span
                      key={s}
                      className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded"
                    >
                      {s.replace('_', ' ')}
                    </span>
                  ))}
                  {t.default_sections.length > 3 && (
                    <span className="text-[10px] text-slate-500 px-1">
                      +{t.default_sections.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onSelectTemplate(t.id)}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🛠️</span> Build This Report →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Report Presets Section (Spec Section 12) */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>💾</span> Saved Report Configuration Presets
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Reusable presets stored in <code className="text-blue-400 font-mono">report_library</code>
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-medium">
            {presets.length} Presets
          </span>
        </div>

        {presets.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic text-xs">
            No saved presets yet. When configuring a report in the builder, click <span className="text-blue-400 font-semibold">"Save Preset"</span> to store it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                  <th className="py-2.5 px-4">Preset Name</th>
                  <th className="py-2.5 px-4">Template Type</th>
                  <th className="py-2.5 px-4">Target College</th>
                  <th className="py-2.5 px-4">Theme</th>
                  <th className="py-2.5 px-4">Saved By</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {presets.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">{p.preset_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                        {p.template_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {p.college_id?.college_name || 'All Colleges'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 capitalize">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.theme === 'green' ? 'bg-emerald-400' : p.theme === 'purple' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                        {p.theme}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{p.coordinator_id?.full_name || 'Coordinator'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onLoadPreset(p)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                        >
                          Load →
                        </button>
                        <button
                          onClick={() => handleDeletePreset(p._id, p.preset_name)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors text-xs"
                          title="Delete Preset"
                        >
                          🗑️
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
