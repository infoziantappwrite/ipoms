'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Globe, Landmark, RefreshCw, TrendingUp, User } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
    <div className="p-6 space-y-6">

      {/* Filter Row */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-background/60 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-fg-muted">Target Institution:</span>
          <select
            value={selectedCollegeId}
            onChange={(e) => onSelectCollege(e.target.value)}
            className="bg-surface border border-border-strong text-fg text-xs px-3 py-1.5 rounded-lg cursor-pointer min-w-[220px]"
          >
            <option value="all"><Globe size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}All Partner Colleges (Consolidated)</option>
            {colleges.map((c) => (
              <option key={c._id} value={c._id}>
                [{c.college_code}] {c.college_name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-raised text-fg-muted rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw size={14} strokeWidth={2} aria-hidden /> Refresh Live BI
        </button>
      </div>

      {/* 6 Live KPI Cards */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Calls */}
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <p className="text-micro text-fg-subtle font-medium">Total Calls Logged</p>
            <p className="text-xl font-bold text-primary mt-1 tabular-nums">{kpi.total_calls}</p>
            <p className="text-micro text-fg-subtle mt-0.5">Daily Tracker Outreach</p>
          </div>

          {/* Card 2: Positive Rate */}
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <p className="text-micro text-fg-subtle font-medium">Positive Outreach</p>
            <p className="text-xl font-bold text-success mt-1 tabular-nums">
              {kpi.positive_rate_pct}%
            </p>
            <p className="text-micro text-success/80 mt-0.5">{kpi.positive_responses} Opportunities</p>
          </div>

          {/* Card 3: Companies Contacted */}
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <p className="text-micro text-fg-subtle font-medium">Companies Contacted</p>
            <p className="text-xl font-bold text-purple-400 mt-1 tabular-nums">{kpi.companies_contacted}</p>
            <p className="text-micro text-purple-500/80 mt-0.5">Unique Corporate Leads</p>
          </div>

          {/* Card 4: JDs Received */}
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <p className="text-micro text-fg-subtle font-medium">JDs Received</p>
            <p className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{kpi.jd_received}</p>
            <p className="text-micro text-cyan-500/80 mt-0.5">Daily Leads Register</p>
          </div>

          {/* Card 5: Drives Completed */}
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <p className="text-micro text-fg-subtle font-medium">Drives Completed</p>
            <p className="text-xl font-bold text-warning mt-1 tabular-nums">{kpi.drives_completed}</p>
            <p className="text-micro text-warning/80 mt-0.5">{kpi.drives_in_progress} In Progress</p>
          </div>

          {/* Card 6: Total Offers */}
          <div className="glass-card rounded-xl p-3.5 border border-border">
            <p className="text-micro text-fg-subtle font-medium">Total Student Offers</p>
            <p className="text-xl font-bold text-success mt-1 tabular-nums">{kpi.total_offers}</p>
            <p className="text-micro text-success/80 mt-0.5">2026 Batch Placements</p>
          </div>
        </div>
      )}

      {/* Automated 4-Category Insights Panel (Spec Section 7.5 & 16) */}
      {insights && (
        <div className="glass-panel rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
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
        <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-lg">
          <div className="px-4 py-3 border-b border-border bg-background/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
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
        <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-lg">
          <div className="px-4 py-3 border-b border-border bg-background/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
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
