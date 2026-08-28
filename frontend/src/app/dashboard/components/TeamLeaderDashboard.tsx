'use client';

import { useState, useEffect } from 'react';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { Plus, Users, Briefcase, CheckCircle2, Clock, Send, Target, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showTeamMatrix, setShowTeamMatrix] = useState(true);

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

  const { team_matrix, assignments_overview } = data;

  const statusStyles: any = {
    on_track: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    active: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    pending: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* ── 1. Team Leader Command & Task Dispatch Action Bar ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600 dark:text-blue-400" aria-hidden /> Placement Team Activity & Operations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your assigned colleges, track team call velocity, and dispatch coordinator tasks.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.2} aria-hidden /> Assign Work to Coordinator
        </button>
      </div>

      {/* ── 2. Team Work Overview KPI Cards ── */}
      {assignments_overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Dispatched</span>
              <Send size={16} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
              {assignments_overview.total_dispatched}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Assigned Work Lifetime</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Completed by Team</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
              {assignments_overview.completed}
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Finished & Verified</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Pending Work</span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
              {assignments_overview.active_pending}
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">In Progress Across Team</p>
          </div>
        </div>
      )}

      {/* ── 3. Team Coordinator Live Activity Matrix ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users size={15} className="text-blue-600 dark:text-blue-400" aria-hidden /> Coordinator Live Performance Matrix
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Live operational telemetry synchronized from Daily Tracker and Assigned Work
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-medium">
              {team_matrix?.length || 0} Team Members
            </span>
            <button
              onClick={() => setShowTeamMatrix(!showTeamMatrix)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title={showTeamMatrix ? 'Collapse team matrix' : 'Expand team matrix'}
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
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-4 text-center">Today's Calls</th>
                  <th className="py-3 px-4 text-center">Positive Leads</th>
                  <th className="py-3 px-4 text-center">JDs Received</th>
                  <th className="py-3 px-4 text-center">Pending Assigned Tasks</th>
                  <th className="py-3 px-4 text-center">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {team_matrix?.map((c: any) => (
                  <tr key={c.coordinator_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{c.email}</p>
                    </td>
                    <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400 font-bold font-mono">
                      {c.calls_today}
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {c.positive_leads}
                    </td>
                    <td className="py-3 px-4 text-center text-cyan-600 dark:text-cyan-400 font-bold font-mono">
                      {c.jds_received}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                          c.pending_assigned_work > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' : 'text-fg-subtle'
                        }`}
                      >
                        {c.pending_assigned_work} Tasks
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          statusStyles[c.status] || statusStyles.pending
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Sujitha's Active College Focus & Operational Workflow ── */}
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
          <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center">
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
          onClose={() => setShowCreateModal(false)}
          onSuccess={onRefresh}
        />
      )}

    </div>
  );
}
