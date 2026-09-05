'use client';

import { useState, useEffect } from 'react';
import {
  Users, Briefcase, CheckCircle2, Target,
  ChevronDown, ChevronUp, Radio, PhoneCall, Building2,
  Sparkles, Mail, Phone, CalendarCheck, TrendingUp, Award
} from 'lucide-react';
import { CoordinatorCollegeFocusSection } from './CoordinatorCollegeFocusSection';
import { CoordinatorCollegeKpiCards } from './CoordinatorCollegeKpiCards';
import { FollowUpSmartQueueWidget } from './FollowUpSmartQueueWidget';
import { getCoordinatorSelectedColleges, isFocusLockedToday } from '@/lib/collegeSession';

interface Props {
  data: any;
  onRefresh: () => void;
}

export function TeamLeaderDashboard({ data, onRefresh }: Props) {
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showTeamMatrix, setShowTeamMatrix] = useState(true);
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'active_today' | 'leave'>('all');

  useEffect(() => {
    setSelectedCollegeIds(getCoordinatorSelectedColleges());
    setIsLocked(isFocusLockedToday());

    const handleFocusUpdate = () => {
      setSelectedCollegeIds(getCoordinatorSelectedColleges());
      setIsLocked(isFocusLockedToday());
    };
    window.addEventListener('ipoms_focus_updated' as any, handleFocusUpdate);
    return () => {
      window.removeEventListener('ipoms_focus_updated' as any, handleFocusUpdate);
    };
  }, []);

  if (!data) return null;

  const { team_matrix = [], online_summary } = data;

  const filteredMatrix = team_matrix.filter((c: any) => {
    if (presenceFilter === 'online') return c.online_status === 'online';
    if (presenceFilter === 'active_today') return c.calls_today > 0 || c.online_status === 'online' || c.online_status === 'away';
    if (presenceFilter === 'leave') return c.online_status === 'on_leave' || c.online_status === 'partial_working';
    return true;
  });

  const onlineCount = online_summary?.currently_online ?? team_matrix.filter((m: any) => m.online_status === 'online').length;
  const activeTodayCount = online_summary?.active_today ?? team_matrix.filter((m: any) => m.calls_today > 0 || m.online_status === 'online' || m.online_status === 'away').length;

  const totalCallsToday = team_matrix.reduce((acc: number, c: any) => acc + (c.calls_today || 0), 0);
  const totalPositives = team_matrix.reduce((acc: number, c: any) => acc + (c.positive_leads || 0), 0);
  const totalJds = team_matrix.reduce((acc: number, c: any) => acc + (c.jds_received || 0), 0);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* ── 1. Team Leader Command Header ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600 dark:text-blue-400" aria-hidden /> Team Leader Operations & Workforce Hub
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Monitor real-time coordinator online activity, track daily call velocity, and manage institutional pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Users size={14} />
            <span>{team_matrix.length} Team Members</span>
          </span>
        </div>
      </div>

      {/* ── 2. Live Presence & Team Outreach KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Live Online Telemetry Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Currently Online
              </span>
              <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
                <Radio size={15} className="animate-pulse" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {onlineCount}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/ {team_matrix.length} Coordinators</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-micro text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Active on portal right now</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        {/* 2. Active Workforce Today */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Active Callers Today
              </span>
              <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                <PhoneCall size={15} />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
                {activeTodayCount}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Coordinators</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-micro text-zinc-500 dark:text-zinc-400">
            <span>Logged calls / leads today</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Live Metric</span>
          </div>
        </div>

        {/* 3. Total Calls Made Today */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Team Calls Today
              </span>
              <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 grid place-items-center shrink-0">
                <TrendingUp size={15} />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
                {totalCallsToday}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Outreach Calls</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-micro text-zinc-500 dark:text-zinc-400">
            <span>Corporate outreach calls today</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Daily Velocity</span>
          </div>
        </div>

        {/* 4. Total Positives & JDs */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Positive Leads & JDs
              </span>
              <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
                <Award size={15} />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {totalPositives}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Positives ({totalJds} JDs)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-micro text-zinc-500 dark:text-zinc-400">
            <span>Cumulative positive conversions</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Pipeline</span>
          </div>
        </div>
      </div>

      {/* ── 3. Team Coordinator Profile & Online Activity Matrix ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Table Header & Presence Filters */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" aria-hidden /> Coordinators Profile & Live Online Activity
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live coordinator profiles, real-time presence indicators, last actions, and daily metrics
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setPresenceFilter('all')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  presenceFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                All ({team_matrix.length})
              </button>
              <button
                type="button"
                onClick={() => setPresenceFilter('online')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  presenceFilter === 'online'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Online ({onlineCount})
              </button>
              <button
                type="button"
                onClick={() => setPresenceFilter('active_today')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  presenceFilter === 'active_today'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Active Today ({activeTodayCount})
              </button>
            </div>

            <button
              onClick={() => setShowTeamMatrix(!showTeamMatrix)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title={showTeamMatrix ? 'Collapse matrix' : 'Expand matrix'}
            >
              {showTeamMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {showTeamMatrix && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5 min-w-[220px]">Coordinator Profile</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Online Activity & Status</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Assigned Institutions</th>
                  <th className="py-3.5 px-3 text-center">Calls Today</th>
                  <th className="py-3.5 px-3 text-center">Positive Leads</th>
                  <th className="py-3.5 px-3 text-center">JDs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-400 italic">
                      No coordinators match the selected presence filter.
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map((c: any) => {
                    const isOnline = c.online_status === 'online';
                    const isAway = c.online_status === 'away';
                    const isOnLeave = c.online_status === 'on_leave';
                    const isPartial = c.online_status === 'partial_working';

                    return (
                      <tr key={c.coordinator_id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        {/* 1. Coordinator Profile (Photo, Name, Email, Mobile) */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            {/* Avatar with Live Presence Dot */}
                            <div className="relative shrink-0">
                              {c.profile_photo_url ? (
                                <img
                                  src={c.profile_photo_url}
                                  alt={c.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-xs">
                                  {c.name?.charAt(0) || 'C'}
                                </div>
                              )}
                              {/* Presence Indicator Badge */}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                                  isOnline
                                    ? 'bg-emerald-500'
                                    : isAway
                                    ? 'bg-amber-400'
                                    : isOnLeave
                                    ? 'bg-purple-500'
                                    : isPartial
                                    ? 'bg-cyan-500'
                                    : 'bg-zinc-300 dark:bg-zinc-600'
                                }`}
                                title={c.online_status_label}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {isOnline && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[180px]">
                                {c.email}
                              </div>
                              {c.mobile && (
                                <div className="text-micro text-zinc-400 font-mono">
                                  {c.mobile}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Online Activity & Presence Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                              isOnline
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : isAway
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : isOnLeave
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                : isPartial
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
                                : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOnline
                                  ? 'bg-emerald-500 animate-pulse'
                                  : isAway
                                  ? 'bg-amber-500'
                                  : isOnLeave
                                  ? 'bg-purple-500'
                                  : isPartial
                                  ? 'bg-cyan-500'
                                  : 'bg-zinc-400'
                              }`}
                            />
                            {c.online_status_label}
                          </span>
                        </td>

                        {/* 3. Assigned Institutions */}
                        <td className="py-3.5 px-4">
                          {c.assigned_colleges && c.assigned_colleges.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {c.assigned_colleges.map((col: any, i: number) => (
                                <span
                                  key={i}
                                  className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-200 dark:border-zinc-700"
                                  title={col.college_name || col.college_code}
                                >
                                  {col.college_code || col.college_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px] italic">All Colleges</span>
                          )}
                        </td>

                        {/* 4. Calls Today */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                            {c.calls_today}
                          </span>
                        </td>

                        {/* 5. Positive Leads (Invite Mail) */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                            {c.positive_leads}
                          </span>
                        </td>

                        {/* 6. JDs (JD Received) */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-cyan-600 dark:text-cyan-400">
                            {c.jds_received}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Team Leader Active College Focus & Operational Workflow ── */}
      <div className="space-y-6 pt-2">
        {/* 1. Follow up Due */}
        <FollowUpSmartQueueWidget
          selectedCollegeIds={selectedCollegeIds}
        />

        {/* 2. Active College Focus */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <CoordinatorCollegeFocusSection
            onSelectionChange={(ids, locked) => {
              setSelectedCollegeIds(ids);
              setIsLocked(locked);
            }}
          />
        </div>

        {/* 3. Campus Outreach Analytics Cards for Selected Colleges */}
        {selectedCollegeIds.length === 0 ? (
          <div className="bg-zinc-50/60 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center">
              <Target size={20} strokeWidth={2} />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Select Colleges to Start Operational Outreach
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
              Choose 1 to 4 partner colleges above to activate live college KPIs, pipeline tracker velocity, and follow-up queues.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Campus Outreach & Conversion Analytics Cards */}
            <CoordinatorCollegeKpiCards
              selectedCollegeIds={selectedCollegeIds}
            />
          </div>
        )}
      </div>

    </div>
  );
}
