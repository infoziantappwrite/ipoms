'use client';

import { useState, useEffect } from 'react';
import { FileSpreadsheet, Save } from 'lucide-react';

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
              <FileSpreadsheet size={14} strokeWidth={2} aria-hidden /> Enterprise Report Templates
            </h2>
            <p className="text-xs text-fg-subtle mt-0.5">
              4 standardized institutional templates. Select any template to build a live report.
            </p>
          </div>
          <span className="text-xs bg-success/20 text-success border border-success/30 px-3 py-1 rounded-full font-semibold">
            4 Approved Templates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="glass-panel rounded-2xl border border-border p-5 flex flex-col justify-between hover:border-primary/60 transition-all group shadow-2"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl p-2 bg-surface rounded-xl border border-border-strong">
                    {t.icon}
                  </span>
                  <span className="text-micro bg-surface text-fg-subtle px-2 py-0.5 rounded-full border border-border-strong">
                    {t.audience.split('&')[0].trim()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-3 group-hover:text-primary transition-colors">
                  {t.title}
                </h3>
                <p className="text-xs text-fg-subtle mt-1.5 leading-relaxed line-clamp-3">
                  {t.description}
                </p>

                {/* Section tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {t.default_sections.slice(0, 3).map((s: string) => (
                    <span
                      key={s}
                      className="text-micro bg-background border border-border text-fg-subtle px-1.5 py-0.5 rounded"
                    >
                      {s.replace('_', ' ')}
                    </span>
                  ))}
                  {t.default_sections.length > 3 && (
                    <span className="text-micro text-fg-subtle px-1">
                      +{t.default_sections.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onSelectTemplate(t.id)}
                className="w-full mt-4 bg-primary hover:bg-primary text-white py-2 rounded-xl text-xs font-semibold shadow-1 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🛠️</span> Build This Report →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Report Presets Section (Spec Section 12) */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-3">
        <div className="px-5 py-4 border-b border-border bg-background/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Save size={14} strokeWidth={2} aria-hidden /> Saved Report Configuration Presets
            </h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Reusable presets stored in <code className="text-primary font-mono">report_library</code>
            </p>
          </div>
          <span className="text-xs bg-surface text-fg-muted px-2.5 py-0.5 rounded-full border border-border-strong font-medium">
            {presets.length} Presets
          </span>
        </div>

        {presets.length === 0 ? (
          <div className="p-8 text-center text-fg-subtle italic text-xs">
            No saved presets yet. When configuring a report in the builder, click <span className="text-primary font-semibold">"Save Preset"</span> to store it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-background/80 text-fg-subtle font-semibold border-b border-border text-micro uppercase">
                  <th className="py-2.5 px-4">Preset Name</th>
                  <th className="py-2.5 px-4">Template Type</th>
                  <th className="py-2.5 px-4">Target College</th>
                  <th className="py-2.5 px-4">Theme</th>
                  <th className="py-2.5 px-4">Saved By</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {presets.map((p) => (
                  <tr key={p._id} className="hover:bg-surface/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-fg">{p.preset_name}</td>
                    <td className="py-3 px-4 text-fg-muted">
                      <span className="bg-surface px-2 py-0.5 rounded text-micro border border-border-strong">
                        {p.template_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-fg-subtle">
                      {p.college_id?.college_name || 'All Colleges'}
                    </td>
                    <td className="py-3 px-4 text-fg-muted capitalize">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.theme === 'green' ? 'bg-success' : p.theme === 'purple' ? 'bg-purple-400' : 'bg-primary'}`} />
                        {p.theme}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-fg-subtle">{p.coordinator_id?.full_name || 'Coordinator'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onLoadPreset(p)}
                          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2.5 py-1 rounded text-micro font-semibold transition-colors"
                        >
                          Load →
                        </button>
                        <button
                          onClick={() => handleDeletePreset(p._id, p.preset_name)}
                          className="text-fg-subtle hover:text-destructive p-1 rounded transition-colors text-xs"
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
