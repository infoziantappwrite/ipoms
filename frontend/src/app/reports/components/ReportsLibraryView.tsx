'use client';

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Save,
  Wrench,
  Trash2,
  TrendingUp,
  BarChart3,
  ListTodo,
  CheckCircle2,
} from 'lucide-react';

import { getApiBase } from '@/lib/api';

const API = getApiBase();

interface Props {
  onSelectTemplate: (templateId: string) => void;
  onLoadPreset: (preset: any) => void;
}

const TEMPLATE_ICONS: Record<string, any> = {
  weekly_placement: TrendingUp,
  monthly_placement: BarChart3,
  pending_tasks: ListTodo,
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-fg">

      {/* 3 Standardized Report Template Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-fg flex items-center gap-2">
              <FileSpreadsheet size={16} strokeWidth={2.25} className="text-primary" />
              <span>Institutional Report Templates</span>
            </h2>
            <p className="text-xs text-fg-subtle mt-0.5">
              3 standardized institutional report templates. Select any template to configure and generate a live report.
            </p>
          </div>
          <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 size={13} strokeWidth={2.5} /> 3 Approved Formats
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((t) => {
            const IconComp = TEMPLATE_ICONS[t.id] || FileSpreadsheet;
            return (
              <div
                key={t.id}
                className="bg-surface rounded-2xl border border-border p-5 flex flex-col justify-between hover:border-primary hover:shadow-sm transition-all group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-2xs">
                      <IconComp size={18} strokeWidth={2.25} />
                    </div>
                    <span className="text-micro bg-surface-sunken text-fg-muted px-2.5 py-1 rounded-full border border-border font-medium">
                      {t.audience?.split('&')[0]?.trim() || 'Leadership'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-fg mt-3 group-hover:text-primary transition-colors">
                    {t.title}
                  </h3>
                  <p className="text-xs text-fg-subtle mt-1.5 leading-relaxed line-clamp-3">
                    {t.description}
                  </p>

                  {/* Section tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.default_sections?.slice(0, 3).map((s: string) => (
                      <span
                        key={s}
                        className="text-micro bg-surface-sunken border border-border text-fg-muted px-2 py-0.5 rounded font-medium"
                      >
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                    {t.default_sections?.length > 3 && (
                      <span className="text-micro text-fg-subtle px-1 self-center font-medium">
                        +{t.default_sections.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTemplate(t.id)}
                  className="w-full mt-5 bg-primary hover:bg-primary-hover text-primary-foreground py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border bg-surface-sunken flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold text-fg flex items-center gap-2">
              <Save size={14} strokeWidth={2.25} className="text-primary" /> Saved Report Configuration Presets
            </h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Reusable presets stored in <code className="text-primary font-mono font-semibold">report_library</code> for 1-click recurring report creation.
            </p>
          </div>
          <span className="text-xs bg-surface text-fg px-2.5 py-0.5 rounded-full border border-border font-semibold shadow-2xs">
            {presets.length} Saved Presets
          </span>
        </div>

        {presets.length === 0 ? (
          <div className="p-8 text-center text-fg-subtle italic text-xs">
            No saved presets yet. When configuring a report in the builder, click <span className="text-primary font-semibold">"Save as Preset"</span> to store it here for 1-click generation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-sunken text-fg-muted font-bold border-b border-border text-micro uppercase">
                  <th className="py-2.5 px-4">Preset Name</th>
                  <th className="py-2.5 px-4">Template Type</th>
                  <th className="py-2.5 px-4">Target College</th>
                  <th className="py-2.5 px-4">Saved By</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-surface font-normal">
                {presets.map((p) => (
                  <tr key={p._id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-fg">{p.preset_name}</td>
                    <td className="py-3 px-4 text-fg-muted">
                      <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-micro font-semibold">
                        {p.template_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-fg font-medium">
                      {p.college_id?.college_name || 'All Colleges (Consolidated)'}
                    </td>
                    <td className="py-3 px-4 text-fg-subtle">{p.coordinator_id?.full_name || 'Operations Lead'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLoadPreset(p)}
                          className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-1 rounded-lg text-micro font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          Load & Build
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(p._id, p.preset_name)}
                          className="text-fg-subtle hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
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
