'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Globe, Landmark, RefreshCw, TrendingUp, User, PhoneCall, Sparkles, FileText, CheckCircle2, Trophy } from 'lucide-react';
import { CollegeSelector } from '@/components/CollegeSelector';

import { getApiBase } from '@/lib/api';

const API = getApiBase();

interface Props {
  selectedCollegeId: string;
  onSelectCollege: (id: string) => void;
}

export function AnalyticsView({ selectedCollegeId, onSelectCollege }: Props) {
  const [colleges, setColleges] = useState<any[]>([]);
  const [kpi, setKpi] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [responsiveness, setResponsiveness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch colleges list
  useEffect(() => {
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setColleges(data.data.colleges);
      })
      .catch(console.error);
  }, []);

  // Fetch live BI overview & comparisons
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const colParam = selectedCollegeId !== 'all' ? `?college_id=${selectedCollegeId}` : '';
      const [ovRes, cmpRes, respRes] = await Promise.all([
        fetch(`${API}/analytics/overview${colParam}`),
        fetch(`${API}/analytics/comparisons`),
        fetch(`${API}/analytics/company-responsiveness${colParam}`),
      ]);

      const [ovData, cmpData, respData] = await Promise.all([
        ovRes.json(),
        cmpRes.json(),
        respRes.json(),
      ]);

      if (ovData.success) {
        setKpi(ovData.data.kpi);
        setInsights(ovData.data.insights);
      }
      if (cmpData.success) {
        setComparisons(cmpData.data.college_comparisons);
      }
      if (respData.success) {
        setResponsiveness(respData.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCollegeId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="p-6 space-y-4">

      {/* Filter Row */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <CollegeSelector
            selectedCollegeId={selectedCollegeId}
            allowAll={true}
            allLabel="All Partner Colleges (Consolidated)"
            label="Target Institution:"
            onSelect={(id) => onSelectCollege(id)}
          />
        </div>

        <button
          onClick={loadAnalytics}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FEF3C7] hover:bg-[#FDE68A] text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} strokeWidth={2} aria-hidden /> Refresh Live BI
        </button>
      </div>

      {/* 6 Live KPI Cards (Slim Single-Row Profile) */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
          {/* Card 1: Total Calls */}
          <div className="bg-white border border-blue-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                <PhoneCall size={12} strokeWidth={2.5} className="text-blue-700" />
              </div>
              <span className="text-micro font-semibold text-slate-700 truncate">Total Calls</span>
            </div>
            <span className="text-xs font-bold font-mono text-blue-700 tabular-nums shrink-0">{kpi.total_calls}</span>
          </div>

          {/* Card 2: Positive Rate */}
          <div className="bg-white border border-emerald-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                <Sparkles size={12} strokeWidth={2.5} className="text-emerald-700" />
              </div>
              <span className="text-micro font-semibold text-slate-700 truncate">Positive Rate</span>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-700 tabular-nums shrink-0">{kpi.positive_rate_pct}%</span>
          </div>

          {/* Card 3: Companies Contacted */}
          <div className="bg-white border border-purple-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center shrink-0">
                <Building2 size={12} strokeWidth={2.5} className="text-purple-700" />
              </div>
              <span className="text-micro font-semibold text-slate-700 truncate">Companies</span>
            </div>
            <span className="text-xs font-bold font-mono text-purple-700 tabular-nums shrink-0">{kpi.companies_contacted}</span>
          </div>

          {/* Card 4: JDs Received */}
          <div className="bg-white border border-cyan-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-cyan-50 flex items-center justify-center shrink-0">
                <FileText size={12} strokeWidth={2.5} className="text-cyan-700" />
              </div>
              <span className="text-micro font-semibold text-slate-700 truncate">JDs Received</span>
            </div>
            <span className="text-xs font-bold font-mono text-cyan-700 tabular-nums shrink-0">{kpi.jd_received}</span>
          </div>

          {/* Card 5: Drives Completed */}
          <div className="bg-white border border-amber-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center shrink-0">
                <CheckCircle2 size={12} strokeWidth={2.5} className="text-amber-700" />
              </div>
              <span className="text-micro font-semibold text-slate-700 truncate">Completed</span>
            </div>
            <span className="text-xs font-bold font-mono text-amber-700 tabular-nums shrink-0">{kpi.drives_completed}</span>
          </div>

          {/* Card 6: Total Offers */}
          <div className="bg-white border border-emerald-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                <Trophy size={12} strokeWidth={2.5} className="text-emerald-700" />
              </div>
              <span className="text-micro font-semibold text-slate-700 truncate">Total Offers</span>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-700 tabular-nums shrink-0">{kpi.total_offers}</span>
          </div>
        </div>
      )}

      {/* Automated 4-Category Insights Panel (Spec Section 7.5 & 16) */}
      {insights && (
        <div className="glass-panel rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-fg flex items-center gap-2">
              <span>💡</span> Automated Operational Insights Engine
            </h2>
            <span className="text-micro bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">
              Live BI Observations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Coordinator Insights */}
            <div className="bg-background/60 border border-border rounded-xl p-3.5 space-y-2">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <User size={14} strokeWidth={2} aria-hidden /> Coordinator Insights
              </span>
              <ul className="space-y-1.5 text-fg-muted text-micro">
                {insights.coordinator_insights.map((ins: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Insights */}
            <div className="bg-background/60 border border-border rounded-xl p-3.5 space-y-2">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                <Building2 size={14} strokeWidth={2} aria-hidden /> Company Insights
              </span>
              <ul className="space-y-1.5 text-fg-muted text-micro">
                {insights.company_insights.map((ins: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-purple-500">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* College Insights */}
            <div className="bg-background/60 border border-border rounded-xl p-3.5 space-y-2">
              <span className="font-bold text-success flex items-center gap-1.5">
                <Landmark size={14} strokeWidth={2} aria-hidden /> College Insights
              </span>
              <ul className="space-y-1.5 text-fg-muted text-micro">
                {insights.college_insights.map((ins: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-success">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trend Insights */}
            <div className="bg-background/60 border border-border rounded-xl p-3.5 space-y-2">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <TrendingUp size={14} strokeWidth={2} aria-hidden /> Trend & Velocity
              </span>
              <ul className="space-y-1.5 text-fg-muted text-micro">
                {insights.trend_insights.map((ins: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-cyan-500">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Two Comparison & Responsiveness Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Table 1: College Comparative Performance */}
        <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-3">
          <div className="px-4 py-3 border-b border-border bg-background/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-fg flex items-center gap-2">
              <Landmark size={14} strokeWidth={2} aria-hidden /> Institutional Performance Comparison
            </h3>
            <span className="text-micro text-fg-subtle">Calls • Positives • Offers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-background/80 text-fg-subtle font-semibold border-b border-border text-micro uppercase">
                  <th className="py-2.5 px-3">Institution Name</th>
                  <th className="py-2.5 px-3 text-center">Calls</th>
                  <th className="py-2.5 px-3 text-center">Positives</th>
                  <th className="py-2.5 px-3 text-center">Drives</th>
                  <th className="py-2.5 px-3 text-center">Offers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {comparisons.map((c) => (
                  <tr key={c.college_id} className="hover:bg-surface/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-fg">
                      <span className="text-primary font-mono text-micro mr-1.5">[{c.college_code}]</span>
                      {c.college_name}
                    </td>
                    <td className="py-2.5 px-3 text-center text-fg-muted font-mono">{c.calls}</td>
                    <td className="py-2.5 px-3 text-center text-success font-semibold font-mono">{c.positives}</td>
                    <td className="py-2.5 px-3 text-center text-warning font-mono">{c.drives_completed}</td>
                    <td className="py-2.5 px-3 text-center text-success font-bold font-mono">{c.offers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Industry & Responsiveness Breakdown */}
        <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-3">
          <div className="px-4 py-3 border-b border-border bg-background/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-fg flex items-center gap-2">
              <Building2 size={14} strokeWidth={2} aria-hidden /> Industry & Corporate Domain Breakdown
            </h3>
            <span className="text-micro text-fg-subtle">Weekly Tracker Pipeline</span>
          </div>

          <div className="p-4 space-y-3">
            {responsiveness?.industry_distribution?.length > 0 ? (
              responsiveness.industry_distribution.map((ind: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-background/40 p-2.5 rounded-lg border border-border">
                  <span className="text-xs font-semibold text-fg">{ind.type}</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    {ind.count} Companies
                  </span>
                </div>
              ))
            ) : (
              <p className="text-fg-subtle italic text-xs py-4 text-center">
                No industry distribution data yet.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
