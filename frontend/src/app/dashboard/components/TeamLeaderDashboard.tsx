'use client';

import { useState, useEffect } from 'react';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import {
  Plus, Users, Briefcase, CheckCircle2, Clock, Send, Target,
  ChevronDown, ChevronUp, Radio, Activity, PhoneCall, Building2,
  Sparkles, Mail, Phone, CalendarCheck
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetCoordinatorId, setTargetCoordinatorId] = useState<string | undefined>(undefined);
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

  const { team_matrix = [], assignments_overview, online_summary } = data;

  const filteredMatrix = team_matrix.filter((c: any) => {
    if (presenceFilter === 'online') return c.online_status === 'online';
    if (presenceFilter === 'active_today') return c.calls_today > 0 || c.online_status === 'online' || c.online_status === 'away';
    if (presenceFilter === 'leave') return c.online_status === 'on_leave' || c.online_status === 'partial_working';
    return true;
  });

  const onlineCount = online_summary?.currently_online ?? team_matrix.filter((m: any) => m.online_status === 'online').length;
  const activeTodayCount = online_summary?.active_today ?? team_matrix.filter((m: any) => m.calls_today > 0 || m.online_status === 'online' || m.online_status === 'away').length;

  const handleOpenAssignModal = (coordinatorId?: string) => {
    setTargetCoordinatorId(coordinatorId);
    setShowCreateModal(true);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* ── 1. Team Leader Command & Task Dispatch Action Bar ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600 dark:text-blue-400" aria-hidden /> Team Leader Operations & Workforce Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time coordinator online activity, track daily call velocity, and dispatch institutional tasks.
          </p>
        </div>

        <button
          onClick={() => handleOpenAssignModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.2} aria-hidden /> Assign Work to Coordinator
        </button>
      </div>

      {/* ── 2. Live Presence & Workforce Overview KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Online Telemetry Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Currently Online</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {onlineCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {team_matrix.length} Coordinators</span>
          </div>
          <p className="text-micro text-emerald-600/90 dark:text-emerald-400/90 font-medium mt-1 flex items-center gap-1">
            <Radio size={11} className="animate-pulse" /> Active on portal right now
          </p>
        </div>

        {/* Active Workforce Today */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Callers Today</span>
            <PhoneCall size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2 tabular-nums">
            {activeTodayCount}
          </p>
          <p className="text-micro text-slate-400 mt-1">Logged calls / leads today</p>
        </div>

        {/* Completed Work */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Completed Tasks</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {assignments_overview?.completed ?? 0}
          </p>
          <p className="text-micro text-slate-400 mt-1">Assignments Finished</p>
        </div>

        {/* Pending Assignments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Pending Work</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {assignments_overview?.active_pending ?? 0}
          </p>
          <p className="text-micro text-slate-400 mt-1">In Progress Across Team</p>
        </div>
      </div>

      {/* ── 3. Team Coordinator Profile & Online Activity Matrix ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Table Header & Presence Filters */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" aria-hidden /> Coordinators Profile & Live Online Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live coordinator profiles, real-time presence indicators, last actions, and daily metrics
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setPresenceFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  presenceFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All ({team_matrix.length})
              </button>
              <button
                type="button"
                onClick={() => setPresenceFilter('online')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  presenceFilter === 'online'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Online ({onlineCount})
              </button>
              <button
                type="button"
                onClick={() => setPresenceFilter('active_today')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  presenceFilter === 'active_today'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Active Today ({activeTodayCount})
              </button>
            </div>

            <button
              onClick={() => setShowTeamMatrix(!showTeamMatrix)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5 min-w-[220px]">Coordinator Profile</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Online Activity & Status</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Assigned Institutions</th>
                  <th className="py-3.5 px-3 text-center">Calls Today</th>
                  <th className="py-3.5 px-3 text-center">Positive Leads</th>
                  <th className="py-3.5 px-3 text-center">JDs</th>
                  <th className="py-3.5 px-4 text-center">Assigned Tasks</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 italic">
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
                      <tr key={c.coordinator_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        {/* 1. Coordinator Profile (Photo, Name, Email, Mobile) */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            {/* Avatar with Live Presence Dot */}
                            <div className="relative shrink-0">
                              {c.profile_photo_url ? (
                                <img
                                  src={c.profile_photo_url}
                                  alt={c.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-xs">
                                  {c.name?.charAt(0) || 'C'}
                                </div>
                              )}
                              {/* Presence Indicator Badge */}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                  isOnline
                                    ? 'bg-emerald-500'
                                    : isAway
                                    ? 'bg-amber-400'
                                    : isOnLeave
                                    ? 'bg-purple-500'
                                    : isPartial
                                    ? 'bg-cyan-500'
                                    : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                                title={c.online_status_label}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {isOnline && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[180px]">
                                {c.email}
                              </div>
                              {c.mobile && (
                                <div className="text-micro text-slate-400 font-mono">
                                  {c.mobile}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Online Activity & Presence Status */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isOnline
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : isAway
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                  : isOnLeave
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                  : isPartial
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
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
                                    : 'bg-slate-400'
                                }`}
                              />
                              {c.online_status_label}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                              {c.last_activity_summary}
                            </p>
                          </div>
                        </td>

                        {/* 3. Assigned Institutions */}
                        <td className="py-3.5 px-4">
                          {c.assigned_colleges && c.assigned_colleges.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {c.assigned_colleges.map((col: any, i: number) => (
                                <span
                                  key={i}
                                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700"
                                  title={col.college_name || col.college_code}
                                >
                                  {col.college_code || col.college_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">All Colleges</span>
                          )}
                        </td>

                        {/* 4. Calls Today */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                            {c.calls_today}
                          </span>
                        </td>

                        {/* 5. Positive Leads */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                            {c.positive_leads}
                          </span>
                        </td>

                        {/* 6. JDs Received */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold font-mono text-sm text-cyan-600 dark:text-cyan-400">
                            {c.jds_received}
                          </span>
                        </td>

                        {/* 7. Pending Assigned Work */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                              c.pending_assigned_work > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {c.pending_assigned_work} Tasks
                          </span>
                        </td>

                        {/* 8. Action Shortcut: Assign Work */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(c.coordinator_id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1 mx-auto"
                            title={`Assign a specific company/college task to ${c.name}`}
                          >
                            <Send size={11} /> Assign
                          </button>
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
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <CoordinatorCollegeFocusSection
            onSelectionChange={(ids, locked) => {
              setSelectedCollegeIds(ids);
              setIsLocked(locked);
            }}
          />
        </div>

        {/* Operational Cards & Follow-Up Smart Queue for Selected Colleges */}
        {selectedCollegeIds.length === 0 ? (
          <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center">
              <Target size={20} strokeWidth={2} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Select Colleges to Start Operational Outreach
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Choose 1 to 4 partner colleges above to activate live college KPIs, pipeline tracker velocity, and follow-up queues.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Per-College KPI Analytics Cards */}
            <CoordinatorCollegeKpiCards
              selectedCollegeIds={selectedCollegeIds}
            />

            {/* Hot Follow-Ups Due — Smart Queue & Alarm */}
            <FollowUpSmartQueueWidget
              selectedCollegeIds={selectedCollegeIds}
            />
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <CreateAssignmentModal
          initialCoordinatorId={targetCoordinatorId}
          onClose={() => {
            setShowCreateModal(false);
            setTargetCoordinatorId(undefined);
          }}
          onSuccess={onRefresh}
        />
      )}

    </div>
  );
}
