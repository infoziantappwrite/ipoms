'use client';

import { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, Target,
  ChevronDown, ChevronUp, Building2,
  Sparkles, Mail, Phone, CalendarCheck, RefreshCw,
  Clock, Timer, Zap, PhoneCall
} from 'lucide-react';
import { CoordinatorClockDurationWidget } from './CoordinatorClockDurationWidget';
import { CoordinatorCollegeFocusSection } from './CoordinatorCollegeFocusSection';
import { CoordinatorCollegeKpiCards } from './CoordinatorCollegeKpiCards';
import { FollowUpSmartQueueWidget } from './FollowUpSmartQueueWidget';
import { getCoordinatorSelectedColleges, isFocusLockedToday, getCollegeAcronym } from '@/lib/collegeSession';

interface Props {
  data: any;
  onRefresh: () => void;
}

export function TeamLeaderDashboard({ data, onRefresh }: Props) {
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showTeamMatrix, setShowTeamMatrix] = useState(false);
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'away' | 'offline' | 'active_today'>('all');

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

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Auto-Refresh every 5 seconds for real-time coordinator presence & deployment monitoring
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const handleManualRefresh = async () => {
    if (typeof onRefresh === 'function') {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  };

  if (!data) return null;

  const { team_matrix = [], online_summary, team_call_duration } = data;

  const onlineCoordinators = team_matrix.filter((m: any) => m.online_status === 'online');
  const awayCoordinators = team_matrix.filter((m: any) => m.online_status === 'away');
  const offlineCoordinators = team_matrix.filter((m: any) => m.online_status === 'offline' || m.online_status === 'on_leave' || m.online_status === 'partial_working');

  const onlineCount = online_summary?.currently_online ?? onlineCoordinators.length;
  const awayCount = awayCoordinators.length;
  const offlineCount = offlineCoordinators.length;
  const activeTodayCount = online_summary?.active_today ?? team_matrix.filter((m: any) => m.calls_today > 0 || m.online_status === 'online' || m.online_status === 'away').length;

  // Cumulative team totals across all coordinators
  const totalTeamDurationSeconds =
    team_call_duration?.total_seconds ??
    team_matrix.reduce((acc: number, curr: any) => acc + (curr.today_call_duration_seconds || 0), 0);

  const totalTeamDurationFormatted =
    team_call_duration?.total_formatted ||
    (() => {
      const h = Math.floor(totalTeamDurationSeconds / 3600);
      const m = Math.floor((totalTeamDurationSeconds % 3600) / 60);
      const s = totalTeamDurationSeconds % 60;
      if (h > 0) return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
      return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    })();

  const totalCallsOverall = team_matrix.reduce((acc: number, curr: any) => acc + (Number(curr.calls_today) || 0), 0);
  const totalPositivesOverall = team_matrix.reduce((acc: number, curr: any) => acc + (Number(curr.positive_leads) || 0), 0);
  const totalJdsOverall = team_matrix.reduce((acc: number, curr: any) => acc + (Number(curr.jds_received) || 0), 0);
  const activeCallersCount = team_matrix.filter((c: any) => (c.today_call_duration_seconds || 0) > 0 || (c.calls_today || 0) > 0).length;

  const filteredMatrix = team_matrix.filter((c: any) => {
    if (presenceFilter === 'online') return c.online_status === 'online';
    if (presenceFilter === 'away') return c.online_status === 'away';
    if (presenceFilter === 'offline') return c.online_status === 'offline' || c.online_status === 'on_leave' || c.online_status === 'partial_working';
    if (presenceFilter === 'active_today') return c.calls_today > 0 || c.online_status === 'online' || c.online_status === 'away';
    return true;
  });

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* ── 0. Dedicated Calling Time Today (Matching Coordinator Design for Sujitha / Team Leader) ── */}
      <CoordinatorClockDurationWidget
        clockData={data?.clock_duration}
        coordinatorName={data?.coordinator?.name || 'Sujitha S'}
      />

      {/* ── 3. Live Active Deployment Bar (High-Level Highlighted Executive Cockpit) ── */}
      {onlineCoordinators.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-emerald-950/60 border-2 border-emerald-400/80 dark:border-emerald-500/50 p-5 shadow-lg shadow-emerald-500/10 relative overflow-hidden">
          {/* Decorative ambient aurora glows */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-3 mb-3.5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-xs"></span>
              </span>
              <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-2">
                Live Coordinator Deployment by College
              </h4>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-600/80 text-emerald-800 dark:text-emerald-200 text-xs font-black font-mono shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {onlineCoordinators.length} Coordinator{onlineCoordinators.length === 1 ? '' : 's'} Active Right Now
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {onlineCoordinators.map((c: any) => {
              const rawCode = c.active_college?.college_code || getCollegeAcronym(c.active_college) || 'Online';
              const isSujitha = c.email === 'sujitha_s@infoziant.com' || c.username === 'sujitha' || /sujitha/i.test(c.name || '');
              const activeCode = (isSujitha && (/mcet|mahalingam/i.test(rawCode) || /mcet|mahalingam/i.test(c.active_college?.college_name || '')))
                ? 'NEHRU'
                : rawCode;

              return (
                <div
                  key={c.coordinator_id}
                  className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-700/80 shadow-md shadow-emerald-900/5 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-900 dark:to-teal-950 text-emerald-800 dark:text-emerald-200 font-black flex items-center justify-center text-sm shrink-0 border border-emerald-300 dark:border-emerald-700 shadow-2xs relative">
                      {c.profile_photo_url ? (
                        <img
                          src={c.profile_photo_url}
                          alt={c.name}
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        c.name?.charAt(0) || 'C'
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 shadow-xs" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate block group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                        {c.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {c.active_college ? (
                      <span
                        title={c.active_college.college_name || activeCode}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono font-black text-xs shadow-md shadow-emerald-600/25 tracking-wider uppercase"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {activeCode}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 font-mono">
                        Dashboard
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Team Coordinator Profile & Online Activity Matrix ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Table Header & Presence Filters */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" aria-hidden /> Coordinators Profile & Live Institutional Presence
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live active college status, real-time presence indicators, last actions, and daily metrics
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
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Online ({onlineCount})
              </button>
              <button
                type="button"
                onClick={() => setPresenceFilter('away')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  presenceFilter === 'away'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Away ({awayCount})
              </button>
              <button
                type="button"
                onClick={() => setPresenceFilter('offline')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  presenceFilter === 'offline'
                    ? 'bg-zinc-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                Offline ({offlineCount})
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

            {/* Live Sync button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh live team presence and active college telemetry immediately"
            >
              <RefreshCw size={13} className={`text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTeamMatrix(!showTeamMatrix)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                !showTeamMatrix
                  ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900/90 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 ring-2 ring-blue-500/20 hover:scale-[1.02]'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
              }`}
              title={showTeamMatrix ? 'Collapse coordinators matrix' : 'Expand coordinators matrix'}
            >
              <span>{showTeamMatrix ? 'Collapse' : 'Expand Matrix'}</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${
                  showTeamMatrix ? 'rotate-180 text-zinc-500' : 'rotate-0 text-blue-600 dark:text-blue-400 animate-bounce'
                }`}
              />
            </button>
          </div>
        </div>

        {showTeamMatrix && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5 min-w-[210px]">Coordinator Profile</th>
                  <th className="py-3.5 px-4 min-w-[230px]">Currently Active In (College)</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Presence Status</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Assigned Focus Institutions</th>
                  <th className="py-3.5 px-3 text-center min-w-[130px]">Call Duration</th>
                  <th className="py-3.5 px-3 text-center">Calls Today</th>
                  <th className="py-3.5 px-3 text-center">Positives Today</th>
                  <th className="py-3.5 px-3 text-center">JDs Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-400 italic">
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
                              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                                <span>{c.name}</span>
                                {c.role === 'team_leader' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    Team Leader
                                  </span>
                                )}
                                {isOnline && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[170px]">
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

                        {/* 2. Currently Active In (College) — Dedicated Live Status Column */}
                        <td className="py-3.5 px-4">
                          {isOnline ? (
                            c.active_college ? (
                              <span
                                title={c.active_college.college_name || c.active_college.college_code}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold font-mono text-xs shadow-2xs tracking-wider"
                              >
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                {(() => {
                                  const rawCode = c.active_college.college_code || getCollegeAcronym(c.active_college) || 'Online';
                                  const isSujitha = c.email === 'sujitha_s@infoziant.com' || c.username === 'sujitha' || /sujitha/i.test(c.name || '');
                                  if (isSujitha && (/mcet|mahalingam/i.test(rawCode) || /mcet|mahalingam/i.test(c.active_college.college_name || ''))) {
                                    return 'NEHRU';
                                  }
                                  return rawCode;
                                })()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                General
                              </span>
                            )
                          ) : isAway ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Away
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                              Offline
                            </span>
                          )}
                        </td>

                        {/* 3. Online Activity & Presence Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
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
                            {isOnline ? 'Online' : isAway ? 'Away' : isOnLeave ? 'On Leave' : isPartial ? 'Partial Working' : 'Offline'}
                          </span>
                        </td>

                        {/* 4. Assigned Focus Institutions */}
                        <td className="py-3.5 px-4">
                          {c.assigned_colleges && c.assigned_colleges.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {c.assigned_colleges.map((col: any, i: number) => {
                                const acronym = col.college_code || getCollegeAcronym(col) || col.college_name;
                                const isKprEmailOnly = (acronym === 'KPR' || col.college_name?.includes('KPR')) && (c.email === 'sujitha_s@infoziant.com' || c.username === 'sujitha');
                                return (
                                  <span
                                    key={i}
                                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-zinc-200 dark:border-zinc-700"
                                    title={isKprEmailOnly ? `${col.college_name || acronym} (Emails Alone)` : (col.college_name || acronym)}
                                  >
                                    {acronym}
                                    {isKprEmailOnly && <span className="text-[9px] text-zinc-400 font-sans ml-0.5">(emails)</span>}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px] italic">All Colleges</span>
                          )}
                        </td>

                        {/* 5. Call Duration Today */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs shadow-2xs">
                            <Clock size={12} className="text-indigo-500 shrink-0" />
                            {c.today_call_duration_formatted || '00m 00s'}
                          </span>
                        </td>

                        {/* 6. Calls Today */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                            {c.calls_today}
                          </span>
                        </td>

                        {/* 6. Positive Leads (Invite Mail) */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                            {c.positive_leads}
                          </span>
                        </td>

                        {/* 7. JDs (JD Received) */}
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
              <tfoot className="bg-zinc-50/90 dark:bg-zinc-800/70 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="py-3 px-5 text-zinc-700 dark:text-zinc-200 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[10px] tracking-wider text-zinc-500 dark:text-zinc-400">Team Cumulative Total</span>
                      <span className="text-[11px] font-normal text-zinc-400 font-mono">({team_matrix.length} Coordinators • {activeCallersCount} Active)</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100/80 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 font-mono font-bold text-xs shadow-2xs">
                      <Clock size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      {totalTeamDurationFormatted}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                      {totalCallsOverall}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      {totalPositivesOverall}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold font-mono text-sm text-cyan-600 dark:text-cyan-400">
                      {totalJdsOverall}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Minimal Team Calling Duration & Daily Totals Summary Footer */}
        <div className="px-5 py-3.5 bg-zinc-50/90 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
              <Clock size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                Total Duration Today Used:
              </span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                {totalTeamDurationFormatted}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">
              Across all {team_matrix.length} placement coordinators ({activeCallersCount} active caller{activeCallersCount === 1 ? '' : 's'})
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-wrap font-mono">
            <div className="flex items-center gap-1.5" title="Total calls made across all coordinators today">
              <span className="text-zinc-500 dark:text-zinc-400 font-sans text-xs font-medium">Calls Today:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{totalCallsOverall}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Total positive leads gained across all coordinators today">
              <span className="text-zinc-500 dark:text-zinc-400 font-sans text-xs font-medium">Positives Today:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{totalPositivesOverall}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Total JDs received across all coordinators today">
              <span className="text-zinc-500 dark:text-zinc-400 font-sans text-xs font-medium">JDs Today:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{totalJdsOverall}</span>
            </div>
          </div>
        </div>
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
              Choose 1 to 5 partner colleges above to activate live college KPIs, pipeline tracker velocity, and follow-up queues.
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
