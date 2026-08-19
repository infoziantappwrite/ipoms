'use client';

import { useState } from 'react';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { Plus, Users } from 'lucide-react';

interface Props {
  data: any;
  onRefresh: () => void;
}

export function TeamLeaderDashboard({ data, onRefresh }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!data) return null;

  const { team_matrix, assignments_overview } = data;

  const statusStyles: any = {
    on_track: 'bg-success/20 text-success border-success/30',
    active: 'bg-primary/20 text-primary border-primary/30',
    pending: 'bg-surface text-fg-subtle border-border-strong',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Top Action Bar */}
      <div className="glass-panel rounded-2xl border border-border p-5 shadow-lg flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>👔</span> Placement Team Activity & Operations
          </h2>
          <p className="text-xs text-fg-subtle mt-0.5">
            Monitor real-time coordinator call velocity, positive leads, and dispatch assigned tasks.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center gap-2"
        >
          <Plus size={14} strokeWidth={2} aria-hidden /> Assign Work to Coordinator
        </button>
      </div>

      {/* Overview Cards (Spec Section 5.2) */}
      {assignments_overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 border border-border">
            <span className="text-micro text-fg-subtle font-semibold uppercase">Total Dispatched</span>
            <p className="text-2xl font-bold text-fg mt-1 tabular-nums">
              {assignments_overview.total_dispatched}
            </p>
            <p className="text-micro text-fg-subtle mt-0.5">Assigned Work Lifetime</p>
          </div>

          <div className="glass-card rounded-xl p-4 border border-border">
            <span className="text-micro text-fg-subtle font-semibold uppercase">Completed by Team</span>
            <p className="text-2xl font-bold text-success mt-1 tabular-nums">
              {assignments_overview.completed}
            </p>
            <p className="text-micro text-success/80 mt-0.5">Finished & Verified</p>
          </div>

          <div className="glass-card rounded-xl p-4 border border-border">
            <span className="text-micro text-fg-subtle font-semibold uppercase">Active Pending Work</span>
            <p className="text-2xl font-bold text-warning mt-1 tabular-nums">
              {assignments_overview.active_pending}
            </p>
            <p className="text-micro text-warning/80 mt-0.5">In Progress Across Team</p>
          </div>
        </div>
      )}

      {/* Team Coordinator Live Activity Matrix (Spec Section 5.2) */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-border bg-background/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Users size={14} strokeWidth={2} aria-hidden /> Coordinator Live Performance Matrix
            </h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Live operational telemetry synchronized from Daily Tracker and Assigned Work
            </p>
          </div>
          <span className="text-xs bg-surface text-fg-muted px-2.5 py-0.5 rounded-full border border-border-strong font-medium">
            {team_matrix?.length || 0} Team Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-background/80 text-fg-subtle font-semibold border-b border-border text-micro uppercase">
                <th className="py-3 px-4">Coordinator</th>
                <th className="py-3 px-4 text-center">Today's Calls</th>
                <th className="py-3 px-4 text-center">Positive Leads</th>
                <th className="py-3 px-4 text-center">JDs Received</th>
                <th className="py-3 px-4 text-center">Pending Assigned Tasks</th>
                <th className="py-3 px-4 text-center">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {team_matrix?.map((c: any) => (
                <tr key={c.coordinator_id} className="hover:bg-surface/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-fg">{c.name}</p>
                    <p className="text-micro text-fg-subtle font-mono">{c.email}</p>
                  </td>
                  <td className="py-3 px-4 text-center text-primary font-bold font-mono">
                    {c.calls_today}
                  </td>
                  <td className="py-3 px-4 text-center text-success font-bold font-mono">
                    {c.positive_leads}
                  </td>
                  <td className="py-3 px-4 text-center text-cyan-400 font-bold font-mono">
                    {c.jds_received}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-micro ${
                        c.pending_assigned_work > 0 ? 'bg-warning/20 text-warning' : 'text-fg-subtle'
                      }`}
                    >
                      {c.pending_assigned_work} Tasks
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-micro uppercase font-bold px-2.5 py-0.5 rounded-full border ${
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
